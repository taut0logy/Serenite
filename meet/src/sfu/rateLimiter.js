// Phase A spec §4.8. Per-socket token buckets, continuously refilled (no
// timers — refill amount is computed from elapsed time on each check, so an
// idle socket costs nothing).

export const BUCKETS = Object.freeze({
  chat: { capacity: 5, refillMs: 10_000 },
  reaction: { capacity: 10, refillMs: 10_000 },
  hand: { capacity: 10, refillMs: 10_000 },
  produce: { capacity: 10, refillMs: 60_000 },
  host: { capacity: 30, refillMs: 10_000 },
  viewport: { capacity: 10, refillMs: 1_000 },
});

export class RateLimiter {
  #buckets = new Map();

  /** @returns {boolean} true if the action is allowed (and a token was spent) */
  allow(bucketName, now = Date.now()) {
    const cfg = BUCKETS[bucketName];
    if (!cfg) return true;

    let bucket = this.#buckets.get(bucketName);
    if (!bucket) {
      bucket = { tokens: cfg.capacity, lastRefill: now };
      this.#buckets.set(bucketName, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    if (elapsed > 0) {
      bucket.tokens = Math.min(cfg.capacity, bucket.tokens + (elapsed / cfg.refillMs) * cfg.capacity);
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }
}
