import logger from '../lib/logger.js';
import { S2C_MEDIA } from '#shared/signaling/events';

// Phase A spec §5.5. `TransportTraceEventData.info` is typed `unknown` in
// mediasoup 3.24.0. Verified against a real live 'bwe' trace event captured
// from an actual Playwright run (2026-08-06):
//   { desiredBitrate, effectiveDesiredBitrate, minBitrate, maxBitrate,
//     startBitrate, maxPaddingBitrate, availableBitrate, bweType }
// `availableBitrate` is the field this module reads — confirmed present and
// numeric in the real event, not assumed from memory.
// Degradation ladder: drop prefetch (rung 1) → cap layers at 1 (also rung
// 1, applied together in consumerManager) → audio-only (rung 2). Recovery
// is hysteretic: an upgrade only happens after the estimate holds above the
// better rung's threshold for RECOVERY_HOLD_MS, so the grid doesn't
// oscillate. Degrading is immediate — protecting the call matters more than
// avoiding a flicker.

const THRESHOLDS_BPS = {
  toLevel1: 600_000,
  toLevel2: 150_000,
};
const RECOVERY_HOLD_MS = 5000;

export function extractAvailableBitrate(info) {
  if (!info || typeof info !== 'object') return null;
  if (typeof info.availableBitrate === 'number') return info.availableBitrate;
  if (typeof info.desiredBitrate === 'number') return info.desiredBitrate;
  return null;
}

export function levelForBitrate(bps) {
  if (bps < THRESHOLDS_BPS.toLevel2) return 2;
  if (bps < THRESHOLDS_BPS.toLevel1) return 1;
  return 0;
}

export function attachBandwidthGovernor(peer, room, roomManager) {
  const transport = peer.recvTransport;
  if (!transport) return;

  let loggedFirstEvent = false;
  let goodSince = null;

  transport.on('trace', (event) => {
    if (event.type !== 'bwe') return;
    if (!loggedFirstEvent) {
      loggedFirstEvent = true;
      logger.debug('first bwe trace event received', { peerId: peer.id, info: event.info });
    }

    const bps = extractAvailableBitrate(event.info);
    if (bps == null) return; // shape didn't match any known field — never act on a guess

    const targetLevel = levelForBitrate(bps);

    // Uses the event's own timestamp for the hysteresis clock, not wall
    // clock — keeps the window meaningful even if event processing itself
    // lags, and makes the state machine deterministically testable.
    const eventTime = typeof event.timestamp === 'number' ? event.timestamp : Date.now();

    if (targetLevel > peer.bandwidthLevel) {
      setLevel(peer, room, roomManager, targetLevel);
      goodSince = null;
    } else if (targetLevel < peer.bandwidthLevel) {
      if (goodSince == null) goodSince = eventTime;
      if (eventTime - goodSince >= RECOVERY_HOLD_MS) {
        setLevel(peer, room, roomManager, targetLevel);
        goodSince = null;
      }
    } else {
      goodSince = null;
    }
  });
}

function setLevel(peer, room, roomManager, level) {
  if (peer.bandwidthLevel === level) return;
  logger.info('bandwidth level changed', { peerId: peer.id, from: peer.bandwidthLevel, to: level });
  peer.bandwidthLevel = level;
  peer.bandwidthLevelSince = Date.now();
  roomManager
    .refreshPeerConsumers(room, peer)
    .catch((err) => logger.warn('consumer refresh after bandwidth change failed', { peerId: peer.id, error: err.message }));
  peer.socket?.emit(S2C_MEDIA.QUALITY_ADVICE, { level, reason: level > 0 ? 'low_bandwidth' : 'recovered' });
}
