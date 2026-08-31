import os from 'node:os';
import * as mediasoup from 'mediasoup';
import config from '../config/index.js';
import logger from '../lib/logger.js';
import { ROUTER_MEDIA_CODECS } from '#shared/media/profiles';

// Phase A spec §3.2. Each worker gets exactly one WebRtcServer multiplexing
// all its transports over one UDP + one TCP port (architecture D9) — N
// workers means N ports, not an RTC port range.

function resolveWorkerCount() {
  if (config.mediasoup.workers === 'auto') {
    return Math.min(os.availableParallelism?.() ?? os.cpus().length, 8);
  }
  const n = Number(config.mediasoup.workers);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * @typedef {object} WorkerEntry
 * @property {import('mediasoup').types.Worker} worker
 * @property {import('mediasoup').types.WebRtcServer} webRtcServer
 * @property {number} id
 */

export class WorkerPool {
  /** @type {WorkerEntry[]} */
  #entries = [];
  /** @type {((entry: WorkerEntry) => void) | null} */
  onWorkerDied = null;

  async start() {
    const count = resolveWorkerCount();
    const basePort = config.mediasoup.rtcBasePort;
    // `WebRtcServer.listenInfos` does NOT auto-expand `ip: '0.0.0.0'` into
    // real local interface addresses the way older per-transport listenIps
    // did — confirmed by inspecting a live client's remote SDP, which showed
    // a literal `a=candidate ... 0.0.0.0 ...` line (unusable by the browser,
    // ICE checks never start). `ip` is only for binding; the ICE candidate
    // address always comes from `announcedAddress`. Production must set
    // MEDIASOUP_ANNOUNCED_ADDRESS explicitly — silently falling back there
    // would produce a deployment that looks fine but never actually
    // connects. Dev/test default to loopback so same-machine testing works
    // without configuration.
    const announcedAddress = config.mediasoup.announcedAddress || (config.isProduction ? undefined : '127.0.0.1');

    for (let i = 0; i < count; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoupLogLevel,
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      });

      const port = basePort + i;
      const webRtcServer = await worker.createWebRtcServer({
        listenInfos: [
          { protocol: 'udp', ip: '0.0.0.0', announcedAddress, port },
          { protocol: 'tcp', ip: '0.0.0.0', announcedAddress, port },
        ],
      });

      const entry = { worker, webRtcServer, id: i };
      worker.on('died', (err) => this.#handleWorkerDied(entry, err));
      this.#entries.push(entry);

      logger.info('mediasoup worker started', { workerId: i, pid: worker.pid, port });
    }

    return this;
  }

  #handleWorkerDied(entry, err) {
    // Unrecoverable in mediasoup: the worker process is gone. We cannot
    // revive it or migrate its routers' live transports elsewhere — every
    // room on this worker is lost. The caller (sfu/main.js) is responsible
    // for tearing those rooms down via onWorkerDied.
    logger.error('mediasoup worker died — unrecoverable', {
      workerId: entry.id,
      pid: entry.worker.pid,
      error: err?.message,
    });
    this.#entries = this.#entries.filter((e) => e !== entry);
    this.onWorkerDied?.(entry);
  }

  /** Least-loaded by total consumer count across the worker's routers, not room count. */
  async leastLoaded(consumerCountByWorkerId) {
    if (this.#entries.length === 0) {
      throw new Error('No mediasoup workers available');
    }
    let best = this.#entries[0];
    let bestLoad = consumerCountByWorkerId(best.id);
    for (const entry of this.#entries.slice(1)) {
      const load = consumerCountByWorkerId(entry.id);
      if (load < bestLoad) {
        best = entry;
        bestLoad = load;
      }
    }
    return best;
  }

  get(workerId) {
    return this.#entries.find((e) => e.id === workerId) ?? null;
  }

  get count() {
    return this.#entries.length;
  }

  async createRouter(workerId) {
    const entry = this.get(workerId);
    if (!entry) throw new Error(`Unknown worker id ${workerId}`);
    return entry.worker.createRouter({ mediaCodecs: ROUTER_MEDIA_CODECS });
  }

  /** Number of live workers, for the health endpoint. */
  size() {
    return this.#entries.length;
  }

  async close() {
    for (const entry of this.#entries) {
      entry.worker.close();
    }
    this.#entries = [];
  }
}
