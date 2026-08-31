import { C2S } from '@/lib/meeting/shared/signaling/events';
import { call } from '../signaling/rpc.js';

// Phase A spec §6.3. mediasoup-client's transport 'connect' and 'produce'
// events are how it asks the server to actually do those things — the
// server-side createWebRtcTransport/produce round trip happens inside these
// callbacks, not before the transport object exists.

export function wireSendTransport(transport, socket) {
  transport.on('connect', ({ dtlsParameters }, callback, errback) => {
    call(socket, C2S.CONNECT_TRANSPORT, { transportId: transport.id, dtlsParameters })
      .then(() => callback())
      .catch(errback);
  });

  transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
    call(socket, C2S.PRODUCE, { transportId: transport.id, kind, rtpParameters, source: appData.source })
      .then(({ producerId }) => callback({ id: producerId }))
      .catch(errback);
  });

  return transport;
}

export function wireRecvTransport(transport, socket) {
  transport.on('connect', ({ dtlsParameters }, callback, errback) => {
    call(socket, C2S.CONNECT_TRANSPORT, { transportId: transport.id, dtlsParameters })
      .then(() => callback())
      .catch(errback);
  });
  return transport;
}

export async function createTransports(device, socket) {
  const sendParams = await call(socket, C2S.CREATE_WEBRTC_TRANSPORT, { direction: 'send' });
  const sendTransport = wireSendTransport(device.createSendTransport(sendParams), socket);

  const recvParams = await call(socket, C2S.CREATE_WEBRTC_TRANSPORT, { direction: 'recv' });
  const recvTransport = wireRecvTransport(device.createRecvTransport(recvParams), socket);

  return { sendTransport, recvTransport };
}
