import {
  markMeetingEnded,
  markMeetingRunning,
  recordJoin,
  recordLeave,
  touchHeartbeat,
} from '../db/queries.js';
import logger from '../lib/logger.js';

// The only place this service writes to Serenite's database. Everything here
// is attendance and meeting lifecycle; membership, eligibility and scheduling
// stay in the Next.js app, which is the sole authority on who may be here.
//
// Every write is best-effort with respect to the call: a database hiccup must
// degrade record keeping, never drop a live session. Failures are logged and
// swallowed for that reason, and the one place that is not acceptable
// (admission) never reaches this module, because admission is decided before
// a token is minted.

export async function startSession(meetingId) {
  try {
    await markMeetingRunning(meetingId);
  } catch (error) {
    logger.error('could not mark meeting running', { meetingId, error: error.message });
  }
}

export async function endSession(meetingId) {
  try {
    await markMeetingEnded(meetingId);
  } catch (error) {
    logger.error('could not mark meeting ended', { meetingId, error: error.message });
  }
}

/**
 * Writes the member's attendance row and returns its id, which the peer holds
 * so the matching close can be written when they leave. Returns null on
 * failure rather than throwing, so a database problem cannot block admission.
 */
export async function recordParticipation({ meetingId, authSessionId, userId }) {
  try {
    return await recordJoin({ meetingId, authSessionId, userId });
  } catch (error) {
    logger.error('could not record participation', { meetingId, userId, error: error.message });
    return null;
  }
}

export async function recordLeft(meetingSessionId) {
  try {
    await recordLeave(meetingSessionId);
  } catch (error) {
    logger.error('could not record leave', { meetingSessionId, error: error.message });
  }
}

export async function heartbeat(meetingSessionId) {
  try {
    await touchHeartbeat(meetingSessionId);
  } catch (error) {
    logger.debug('heartbeat write failed', { meetingSessionId, error: error.message });
  }
}
