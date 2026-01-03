"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// Constants for meeting timing
const EARLY_JOIN_MINUTES = 10;
const MEETING_DURATION_MINUTES = 120;
const END_WARNING_MINUTES = 10;

export interface UpcomingMeeting {
  id: string;
  startTime: Date;
  groupId: string;
  groupName: string;
  groupShareableId: string;
  status: string;
}

export interface MissedMeeting {
  id: string;
  startTime: Date;
  endTime: Date | null;
  groupId: string;
  groupName: string;
  groupShareableId: string;
  hasRecording: boolean;
}

export interface MeetingDetails {
  id: string;
  startTime: Date;
  endTime: Date;
  status: "PENDING" | "RUNNING" | "ENDED";
  groupId: string;
  groupName: string;
  groupShareableId: string;
  participantCount: number;
  remainingTimeMs: number;
  isInWarningPeriod: boolean;
}

export interface JoinCheckResult {
  canJoin: boolean;
  reason?: "too_early" | "too_late" | "not_member" | "meeting_ended";
  waitingRoom: boolean;
  meetingStartsIn?: number; // milliseconds until meeting starts
  meeting?: MeetingDetails;
}

/**
 * Get upcoming meetings from user's joined groups.
 * Returns meetings that are PENDING or RUNNING with startTime >= now.
 */
export async function getUpcomingMeetings(): Promise<{
  success: boolean;
  meetings?: UpcomingMeeting[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    // Get user's groups
    const userGroups = await prisma.supportGroup.findMany({
      where: { members: { some: { id: session.user.id } } },
      select: { id: true, name: true, shareableId: true },
    });

    const groupIds = userGroups.map((g) => g.id);

    if (groupIds.length === 0) {
      return { success: true, meetings: [] };
    }

    // Get upcoming meetings from those groups
    const meetings = await prisma.meeting.findMany({
      where: {
        supportGroupId: { in: groupIds },
        startTime: { gte: new Date() },
        status: { in: ["PENDING", "RUNNING"] },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    });

    const groupMap = new Map(userGroups.map((g) => [g.id, g]));

    const upcomingMeetings: UpcomingMeeting[] = meetings.map((m) => {
      const group = groupMap.get(m.supportGroupId!);
      return {
        id: m.id,
        startTime: m.startTime,
        groupId: m.supportGroupId!,
        groupName: group?.name ?? "Unknown Group",
        groupShareableId: group?.shareableId ?? "",
        status: m.status,
      };
    });

    return { success: true, meetings: upcomingMeetings };
  } catch (error) {
    console.error("Error getting upcoming meetings:", error);
    return { success: false, error: "Failed to get upcoming meetings" };
  }
}

/**
 * Get meetings user missed - ended meetings from their groups in past 7 days
 * where user was not a participant.
 */
export async function getMissedMeetings(): Promise<{
  success: boolean;
  meetings?: MissedMeeting[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const userId = session.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get user's groups
    const userGroups = await prisma.supportGroup.findMany({
      where: { members: { some: { id: userId } } },
      select: { id: true, name: true, shareableId: true },
    });

    const groupIds = userGroups.map((g) => g.id);

    if (groupIds.length === 0) {
      return { success: true, meetings: [] };
    }

    // Get ended meetings from user's groups where user was NOT a participant
    const meetings = await prisma.meeting.findMany({
      where: {
        supportGroupId: { in: groupIds },
        status: "ENDED",
        startTime: { gte: sevenDaysAgo },
        NOT: {
          participants: { some: { id: userId } },
        },
      },
      include: {
        recordings: { select: { id: true } },
      },
      orderBy: { startTime: "desc" },
      take: 5,
    });

    const groupMap = new Map(userGroups.map((g) => [g.id, g]));

    const missedMeetings: MissedMeeting[] = meetings.map((m) => {
      const group = groupMap.get(m.supportGroupId!);
      return {
        id: m.id,
        startTime: m.startTime,
        endTime: m.endTime,
        groupId: m.supportGroupId!,
        groupName: group?.name ?? "Unknown Group",
        groupShareableId: group?.shareableId ?? "",
        hasRecording: m.recordings.length > 0,
      };
    });

    return { success: true, meetings: missedMeetings };
  } catch (error) {
    console.error("Error getting missed meetings:", error);
    return { success: false, error: "Failed to get missed meetings" };
  }
}

/**
 * Get user's next meeting across all their groups.
 */
export async function getNextMeeting(): Promise<{
  success: boolean;
  meeting?: UpcomingMeeting | null;
  error?: string;
}> {
  try {
    const result = await getUpcomingMeetings();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      meeting: result.meetings?.[0] ?? null,
    };
  } catch (error) {
    console.error("Error getting next meeting:", error);
    return { success: false, error: "Failed to get next meeting" };
  }
}

