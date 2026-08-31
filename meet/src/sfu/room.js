import { EventEmitter } from 'node:events';
import logger from '../lib/logger.js';

// Phase A spec §3.4. Per-meeting state: peers, waiting queue, room flags, the
// two audio observers, and the `rev` counter that makes every state delta
// self-describing (spec §4.5).
//
// Also an EventEmitter (Phase C spec §3.3) — emits producer:new,
// producer:closed, producer:paused, producer:resumed, speaker:changed,
// closing (see close()'s comment — fires before teardown, while RTP is
// still live), and closed (after teardown). The Phase C recorder is the
// only subscriber; nothing in sfu/ or signaling/ imports from
// server/src/recorder, keeping the promise from architecture §6.3 real:
// "the SFU has zero knowledge that recording exists."

export class Room extends EventEmitter {
  constructor({ meetingId, code, title, router, workerId, sessionId, isRecurring, flags }) {
    super();
    this.meetingId = meetingId;
    this.code = code;
    this.title = title;
    this.router = router;
    this.workerId = workerId;
    this.sessionId = sessionId;
    this.isRecurring = isRecurring;

    this.rev = 0;
    /** @type {Map<string, import('./peer.js').Peer>} */
    this.peers = new Map();
    /** @type {Map<string, { peerId: string, displayName: string, avatarUrl: string|null, socket: import('socket.io').Socket, at: number, role: string }>} */
    this.waiting = new Map();
    this.chat = [];
    this.flags = flags;

    this.audioLevelObserver = null;
    this.activeSpeakerObserver = null;
    this.dominantSpeakerId = null;
    /** @type {Set<string>} producer ids currently in the audio-level observer's top N */
    this.topSpeakingProducerIds = new Set();
    /** @type {Map<string, number>} peerId -> epoch ms last spoke */
    this.lastSpokeAt = new Map();

    this.peakParticipants = 0;

    // Duration enforcement (SCHEDULED meetings only) — set by roomManager
    // right after construction, cleared in close() so a room that ends
    // early (host ends it, everyone leaves) doesn't leave a dangling timer
    // that fires against an already-closed room. scheduledEndsAt/
    // durationWarningMs are also read by snapshotFor so a peer joining
    // *after* the warning broadcast already fired (or even, for a
    // meeting created right at the warning floor, racing ahead of it —
    // getOrCreateRoom runs before the joining peer is added to the room)
    // still sees the banner immediately, rather than only whoever
    // happened to be connected at the exact moment the one-shot broadcast
    // went out.
    this.durationWarnTimer = null;
    this.durationEndTimer = null;
    this.scheduledEndsAt = null;
    this.durationWarningMs = 0;

    // Phase C spec §5. Not persisted here — recordingStore.js/Postgres is
    // the source of truth for the Recording row itself (decision C8); this
    // is just the in-memory mirror the signaling layer broadcasts as deltas
    // and includes in the join snapshot.
    this.recording = { active: false, startedAt: null, startedBy: null, recordingId: null };
  }

  static buildFlagsFromMeeting(meeting) {
    return {
      allowChat: true,
      allowScreenShare: true,
      allowReactions: true,
      allowUnmute: true,
      waitingRoom: meeting.waitingRoom,
      locked: !!meeting.lockedAt,
      muteOnEntry: meeting.muteOnEntry,
      cameraOffOnEntry: meeting.cameraOffOnEntry,
    };
  }

  totalConsumerCount() {
    let total = 0;
    for (const peer of this.peers.values()) total += peer.consumers.size;
    return total;
  }

  connectedPeerCount() {
    let total = 0;
    for (const peer of this.peers.values()) if (peer.state.connected) total += 1;
    return total;
  }

  hostsAndCohosts() {
    return [...this.peers.values()].filter((p) => p.socket && p.isHostOrCohost());
  }

  addPeer(peer) {
    this.peers.set(peer.id, peer);
    this.peakParticipants = Math.max(this.peakParticipants, this.peers.size);
  }

  removePeer(peerId) {
    this.peers.delete(peerId);
  }

  addToWaiting(entry) {
    this.waiting.set(entry.peerId, entry);
  }

  removeFromWaiting(peerId) {
    this.waiting.delete(peerId);
  }

  /** Delivers a state delta with the next `rev`. `audience` optionally filters recipients. */
  broadcastDelta(event, payload, { audience } = {}) {
    this.rev += 1;
    const body = { ...payload, rev: this.rev };
    for (const peer of this.peers.values()) {
      if (!peer.socket) continue;
      if (audience && !audience(peer)) continue;
      peer.socket.emit(event, body);
    }
    return body;
  }

