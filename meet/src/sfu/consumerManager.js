import config from '../config/index.js';
import logger from '../lib/logger.js';
import { spatialLayerForWidth, MAX_SPATIAL_LAYER } from '#shared/media/profiles';
import { VIEWPORT_PREFETCH_CAP } from '#shared/signaling/schemas';
import { S2C_MEDIA } from '#shared/signaling/events';
import { attachConsumerScore } from './qualitySignals.js';

// Phase A spec §5.1. Split deliberately in two:
//   computeDesired  — pure, no mediasoup objects, exhaustively unit-testable
//   applyDiff       — effectful, does the actual consume()/pause()/close()
//
// video = visible ∪ prefetch(≤6) ∪ pinned ∪ screenShares ∪ dominantSpeaker − own
// audio = topN ∪ spokeWithin(SPOKE_RECENTLY_MS) ∪ pinned ∪ screenAudio − own

/**
 * @param {object} params
 * @param {string} params.ownPeerId
 * @param {Array<{peerId: string, producers: Array<{producerId: string, kind: 'audio'|'video', source: string}>}>} params.peers
 *   Roster of every peer in the room, own peer included (filtered out internally).
 * @param {{visible: Array<{producerId: string, width: number}>, prefetch: string[], pinned: string[]}} params.viewport
 * @param {string|null} params.dominantSpeakerId
 * @param {string[]} params.topSpeakingProducerIds - producer ids currently in the audio-level observer's top N
 * @param {Record<string, number>} params.lastSpokeAt - peerId -> epoch ms, peers who have ever spoken
 * @param {number} params.now - epoch ms
 * @param {number} [params.spokeRecentlyMs]
 * @param {0|1|2} [params.bandwidthLevel] - bandwidth governor degradation
 *   level (spec §5.5): 0 full, 1 drop prefetch + cap layers at 1, 2 video off.
 * @returns {{ video: Set<string>, audio: Set<string>, layers: Map<string, number> }}
 */
export function computeDesired({
  ownPeerId,
  peers,
  viewport,
  dominantSpeakerId,
  topSpeakingProducerIds,
  lastSpokeAt,
  now,
  spokeRecentlyMs = 30000,
  bandwidthLevel = 0,
}) {
  const others = peers.filter((p) => p.peerId !== ownPeerId);
  const producerIndex = new Map(); // producerId -> { peerId, kind, source }
  for (const p of others) {
    for (const prod of p.producers) {
      producerIndex.set(prod.producerId, { peerId: p.peerId, kind: prod.kind, source: prod.source });
    }
  }

  const camProducerIdByPeer = new Map();
  const audioProducerIdByPeer = new Map();
  const screenVideoProducerIds = new Set();
  const screenAudioProducerIds = new Set();
  for (const [producerId, info] of producerIndex) {
    if (info.source === 'cam') camProducerIdByPeer.set(info.peerId, producerId);
    if (info.source === 'mic') audioProducerIdByPeer.set(info.peerId, producerId);
    if (info.source === 'screen') screenVideoProducerIds.add(producerId);
    if (info.source === 'screenAudio') screenAudioProducerIds.add(producerId);
  }

  const pinnedPeerIds = new Set(viewport.pinned ?? []);
  const visibleEntries = viewport.visible ?? [];
  const visibleIds = new Set(visibleEntries.map((v) => v.producerId));
  const prefetchIds = new Set((viewport.prefetch ?? []).slice(0, VIEWPORT_PREFETCH_CAP));

  const video = new Set();
  const layers = new Map();

  for (const { producerId, width } of visibleEntries) {
    if (!producerIndex.has(producerId)) continue;
    video.add(producerId);
    layers.set(producerId, spatialLayerForWidth(width));
  }
  // Degradation ladder rung 1 (spec §5.5): shrink the visible tile count by
  // dropping speculative prefetch first — genuinely visible/pinned/spotlight
  // producers are untouched.
  if (bandwidthLevel < 1) {
    for (const producerId of prefetchIds) {
      if (!producerIndex.has(producerId)) continue;
      video.add(producerId);
      if (!layers.has(producerId)) layers.set(producerId, 0);
    }
  }
  for (const peerId of pinnedPeerIds) {
    const producerId = camProducerIdByPeer.get(peerId);
    if (producerId) {
      video.add(producerId);
      if (!layers.has(producerId)) layers.set(producerId, MAX_SPATIAL_LAYER);
    }
  }
  for (const producerId of screenVideoProducerIds) {
    video.add(producerId); // single-encoding; no spatial layer selection
  }
  if (dominantSpeakerId) {
    const producerId = camProducerIdByPeer.get(dominantSpeakerId);
    if (producerId) {
      video.add(producerId);
      if (!layers.has(producerId)) layers.set(producerId, MAX_SPATIAL_LAYER);
    }
  }

  const audio = new Set();
  for (const producerId of topSpeakingProducerIds ?? []) {
    if (producerIndex.has(producerId)) audio.add(producerId);
  }
  for (const [peerId, spokeAt] of Object.entries(lastSpokeAt ?? {})) {
    if (now - spokeAt > spokeRecentlyMs) continue;
    const producerId = audioProducerIdByPeer.get(peerId);
    if (producerId) audio.add(producerId);
  }
  for (const peerId of pinnedPeerIds) {
    const producerId = audioProducerIdByPeer.get(peerId);
    if (producerId) audio.add(producerId);
  }
  // Mirrors the video set's dominant-speaker inclusion above. Without this,
  // a peer's mic is only granted via the AudioLevelObserver's absolute
  // -60dBov threshold — but ActiveSpeakerObserver's dominance algorithm is
  // relative, not threshold-gated, so someone can legitimately win
  // "dominant speaker" (and be spotlighted in video) while never crossing
  // -60dBov, leaving them permanently inaudible to everyone else.
  if (dominantSpeakerId) {
    const producerId = audioProducerIdByPeer.get(dominantSpeakerId);
    if (producerId) audio.add(producerId);
  }
  for (const producerId of screenAudioProducerIds) {
    audio.add(producerId); // exempt from top-N gating (spec §5.4)
  }

  // Degradation ladder rung 1: cap every spatial layer at 1 (drop the
  // largest tiles first, keeping the spotlight legible but smaller).
  if (bandwidthLevel === 1) {
    for (const [producerId, layer] of layers) {
      layers.set(producerId, Math.min(layer, 1));
    }
  }

  // Degradation ladder rung 2 (spec §5.5 floor): audio-only. Screen shares
  // stay — losing the presentation entirely is a worse outcome than losing
  // camera tiles, and it's typically static content costing little bandwidth
  // relative to camera video.
  if (bandwidthLevel >= 2) {
    for (const producerId of [...video]) {
      if (screenVideoProducerIds.has(producerId)) continue;
      video.delete(producerId);
      layers.delete(producerId);
    }
  }

  return { video, audio, layers };
}

