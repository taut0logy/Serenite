/**
 * Client-side encryption utilities for protecting questionnaire responses.
 * Uses AES-256-GCM with PBKDF2 key derivation from user's password.
 */

/**
 * Derive an AES-256 encryption key from the user's password using PBKDF2.
 * The same password + salt will always produce the same key.
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt questionnaire responses with a password-derived key.
 * Returns the encrypted data along with the IV and salt needed for decryption.
 */
export async function encryptResponses(
  responses: Record<string, number>,
  password: string
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array; salt: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const data = new TextEncoder().encode(JSON.stringify(responses));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return { encrypted, iv, salt };
}

/**
 * Decrypt questionnaire responses using the password-derived key.
 * Requires the same salt and IV that were used during encryption.
 */
export async function decryptResponses(
  encrypted: ArrayBuffer,
  iv: Uint8Array,
  salt: Uint8Array,
  password: string
): Promise<Record<string, number>> {
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encrypted
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

/**
 * Convert ArrayBuffer to Base64 string for storage/transmission.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string back to ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * Convert Uint8Array to Base64 string.
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  return arrayBufferToBase64(array.buffer as ArrayBuffer);
}

/**
 * Convert Base64 string to Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}
