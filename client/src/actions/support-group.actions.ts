"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { computeCosineSimilarity } from "@/lib/profiling";

export interface SupportGroupRecommendation {
  id: string;
  shareableId: string;
  name: string;
  description: string | null;
  type: string;
  tags: string[];
  meetingDayOfWeek: string | null;
  meetingTime: string | null;
  nextMeetingDate: Date | null;
  memberCount: number;
  maxMembers: number;
  vacancy: number;
  matchScore: number;
  isMember: boolean;
}

/**
 * Internal helper to generate recommendations (does NOT save to DB)
 */
async function generateRecommendations(
  userId: string,
  slotsAvailable: number
): Promise<{ groupId: string; matchScore: number }[]> {
  // Get user's mental health profile
  const userProfile = await prisma.mentalHealthProfile.findUnique({
    where: { userId },
  });

  // Get user's current group memberships
  const currentMemberships = await prisma.supportGroup.findMany({
    where: { members: { some: { id: userId } } },
    select: { id: true },
  });

  const currentGroupIds = currentMemberships.map((g) => g.id);

  // Get all groups the user is not already a member of
  const groups = await prisma.supportGroup.findMany({
    where: {
      id: { notIn: currentGroupIds },
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  // Severity level ordering for comparison
  const severityOrder = ['MINIMAL', 'MILD', 'MODERATE', 'SEVERE'] as const;
  const getSeverityIndex = (s: string) => severityOrder.indexOf(s as typeof severityOrder[number]);

  // Filter groups with vacancy, severity match, and compute scores
  const recommendations = groups
    .filter((g) => {
      // Check vacancy
      if (g._count.members >= g.maxMembers) return false;
      
      // Check severity range if user has profile
      if (userProfile) {
        const userSeverityIndex = getSeverityIndex(userProfile.overallSeverity);
        const minIndex = getSeverityIndex(g.minSeverity);
        const maxIndex = getSeverityIndex(g.maxSeverity);
        if (userSeverityIndex < minIndex || userSeverityIndex > maxIndex) return false;
      }
      
      return true;
    })
    .map((g) => {
      let matchScore = 0;

      if (userProfile) {
        const userClusters = [
          userProfile.distress,
          userProfile.fearAvoidance,
          userProfile.traumaStress,
          userProfile.cognitivePatterns,
          userProfile.dailyFunctioning,
        ];
        const groupClusters = [
          g.targetDistress,
          g.targetFearAvoidance,
          g.targetTraumaStress,
          g.targetCognitivePatterns,
          g.targetDailyFunctioning,
        ];
        matchScore = computeCosineSimilarity(userClusters, groupClusters);
      }

      return { groupId: g.id, matchScore };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, slotsAvailable);

  return recommendations;
}

/**
 * Internal helper to fetch full group details from stored recommendation IDs
 */
async function fetchGroupDetails(
  userId: string,
  storedRecs: { groupId: string; matchScore: number }[]
): Promise<SupportGroupRecommendation[]> {
  const groupIds = storedRecs.map((r) => r.groupId);
  const scoreMap = new Map(storedRecs.map((r) => [r.groupId, r.matchScore]));

  const groups = await prisma.supportGroup.findMany({
    where: { id: { in: groupIds } },
    include: {
      _count: { select: { members: true } },
      members: { select: { id: true } },
    },
  });

  return groups.map((g) => ({
    id: g.id,
    shareableId: g.shareableId,
    name: g.name,
    description: g.description,
    type: g.type,
    tags: g.tags,
    meetingDayOfWeek: g.meetingDayOfWeek,
    meetingTime: g.meetingTime,
    nextMeetingDate: g.nextMeetingDate,
    memberCount: g._count.members,
    maxMembers: g.maxMembers,
    vacancy: g.maxMembers - g._count.members,
    matchScore: scoreMap.get(g.id) ?? 0,
    isMember: g.members.some((m) => m.id === userId),
  }));
}

/**
 * Get support group recommendations.
 * - First checks for saved recommendations in DB
 * - If none exist, generates new ones and saves to DB
 * - Returns the recommendations
 */
export async function getSupportGroupRecommendations(): Promise<{
  success: boolean;
  recommendations?: SupportGroupRecommendation[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const userId = session.user.id;

    // Check for saved recommendations
    const savedRecs = await prisma.userRecommendation.findUnique({
      where: { userId },
    });

    if (savedRecs) {
      // Return saved recommendations
      const storedRecs = savedRecs.recommendations as { groupId: string; matchScore: number }[];
      const recommendations = await fetchGroupDetails(userId, storedRecs);
      return { success: true, recommendations };
    }

    // No saved recommendations - generate new ones
    const currentMemberships = await prisma.supportGroup.count({
      where: { members: { some: { id: userId } } },
    });
    const slotsAvailable = 3 - currentMemberships;

    if (slotsAvailable <= 0) {
      return { success: true, recommendations: [] };
    }

    const generatedRecs = await generateRecommendations(userId, slotsAvailable);

    // Save to DB
    await prisma.userRecommendation.create({
      data: {
        userId,
        recommendations: generatedRecs,
      },
    });

    // Fetch and return full details
    const recommendations = await fetchGroupDetails(userId, generatedRecs);
    return { success: true, recommendations };
  } catch (error) {
    console.error("Error getting support group recommendations:", error);
    return { success: false, error: "Failed to get recommendations" };
  }
}

/**
 * Force refresh support group recommendations.
 * Regenerates and saves new recommendations to DB.
 */
export async function refreshSupportGroupRecommendations(): Promise<{
  success: boolean;
  recommendations?: SupportGroupRecommendation[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const userId = session.user.id;

    // Count current memberships
    const currentMemberships = await prisma.supportGroup.count({
      where: { members: { some: { id: userId } } },
    });
    const slotsAvailable = 3 - currentMemberships;

    if (slotsAvailable <= 0) {
      // Delete any existing recommendations since user is full
      await prisma.userRecommendation.deleteMany({ where: { userId } });
      return { success: true, recommendations: [] };
    }

    // Generate new recommendations
    const generatedRecs = await generateRecommendations(userId, slotsAvailable);

    // Upsert to DB
    await prisma.userRecommendation.upsert({
      where: { userId },
      create: {
        userId,
        recommendations: generatedRecs,
      },
      update: {
        recommendations: generatedRecs,
        generatedAt: new Date(),
      },
    });

    // Fetch and return full details
    const recommendations = await fetchGroupDetails(userId, generatedRecs);
    return { success: true, recommendations };
  } catch (error) {
    console.error("Error refreshing support group recommendations:", error);
    return { success: false, error: "Failed to refresh recommendations" };
  }
}


/**
 * Get all support groups with user membership status
 */
export async function getAllSupportGroups(): Promise<{
  success: boolean;
  groups?: SupportGroupRecommendation[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const allGroups = await prisma.supportGroup.findMany({
      include: {
        members: { select: { id: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });

    const groups = allGroups.map((group) => ({
      id: group.id,
      shareableId: group.shareableId,
      name: group.name,
      description: group.description,
      type: group.type,
      tags: group.tags,
      meetingDayOfWeek: group.meetingDayOfWeek,
      meetingTime: group.meetingTime,
      nextMeetingDate: group.nextMeetingDate,
      memberCount: group._count.members,
      maxMembers: group.maxMembers,
      vacancy: group.maxMembers - group._count.members,
      matchScore: 0,
      isMember: group.members.some((member) => member.id === session.user.id),
    }));

    return { success: true, groups };
  } catch (error) {
    console.error("Error getting all support groups:", error);
    return { success: false, error: "Failed to get support groups" };
  }
}

/**
 * Get user's current group memberships
 */
export async function getUserGroups(): Promise<{
  success: boolean;
  groups?: SupportGroupRecommendation[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    const userGroups = await prisma.supportGroup.findMany({
      where: { members: { some: { id: session.user.id } } },
      include: {
        members: { select: { id: true } },
        _count: { select: { members: true } },
      },
      orderBy: { nextMeetingDate: "asc" },
    });

    const groups = userGroups.map((group) => ({
      id: group.id,
      shareableId: group.shareableId,
      name: group.name,
      description: group.description,
      type: group.type,
      tags: group.tags,
      meetingDayOfWeek: group.meetingDayOfWeek,
      meetingTime: group.meetingTime,
      nextMeetingDate: group.nextMeetingDate,
      memberCount: group._count.members,
      maxMembers: group.maxMembers,
      vacancy: group.maxMembers - group._count.members,
      matchScore: 100, // Already a member, full match
      isMember: true,
    }));

    return { success: true, groups };
  } catch (error) {
    console.error("Error getting user groups:", error);
    return { success: false, error: "Failed to get user groups" };
  }
}

/**
 * Join a support group using transaction to prevent race conditions.
 * Enforces max 12 members per group and max 3 groups per user.
 */
export async function joinSupportGroup(groupId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    // Use transaction to prevent race conditions
    await prisma.$transaction(async (tx) => {
      // 1. Check user's current group count (max 3)
      const userGroupCount = await tx.supportGroup.count({
        where: { members: { some: { id: session.user.id } } },
      });
      if (userGroupCount >= 3) {
        throw new Error("MAX_GROUPS_REACHED");
      }

      // 2. Check if user is already a member
      const existingMembership = await tx.supportGroup.findFirst({
        where: {
          id: groupId,
          members: { some: { id: session.user.id } },
        },
      });
      if (existingMembership) {
        throw new Error("ALREADY_MEMBER");
      }

      // 3. Check group's current member count
      const group = await tx.supportGroup.findUnique({
        where: { id: groupId },
        include: { _count: { select: { members: true } } },
      });
      if (!group) {
        throw new Error("GROUP_NOT_FOUND");
      }
      if (group._count.members >= group.maxMembers) {
        throw new Error("GROUP_FULL");
      }

      // 4. Add user to group (atomic operation)
      await tx.supportGroup.update({
        where: { id: groupId },
        data: { members: { connect: { id: session.user.id } } },
      });
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    
    if (message === "MAX_GROUPS_REACHED") {
      return { success: false, error: "You've already joined the maximum of 3 groups" };
    }
    if (message === "ALREADY_MEMBER") {
      return { success: false, error: "You're already a member of this group" };
    }
    if (message === "GROUP_FULL") {
      return { success: false, error: "This group is full (max 12 members)" };
    }
    if (message === "GROUP_NOT_FOUND") {
      return { success: false, error: "Group not found" };
    }

    console.error("Error joining support group:", error);
    return { success: false, error: "Failed to join support group" };
  }
}

/**
 * Join a support group by shareable ID
 */
export async function joinByShareableId(shareableId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const group = await prisma.supportGroup.findUnique({
      where: { shareableId },
    });

    if (!group) {
      return { success: false, error: "Invalid group ID" };
    }

    return joinSupportGroup(group.id);
  } catch (error) {
    console.error("Error joining by shareable ID:", error);
    return { success: false, error: "Failed to join group" };
  }
}

/**
 * Leave a support group
 */
export async function leaveSupportGroup(groupId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    await prisma.supportGroup.update({
      where: { id: groupId },
      data: {
        members: {
          disconnect: { id: session.user.id },
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error leaving support group:", error);
    return { success: false, error: "Failed to leave support group" };
  }
}

/**
 * Get a group by its shareable ID (public info only)
 */
export async function getGroupByShareableId(shareableId: string): Promise<{
  success: boolean;
  group?: SupportGroupRecommendation;
  error?: string;
}> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const group = await prisma.supportGroup.findUnique({
      where: { shareableId },
      include: {
        members: { select: { id: true } },
        _count: { select: { members: true } },
      },
    });

    if (!group) {
      return { success: false, error: "Group not found" };
    }

    return {
      success: true,
      group: {
        id: group.id,
        shareableId: group.shareableId,
        name: group.name,
        description: group.description,
        type: group.type,
        tags: group.tags,
        meetingDayOfWeek: group.meetingDayOfWeek,
        meetingTime: group.meetingTime,
        nextMeetingDate: group.nextMeetingDate,
        memberCount: group._count.members,
        maxMembers: group.maxMembers,
        vacancy: group.maxMembers - group._count.members,
        matchScore: 0,
        isMember: userId ? group.members.some((m) => m.id === userId) : false,
      },
    };
  } catch (error) {
    console.error("Error getting group by shareable ID:", error);
    return { success: false, error: "Failed to get group" };
  }
}
