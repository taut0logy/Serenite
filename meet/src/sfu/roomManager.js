import { randomUUID } from 'node:crypto';
import { findMeetingForRoom } from '../db/queries.js';
import config from '../config/index.js';
import logger from '../lib/logger.js';
import { RouterRegistry } from './routerRegistry.js';
import { Room } from './room.js';
import { createObservers, attachObserverHandlers } from './speakerDetector.js';
import { startSession, endSession } from './sessionLog.js';
import { computeDesired, applyDiff } from './consumerManager.js';
import { S2C_DELTA, S2C_MEDIA, S2C_TERMINAL } from '#shared/signaling/events';

// Ties together the router registry, session logging, and the audio
// observers into one live-room lifecycle (Phase A spec §3.3–§3.6). Not
// itself named in the spec's file layout — an internal seam that keeps
// `signaling/handlers/*` from each re-deriving room creation/teardown.

/** How long before a session's end time participants are warned. */
const DURATION_WARNING_MS = 5 * 60 * 1000;

function findProducer(room, producerId) {
  for (const peer of room.peers.values()) {
    const entry = peer.producers.get(producerId);
    if (entry) return { peer, entry };
  }
  return null;
}

export class RoomManager {
  constructor(workerPool) {
    this.workerPool = workerPool;
    this.routerRegistry = new RouterRegistry(workerPool);
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
  }

  getRoom(meetingId) {
    return this.rooms.get(meetingId) ?? null;
  }

  /**
   * A signed-in user may have at most one admitted peer, in at most one
   * room, at a time (product decision — see handleJoin's use of this).
   * Guests are exempt: `userId` is null for them by design (a fresh
   * `guestId` per join, see waitingRoom.js's userAndGuestId), so this never
   * matches a guest peer, only ever a real account.
   *
   * Only scans `room.peers` (admitted), not `room.waiting` — sitting in a
   * waiting room isn't "active in a meeting" yet, and blocking that would
   * stop someone from being waitlisted for a second meeting while waiting
   * to be let into the first.
   */
  findActivePeerForUser(userId) {
    if (!userId) return null;
    for (const room of this.rooms.values()) {
      for (const peer of room.peers.values()) {
        if (peer.userId === userId) return { room, peer };
      }
    }
    return null;
  }

  async getOrCreateRoom(meetingId) {
    const existing = this.rooms.get(meetingId);
    if (existing) return existing;

    // Serenite's SupportGroup is the recurring series and Meeting is one
    // occurrence of it, so the room's identity and capacity come from the
    // group while its window comes from the meeting.
    const meeting = await findMeetingForRoom(meetingId);
    if (!meeting) throw new Error(`Meeting ${meetingId} not found`);

    const { router, workerId } = await this.routerRegistry.acquireRouterFor(meetingId);
    await startSession(meetingId);
    const { audioLevelObserver, activeSpeakerObserver } = await createObservers(router);

    const room = new Room({
      meetingId,
      code: meetingId,
      title: meeting.group_name ?? 'Support session',
      router,
      workerId,
      // Identifies this run of the room for reconnect tokens. Deliberately
      // not a database row: a reconnect only has to be valid for as long as
      // the room is up, and nothing outside this process reads it.
      sessionId: randomUUID(),
      isRecurring: true,
      flags: Room.buildFlagsFromMeeting({
        // Support sessions always hold arrivals until the facilitator admits
        // them. It is the one moment someone can notice a member is in a bad
        // state before they are on camera in front of the group, so it is a
        // fixed policy rather than something a host opts into.
        waitingRoom: 'EVERYONE',
        lockedAt: null,
        muteOnEntry: false,
        cameraOffOnEntry: false,
      }),
    });
    room.facilitatorId = meeting.facilitator_id ?? null;
    room.maxParticipants = Math.min(
      meeting.max_members ?? config.meeting.maxParticipants,
      config.meeting.maxParticipants
    );
    room.audioLevelObserver = audioLevelObserver;
    room.activeSpeakerObserver = activeSpeakerObserver;

    attachObserverHandlers(room, {
      onDominantSpeakerChanged: (peerId) => {
        room.broadcastDelta(S2C_DELTA.SPEAKER_DOMINANT, { dominantSpeakerId: peerId });
        this.refreshAllPeersConsumers(room).catch((err) =>
          logger.warn('consumer refresh after speaker change failed', { error: err.message }),
        );
      },
      onChanged: () => {
        this.refreshAllPeersConsumers(room).catch((err) =>
          logger.warn('consumer refresh after top-speaker change failed', { error: err.message }),
        );
      },
    });

    this.rooms.set(meetingId, room);
    logger.info('room created', { meetingId, workerId });

    this.scheduleDurationEnforcement(room, meeting);

    return room;
  }

