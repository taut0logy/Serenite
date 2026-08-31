import { createWebRtcTransport as createTransport } from '../../sfu/transportFactory.js';
import { attachBandwidthGovernor } from '../../sfu/bandwidthGovernor.js';
import { AppError } from '../../lib/errors.js';
import { ErrorCode } from '#shared/enums';
import { requirePeer } from './util.js';

// Phase A spec §4.2. `createWebRtcTransport` is called once per direction by
// the client after `join` succeeds.

function findTransport(peer, transportId) {
  if (peer.sendTransport?.id === transportId) return peer.sendTransport;
  if (peer.recvTransport?.id === transportId) return peer.recvTransport;
  return null;
}

export async function handleCreateWebRtcTransport({ socket, roomManager }, { direction }) {
  const peer = requirePeer(socket);
  const room = socket.data.room;

  const transport = await createTransport({ room, workerPool: roomManager.workerPool, direction });
  if (direction === 'send') {
    peer.sendTransport = transport;
  } else {
    peer.recvTransport = transport;
    attachBandwidthGovernor(peer, room, roomManager);
  }

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

export async function handleConnectTransport({ socket }, { transportId, dtlsParameters }) {
  const peer = requirePeer(socket);
  const transport = findTransport(peer, transportId);
  if (!transport) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown transport');
  await transport.connect({ dtlsParameters });
  return { ok: true };
}

export async function handleRestartIce({ socket }, { transportId }) {
  const peer = requirePeer(socket);
  const transport = findTransport(peer, transportId);
  if (!transport) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown transport');
  const iceParameters = await transport.restartIce();
  return { iceParameters };
}

