import { randomUUID } from 'node:crypto';
import config from '../../config/index.js';
import { S2C_DELTA } from '#shared/signaling/events';
import { requirePeer, requireRoom } from './util.js';

// Phase A spec §6 (Milestone A2). In-memory only, capped ring buffer,
// discarded when the meeting ends (architecture D11) — no schema, no
// retention policy.
export function handleChatSend({ socket }, { text }) {
  const peer = requirePeer(socket);
  const room = requireRoom(socket);
  if (!room.flags.allowChat) return;

  const message = { id: randomUUID(), peerId: peer.id, displayName: peer.displayName, text, at: Date.now() };
  room.chat.push(message);
  if (room.chat.length > config.meeting.chatHistoryLimit) room.chat.shift();

  room.broadcastDelta(S2C_DELTA.CHAT_MESSAGE, { message });
}
