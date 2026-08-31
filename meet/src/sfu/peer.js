// Phase A spec §3.4. Per-connection state for one meeting participant.
// Survives socket drops (§3.5) — only `socket` goes null during the
// reconnect grace window; everything else (transports, producers,
// consumers) stays untouched so media never stops.

export class Peer {
  constructor({ id, userId, guestId, displayName, avatarUrl, role }) {
    this.id = id;
    this.userId = userId ?? null;
    this.guestId = guestId ?? null;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl ?? null;
    this.role = role; // HOST | COHOST | PARTICIPANT — set once at admit time from the join token

    this.socket = null;
    this.reconnectTimer = null;
    this.rtpCapabilities = null; // set from the client's Device.rtpCapabilities on join

    this.sendTransport = null;
    this.recvTransport = null;

    /** @type {Map<string, { producer: import('mediasoup').types.Producer, kind: string, source: string, paused: boolean }>} */
    this.producers = new Map();
    /** @type {Map<string, { consumer: import('mediasoup').types.Consumer, producerId: string, peerId: string, kind: string, source: string, paused: boolean, lastPausedAt: number|null }>} */
    this.consumers = new Map();

    this.viewport = { visible: new Map(), prefetch: new Set(), pinned: new Set(), page: 0 };
    this.state = { micOn: true, camOn: true, handRaised: false, sharing: false, connected: true };
    this.scores = { producer: new Map(), consumerByPeer: new Map() };

    // Milestone A3 bandwidth governor (spec §5.5): 0 full, 1 reduced, 2
    // audio-only. Driven by this peer's own recv-transport BWE trace events
    // — see sfu/bandwidthGovernor.js.
    this.bandwidthLevel = 0;
    this.bandwidthLevelSince = Date.now();

    this.admittedBy = null;
    // Serenite's auth session id, carried on the join token. Attendance is
    // written per device against the (meetingId, sessionId) constraint the
    // app already maintains.
    this.authSessionId = null;
    this.participationId = null; // the MeetingSession row id, once written
  }

  isHostOrCohost() {
    return this.role === 'HOST' || this.role === 'COHOST';
  }

  summary() {
    return {
      peerId: this.id,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      role: this.role,
      connected: this.state.connected,
      micOn: this.state.micOn,
      camOn: this.state.camOn,
      handRaised: this.state.handRaised,
      sharing: this.state.sharing,
    };
  }

  async closeMediaState() {
    for (const { consumer } of this.consumers.values()) {
      if (!consumer.closed) consumer.close();
    }
    this.consumers.clear();
    for (const { producer } of this.producers.values()) {
      if (!producer.closed) producer.close();
    }
    this.producers.clear();
    if (this.sendTransport && !this.sendTransport.closed) this.sendTransport.close();
    if (this.recvTransport && !this.recvTransport.closed) this.recvTransport.close();
    this.sendTransport = null;
    this.recvTransport = null;
  }
}
