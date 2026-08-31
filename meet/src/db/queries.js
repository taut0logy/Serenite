import { query, transaction } from './client.js';

// Every statement this service runs against Serenite's database, in one place.
// Table and column names are Prisma's defaults for the models in
// client/prisma/schema.prisma; if that schema changes, this is the file that
// has to change with it.

/**
 * Room configuration for a meeting, joined to the group that owns it.
 *
 * Serenite's SupportGroup is the recurring series and Meeting is a single
 * occurrence, so the facilitator, capacity and severity range all come from
 * the group while the window comes from the meeting.
 */
export async function findMeetingForRoom(meetingId) {
  const { rows } = await query(
    `SELECT m.id,
            m."startTime",
            m."endTime",
            m.status,
            m."supportGroupId",
            g.name          AS group_name,
            g."maxMembers"  AS max_members,
            g."facilitatorId" AS facilitator_id
       FROM "Meeting" m
       LEFT JOIN "SupportGroup" g ON g.id = m."supportGroupId"
      WHERE m.id = $1`,
    [meetingId]
  );
  return rows[0] ?? null;
}

/** Marks a meeting live. Called once, when its first peer is admitted. */
export async function markMeetingRunning(meetingId) {
  await query(`UPDATE "Meeting" SET status = 'RUNNING', "updatedAt" = now() WHERE id = $1`, [
    meetingId,
  ]);
}

/**
 * Marks a meeting ended once its room empties.
 *
 * Guarded on the current status so a late straggler's disconnect cannot end a
 * meeting somebody has already restarted.
 */
export async function markMeetingEnded(meetingId) {
  await query(
    `UPDATE "Meeting"
        SET status = 'ENDED', "endTime" = COALESCE("endTime", now()), "updatedAt" = now()
      WHERE id = $1 AND status = 'RUNNING'`,
    [meetingId]
  );
}

/**
 * Records a member joining. `authSessionId` comes from the join token, so
 * attendance is per device, matching the unique constraint Serenite already
 * places on (meetingId, sessionId).
 *
 * Upsert rather than insert: rejoining after a dropped connection reuses the
 * row instead of failing on the constraint or leaving a stale active session.
 */
export async function recordJoin({ meetingId, authSessionId, userId }) {
  const { rows } = await query(
    `INSERT INTO "MeetingSession" (id, "meetingId", "sessionId", "userId", "joinedAt", "isActive", "lastHeartbeat")
     VALUES (gen_random_uuid(), $1, $2, $3, now(), true, now())
     ON CONFLICT ("meetingId", "sessionId")
     DO UPDATE SET "isActive" = true, "leftAt" = NULL, "lastHeartbeat" = now()
     RETURNING id`,
    [meetingId, authSessionId, userId]
  );
  return rows[0].id;
}

export async function recordLeave(meetingSessionId) {
  if (!meetingSessionId) return;
  await query(
    `UPDATE "MeetingSession" SET "isActive" = false, "leftAt" = now() WHERE id = $1`,
    [meetingSessionId]
  );
}

/** Keeps a peer's presence fresh so stale-session sweeps do not evict them. */
export async function touchHeartbeat(meetingSessionId) {
  if (!meetingSessionId) return;
  await query(`UPDATE "MeetingSession" SET "lastHeartbeat" = now() WHERE id = $1`, [
    meetingSessionId,
  ]);
}

/**
 * Closes any session left active by a process that died mid-call. Run at boot:
 * without it those rows read as a live participant forever, and overlap
 * control would refuse the member's next join.
 */
export async function reconcileOrphanedSessions() {
  const { rowCount } = await query(
    `UPDATE "MeetingSession" ms
        SET "isActive" = false, "leftAt" = now()
       FROM "Meeting" m
      WHERE ms."meetingId" = m.id
        AND ms."isActive" = true
        AND m.status <> 'RUNNING'`
  );
  return rowCount;
}

/** Ends every meeting this process had marked live, for a clean restart. */
export async function endOrphanedMeetings() {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id FROM "Meeting" WHERE status = 'RUNNING' FOR UPDATE`
    );
    if (rows.length === 0) return [];
    await client.query(
      `UPDATE "Meeting" SET status = 'ENDED', "endTime" = COALESCE("endTime", now()) WHERE status = 'RUNNING'`
    );
    return rows.map((r) => r.id);
  });
}
