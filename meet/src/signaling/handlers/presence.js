import config from '../../config/index.js';
import { recordLeft } from '../../sfu/sessionLog.js';
import { S2C_DELTA, S2C_TERMINAL } from '#shared/signaling/events';
import logger from '../../lib/logger.js';

// Phase A spec §3.5 (reconnect grace) / §3.6 (leave and room close) / §4.6
// (a waiting knocker disconnecting just leaves the queue — no grace needed,
// since they were never actually admitted into the meeting).

export async function finalizeLeave({ room, roomManager, peer, notifyRemoved = false }) {
  if (peer.reconnectTimer) {
    clearTimeout(peer.reconnectTimer);
    peer.reconnectTimer = null;
  }
  await recordLeft(peer.participationId);
  await peer.closeMediaState();
  const leavingWasHostOrCohost = peer.isHostOrCohost();
  room.removePeer(peer.id);
  if (notifyRemoved) peer.socket?.emit(S2C_TERMINAL.REMOVED, {});
  peer.socket?.disconnect(true);

  if (room.peers.size === 0) {
    await roomManager.closeRoom(room, 'ended');
    return;
  }

  // No auto-promotion of a random participant (deliberate — a host/cohost
  // carries real authority, e.g. removing participants, that shouldn't land
  // on someone who didn't ask for it). If the peer who just left was the
  // room's last remaining host/cohost, nobody can run the meeting anymore
  // (admit waiters, end it, change roles) — end it for everyone instead of
  // leaving it orphaned open indefinitely. The client warns the last
  // host/cohost before they trigger this (see control-bar's leave confirm).
  if (leavingWasHostOrCohost && room.hostsAndCohosts().length === 0) {
    await roomManager.closeRoom(room, 'host_left');
    return;
  }

  room.broadcastDelta(S2C_DELTA.PEER_LEFT, { peerId: peer.id }, { audience: (p) => p.id !== peer.id });
  await roomManager.refreshAllPeersConsumers(room);
}

export async function handleLeave({ socket, roomManager }) {
  const peer = socket.data.peer;
  const room = socket.data.room;
  if (!peer || !room) return { ok: true };
  await finalizeLeave({ room, roomManager, peer, notifyRemoved: false });
  return { ok: true };
}

export function handleDisconnect({ socket, roomManager }) {
  const peer = socket.data.peer;
  const room = socket.data.room;
  if (!peer || !room) return;

  if (room.waiting.has(peer.id)) {
    room.removeFromWaiting(peer.id);
    room.broadcastToWaitingHosts(S2C_DELTA.WAITING_REMOVED, { peerId: peer.id });
    return;
  }

  if (peer.reconnectTimer) clearTimeout(peer.reconnectTimer);

  peer.socket = null;
  peer.state.connected = false;
  room.broadcastDelta(
    S2C_DELTA.PEER_UPDATED,
    { peerId: peer.id, connected: false },
    { audience: (p) => p.id !== peer.id },
  );

  peer.reconnectTimer = setTimeout(async () => {
    try {
      await finalizeLeave({ room, roomManager, peer, notifyRemoved: false });
    } catch (err) {
      logger.error('grace-expiry leave failed', {
        meetingId: room.meetingId,
        peerId: peer.id,
        error: err.message,
      });
    }
  }, config.meeting.peerReconnectGraceMs);
  peer.reconnectTimer.unref?.();
}
