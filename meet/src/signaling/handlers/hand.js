import { S2C_DELTA } from '#shared/signaling/events';
import { requirePeer, requireRoom } from './util.js';

// Phase A spec §6 (Milestone A2). Reuses peer:updated so clients don't need
// a dedicated event/reducer for a single boolean.
export function handleHandToggle({ socket }, { raised }) {
  const peer = requirePeer(socket);
  const room = requireRoom(socket);

  peer.state.handRaised = raised;
  room.broadcastDelta(S2C_DELTA.PEER_UPDATED, { peerId: peer.id, handRaised: raised }, { audience: (p) => p.id !== peer.id });
}
