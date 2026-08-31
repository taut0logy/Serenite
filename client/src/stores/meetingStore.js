import { create } from 'zustand';

// Phase A spec §6.2. Tiles subscribe through selectors keyed by peerId so
// one participant's update doesn't re-render every other tile
// (architecture D12). Pure state only — the socket/mediasoup side effects
// live in the connection orchestrator, not here.

const initialState = {
  connectionState: 'idle', // idle | connecting | waiting | connected | reconnecting | ended | error
  errorMessage: null,
  rev: 0,
  meeting: null,
  self: null, // { peerId, role, micOn, camOn }
  flags: {},
  peers: {}, // peerId -> summary
  producers: {}, // producerId -> { producerId, peerId, kind, source, paused }
  consumers: {}, // consumerId -> { consumerId, producerId, peerId, kind, source, track, paused }
  waiting: [],
  dominantSpeakerId: null,
  speakingPeerIds: [], // Meet/Zoom-style per-tile "talking now" border — distinct from dominantSpeakerId (spotlight target)
  localStream: null,
  screenStream: null, // self-preview only (video track); other peers' shares come from consumers like any other track
  audioOutputId: null, // preferred speaker device — applied per-<video> element by ParticipantTile (setSinkId)

  // Milestone A2.
  chat: [], // { id, peerId, displayName, text, at }
  reactions: [], // transient: { id, peerId, emoji, at } — self-clearing, see addReaction
  sidePanel: null, // null | 'chat' | 'participants' | 'waiting'
  layoutMode: 'tiled', // 'tiled' | 'spotlight' | 'sidebar'
  pinnedPeerId: null,

  // Milestone A3.
  selfConnectionUnstable: false, // from our own producer's quality:advice
  unmutePromptVisible: false, // "you're muted, are you talking?"
  incomingVideoOff: false, // manual "turn off incoming video" override

  // Phase C. Mirrors Room.recording (spec §5/§6) — seeded from the join
  // snapshot, updated by the recording:state delta.
  recording: { active: false, startedAt: null, startedBy: null },

  // Scheduled-meeting duration enforcement — null until the server's 5-
  // minutes-before warning arrives. `endsAt` is an absolute ISO timestamp
  // (not a countdown number) so the overlay's live countdown is immune to
  // when-it-happened-to-render/network-latency drift.
  durationWarning: null, // { endsAt: string } | null
};

export const useMeetingStore = create((set, get) => ({
  ...initialState,

  reset: () => set(initialState),

  setConnectionState: (connectionState, errorMessage = null) => set({ connectionState, errorMessage }),

  applySnapshot: (snapshot) =>
    set({
      rev: snapshot.rev,
      meeting: snapshot.meeting,
      self: snapshot.self,
      flags: snapshot.flags,
      peers: Object.fromEntries(snapshot.peers.map((p) => [p.peerId, p])),
      producers: Object.fromEntries(snapshot.producers.map((p) => [p.producerId, p])),
      waiting: snapshot.waiting,
      dominantSpeakerId: snapshot.dominantSpeakerId,
      chat: snapshot.chat ?? [],
      recording: snapshot.recording ?? initialState.recording,
      durationWarning: snapshot.durationWarning ?? null,
    }),

  /** Returns false if `delta.rev` isn't exactly next — caller should resync. */
  applyDelta: (delta, apply) => {
    const { rev } = get();
    if (delta.rev !== rev + 1) return false;
    set((state) => {
      const patch = apply(state, delta) ?? {};
      return { ...patch, rev: delta.rev };
    });
    return true;
  },

  upsertPeer: (peer) => set((state) => ({ peers: { ...state.peers, [peer.peerId]: peer } })),
  removePeer: (peerId) =>
    set((state) => {
      const peers = { ...state.peers };
      delete peers[peerId];
      return { peers };
    }),
  patchPeer: (peerId, patch) =>
    set((state) => {
      if (!state.peers[peerId]) return {};
      return { peers: { ...state.peers, [peerId]: { ...state.peers[peerId], ...patch } } };
    }),

  upsertProducer: (producer) => set((state) => ({ producers: { ...state.producers, [producer.producerId]: producer } })),
  removeProducer: (producerId) =>
    set((state) => {
      const producers = { ...state.producers };
      delete producers[producerId];
      return { producers };
    }),
  patchProducer: (producerId, patch) =>
    set((state) => {
      if (!state.producers[producerId]) return {};
      return { producers: { ...state.producers, [producerId]: { ...state.producers[producerId], ...patch } } };
    }),

  addConsumer: (consumer) => set((state) => ({ consumers: { ...state.consumers, [consumer.consumerId]: consumer } })),
  removeConsumer: (consumerId) =>
    set((state) => {
      const consumers = { ...state.consumers };
      delete consumers[consumerId];
      return { consumers };
    }),
  setConsumerScore: (consumerId, score) =>
    set((state) => {
      const existing = state.consumers[consumerId];
      if (!existing) return {};
      return { consumers: { ...state.consumers, [consumerId]: { ...existing, score } } };
    }),

  setWaiting: (waiting) => set({ waiting }),
  setDominantSpeaker: (dominantSpeakerId) => set({ dominantSpeakerId }),
  setSpeakingPeerIds: (speakingPeerIds) => set({ speakingPeerIds }),
  setFlags: (flags) => set({ flags }),
  setSelf: (patch) => set((state) => ({ self: { ...state.self, ...patch } })),
  setLocalStream: (localStream) => set({ localStream }),
  setScreenStream: (screenStream) => set({ screenStream }),
  setAudioOutputId: (audioOutputId) => set({ audioOutputId }),

  addChatMessage: (message) => set((state) => ({ chat: [...state.chat, message] })),

  /** Reactions self-clear after a few seconds — the UI is a transient animation, not a log. */
  addReaction: (reaction) => {
    set((state) => ({ reactions: [...state.reactions, reaction] }));
    setTimeout(() => {
      set((state) => ({ reactions: state.reactions.filter((r) => r.id !== reaction.id) }));
    }, 4000);
  },

  setSidePanel: (sidePanel) => set((state) => ({ sidePanel: state.sidePanel === sidePanel ? null : sidePanel })),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setPinnedPeerId: (pinnedPeerId) => set({ pinnedPeerId }),
  togglePin: (peerId) => set((state) => ({ pinnedPeerId: state.pinnedPeerId === peerId ? null : peerId })),

  setSelfConnectionUnstable: (selfConnectionUnstable) => set({ selfConnectionUnstable }),
  showUnmutePrompt: () => set({ unmutePromptVisible: true }),
  dismissUnmutePrompt: () => set({ unmutePromptVisible: false }),
  setIncomingVideoOff: (incomingVideoOff) => set({ incomingVideoOff }),
  setDurationWarning: (durationWarning) => set({ durationWarning }),
}));