  /**
   * Room-wide media broadcast, no `rev` — for fast-changing, best-effort
   * signals (like per-peer speaking state) that don't need resync
   * guarantees the way room state deltas do; bumping `rev` for every one
   * of these would make the resync-on-gap logic fire constantly for data
   * nobody needs strict ordering on.
   */
  broadcastMedia(event, payload) {
    for (const peer of this.peers.values()) {
      peer.socket?.emit(event, payload);
    }
  }

  /** Per-peer media events carry no `rev` (spec §4.3) and target one socket. */
  sendToPeer(peerId, event, payload) {
    const peer = this.peers.get(peerId);
    peer?.socket?.emit(event, payload);
  }

  broadcastToWaitingHosts(event, payload) {
    for (const host of this.hostsAndCohosts()) {
      host.socket.emit(event, payload);
    }
  }

  snapshotFor(peer) {
    const isHost = peer.isHostOrCohost();
    return {
      rev: this.rev,
      meeting: { id: this.meetingId, code: this.code, title: this.title },
      self: { peerId: peer.id, role: peer.role, micOn: peer.state.micOn, camOn: peer.state.camOn },
      flags: this.flags,
      peers: [...this.peers.values()].map((p) => p.summary()),
      producers: [...this.peers.values()].flatMap((p) =>
        [...p.producers.values()].map((entry) => ({
          producerId: entry.producer.id,
          peerId: p.id,
          kind: entry.kind,
          source: entry.source,
          paused: entry.paused,
        })),
      ),
      chat: this.chat,
      recording: { active: this.recording.active, startedAt: this.recording.startedAt, startedBy: this.recording.startedBy },
      waiting: isHost
        ? [...this.waiting.values()].map((w) => ({
            peerId: w.peerId,
            displayName: w.displayName,
            avatarUrl: w.avatarUrl,
            at: w.at,
          }))
        : [],
      dominantSpeakerId: this.dominantSpeakerId,
      durationWarning:
        this.scheduledEndsAt && this.scheduledEndsAt.getTime() - Date.now() <= this.durationWarningMs
          ? { endsAt: this.scheduledEndsAt.toISOString() }
          : null,
    };
  }

  /**
   * Tears down all peer/waiting state and the audio observers. Does NOT
   * close `this.router` — router lifecycle (refcount + its own grace window)
   * is owned by `routerRegistry.releaseRouter`, called separately by
   * `roomManager` once this resolves (spec §3.3 vs §3.6 are deliberately
   * two different grace periods: a peer's socket-drop grace vs. the
   * router's last-peer-left grace).
   */
  async close() {
    // Fired before any teardown, while every producer's RTP is still
    // flowing — the recorder's CaptureSession is the reason this exists.
    // A capture's ffmpeg can only respond to its graceful 'q' stdin
    // quit-command while its RTP read loop is still getting scheduled; once
    // the source producer actually closes (a few lines below) ffmpeg is
    // blocked on a now-silent UDP socket and never notices 'q' at all,
    // falling through to a 5s SIGKILL that discards whatever hadn't been
    // flushed to disk yet — confirmed live: killing a capture that way
    // produced a corrupt/truncated file even though real RTP had been
    // captured for over a second. Giving CaptureSession this earlier signal
    // lets its captures quit cleanly *before* their source disappears,
    // instead of racing a dead socket. `closed` (below, after teardown)
    // keeps its existing "everything is actually gone" meaning for any
    // other subscriber.
    this.emit('closing', {});

    if (this.durationWarnTimer) clearTimeout(this.durationWarnTimer);
    if (this.durationEndTimer) clearTimeout(this.durationEndTimer);
    this.durationWarnTimer = null;
    this.durationEndTimer = null;
    for (const entry of this.waiting.values()) {
      entry.socket?.disconnect(true);
    }
    this.waiting.clear();
    for (const peer of this.peers.values()) {
      if (peer.reconnectTimer) clearTimeout(peer.reconnectTimer);
      await peer.closeMediaState();
      peer.socket?.disconnect(true);
    }
    this.peers.clear();
    if (this.audioLevelObserver && !this.audioLevelObserver.closed) this.audioLevelObserver.close();
    if (this.activeSpeakerObserver && !this.activeSpeakerObserver.closed) this.activeSpeakerObserver.close();
    logger.info('room closed', { meetingId: this.meetingId, peakParticipants: this.peakParticipants });
    this.emit('closed', {});
  }
}
