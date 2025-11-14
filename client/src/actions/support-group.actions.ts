"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export interface SupportGroupRecommendation {
  id: string;
  name: string;
  description: string | null;
  type: string;
  tags: string[];
  meetingDayOfWeek: string | null;
  meetingTime: string | null;
  nextMeetingDate: Date | null;
  memberCount: number;
  matchScore: number;
  matchedTags: string[];
  isMember: boolean;
}

/**
 * Get personalized support group recommendations based on user's mental health profile
 */
export async function getSupportGroupRecommendations(limit: number = 5): Promise<{
  success: boolean;
  recommendations?: SupportGroupRecommendation[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "User not authenticated" };
    }

    // Get user's mental health profile
    const userProfile = await prisma.mentalHealthProfile.findUnique({
      where: { userId: session.user.id },
      select: { tags: true },
    });

    if (!userProfile || !userProfile.tags || userProfile.tags.length === 0) {
      // If no profile exists, return all groups sorted by member count
      const allGroups = await prisma.supportGroup.findMany({
        include: {
          members: true,
          _count: {
            select: { members: true },
          },
        },
        orderBy: {
          members: {
            _count: "desc",
          },
        },
        take: limit,
      });

      const recommendations = allGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        tags: group.tags,
        meetingDayOfWeek: group.meetingDayOfWeek,
        meetingTime: group.meetingTime,
        nextMeetingDate: group.nextMeetingDate,
        memberCount: group._count.members,
        matchScore: 0,
        matchedTags: [],
        isMember: group.members.some((member) => member.id === session.user.id),
      }));

      return { success: true, recommendations };
    }

    const userTags = userProfile.tags;

    // Get all support groups
    const allGroups = await prisma.supportGroup.findMany({
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
    });

    // Calculate match scores for each group
    const groupsWithScores = allGroups.map((group) => {
      const groupTags = group.tags || [];
      const matchedTags = userTags.filter((userTag) =>
        groupTags.some((groupTag) =>
          groupTag.toLowerCase().includes(userTag.toLowerCase()) ||
          userTag.toLowerCase().includes(groupTag.toLowerCase())
        )
      );

      // Calculate match score (0-100)
      // Higher score = more relevant
      const tagMatchScore = groupTags.length > 0
        ? (matchedTags.length / groupTags.length) * 100
        : 0;

      // Boost score if user has many matching tags
      const userTagMatchScore = userTags.length > 0
        ? (matchedTags.length / userTags.length) * 100
        : 0;

      // Combined score (weighted average)
      const matchScore = (tagMatchScore * 0.6 + userTagMatchScore * 0.4);

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        tags: group.tags,
        meetingDayOfWeek: group.meetingDayOfWeek,
        meetingTime: group.meetingTime,
        nextMeetingDate: group.nextMeetingDate,
        memberCount: group._count.members,
        matchScore: Math.round(matchScore),
        matchedTags,
        isMember: group.members.some((member) => member.id === session.user.id),
      };
    });

    // Sort by match score (descending) and take top N
    const recommendations = groupsWithScores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return { success: true, recommendations };
  } catch (error) {
    console.error("Error getting support group recommendations:", error);
    return { success: false, error: "Failed to get recommendations" };
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
        members: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const groups = allGroups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      type: group.type,
      tags: group.tags,
      meetingDayOfWeek: group.meetingDayOfWeek,
      meetingTime: group.meetingTime,
      nextMeetingDate: group.nextMeetingDate,
      memberCount: group._count.members,
      matchScore: 0,
      matchedTags: [],
      isMember: group.members.some((member) => member.id === session.user.id),
    }));

    return { success: true, groups };
  } catch (error) {
    console.error("Error getting all support groups:", error);
    return { success: false, error: "Failed to get support groups" };
  }
}

/**
 * Join a support group
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

    await prisma.supportGroup.update({
      where: { id: groupId },
      data: {
        members: {
          connect: { id: session.user.id },
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error joining support group:", error);
    return { success: false, error: "Failed to join support group" };
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
