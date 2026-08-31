import { S2C_DELTA } from '#shared/signaling/events';
import { requirePeer, requireRoom } from './util.js';

// Phase A spec §6 (Milestone A2). Ephemeral — not stored in room state,
// each reaction is a transient floating-emoji broadcast.
export function handleReactionSend({ socket }, { emoji }) {
  const peer = requirePeer(socket);
  const room = requireRoom(socket);
  if (!room.flags.allowReactions) return;

  room.broadcastDelta(S2C_DELTA.REACTION, { peerId: peer.id, emoji, at: Date.now() });
}
