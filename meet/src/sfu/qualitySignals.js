import { S2C_MEDIA } from '#shared/signaling/events';

// Phase A spec §5.6. mediasoup scores run 0 (unusable) to 10 (perfect).
// `consumer.on('score')` drives the *receiving* peer's signal bars for one
// remote participant; `producer.on('score')` drives a self-facing "your
// connection is unstable" advisory. Both watch for a few consecutive bad
// samples rather than reacting to a single blip — scores are noisy at the
// per-interval level.

const LOW_SCORE_THRESHOLD = 5;
const CONSECUTIVE_SAMPLES_TO_FLIP = 3;

/** Forwards a consumer's own RTP-stream score to the peer that owns it, for that tile's signal bars. */
export function attachConsumerScore(peer, consumer, remotePeerId) {
  consumer.on('score', (consumerScore) => {
    peer.socket?.emit(S2C_MEDIA.CONSUMER_SCORE, {
      consumerId: consumer.id,
      peerId: remotePeerId,
      score: consumerScore.score,
    });
  });
}

/** Debounced "your connection is unstable" advisory for the producing peer. */
export function attachProducerScore(peer, producer) {
  let consecutiveLow = 0;
  let consecutiveGood = 0;
  let advised = false;

  producer.on('score', (scores) => {
    if (scores.length === 0) return;
    const worst = Math.min(...scores.map((s) => s.score));

    if (worst <= LOW_SCORE_THRESHOLD) {
      consecutiveLow += 1;
      consecutiveGood = 0;
    } else {
      consecutiveGood += 1;
      consecutiveLow = 0;
    }

    if (!advised && consecutiveLow >= CONSECUTIVE_SAMPLES_TO_FLIP) {
      advised = true;
      peer.socket?.emit(S2C_MEDIA.QUALITY_ADVICE, { producerId: producer.id, kind: producer.kind, unstable: true });
    } else if (advised && consecutiveGood >= CONSECUTIVE_SAMPLES_TO_FLIP) {
      advised = false;
      peer.socket?.emit(S2C_MEDIA.QUALITY_ADVICE, { producerId: producer.id, kind: producer.kind, unstable: false });
    }
  });
}
