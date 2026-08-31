import { requirePeer, requireRoom } from './util.js';

// Fire-and-forget (spec §4.2). Throttled client-side to 250ms.

export async function handleViewport({ socket, roomManager }, payload) {
  const peer = requirePeer(socket);
  const room = requireRoom(socket);

  peer.viewport.visible = new Map(payload.visible.map((v) => [v.producerId, v.width]));
  peer.viewport.prefetch = new Set(payload.prefetch ?? []);
  peer.viewport.pinned = new Set(payload.pinned ?? []);
  peer.viewport.page = payload.page ?? 0;

  await roomManager.refreshPeerConsumers(room, peer);
}