/**
 * Effectful half: diffs `desired` against `peer.consumers` and performs the
 * actual mediasoup calls. `peerProducerLookup(producerId)` resolves a
 * producer id to its live `{ peer, entry }` so a consumer can be created.
 *
 * @param {import('./peer.js').Peer} peer
 * @param {{ video: Set<string>, audio: Set<string>, layers: Map<string, number> }} desired
 * @param {(producerId: string) => { peer: import('./peer.js').Peer, entry: object } | null} peerProducerLookup
 * @param {import('mediasoup').types.Router} router
 */
export async function applyDiff(peer, desired, peerProducerLookup, router) {
  if (!peer.recvTransport || peer.recvTransport.closed) return;

  const desiredIds = new Set([...desired.video, ...desired.audio]);
  const now = Date.now();

  // Close/pause anything no longer desired.
  for (const [consumerId, entry] of [...peer.consumers]) {
    if (desiredIds.has(entry.producerId)) continue;
    if (entry.paused) {
      if (
        entry.lastPausedAt &&
        now - entry.lastPausedAt > config.meeting.consumerIdleCloseMs
      ) {
        entry.consumer.close();
        peer.consumers.delete(consumerId);
      }
      continue;
    }
    try {
      await entry.consumer.pause();
    } catch (err) {
      logger.warn('consumer pause failed', { error: err.message, consumerId });
    }
    entry.paused = true;
    entry.lastPausedAt = now;
  }

  // Resume or create everything desired.
  const existingByProducerId = new Map([...peer.consumers.values()].map((e) => [e.producerId, e]));
  for (const producerId of desiredIds) {
    const existing = existingByProducerId.get(producerId);
    if (existing) {
      if (existing.paused) {
        try {
          await existing.consumer.resume();
          existing.paused = false;
          existing.lastPausedAt = null;
        } catch (err) {
          logger.warn('consumer resume failed', { error: err.message, producerId });
        }
      }
      if (desired.layers.has(producerId)) {
        await setLayerSafely(existing.consumer, desired.layers.get(producerId));
      }
      continue;
    }

    const found = peerProducerLookup(producerId);
    if (!found) continue;
    const { entry: producerEntry } = found;
    if (producerEntry.producer.closed) continue;

    if (!router.canConsume({ producerId, rtpCapabilities: peer.rtpCapabilities })) continue;

    // Consumers are always created paused (spec §5.3) — the client resumes
    // once the track is attached, avoiding a black first second.
    const consumer = await peer.recvTransport.consume({
      producerId,
      rtpCapabilities: peer.rtpCapabilities,
      paused: true,
    });

    peer.consumers.set(consumer.id, {
      consumer,
      producerId,
      peerId: found.peer.id,
      kind: consumer.kind,
      source: producerEntry.source,
      paused: true,
      lastPausedAt: null,
    });

    if (desired.layers.has(producerId)) {
      await setLayerSafely(consumer, desired.layers.get(producerId));
    }

    attachConsumerScore(peer, consumer, found.peer.id);

    peer.socket?.emit(S2C_MEDIA.CONSUMER_NEW, {
      consumerId: consumer.id,
      producerId,
      peerId: found.peer.id,
      kind: consumer.kind,
      source: producerEntry.source,
      rtpParameters: consumer.rtpParameters,
      producerPaused: consumer.producerPaused,
    });
  }
}

async function setLayerSafely(consumer, spatialLayer) {
  if (consumer.kind !== 'video' || consumer.closed) return;
  try {
    await consumer.setPreferredLayers({ spatialLayer, temporalLayer: 2 });
  } catch (err) {
    // Screen-share (single-encoding) consumers reject layer selection —
    // expected, not an error worth logging above debug.
    logger.debug('setPreferredLayers skipped', { error: err.message, consumerId: consumer.id });
  }
}
