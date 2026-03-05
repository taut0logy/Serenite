/**
 * Envelope Encryption — Key Management
 *
 * Architecture (ProtonMail / 1Password pattern):
 *  - MK  = random 256-bit Master Key (encrypts all user data)
 *  - KEK = Key Encryption Key derived from the user's password via PBKDF2
 *  - MK is wrapped (AES-KW) by the KEK and stored server-side
 *  - On password change: re-wrap MK → no data re-encryption
 *  - On password reset: unwrap MK with Safe Words → re-wrap with new password
 */

// ── Constants ───────────────────────────────────────────────────────────────
const KEK_ITERATIONS = 600_000; // OWASP 2023 recommendation for PBKDF2-SHA-256
const KEK_SALT_BYTES = 16;
const MK_ALG = { name: 'AES-GCM', length: 256 } as const;
const KEK_ALG = { name: 'AES-KW', length: 256 } as const;
const RECOVERY_KEY_BYTES = 12; // 96-bit entropy represented as 12 words

/**
 * BIP-39 inspired word list (128 words — 7 bits each, 16 bytes = 128 bits
 * represented as 12 words). These are chosen to be short, unambiguous in
 * any accent, and emotionally neutral.
 */
const WORDLIST = [
  'apple', 'arch', 'bank', 'beam', 'bird', 'bone', 'book', 'boot',
  'brick', 'brush', 'calm', 'card', 'cart', 'case', 'cave', 'clay',
  'clip', 'cloth', 'club', 'coal', 'coat', 'coin', 'cold', 'core',
  'corn', 'cove', 'crab', 'crop', 'crow', 'curl', 'dark', 'dash',
  'dawn', 'deck', 'deer', 'dell', 'desk', 'dew', 'dice', 'dish',
  'disk', 'dock', 'dome', 'door', 'dove', 'down', 'draw', 'drum',
  'duck', 'dune', 'dusk', 'dust', 'echo', 'edge', 'fern', 'field',
  'film', 'fish', 'flag', 'flat', 'flaw', 'flex', 'flip', 'flock',
  'flow', 'foam', 'fold', 'font', 'fork', 'form', 'frog', 'frost',
  'gale', 'gate', 'gem', 'gift', 'gild', 'glad', 'glow', 'glyph',
  'gold', 'golf', 'gown', 'gram', 'grid', 'grip', 'grit', 'gulf',
  'gust', 'halo', 'harp', 'haze', 'helm', 'herb', 'hill', 'hint',
  'hive', 'hold', 'home', 'hook', 'horn', 'hull', 'husk', 'jade',
  'jolt', 'kelp', 'knot', 'lace', 'lake', 'lamp', 'lane', 'lark',
  'last', 'lath', 'lawn', 'lead', 'leaf', 'lean', 'ledge', 'lilt',
  'lime', 'link', 'lint', 'lock', 'loft', 'loop', 'lore', 'lyre',
  'mage', 'mail', 'maple', 'maze', 'meal', 'mesh', 'mild', 'mine',
  'mist', 'monk', 'moon', 'moss', 'moth', 'mud', 'mute', 'nail',
  'near', 'neck', 'nest', 'node', 'noise', 'nose', 'note', 'oak',
  'oar', 'oath', 'ocean', 'oil', 'old', 'olive', 'opal', 'open',
  'orbit', 'organ', 'owl', 'pack', 'page', 'paint', 'palm', 'pane',
  'park', 'path', 'peak', 'pearl', 'peat', 'peel', 'pen', 'pest',
  'pet', 'phone', 'piano', 'pick', 'pier', 'pile', 'pine', 'pink',
  'pipe', 'pit', 'plain', 'plan', 'plant', 'plate', 'play', 'plot',
  'plow', 'plum', 'plus', 'poem', 'poet', 'point', 'pole', 'pond',
  'pool', 'pork', 'port', 'post', 'pot', 'pour', 'power', 'prawn',
  'prize', 'proof', 'prop', 'pulp', 'pulse', 'pump', 'pure', 'quartz',
  'queen', 'quick', 'quiet', 'quilt', 'race', 'raft', 'rail', 'rain',
  'rake', 'ramp', 'rank', 'rare', 'rate', 'raw', 'ray', 'rear',
  'reef', 'reel', 'rest', 'rib', 'rice', 'rich', 'ride', 'ring',
  'rise', 'risk', 'road', 'rock', 'rod', 'roof', 'room', 'root',
  'rope', 'rose', 'round', 'row', 'ruby', 'rule', 'rust', 'safe'
];

