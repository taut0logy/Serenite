import config from '../config/index.js';
import logger from '../lib/logger.js';
import { S2C_MEDIA } from '#shared/signaling/events';

// Phase A spec §5.4. Both observers watch producers, not consumers, so
// gating a consumer (top-N audio) never blinds speaker detection.

export async function createObservers(router) {
  const audioLevelObserver = await router.createAudioLevelObserver({
    maxEntries: config.meeting.audioTopN,
    threshold: -60,
    interval: 400,
  });
  const activeSpeakerObserver = await router.createActiveSpeakerObserver({ interval: 300 });
  return { audioLevelObserver, activeSpeakerObserver };
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

/**
 * Wires the room's observers to update `room.topSpeakingProducerIds`,
 * `room.lastSpokeAt`, and `room.dominantSpeakerId`, and invokes
 * `onChanged()` so the caller can re-run `consumerManager` for every peer —
 * gating sets and layers may now be stale.
 */
export function attachObserverHandlers(room, { onDominantSpeakerChanged, onChanged }) {
  room.audioLevelObserver.on('volumes', (volumes) => {
    const now = Date.now();
    const ids = new Set();
    const speakingPeerIds = new Set();
    for (const { producer } of volumes) {
      ids.add(producer.id);
      const peerId = producer.appData?.peerId;
      if (peerId) {
        room.lastSpokeAt.set(peerId, now);
        speakingPeerIds.add(peerId);
      }
    }
    // topSpeakingProducerIds directly gates the audio consumer set (spec
    // §5.1's "audio = topN ∪ spokeWithin(...)"); without re-running the
    // consumer diff on every membership change, a peer's mic is never
    // actually consumed by anyone else until they separately win the
    // (single-winner) dominant-speaker algorithm below — which may take far
    // longer than "started talking", or never happen at all in a room with
    // overlapping speech. Diffed against the previous set so this doesn't
    // fire on every 400ms observer tick, only on real membership changes.
    const changed = !setsEqual(ids, room.topSpeakingProducerIds);
    room.topSpeakingProducerIds = ids;
    // Per-tile "who's talking right now" — Meet/Zoom-style border
    // highlight, distinct from dominantSpeakerId (spotlight-layout target,
    // debounced/smoothed for that purpose). Best-effort, no rev — see
    // Room.broadcastMedia.
    room.broadcastMedia(S2C_MEDIA.AUDIO_LEVELS, { speakingPeerIds: [...speakingPeerIds] });
    if (changed) onChanged?.();
  });

  room.audioLevelObserver.on('silence', () => {
    room.topSpeakingProducerIds = new Set();
    room.broadcastMedia(S2C_MEDIA.AUDIO_LEVELS, { speakingPeerIds: [] });
  });

  room.activeSpeakerObserver.on('dominantspeaker', ({ producer }) => {
    const peerId = producer.appData?.peerId ?? null;
    if (peerId === room.dominantSpeakerId) return;
    room.dominantSpeakerId = peerId;
    logger.debug('dominant speaker changed', { meetingId: room.meetingId, peerId });
    room.emit('speaker:changed', { peerId });
    onDominantSpeakerChanged?.(peerId);
  });
}

/** Adds an audio producer to both observers. Screen-share audio is exempt (spec §5.4). */
export async function addProducerToObservers(room, producer) {
  if (producer.kind !== 'audio') return;
  if (producer.appData?.source === 'screenAudio') return;
  await room.audioLevelObserver.addProducer({ producerId: producer.id });
  await room.activeSpeakerObserver.addProducer({ producerId: producer.id });
}
