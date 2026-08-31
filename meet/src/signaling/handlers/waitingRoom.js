import { randomUUID } from 'node:crypto';
import config from '../../config/index.js';
import { Peer } from '../../sfu/peer.js';
import { recordParticipation } from '../../sfu/sessionLog.js';
import { mintReconnectToken } from '../../auth/joinToken.js';
import { AppError } from '../../lib/errors.js';
import { ErrorCode } from '#shared/enums';
import { S2C_DELTA, S2C_TERMINAL } from '#shared/signaling/events';
import logger from '../../lib/logger.js';

// `join` covers a brand-new peer and a reloaded-page reconnect (resume: false); 
// `roomSync` covers both a genuine rev-gap resync and the resume: true reattachment.

function userAndGuestId(sub) {
  return sub.startsWith('guest_') ? { userId: null, guestId: sub } : { userId: sub, guestId: null };
}

/**
 * Adds an admitted peer to the room: roster entry, Participation row,
 * `peer:joined` broadcast. Shared by a direct join and `host:admit`.
 */
export async function admitPeerIntoRoom(room, peer, { admittedBy }) {
  room.addPeer(peer);
  peer.admittedBy = admittedBy;
  // Keyed on the member's auth session, which the join token carries, so
  // attendance is per device and matches the unique constraint Serenite
  // already places on (meetingId, sessionId).
  peer.participationId = await recordParticipation({
    meetingId: room.meetingId,
    authSessionId: peer.authSessionId,
    userId: peer.userId,
  });
  room.broadcastDelta(S2C_DELTA.PEER_JOINED, { peer: peer.summary() }, { audience: (p) => p.id !== peer.id });
}

export async function handleJoin({ socket, roomManager }, payload) {
  const auth = socket.data.auth;

  if (auth.kind === 'reconnect') {
    if (auth.resume) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'resume:true reconnects use room:sync, not join');
    }
    return handlePageReloadReconnect({ socket, roomManager }, payload, auth);
  }

  const { userId, guestId } = userAndGuestId(auth.sub);

  if (config.meeting.singleMeetingEnabled && roomManager.findActivePeerForUser(userId)) {
    throw new AppError(409, ErrorCode.ALREADY_IN_MEETING, 'This account is already active in another meeting');
  }

  const room = await roomManager.getOrCreateRoom(auth.meetingId);

  const peer = new Peer({
    id: randomUUID(),
    userId,
    guestId,
    displayName: auth.name,
    avatarUrl: auth.avatar,
    role: auth.role,
  });
  peer.authSessionId = auth.authSessionId;
  peer.rtpCapabilities = payload.rtpCapabilities;
  peer.socket = socket;
  if (room.flags.muteOnEntry) peer.state.micOn = false;
  if (room.flags.cameraOffOnEntry) peer.state.camOn = false;

  socket.data.room = room;
  socket.data.peer = peer;

  if (auth.approve) {
    room.addToWaiting({
      peerId: peer.id,
      displayName: peer.displayName,
      avatarUrl: peer.avatarUrl,
      socket,
      at: Date.now(),
      role: peer.role,
      peer,
    });
    room.broadcastToWaitingHosts(S2C_DELTA.WAITING_ADDED, {
      peerId: peer.id,
      displayName: peer.displayName,
      avatarUrl: peer.avatarUrl,
      at: Date.now(),
    });
    logger.info('peer waiting for admission', { meetingId: room.meetingId, peerId: peer.id });
    return { waiting: true, peerId: peer.id };
  }

  await admitPeerIntoRoom(room, peer, { admittedBy: null });
  const reconnectToken = await mintReconnectToken({ pid: peer.id, mid: room.meetingId, sid: room.sessionId });
  return { peerId: peer.id, reconnectToken, snapshot: room.snapshotFor(peer) };
}

async function handlePageReloadReconnect({ socket, roomManager }, payload, auth) {
  const room = roomManager.getRoom(auth.meetingId);
  const peer = room?.peers.get(auth.peerId);
  if (!room || !peer) {
    throw new AppError(410, ErrorCode.RECONNECT_TOKEN_INVALID, 'This meeting session no longer exists');
  }

  if (peer.reconnectTimer) {
    clearTimeout(peer.reconnectTimer);
    peer.reconnectTimer = null;
  }
  // The browser's RTCPeerConnections are gone after a reload — DTLS is dead,
  // so reattaching to the old server-side transports would leave media
  // silently broken (spec A9). Close and let the client rebuild.
  await peer.closeMediaState();

  peer.rtpCapabilities = payload.rtpCapabilities;
  peer.socket = socket;
  peer.state.connected = true;

  socket.data.room = room;
  socket.data.peer = peer;

  room.broadcastDelta(
    S2C_DELTA.PEER_UPDATED,
    { peerId: peer.id, connected: true },
    { audience: (p) => p.id !== peer.id },
  );

  const reconnectToken = await mintReconnectToken({ pid: peer.id, mid: room.meetingId, sid: room.sessionId });
  return { peerId: peer.id, reconnectToken, snapshot: room.snapshotFor(peer) };
}

export async function handleRoomSync({ socket, roomManager }) {
  if (socket.data.room && socket.data.peer) {
    return { snapshot: socket.data.room.snapshotFor(socket.data.peer) };
  }

  const auth = socket.data.auth;
  if (auth.kind !== 'reconnect' || !auth.resume) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Not yet joined');
  }

  const room = roomManager.getRoom(auth.meetingId);
  const peer = room?.peers.get(auth.peerId);
  if (!room || !peer) {
    throw new AppError(410, ErrorCode.RECONNECT_TOKEN_INVALID, 'This meeting session no longer exists');
  }

  if (peer.reconnectTimer) {
    clearTimeout(peer.reconnectTimer);
    peer.reconnectTimer = null;
  }
  peer.socket = socket;
  peer.state.connected = true;
  socket.data.room = room;
  socket.data.peer = peer;

  room.broadcastDelta(
    S2C_DELTA.PEER_UPDATED,
    { peerId: peer.id, connected: true },
    { audience: (p) => p.id !== peer.id },
  );

  // `peer.viewport` was never cleared during the disconnect (only `socket`
  // went null), so re-running the diff against it now reconciles anything
  // that changed room membership while this peer was away — no client-side
  // re-report needed.
  await roomManager.refreshPeerConsumers(room, peer);

  logger.info('peer resumed after socket drop', { meetingId: room.meetingId, peerId: peer.id });
  return { snapshot: room.snapshotFor(peer) };
}
