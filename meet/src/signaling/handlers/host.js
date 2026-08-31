import { mintReconnectToken } from '../../auth/joinToken.js';
import { AppError } from '../../lib/errors.js';
import { ErrorCode } from '#shared/enums';
import { S2C_DELTA, S2C_MEDIA, S2C_TERMINAL } from '#shared/signaling/events';
import { admitPeerIntoRoom } from './waitingRoom.js';
import { finalizeLeave } from './presence.js';
import { requirePeer, requireRoom, requireHostOrCohost, requireHost } from './util.js';

// Phase A spec §4.7. Every handler reads `peer.role` from the server-side
// Peer — never from the client payload. `host:mute` is asymmetric by
// design: it pauses the target's producer server-side (works regardless of
// the target's cooperation); there is no server-side "force resume" at all.

export async function handleHostAdmit({ socket, roomManager }, { peerId }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHostOrCohost(hostPeer);

  const waitingEntry = room.waiting.get(peerId);
  if (!waitingEntry) throw new AppError(404, ErrorCode.NOT_FOUND, 'No such waiting participant');

  room.removeFromWaiting(peerId);
  await admitPeerIntoRoom(room, waitingEntry.peer, { admittedBy: hostPeer.id });
  const reconnectToken = await mintReconnectToken({
    pid: waitingEntry.peer.id,
    mid: room.meetingId,
    sid: room.sessionId,
  });
  waitingEntry.socket.emit(S2C_TERMINAL.ADMITTED, {
    snapshot: room.snapshotFor(waitingEntry.peer),
    reconnectToken,
  });
  room.broadcastDelta(S2C_DELTA.WAITING_REMOVED, { peerId });
  return { ok: true };
}

export async function handleHostDeny({ socket }, { peerId }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHostOrCohost(hostPeer);

  const waitingEntry = room.waiting.get(peerId);
  if (!waitingEntry) throw new AppError(404, ErrorCode.NOT_FOUND, 'No such waiting participant');

  room.removeFromWaiting(peerId);
  waitingEntry.socket.emit(S2C_TERMINAL.DENIED, {});
  waitingEntry.socket.disconnect(true);
  room.broadcastDelta(S2C_DELTA.WAITING_REMOVED, { peerId });
  return { ok: true };
}

export async function handleHostAdmitAll({ socket }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHostOrCohost(hostPeer);

  const entries = [...room.waiting.values()];
  for (const entry of entries) {
    room.removeFromWaiting(entry.peerId);
    await admitPeerIntoRoom(room, entry.peer, { admittedBy: hostPeer.id });
    const reconnectToken = await mintReconnectToken({
      pid: entry.peer.id,
      mid: room.meetingId,
      sid: room.sessionId,
    });
    entry.socket.emit(S2C_TERMINAL.ADMITTED, { snapshot: room.snapshotFor(entry.peer), reconnectToken });
  }
  return { admitted: entries.length };
}

async function pauseTargetKind(room, hostPeer, target, kind) {
  const entry = [...target.producers.values()].find((e) => e.kind === kind && !e.producer.closed);
  if (entry && !entry.paused) {
    await entry.producer.pause();
    entry.paused = true;
    room.broadcastDelta(
      S2C_DELTA.PRODUCER_PAUSED,
      { producerId: entry.producer.id, peerId: target.id },
      { audience: (p) => p.id !== target.id },
    );
  }
  if (kind === 'audio') target.state.micOn = false;
  else target.state.camOn = false;
  target.socket?.emit(S2C_MEDIA.HOST_MUTED, { kind, byPeerId: hostPeer.id });
  return !!entry;
}

export async function handleHostMute({ socket }, { peerId, kind }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHostOrCohost(hostPeer);

  const target = room.peers.get(peerId);
  if (!target) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown participant');

  await pauseTargetKind(room, hostPeer, target, kind);
  return { ok: true };
}

export async function handleHostMuteAll({ socket }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHostOrCohost(hostPeer);

  let muted = 0;
  for (const target of room.peers.values()) {
    if (target.id === hostPeer.id) continue;
    if (await pauseTargetKind(room, hostPeer, target, 'audio')) muted += 1;
  }
  return { muted };
}

export async function handleHostRemove({ socket, roomManager }, { peerId }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHostOrCohost(hostPeer);

  const target = room.peers.get(peerId);
  if (!target) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown participant');
  if (target.role === 'HOST' && hostPeer.role !== 'HOST') {
    throw new AppError(403, ErrorCode.FORBIDDEN_ROLE_ACTION, 'A cohost cannot remove the host');
  }

  await finalizeLeave({ room, roomManager, peer: target, notifyRemoved: true });
  return { ok: true };
}

export async function handleHostSetRole({ socket }, { peerId, role }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHost(hostPeer); // HOST only — a cohost cannot promote/demote (spec §4.7)

  if (peerId === hostPeer.id) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Cannot change your own role');
  }
  const target = room.peers.get(peerId);
  if (!target) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown participant');

  target.role = role;
  room.broadcastDelta(S2C_DELTA.PEER_UPDATED, { peerId: target.id, role });
  return { ok: true };
}

export async function handleHostSetFlag({ socket }, { flag, value }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHostOrCohost(hostPeer);

  // Held in room state only. Both flags describe a live call: locking is
  // transient, and the waiting room is a fixed policy for support groups
  // rather than something a facilitator opts into, so neither needs to
  // outlive the room. Serenite decides admission before minting a token and
  // is not consulting these.
  room.flags = { ...room.flags, [flag]: value };

  room.broadcastDelta(S2C_DELTA.ROOM_FLAGS, { flags: room.flags });
  return { ok: true };
}

export async function handleHostEnd({ socket, roomManager }) {
  const hostPeer = requirePeer(socket);
  const room = requireRoom(socket);
  requireHost(hostPeer); // HOST only — a cohost cannot end the meeting for all (spec §4.7)

  await roomManager.closeRoom(room, 'ended_by_host');
  return { ok: true };
}

export async function handleAskToUnmute({ socket }, { peerId }) {
  requirePeer(socket);
  const room = requireRoom(socket);

  const target = room.peers.get(peerId);
  if (!target) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown participant');

  target.socket?.emit(S2C_MEDIA.UNMUTE_REQUESTED, { fromPeerId: socket.data.peer.id });
  return { ok: true };
}