/**
 * Get or create a meeting for a support group based on its schedule.
 * Returns the meeting for the current scheduled time slot.
 */
export async function getMeetingForGroup(groupId: string): Promise<{
  success: boolean;
  meeting?: MeetingDetails;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    // Get the support group
    const group = await prisma.supportGroup.findUnique({
      where: { id: groupId },
      include: {
        members: { select: { id: true } },
        meetings: {
          where: {
            status: { in: ["PENDING", "RUNNING"] },
          },
          include: {
            participants: { select: { id: true } },
          },
          orderBy: { startTime: "desc" },
          take: 1,
        },
      },
    });

    if (!group) {
      return { success: false, error: "Group not found" };
    }

    // Check if user is a member
    const isMember = group.members.some((m) => m.id === session.user.id);
    if (!isMember) {
      return { success: false, error: "User is not a member of this group" };
    }

    // Check for existing meeting
    let meeting = group.meetings[0];

    // If no meeting exists or the existing one is in the past, create a new one
    if (!meeting && group.nextMeetingDate) {
      const endTime = new Date(group.nextMeetingDate);
      endTime.setMinutes(endTime.getMinutes() + MEETING_DURATION_MINUTES);

      meeting = await prisma.meeting.create({
        data: {
          startTime: group.nextMeetingDate,
          endTime,
          supportGroupId: groupId,
          status: "PENDING",
        },
        include: {
          participants: { select: { id: true } },
        },
      });
    }

    if (!meeting) {
      return { success: false, error: "No meeting scheduled for this group" };
    }

    const now = new Date();
    const endTime = meeting.endTime || new Date(meeting.startTime.getTime() + MEETING_DURATION_MINUTES * 60000);
    const remainingTimeMs = endTime.getTime() - now.getTime();
    const warningThresholdMs = END_WARNING_MINUTES * 60000;

    return {
      success: true,
      meeting: {
        id: meeting.id,
        startTime: meeting.startTime,
        endTime,
        status: meeting.status as "PENDING" | "RUNNING" | "ENDED",
        groupId,
        groupName: group.name,
        groupShareableId: group.shareableId,
        participantCount: meeting.participants.length,
        remainingTimeMs: Math.max(0, remainingTimeMs),
        isInWarningPeriod: remainingTimeMs <= warningThresholdMs && remainingTimeMs > 0,
      },
    };
  } catch (error) {
    console.error("Error getting meeting for group:", error);
    return { success: false, error: "Failed to get meeting" };
  }
}

/**
 * Check if a user can join a meeting.
 * Users can join 10 minutes before the scheduled start time.
 * Returns waitingRoom: true if meeting hasn't officially started.
 */