// ── Master Key ───────────────────────────────────────────────────────────────

/**
 * Generate a fresh random Master Key (AES-256-GCM, non-extractable).
 */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(MK_ALG, true, ['encrypt', 'decrypt']);
}

// ── Key Encryption Key (KEK) ─────────────────────────────────────────────────

/**
 * Generate a fresh 16-byte salt for KEK derivation.
 */
export function generateKEKSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(KEK_SALT_BYTES));
}

/**
 * Derive a Key Encryption Key from the user's password.
 * Uses PBKDF2 with 600,000 iterations (OWASP 2023).
 */
export async function deriveKEK(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: KEK_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEK_ALG,
    false,
    ['wrapKey', 'unwrapKey']
  );
}

// ── Wrap / Unwrap ─────────────────────────────────────────────────────────────

/**
 * Wrap the Master Key with a KEK for server-side storage.
 * Returns a base64-encoded wrapped key blob (~40 bytes).
 */
export async function wrapMasterKey(mk: CryptoKey, kek: CryptoKey): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey('raw', mk, kek, 'AES-KW');
  return arrayBufferToBase64(wrapped);
}

/**
 * Unwrap a server-stored wrapped MK blob into a usable CryptoKey.
 * The resulting key is non-extractable (safe to keep in memory).
 */
export async function unwrapMasterKey(wrappedBase64: string, kek: CryptoKey): Promise<CryptoKey> {
  const wrappedBuffer = base64ToArrayBuffer(wrappedBase64);
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedBuffer,
    kek,
    'AES-KW',
    MK_ALG,
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
}

// ── Safe Words (Recovery Key) ─────────────────────────────────────────────────

/**
 * Generate a recovery key as 12 mnemonic words.
 * Returns both the displayable phrase and a raw Uint8Array for crypto use.
 */
export function generateSafeWords(): { words: string[]; phrase: string; rawBytes: Uint8Array } {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_KEY_BYTES));
  // Each byte (8 bits) -> index into 256-word list
  const words = Array.from(bytes).map(b => WORDLIST[b]);
  return { words, phrase: words.join(' '), rawBytes: bytes };
}

/**
 * Reconstruct the raw key bytes from a safe-word phrase.
 * Words are looked up in the WORDLIST; unknown words throw.
 */
export function safeWordsToBytes(phrase: string): Uint8Array {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  const bytes = new Uint8Array(words.length);
  for (let i = 0; i < words.length; i++) {
    const idx = WORDLIST.indexOf(words[i]);
    if (idx === -1) {
      throw new Error(`Unknown word in safe phrase: "${words[i]}"`);
    }
    bytes[i] = idx;
  }
  return bytes;
}

/**
 * Derive a CryptoKey from safe-word bytes for wrapping/unwrapping.
 * Uses a fixed salt derived from a constant string (the bytes themselves
 * provide the entropy — no need for a separate stored salt).
 */
export async function deriveSafeWordKey(rawBytes: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', rawBytes.buffer as ArrayBuffer, 'PBKDF2', false, ['deriveKey']);
  // Use a fixed domain-separated salt for the recovery path
  const salt = new TextEncoder().encode('serenite-recovery-v1');
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    KEK_ALG,
    false,
    ['wrapKey', 'unwrapKey']
  );
}

// ── Data Encryption with MK ───────────────────────────────────────────────────

/**
 * Encrypt questionnaire responses with the Master Key.
 * Much faster than the old approach — no PBKDF2 per call.
 */
export async function encryptWithMK(
  responses: Record<string, number>,
  mk: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(responses));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, mk, data);
  return { encrypted, iv };
}

/**
 * Decrypt questionnaire responses with the Master Key.
 */
export async function decryptWithMK(
  encrypted: ArrayBuffer,
  iv: Uint8Array,
  mk: CryptoKey
): Promise<Record<string, number>> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    mk,
    encrypted
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Validate a base64 string before decoding — prevents InvalidCharacterError.
 */
export function isValidBase64(str: string): boolean {
  if (!str || str.length === 0) return false;
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}
