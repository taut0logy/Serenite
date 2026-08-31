import { C2S } from '@/lib/meeting/shared/signaling/events';
import { call } from '../signaling/rpc.js';

// Phase A spec §5.3. Consumers are always created paused server-side; the
// client resumes only after the track is attached to a media element, so
// the first keyframe doesn't arrive before anything is rendering it.
export async function consumeRemote(recvTransport, socket, { consumerId, producerId, kind, rtpParameters }) {
  const consumer = await recvTransport.consume({
    id: consumerId,
    producerId,
    kind,
    rtpParameters,
  });
  return consumer;
}

export async function resumeConsumer(socket, consumerId) {
  await call(socket, C2S.RESUME_CONSUMER, { consumerId });
}
