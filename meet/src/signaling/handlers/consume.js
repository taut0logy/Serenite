import { AppError } from '../../lib/errors.js';
import { ErrorCode } from '#shared/enums';
import { requirePeer } from './util.js';

// Phase A spec §5.3 — consumers are always created paused; the client
// resumes once the track is attached to a media element.

export async function handleResumeConsumer({ socket }, { consumerId }) {
  const peer = requirePeer(socket);
  const entry = peer.consumers.get(consumerId);
  if (!entry) throw new AppError(404, ErrorCode.NOT_FOUND, 'Unknown consumer');

  await entry.consumer.resume();
  entry.paused = false;
  entry.lastPausedAt = null;
  return { ok: true };
}
