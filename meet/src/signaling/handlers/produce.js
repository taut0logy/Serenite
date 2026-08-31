import config from '../../config/index.js';
import { AppError } from '../../lib/errors.js';
import { ErrorCode } from '#shared/enums';
import { S2C_DELTA } from '#shared/signaling/events';
import { addProducerToObservers } from '../../sfu/speakerDetector.js';
import { attachProducerScore } from '../../sfu/qualitySignals.js';
import { requirePeer, requireRoom } from './util.js';

// Phase A spec §4.9 — `produce` is the single choke point for media policy.

function countActiveScreenPresenters(room) {
  const presenters = new Set();
  for (const peer of room.peers.values()) {
    for (const entry of peer.producers.values()) {
      if (entry.source === 'screen' && !entry.producer.closed) presenters.add(peer.id);
    }
  }
  return presenters.size;
}

export async function handleProduce({ socket, roomManager }, { transportId, kind, rtpParameters, source }) {
  const peer = requirePeer(socket);
  const room = requireRoom(socket);

  if (room.peers.size > config.meeting.maxParticipants) {
    throw new AppError(403, ErrorCode.ROOM_FULL, 'Meeting is full');
  }

  if (source === 'screen' || source === 'screenAudio') {
    if (!room.flags.allowScreenShare) {
      throw new AppError(403, ErrorCode.SCREEN_SHARE_DISABLED, 'Screen sharing is disabled by the host');
    }
    if (source === 'screen' && countActiveScreenPresenters(room) >= config.meeting.screenShareMaxConcurrent) {
      throw new AppError(409, ErrorCode.SCREEN_SHARE_LIMIT_REACHED, 'Too many active screen shares');
    }
  }

  const alreadyHasSource = [...peer.producers.values()].some((e) => e.source === source && !e.producer.closed);
  if (alreadyHasSource) {
    throw new AppError(409, ErrorCode.DUPLICATE_PRODUCER_SOURCE, `Already producing ${source}`);
  }

  const transport = peer.sendTransport;
  if (!transport || transport.id !== transportId) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown send transport');
  }

  const producer = await transport.produce({
    kind,
    rtpParameters,
    appData: { peerId: peer.id, source },
  });
  peer.producers.set(producer.id, { producer, kind, source, paused: false });
  if (source === 'screen') peer.state.sharing = true;

  await addProducerToObservers(room, producer);
  attachProducerScore(peer, producer);

  room.broadcastDelta(
    S2C_DELTA.PRODUCER_NEW,
    { producerId: producer.id, peerId: peer.id, kind, source, paused: false },
    { audience: (p) => p.id !== peer.id },
  );
  room.emit('producer:new', { peerId: peer.id, producer, source });

  await roomManager.refreshAllPeersConsumers(room);

  return { producerId: producer.id };
}

export async function handlePauseProducer({ socket }, { producerId }) {
  const peer = requirePeer(socket);
  const room = requireRoom(socket);
  const entry = peer.producers.get(producerId);
  if (!entry) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown producer');

  await entry.producer.pause();
  entry.paused = true;
  room.broadcastDelta(
    S2C_DELTA.PRODUCER_PAUSED,
    { producerId, peerId: peer.id },
    { audience: (p) => p.id !== peer.id },
  );
  // PRODUCER_PAUSED alone only patches producers[producerId] client-side —
  // participant-tile.jsx's mic icon reads peer.micOn (the Peer *summary*
  // field), which this never touched, so a self-initiated mute/unmute was
  // never visible on anyone else's tile. host.js's host-mute path already
  // updates this same field; self-mute needs to as well.
  if (entry.kind === 'audio') {
    peer.state.micOn = false;
    room.broadcastDelta(S2C_DELTA.PEER_UPDATED, { peerId: peer.id, micOn: false });
  }
  room.emit('producer:paused', { peerId: peer.id, producerId });
  return { ok: true };
}

export async function handleResumeProducer({ socket }, { producerId }) {
  const peer = requirePeer(socket);
  const room = requireRoom(socket);
  const entry = peer.producers.get(producerId);
  if (!entry) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown producer');

  await entry.producer.resume();
  entry.paused = false;
  room.broadcastDelta(
    S2C_DELTA.PRODUCER_RESUMED,
    { producerId, peerId: peer.id },
    { audience: (p) => p.id !== peer.id },
  );
  if (entry.kind === 'audio') {
    peer.state.micOn = true;
    room.broadcastDelta(S2C_DELTA.PEER_UPDATED, { peerId: peer.id, micOn: true });
  }
  room.emit('producer:resumed', { peerId: peer.id, producerId });
  return { ok: true };
}

export async function handleCloseProducer({ socket, roomManager }, { producerId }) {
  const peer = requirePeer(socket);
  const room = requireRoom(socket);
  const entry = peer.producers.get(producerId);
  if (!entry) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown producer');

  if (!entry.producer.closed) entry.producer.close();
  peer.producers.delete(producerId);
  if (entry.source === 'screen') {
    peer.state.sharing = [...peer.producers.values()].some((e) => e.source === 'screen');
  }

  room.broadcastDelta(
    S2C_DELTA.PRODUCER_CLOSED,
    { producerId, peerId: peer.id },
    { audience: (p) => p.id !== peer.id },
  );
  room.emit('producer:closed', { peerId: peer.id, producerId });
  await roomManager.retireProducerEverywhere(room, producerId);
  await roomManager.refreshAllPeersConsumers(room);
  return { ok: true };
}
