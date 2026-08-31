import config from '../config/index.js';
import logger from '../lib/logger.js';

// Phase A spec §3.3 / architecture §6.2. One router per meeting, refcounted,
// placed on the least-loaded worker. Closing is delayed by a grace window so
// a lone participant's WiFi blip does not destroy the room they're about to
// return to.

/**
 * @typedef {object} RouterEntry
 * @property {import('mediasoup').types.Router} router
 * @property {number} workerId
 * @property {number} refcount
 * @property {NodeJS.Timeout | null} closeTimer
 */

export class RouterRegistry {
  /** @param {import('./workerPool.js').WorkerPool} workerPool */
  constructor(workerPool) {
    this.workerPool = workerPool;
    /** @type {Map<string, RouterEntry>} */
    this.entries = new Map();
  }

  /** Total consumer count across a worker's routers — the load-balancing metric. */
  #consumerCountForWorker(workerId) {
    let total = 0;
    for (const entry of this.entries.values()) {
      if (entry.workerId === workerId) {
        // Router itself doesn't expose consumer count directly; callers
        // (room.js) report it via `reportLoad` so this stays O(1) instead of
        // walking every transport on every acquire.
        total += entry.loadHint ?? 0;
      }
    }
    return total;
  }

  /**
   * Returns the existing router for a meeting, or creates one on the
   * least-loaded worker. Cancels any pending close timer.
   */
  async acquireRouterFor(meetingId) {
    const existing = this.entries.get(meetingId);
    if (existing) {
      if (existing.closeTimer) {
        clearTimeout(existing.closeTimer);
        existing.closeTimer = null;
      }
      existing.refcount += 1;
      return { router: existing.router, workerId: existing.workerId };
    }

    const workerEntry = await this.workerPool.leastLoaded((id) => this.#consumerCountForWorker(id));
    const router = await this.workerPool.createRouter(workerEntry.id);

    const entry = { router, workerId: workerEntry.id, refcount: 1, closeTimer: null, loadHint: 0 };
    this.entries.set(meetingId, entry);
    logger.info('router acquired', { meetingId, workerId: workerEntry.id });
    return { router, workerId: workerEntry.id };
  }

  /** Lets the load-balancing metric reflect a room's current consumer count. */
  reportLoad(meetingId, consumerCount) {
    const entry = this.entries.get(meetingId);
    if (entry) entry.loadHint = consumerCount;
  }

  /**
   * Decrements refcount; when it reaches zero, starts a grace-window close
   * timer instead of closing immediately.
   */
  releaseRouter(meetingId) {
    const entry = this.entries.get(meetingId);
    if (!entry) return;
    entry.refcount = Math.max(0, entry.refcount - 1);
    if (entry.refcount > 0) return;

    const delay = config.meeting.peerReconnectGraceMs + 5000;
    entry.closeTimer = setTimeout(() => this.#closeRouter(meetingId), delay);
    entry.closeTimer.unref?.();
  }

  #closeRouter(meetingId) {
    const entry = this.entries.get(meetingId);
    if (!entry || entry.refcount > 0) return;
    entry.router.close();
    this.entries.delete(meetingId);
    logger.info('router closed', { meetingId, workerId: entry.workerId });
  }

  /** Immediate teardown, used when the worker holding this router has died. */
  forceCloseRoutersOnWorker(workerId) {
    const closed = [];
    for (const [meetingId, entry] of this.entries) {
      if (entry.workerId !== workerId) continue;
      if (entry.closeTimer) clearTimeout(entry.closeTimer);
      // The worker is already dead; its router is unusable but calling
      // .close() on an already-gone worker's router is a harmless no-op in
      // mediasoup (it just marks local state closed).
      this.entries.delete(meetingId);
      closed.push(meetingId);
    }
    return closed;
  }

  get(meetingId) {
    return this.entries.get(meetingId) ?? null;
  }
}