export async function canJoinMeeting(meetingId: string): Promise<{
  success: boolean;
  result?: JoinCheckResult;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        supportGroup: {
          include: {
            members: { select: { id: true } },
          },
        },
        participants: { select: { id: true } },
      },
    });

    if (!meeting || !meeting.supportGroup) {
      return { success: false, error: "Meeting not found" };
    }

    // Check if user is a member of the support group
    const isMember = meeting.supportGroup.members.some((m) => m.id === session.user.id);
    if (!isMember) {
      return {
        success: true,
        result: { canJoin: false, reason: "not_member", waitingRoom: false },
      };
    }

    // Check if meeting has ended
    if (meeting.status === "ENDED") {
      return {
        success: true,
        result: { canJoin: false, reason: "meeting_ended", waitingRoom: false },
      };
    }

    const now = new Date();
    const startTime = meeting.startTime;
    const endTime = meeting.endTime || new Date(startTime.getTime() + MEETING_DURATION_MINUTES * 60000);
    
    // Calculate early join window (10 minutes before)
    const earlyJoinTime = new Date(startTime.getTime() - EARLY_JOIN_MINUTES * 60000);
    
    // Check if too early
    if (now < earlyJoinTime) {
      const waitTime = earlyJoinTime.getTime() - now.getTime();
      return {
        success: true,
        result: {
          canJoin: false,
          reason: "too_early",
          waitingRoom: false,
          meetingStartsIn: waitTime,
        },
      };
    }

    // Check if too late (meeting ended)
    if (now > endTime) {
      return {
        success: true,
        result: { canJoin: false, reason: "too_late", waitingRoom: false },
      };
    }

    // User can join - determine if in waiting room or main room
    const isWaitingRoom = now < startTime;
    const remainingTimeMs = endTime.getTime() - now.getTime();
    const warningThresholdMs = END_WARNING_MINUTES * 60000;

    return {
      success: true,
      result: {
        canJoin: true,
        waitingRoom: isWaitingRoom,
        meetingStartsIn: isWaitingRoom ? startTime.getTime() - now.getTime() : 0,
        meeting: {
          id: meeting.id,
          startTime: meeting.startTime,
          endTime,
          status: meeting.status as "PENDING" | "RUNNING" | "ENDED",
          groupId: meeting.supportGroup.id,
          groupName: meeting.supportGroup.name,
          groupShareableId: meeting.supportGroup.shareableId,
          participantCount: meeting.participants.length,
          remainingTimeMs: Math.max(0, remainingTimeMs),
          isInWarningPeriod: remainingTimeMs <= warningThresholdMs && remainingTimeMs > 0,
        },
      },
    };
  } catch (error) {
    console.error("Error checking if user can join meeting:", error);
    return { success: false, error: "Failed to check meeting access" };
  }
}

/**
 * Get current meeting status including remaining time.
 */
export async function getMeetingStatus(meetingId: string): Promise<{
  success: boolean;
  meeting?: MeetingDetails;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        supportGroup: true,
        participants: { select: { id: true } },
      },
    });

    if (!meeting || !meeting.supportGroup) {
      return { success: false, error: "Meeting not found" };
    }

    const now = new Date();
    const endTime = meeting.endTime || new Date(meeting.startTime.getTime() + MEETING_DURATION_MINUTES * 60000);
    const remainingTimeMs = endTime.getTime() - now.getTime();
    const warningThresholdMs = END_WARNING_MINUTES * 60000;

    return {
      success: true,
      meeting: {
        id: meeting.id,
        startTime: meeting.startTime,
        endTime,
        status: meeting.status as "PENDING" | "RUNNING" | "ENDED",
        groupId: meeting.supportGroup.id,
        groupName: meeting.supportGroup.name,
        groupShareableId: meeting.supportGroup.shareableId,
        participantCount: meeting.participants.length,
        remainingTimeMs: Math.max(0, remainingTimeMs),
        isInWarningPeriod: remainingTimeMs <= warningThresholdMs && remainingTimeMs > 0,
      },
    };
  } catch (error) {
    console.error("Error getting meeting status:", error);
    return { success: false, error: "Failed to get meeting status" };
  }
}

/**
 * Start a meeting (change status from PENDING to RUNNING).
 */
export async function startMeeting(meetingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        supportGroup: {
          include: { members: { select: { id: true } } },
        },
      },
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    // Check if user is a member of the group
    const isMember = meeting.supportGroup?.members.some((m) => m.id === session.user.id);
    if (!isMember) {
      return { success: false, error: "Not authorized to start this meeting" };
    }

    // Only start if currently PENDING
    if (meeting.status !== "PENDING") {
      return { success: false, error: `Meeting is already ${meeting.status}` };
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "RUNNING" },
    });

    return { success: true };
  } catch (error) {
    console.error("Error starting meeting:", error);
    return { success: false, error: "Failed to start meeting" };
  }
}

/**
 * End a meeting (change status to ENDED).
 */
export async function endMeeting(meetingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    if (meeting.status === "ENDED") {
      return { success: true }; // Already ended
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: "ENDED",
        endTime: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error ending meeting:", error);
    return { success: false, error: "Failed to end meeting" };
  }
}

/**
 * Add user as participant when they join the meeting.
 */
export async function joinMeetingAsParticipant(meetingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        participants: {
          connect: { id: session.user.id },
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error joining meeting as participant:", error);
    return { success: false, error: "Failed to join meeting" };
  }
}

// ============================================
// TEST MEETING FUNCTIONS (Development only)
// ============================================

/**
 * Get or create a test meeting for the user.
 * Uses the first group the user is a member of.
 */