  /**
   * A session ends at its meeting's `endTime`. Serenite materialises that
   * when it creates the occurrence, so there is no recurrence rule to expand
   * here. A meeting with no end time runs until its last participant leaves.
   */
  scheduleDurationEnforcement(room, meeting) {
    if (!meeting.endTime) return;

    const endsAt = new Date(meeting.endTime);
    const msUntilEnd = endsAt.getTime() - Date.now();
    // Already past its window, because the group started very late. Do not
    // retroactively close a room that has only just opened.
    if (msUntilEnd <= 0) return;

    room.scheduledEndsAt = endsAt;
    room.durationWarningMs = DURATION_WARNING_MS;

    const msUntilWarn = Math.max(0, msUntilEnd - DURATION_WARNING_MS);

    room.durationWarnTimer = setTimeout(() => {
      room.broadcastMedia(S2C_MEDIA.DURATION_WARNING, { endsAt: endsAt.toISOString() });
    }, msUntilWarn);
    room.durationWarnTimer.unref?.();

    room.durationEndTimer = setTimeout(() => {
      this.closeRoom(room, 'duration_expired').catch((err) =>
        logger.error('closeRoom after duration expiry failed', { meetingId: room.meetingId, error: err.message }),
      );
    }, msUntilEnd);
    room.durationEndTimer.unref?.();
  }

  /** Re-runs the consumer diff for one peer against the room's current state. */
  async refreshPeerConsumers(room, peer) {
    if (!peer.socket || !peer.recvTransport || peer.recvTransport.closed) return;

    const roster = [...room.peers.values()].map((p) => ({
      peerId: p.id,
      producers: [...p.producers.values()].map((e) => ({
        producerId: e.producer.id,
        kind: e.kind,
        source: e.source,
      })),
    }));

    const desired = computeDesired({
      ownPeerId: peer.id,
      peers: roster,
      viewport: {
        visible: [...peer.viewport.visible.entries()].map(([producerId, width]) => ({ producerId, width })),
        prefetch: [...peer.viewport.prefetch],
        pinned: [...peer.viewport.pinned],
      },
      dominantSpeakerId: room.dominantSpeakerId,
      topSpeakingProducerIds: [...room.topSpeakingProducerIds],
      lastSpokeAt: Object.fromEntries(room.lastSpokeAt),
      now: Date.now(),
      spokeRecentlyMs: config.meeting.spokeRecentlyMs,
      bandwidthLevel: peer.bandwidthLevel,
    });

    await applyDiff(peer, desired, (producerId) => findProducer(room, producerId), room.router);
    this.routerRegistry.reportLoad(room.meetingId, room.totalConsumerCount());
  }

  async refreshAllPeersConsumers(room) {
    for (const peer of room.peers.values()) {
      await this.refreshPeerConsumers(room, peer);
    }
  }

  /** Closes producers of `sourcePeer` on every other peer's consumer set and refreshes them. */
  async retireProducerEverywhere(room, producerId) {
    for (const peer of room.peers.values()) {
      for (const [consumerId, entry] of [...peer.consumers]) {
        if (entry.producerId !== producerId) continue;
        if (!entry.consumer.closed) entry.consumer.close();
        peer.consumers.delete(consumerId);
        peer.socket?.emit(S2C_MEDIA.CONSUMER_CLOSED, { consumerId, producerId });
      }
    }
  }

  /**
   * Ends a room: broadcasts `meeting:ended`, writes the session end + status
   * transition, closes all media, and releases the router (spec §3.6).
   */
  async closeRoom(room, reason) {
    if (!this.rooms.has(room.meetingId)) return;
    this.rooms.delete(room.meetingId);

    room.broadcastDelta(S2C_TERMINAL.MEETING_ENDED, { reason });
    for (const entry of room.waiting.values()) {
      entry.socket?.emit(S2C_TERMINAL.MEETING_ENDED, { reason });
    }

    try {
      await endSession(room.meetingId);
    } catch (err) {
      logger.error('endSession failed', { meetingId: room.meetingId, error: err.message });
    }

    await room.close();
    this.routerRegistry.releaseRouter(room.meetingId);
  }

  /** Worker died — every room on it is unrecoverable (spec §3.2). */
  async forceCloseRoomsOnWorker(workerId) {
    const meetingIds = this.routerRegistry.forceCloseRoutersOnWorker(workerId);
    for (const meetingId of meetingIds) {
      const room = this.rooms.get(meetingId);
      if (!room) continue;
      this.rooms.delete(meetingId);
      room.broadcastDelta(S2C_TERMINAL.MEETING_ENDED, { reason: 'server_error' });
      try {
        await endSession(room.meetingId);
      } catch (err) {
        logger.error('endSession failed after worker death', { meetingId, error: err.message });
      }
      await room.close();
    }
  }
}
