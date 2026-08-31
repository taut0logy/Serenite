import { AppError } from '../../lib/errors.js';
import { ErrorCode } from '#shared/enums';

export function requirePeer(socket) {
  if (!socket.data.peer) throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Not joined');
  return socket.data.peer;
}

export function requireRoom(socket) {
  if (!socket.data.room) throw new AppError(401, ErrorCode.AUTH_REQUIRED, 'Not joined');
  return socket.data.room;
}

export function requireHostOrCohost(peer) {
  if (!peer.isHostOrCohost()) {
    throw new AppError(403, ErrorCode.FORBIDDEN_ROLE_ACTION, 'Host or cohost only');
  }
}

export function requireHost(peer) {
  if (peer.role !== 'HOST') {
    throw new AppError(403, ErrorCode.FORBIDDEN_ROLE_ACTION, 'Host only');
  }
}
