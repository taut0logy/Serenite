import { z } from 'zod';
import { C2S, C2S_FF } from './events.js';

// One zod schema per signaling payload (Phase A spec §4). mediasoup's own
// RTP/DTLS/ICE parameter objects are large, version-coupled structures
// mediasoup itself validates internally when handed to Router/Transport
// methods — re-deriving their full shape here would drift from the installed
// mediasoup-client version. We validate that they are plain objects and let
// mediasoup reject malformed internals; every other field is validated
// strictly.
const rtpCapabilitiesSchema = z.record(z.string(), z.any());
const dtlsParametersSchema = z.record(z.string(), z.any());
const rtpParametersSchema = z.record(z.string(), z.any());

const emptySchema = z.object({}).strict().optional();

const mediaKindSchema = z.enum(['audio', 'video']);
const producerSourceSchema = z.enum(['mic', 'cam', 'screen', 'screenAudio']);
const directionSchema = z.enum(['send', 'recv']);

const producerIdSchema = z.object({ producerId: z.string().min(1) });
const consumerIdSchema = z.object({ consumerId: z.string().min(1) });
const peerIdSchema = z.object({ peerId: z.string().min(1) });

export const joinSchema = z.object({
  rtpCapabilities: rtpCapabilitiesSchema,
  device: z
    .object({
      name: z.string().max(200).optional(),
      flag: z.string().max(50).optional(),
      version: z.string().max(50).optional(),
    })
    .partial()
    .optional(),
});

export const createWebRtcTransportSchema = z.object({ direction: directionSchema });

export const connectTransportSchema = z.object({
  transportId: z.string().min(1),
  dtlsParameters: dtlsParametersSchema,
});

export const restartIceSchema = z.object({ transportId: z.string().min(1) });

export const produceSchema = z.object({
  transportId: z.string().min(1),
  kind: mediaKindSchema,
  rtpParameters: rtpParametersSchema,
  source: producerSourceSchema,
});

export const pauseProducerSchema = producerIdSchema;
export const resumeProducerSchema = producerIdSchema;
export const closeProducerSchema = producerIdSchema;
export const resumeConsumerSchema = consumerIdSchema;
export const askToUnmuteSchema = peerIdSchema;

export const hostAdmitSchema = peerIdSchema;
export const hostDenySchema = peerIdSchema;
export const hostAdmitAllSchema = emptySchema;
export const hostMuteSchema = z.object({ peerId: z.string().min(1), kind: mediaKindSchema });
export const hostMuteAllSchema = emptySchema;
export const hostRemoveSchema = peerIdSchema;
export const hostSetRoleSchema = z.object({
  peerId: z.string().min(1),
  role: z.enum(['COHOST', 'PARTICIPANT']),
});
export const hostSetFlagSchema = z.discriminatedUnion('flag', [
  z.object({ flag: z.literal('allowChat'), value: z.boolean() }),
  z.object({ flag: z.literal('allowScreenShare'), value: z.boolean() }),
  z.object({ flag: z.literal('allowReactions'), value: z.boolean() }),
  z.object({ flag: z.literal('allowUnmute'), value: z.boolean() }),
  z.object({ flag: z.literal('locked'), value: z.boolean() }),
  z.object({ flag: z.literal('waitingRoom'), value: z.enum(['OFF', 'GUESTS_ONLY', 'EVERYONE']) }),
]);
export const hostEndSchema = emptySchema;
export const recordingStartSchema = emptySchema;
export const recordingStopSchema = emptySchema;
export const leaveSchema = emptySchema;
export const roomSyncSchema = emptySchema;
export const getRouterRtpCapabilitiesSchema = emptySchema;

// Fire-and-forget payloads.
export const REACTIONS = Object.freeze(['thumbsup', 'clap', 'heart', 'laugh', 'wow', 'sad']);

export const VIEWPORT_PREFETCH_CAP = 6;

export const viewportSchema = z.object({
  visible: z
    .array(z.object({ producerId: z.string().min(1), width: z.number().int().positive().max(8000) }))
    .max(60),
  // The client knows its own grid pagination; the server cannot derive
  // "±1 page" without duplicating layout logic, so the client reports which
  // extra producers to prefetch and the server just enforces the cap.
  prefetch: z.array(z.string().min(1)).max(VIEWPORT_PREFETCH_CAP).default([]),
  pinned: z.array(z.string().min(1)).max(10).default([]),
  page: z.number().int().min(0).default(0),
});

export const chatSendSchema = z.object({ text: z.string().trim().min(1).max(2000) });
export const reactionSendSchema = z.object({ emoji: z.enum(REACTIONS) });
export const handToggleSchema = z.object({ raised: z.boolean() });

// Keyed by the C2S event-name constants so the namespace's connection
// handler can validate generically: `C2S_SCHEMAS[eventName].parse(payload)`.
export const C2S_SCHEMAS = Object.freeze({
  [C2S.GET_ROUTER_RTP_CAPABILITIES]: getRouterRtpCapabilitiesSchema,
  [C2S.JOIN]: joinSchema,
  [C2S.ROOM_SYNC]: roomSyncSchema,
  [C2S.CREATE_WEBRTC_TRANSPORT]: createWebRtcTransportSchema,
  [C2S.CONNECT_TRANSPORT]: connectTransportSchema,
  [C2S.RESTART_ICE]: restartIceSchema,
  [C2S.PRODUCE]: produceSchema,
  [C2S.PAUSE_PRODUCER]: pauseProducerSchema,
  [C2S.RESUME_PRODUCER]: resumeProducerSchema,
  [C2S.CLOSE_PRODUCER]: closeProducerSchema,
  [C2S.RESUME_CONSUMER]: resumeConsumerSchema,
  [C2S.ASK_TO_UNMUTE]: askToUnmuteSchema,
  [C2S.HOST_ADMIT]: hostAdmitSchema,
  [C2S.HOST_DENY]: hostDenySchema,
  [C2S.HOST_ADMIT_ALL]: hostAdmitAllSchema,
  [C2S.HOST_MUTE]: hostMuteSchema,
  [C2S.HOST_MUTE_ALL]: hostMuteAllSchema,
  [C2S.HOST_REMOVE]: hostRemoveSchema,
  [C2S.HOST_SET_ROLE]: hostSetRoleSchema,
  [C2S.HOST_SET_FLAG]: hostSetFlagSchema,
  [C2S.HOST_END]: hostEndSchema,
  [C2S.RECORDING_START]: recordingStartSchema,
  [C2S.RECORDING_STOP]: recordingStopSchema,
  [C2S.LEAVE]: leaveSchema,
});

export const C2S_FF_SCHEMAS = Object.freeze({
  [C2S_FF.VIEWPORT]: viewportSchema,
  [C2S_FF.CHAT_SEND]: chatSendSchema,
  [C2S_FF.REACTION_SEND]: reactionSendSchema,
  [C2S_FF.HAND_TOGGLE]: handToggleSchema,
});
