import { C2S, C2S_FF } from '#shared/signaling/events';
import { C2S_SCHEMAS, C2S_FF_SCHEMAS } from '#shared/signaling/schemas';
import { ErrorCode } from '#shared/enums';
import { AppError } from '../lib/errors.js';
import logger from '../lib/logger.js';
import { socketAuthMiddleware } from './authMiddleware.js';
import { RateLimiter } from '../sfu/rateLimiter.js';

import { handleJoin, handleRoomSync } from './handlers/waitingRoom.js';
import {
  handleCreateWebRtcTransport,
  handleConnectTransport,
  handleRestartIce,
} from './handlers/transport.js';
import {
  handleProduce,
  handlePauseProducer,
  handleResumeProducer,
  handleCloseProducer,
} from './handlers/produce.js';
import { handleResumeConsumer } from './handlers/consume.js';
import { handleViewport } from './handlers/viewport.js';
import { handleChatSend } from './handlers/chat.js';
import { handleReactionSend } from './handlers/reactions.js';
import { handleHandToggle } from './handlers/hand.js';
import {
  handleHostAdmit,
  handleHostDeny,
  handleHostAdmitAll,
  handleHostMute,
  handleHostMuteAll,
  handleHostRemove,
  handleHostSetRole,
  handleHostSetFlag,
  handleHostEnd,
  handleAskToUnmute,
} from './handlers/host.js';
import { handleLeave, handleDisconnect } from './handlers/presence.js';

// Phase A spec §4. One namespace, one zod schema per payload, one rate-limit
// bucket per action family. Ack handlers return their ack body directly (or
// throw AppError); this module is the only place that turns a throw into
// `{ error: { code, message } }` on the wire.

const ACK_HANDLERS = [
  [C2S.GET_ROUTER_RTP_CAPABILITIES, handleGetRouterRtpCapabilities, null],
  [C2S.JOIN, handleJoin, null],
  [C2S.ROOM_SYNC, handleRoomSync, null],
  [C2S.CREATE_WEBRTC_TRANSPORT, handleCreateWebRtcTransport, null],
  [C2S.CONNECT_TRANSPORT, handleConnectTransport, null],
  [C2S.RESTART_ICE, handleRestartIce, null],
  [C2S.PRODUCE, handleProduce, 'produce'],
  [C2S.PAUSE_PRODUCER, handlePauseProducer, null],
  [C2S.RESUME_PRODUCER, handleResumeProducer, null],
  [C2S.CLOSE_PRODUCER, handleCloseProducer, null],
  [C2S.RESUME_CONSUMER, handleResumeConsumer, null],
  [C2S.ASK_TO_UNMUTE, handleAskToUnmute, 'host'],
  [C2S.HOST_ADMIT, handleHostAdmit, 'host'],
  [C2S.HOST_DENY, handleHostDeny, 'host'],
  [C2S.HOST_ADMIT_ALL, handleHostAdmitAll, 'host'],
  [C2S.HOST_MUTE, handleHostMute, 'host'],
  [C2S.HOST_MUTE_ALL, handleHostMuteAll, 'host'],
  [C2S.HOST_REMOVE, handleHostRemove, 'host'],
  [C2S.HOST_SET_ROLE, handleHostSetRole, 'host'],
  [C2S.HOST_SET_FLAG, handleHostSetFlag, 'host'],
  [C2S.HOST_END, handleHostEnd, 'host'],
  [C2S.LEAVE, handleLeave, null],
];

const FF_HANDLERS = [
  [C2S_FF.VIEWPORT, handleViewport, 'viewport'],
  [C2S_FF.CHAT_SEND, handleChatSend, 'chat'],
  [C2S_FF.REACTION_SEND, handleReactionSend, 'reaction'],
  [C2S_FF.HAND_TOGGLE, handleHandToggle, 'hand'],
];

async function handleGetRouterRtpCapabilities({ socket, roomManager }) {
  // Called before `join` (spec §6.3 step 3, Device.load() needs the
  // meeting's actual router capabilities before produce/consume can work).
  // Creates the room's router on first contact — reused by `join` afterward,
  // whether or not this peer ends up admitted immediately or waits.
  const room = socket.data.room ?? (await roomManager.getOrCreateRoom(socket.data.auth.meetingId));
  socket.data.room = room;
  return { routerRtpCapabilities: room.router.rtpCapabilities };
}

function toAckError(err) {
  if (err instanceof AppError) {
    return { error: { code: err.code, message: err.message } };
  }
  if (err?.issues) {
    return { error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid payload' } };
  }
  logger.error('signaling handler threw an unhandled error', { error: err?.message ?? String(err) });
  return { error: { code: ErrorCode.INTERNAL, message: 'Internal error' } };
}

export function attachSignalingNamespace(io, roomManager) {
  const nsp = io.of('/signaling');
  nsp.use(socketAuthMiddleware());

  nsp.on('connection', (socket) => {
    const rateLimiter = new RateLimiter();
    logger.info('signaling socket connected', { socketId: socket.id, authKind: socket.data.auth?.kind });

    for (const [event, handler, bucket] of ACK_HANDLERS) {
      const schema = C2S_SCHEMAS[event];
      socket.on(event, async (rawPayload, ack) => {
        if (typeof ack !== 'function') return;
        try {
          if (bucket && !rateLimiter.allow(bucket)) {
            throw new AppError(429, ErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded');
          }
          const payload = schema ? schema.parse(rawPayload ?? {}) : rawPayload;
          const result = await handler({ socket, roomManager, undefined }, payload);
          ack(result ?? { ok: true });
        } catch (err) {
          ack(toAckError(err));
        }
      });
    }

    for (const [event, handler, bucket] of FF_HANDLERS) {
      const schema = C2S_FF_SCHEMAS[event];
      socket.on(event, async (rawPayload) => {
        try {
          if (bucket && !rateLimiter.allow(bucket)) return;
          const payload = schema ? schema.parse(rawPayload ?? {}) : rawPayload;
          await handler({ socket, roomManager, undefined }, payload);
        } catch (err) {
          logger.debug('fire-and-forget handler failed', { event, error: err?.message });
        }
      });
    }

    socket.on('disconnect', () => {
      try {
        handleDisconnect({ socket, roomManager });
      } catch (err) {
        logger.error('disconnect handler failed', { socketId: socket.id, error: err.message });
      }
    });
  });

  return nsp;
}
