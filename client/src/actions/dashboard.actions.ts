'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { SupportGroupType } from '@prisma/client';

export interface DashboardSupportGroup {
    id: string;
    name: string;
    description: string | null;
    type: SupportGroupType;
    tags: string[];
    nextMeetingDate: Date | null;
    meetingTime: string | null;
    memberCount: number;
    isLive: boolean;
    isStartingSoon: boolean;
    isMember: boolean;
}

export interface DashboardStats {
    totalGroups: number;
    totalMembers: number;
    liveSessionsCount: number;
    upcomingSessionsCount: number;
}

/**
 * Get all support groups with member counts and user membership status
 */
export async function getAllSupportGroupsWithStats(): Promise<DashboardSupportGroup[]> {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        const groups = await prisma.supportGroup.findMany({
            include: {
                _count: {
                    select: {
                        members: true,
                    },
                },
                ...(userId ? {
                    members: {
                        where: {
                            id: userId,
                        },
                        select: {
                            id: true,
                        },
                    },
                } : {}),
            },
            orderBy: {
                nextMeetingDate: 'asc',
            },
        });

        const now = new Date();

        return groups.map((group) => {
            const nextMeeting = group.nextMeetingDate;
            const isLive =
                nextMeeting &&
                Math.abs(now.getTime() - nextMeeting.getTime()) < 15 * 60 * 1000; // Within 15 minutes
            const isStartingSoon =
                nextMeeting &&
                !isLive &&
                nextMeeting.getTime() > now.getTime() &&
                nextMeeting.getTime() - now.getTime() < 2 * 60 * 60 * 1000; // Within 2 hours

            return {
                id: group.id,
                name: group.name,
                description: group.description,
                type: group.type,
                tags: group.tags,
                nextMeetingDate: group.nextMeetingDate,
                meetingTime: group.meetingTime,
                memberCount: group._count.members,
                isLive: !!isLive,
                isStartingSoon: !!isStartingSoon,
                isMember: userId && 'members' in group && Array.isArray(group.members) ? group.members.length > 0 : false,
            };
        });
    } catch (error) {
        console.error('Error fetching support groups:', error);
        throw new Error('Failed to fetch support groups');
    }
}

/**
 * Get support groups with upcoming sessions (next 24-48 hours)
 */
export async function getUpcomingSessions(): Promise<DashboardSupportGroup[]> {
    try {
        const allGroups = await getAllSupportGroupsWithStats();
        const now = new Date();
        const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        return allGroups.filter((group) => {
            if (!group.nextMeetingDate) return false;
            const meetingTime = group.nextMeetingDate.getTime();
            return meetingTime > now.getTime() && meetingTime <= next48Hours.getTime();
        });
    } catch (error) {
        console.error('Error fetching upcoming sessions:', error);
        throw new Error('Failed to fetch upcoming sessions');
    }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const totalGroups = await prisma.supportGroup.count();

        // Count total memberships (many-to-many relation)
        const allGroups = await prisma.supportGroup.findMany({
            include: {
                _count: {
                    select: {
                        members: true,
                    },
                },
            },
        });
        const totalMembers = allGroups.reduce((sum, group) => sum + group._count.members, 0);

        const groups = await getAllSupportGroupsWithStats();
        const liveSessionsCount = groups.filter((g) => g.isLive).length;
        const upcomingSessionsCount = groups.filter(
            (g) => g.isStartingSoon || (g.nextMeetingDate && g.nextMeetingDate > new Date() && !g.isLive)
        ).length;

        return {
            totalGroups,
            totalMembers,
            liveSessionsCount,
            upcomingSessionsCount,
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw new Error('Failed to fetch dashboard stats');
    }
}

/**
 * Search and filter support groups
 */
export async function searchSupportGroups(
    query?: string,
    tags?: string[],
    type?: SupportGroupType
): Promise<DashboardSupportGroup[]> {
    try {
        const allGroups = await getAllSupportGroupsWithStats();

        return allGroups.filter((group) => {
            // Filter by search query (name or description)
            if (query) {
                const lowerQuery = query.toLowerCase();
                const matchesName = group.name.toLowerCase().includes(lowerQuery);
                const matchesDescription = group.description?.toLowerCase().includes(lowerQuery);
                if (!matchesName && !matchesDescription) {
                    return false;
                }
            }

            // Filter by tags
            if (tags && tags.length > 0) {
                const hasMatchingTag = tags.some((tag) =>
                    group.tags.some((groupTag) => groupTag.toLowerCase().includes(tag.toLowerCase()))
                );
                if (!hasMatchingTag) {
                    return false;
                }
            }

            // Filter by type
            if (type && group.type !== type) {
                return false;
            }

            return true;
        });
    } catch (error) {
        console.error('Error searching support groups:', error);
        throw new Error('Failed to search support groups');
    }
}

/**
 * Get unique tags from all support groups
 */
export async function getAllTags(): Promise<string[]> {
    try {
        const groups = await prisma.supportGroup.findMany({
            select: {
                tags: true,
            },
        });

        const allTags = new Set<string>();
        groups.forEach((group) => {
            group.tags.forEach((tag) => allTags.add(tag));
        });

        return Array.from(allTags).sort();
    } catch (error) {
        console.error('Error fetching tags:', error);
        throw new Error('Failed to fetch tags');
    }
}