export async function getOrCreateTestMeeting(): Promise<{
  success: boolean;
  meeting?: {
    id: string;
    startTime: Date;
    endTime: Date | null;
    status: string;
    groupName: string;
    groupId: string;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    // Get user's first group
    const userGroup = await prisma.supportGroup.findFirst({
      where: { members: { some: { id: session.user.id } } },
    });

    if (!userGroup) {
      return { success: false, error: "User is not a member of any group" };
    }

    // Check for existing test meeting (not ended)
    let meeting = await prisma.meeting.findFirst({
      where: {
        supportGroupId: userGroup.id,
        status: { in: ["PENDING", "RUNNING"] },
      },
      orderBy: { createdAt: "desc" },
    });

    // Create a new test meeting if none exists
    if (!meeting) {
      const startTime = new Date();
      startTime.setMinutes(startTime.getMinutes() + 15); // Default: 15 min from now
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + MEETING_DURATION_MINUTES);

      meeting = await prisma.meeting.create({
        data: {
          startTime,
          endTime,
          supportGroupId: userGroup.id,
          status: "PENDING",
        },
      });
    }

    return {
      success: true,
      meeting: {
        id: meeting.id,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        status: meeting.status,
        groupName: userGroup.name,
        groupId: userGroup.id,
      },
    };
  } catch (error) {
    console.error("Error getting/creating test meeting:", error);
    return { success: false, error: "Failed to get test meeting" };
  }
}

/**
 * Set test meeting start time to X minutes from now.
 */
export async function setTestMeetingTime(meetingId: string, minutesFromNow: number): Promise<{
  success: boolean;
  meeting?: {
    id: string;
    startTime: Date;
    endTime: Date;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + minutesFromNow);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + MEETING_DURATION_MINUTES);

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        startTime,
        endTime,
        status: "PENDING", // Reset to pending when rescheduling
      },
    });

    return {
      success: true,
      meeting: {
        id: meeting.id,
        startTime: meeting.startTime,
        endTime: meeting.endTime!,
      },
    };
  } catch (error) {
    console.error("Error setting test meeting time:", error);
    return { success: false, error: "Failed to set meeting time" };
  }
}

/**
 * Hasten test meeting start time by X minutes.
 */
export async function hastenTestMeeting(meetingId: string, minutesToSubtract: number): Promise<{
  success: boolean;
  meeting?: {
    id: string;
    startTime: Date;
    endTime: Date;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    const newStartTime = new Date(meeting.startTime);
    newStartTime.setMinutes(newStartTime.getMinutes() - minutesToSubtract);
    
    const newEndTime = new Date(newStartTime);
    newEndTime.setMinutes(newEndTime.getMinutes() + MEETING_DURATION_MINUTES);

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
      },
    });

    return {
      success: true,
      meeting: {
        id: updated.id,
        startTime: updated.startTime,
        endTime: updated.endTime!,
      },
    };
  } catch (error) {
    console.error("Error hastening test meeting:", error);
    return { success: false, error: "Failed to hasten meeting" };
  }
}

/**
 * Reset/delete test meeting to start fresh.
 */
export async function resetTestMeeting(meetingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    await prisma.meeting.delete({
      where: { id: meetingId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error resetting test meeting:", error);
    return { success: false, error: "Failed to reset meeting" };
  }
}

/**
 * Hasten meeting end time by X minutes (for testing countdown).
 */
export async function hastenMeetingEnd(meetingId: string, minutesToSubtract: number): Promise<{
  success: boolean;
  meeting?: {
    id: string;
    startTime: Date;
    endTime: Date;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    if (!meeting.endTime) {
      return { success: false, error: "Meeting has no end time set" };
    }

    const newEndTime = new Date(meeting.endTime);
    newEndTime.setMinutes(newEndTime.getMinutes() - minutesToSubtract);

    // Don't allow end time before current time
    if (newEndTime.getTime() < Date.now()) {
      return { success: false, error: "End time cannot be in the past" };
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        endTime: newEndTime,
      },
    });

    return {
      success: true,
      meeting: {
        id: updated.id,
        startTime: updated.startTime,
        endTime: updated.endTime!,
      },
    };
  } catch (error) {
    console.error("Error hastening meeting end:", error);
    return { success: false, error: "Failed to hasten meeting end" };
  }
}



