import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import config from '../config/index.js';
import { AppError } from '../lib/errors.js';
import { ErrorCode } from '#shared/enums';

// This service verifies join tokens; it never mints them. Serenite decides
// who may be in a room, because only Serenite knows about group membership,
// severity bands and risk status. Verification is local: signature, expiry
// and single use, with no callback and no database round-trip on join.

const secretKey = new TextEncoder().encode(config.joinToken.secret);

// Single-use guard on the `jti` claim. Tokens live 120 seconds, so this never
// grows large; entries are evicted lazily as they expire.
const usedTokenIds = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [jti, expiresAtMs] of usedTokenIds) {
    if (expiresAtMs <= now) usedTokenIds.delete(jti);
  }
}

/**
 * Verifies a join token minted by Serenite.
 *
 * `typ` is checked because a reconnect token is long-lived and readable from
 * the client's session storage; without the discriminator it would double as
 * a valid join token.
 */
export async function verifyJoinToken(token) {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] }));
  } catch {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Join token is invalid or expired');
  }

  if (payload.typ !== 'join') {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Wrong token type');
  }

  pruneExpired();
  if (usedTokenIds.has(payload.jti)) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Join token has already been used');
  }
  usedTokenIds.set(payload.jti, (payload.exp ?? 0) * 1000);

  return {
    kind: 'join',
    sub: payload.sub,
    meetingId: payload.mid,
    name: payload.name,
    avatar: payload.avatar ?? null,
    role: payload.role,
    approve: payload.approve === true,
    // Serenite's auth session, so attendance is recorded per device against
    // the unique constraint the app already maintains.
    authSessionId: payload.sid ?? null,
  };
}

/**
 * Reconnect tokens are minted here, not by Serenite: they only make sense
 * once a peer has been admitted, and they are scoped to a room this process
 * is currently holding.
 */
export async function mintReconnectToken({ pid, mid, sid }) {
  return new SignJWT({ typ: 'reconnect', pid, mid, sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secretKey);
}

export async function verifyReconnectToken(token) {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] }));
  } catch {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Reconnect token is invalid or expired');
  }
  if (payload.typ !== 'reconnect') {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Wrong token type');
  }
  return { kind: 'reconnect', peerId: payload.pid, meetingId: payload.mid, sessionId: payload.sid };
}
