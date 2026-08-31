// Event name constants for the /signaling Socket.IO namespace (Phase A spec §4).
// Client and server both import from here so a typo cannot silently create two
// different event names.

// Client → server, acknowledged (request/response).
export const C2S = Object.freeze({
  GET_ROUTER_RTP_CAPABILITIES: 'getRouterRtpCapabilities',
  JOIN: 'join',
  ROOM_SYNC: 'room:sync',
  CREATE_WEBRTC_TRANSPORT: 'createWebRtcTransport',
  CONNECT_TRANSPORT: 'connectTransport',
  RESTART_ICE: 'restartIce',
  PRODUCE: 'produce',
  PAUSE_PRODUCER: 'pauseProducer',
  RESUME_PRODUCER: 'resumeProducer',
  CLOSE_PRODUCER: 'closeProducer',
  RESUME_CONSUMER: 'resumeConsumer',
  ASK_TO_UNMUTE: 'askToUnmute',
  HOST_ADMIT: 'host:admit',
  HOST_DENY: 'host:deny',
  HOST_ADMIT_ALL: 'host:admitAll',
  HOST_MUTE: 'host:mute',
  HOST_MUTE_ALL: 'host:muteAll',
  HOST_REMOVE: 'host:remove',
  HOST_SET_ROLE: 'host:setRole',
  HOST_SET_FLAG: 'host:setFlag',
  HOST_END: 'host:end',
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  LEAVE: 'leave',
});

// Client → server, fire-and-forget (no ack).
export const C2S_FF = Object.freeze({
  VIEWPORT: 'viewport',
  CHAT_SEND: 'chat:send',
  REACTION_SEND: 'reaction:send',
  HAND_TOGGLE: 'hand:toggle',
});

// Server → client, state deltas — every payload carries `rev` (spec §4.5).
export const S2C_DELTA = Object.freeze({
  PEER_JOINED: 'peer:joined',
  PEER_LEFT: 'peer:left',
  PEER_UPDATED: 'peer:updated',
  PRODUCER_NEW: 'producer:new',
  PRODUCER_CLOSED: 'producer:closed',
  PRODUCER_PAUSED: 'producer:paused',
  PRODUCER_RESUMED: 'producer:resumed',
  CHAT_MESSAGE: 'chat:message',
  REACTION: 'reaction',
  WAITING_ADDED: 'waiting:added',
  WAITING_REMOVED: 'waiting:removed',
  ROOM_FLAGS: 'room:flags',
  SPEAKER_DOMINANT: 'speaker:dominant',
  RECORDING_STATE: 'recording:state',
});

// Server → client, per-peer media events — no `rev` (they describe the
// receiving peer's own consumers/producers, not shared room state).
export const S2C_MEDIA = Object.freeze({
  CONSUMER_NEW: 'consumer:new',
  CONSUMER_CLOSED: 'consumer:closed',
  CONSUMER_PAUSED: 'consumer:paused',
  CONSUMER_RESUMED: 'consumer:resumed',
  CONSUMER_LAYERS_CHANGED: 'consumer:layersChanged',
  CONSUMER_SCORE: 'consumer:score',
  PRODUCER_SCORE: 'producer:score',
  AUDIO_LEVELS: 'audio:levels',
  DURATION_WARNING: 'duration:warning',
  QUALITY_ADVICE: 'quality:advice',
  HOST_MUTED: 'host:muted',
  UNMUTE_REQUESTED: 'unmute:requested',
});

// Server → client, terminal / connection-lifecycle events.
export const S2C_TERMINAL = Object.freeze({
  ADMITTED: 'admitted',
  DENIED: 'denied',
  REMOVED: 'removed',
  MEETING_ENDED: 'meeting:ended',
  ERROR: 'error',
});
