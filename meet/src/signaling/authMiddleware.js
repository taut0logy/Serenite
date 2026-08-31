import { verifyJoinToken, verifyReconnectToken } from '../auth/joinToken.js';
import { AppError } from '../lib/errors.js';
import { ErrorCode } from '#shared/enums';

// Verified locally: no database call, no round-trip to Serenite. The
// single-use guard lives in this process's memory, which is the right place,
// because this process is what a stolen token would be replayed against.
//
// The verifier owns the shape of what comes back; this middleware only
// decides which verifier applies and attaches the result to the socket.

export async function authenticateSocket(socket) {
  const { token, reconnectToken, resume } = socket.handshake.auth ?? {};

  if (reconnectToken) {
    const payload = await verifyReconnectToken(reconnectToken);
    return { ...payload, resume: resume === true };
  }

  if (token) {
    return verifyJoinToken(token);
  }

  throw new AppError(401, ErrorCode.JOIN_TOKEN_INVALID, 'No token provided in handshake');
}

/** Socket.IO namespace middleware wrapping authenticateSocket. */
export function socketAuthMiddleware() {
  return async (socket, next) => {
    try {
      socket.data.auth = await authenticateSocket(socket);
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error('Authentication failed'));
    }
  };
}
