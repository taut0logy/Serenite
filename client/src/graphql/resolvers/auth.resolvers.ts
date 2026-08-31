import type { Context } from '@/types/graphql';

/** Mirrors the UpdateProfileInput in graphql/types: every field optional. */
interface UpdateProfileInput {
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatarUrl?: string;
    /** ISO date string over the wire; Profile.dob is a DateTime. */
    dob?: string;
}

export const authResolvers = {
    Query: {
        me: async (_: unknown, __: unknown, context: Context) => {
            if (!context.user?.id) return null;
            return await context.prisma.user.findUnique({
                where: { id: context.user.id },
                include: { profile: true },
            });
        },

        profile: async (_: unknown, { userId }: { userId: string }, context: Context) => {
            if (!context.user?.id) return null;
            return await context.prisma.profile.findUnique({
                where: { userId },
            });
        },

        notifications: async (
            _: unknown,
            { userId, offset = 0, limit = 10 }: { userId: string; offset?: number; limit?: number },
            context: Context
        ) => {
            if (!context.user?.id || context.user.id !== userId) {
                return { success: false, message: 'Unauthorized', notifications: [], totalCount: 0, hasMore: false };
            }

            const [notifications, totalCount] = await Promise.all([
                context.prisma.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    skip: offset,
                    take: limit,
                    include: { user: true },
                }),
                context.prisma.notification.count({ where: { userId } }),
            ]);

            return {
                success: true,
                message: 'OK',
                notifications,
                totalCount,
                hasMore: offset + limit < totalCount,
            };
        },
    },

    Mutation: {
        updateProfile: async (
            _: unknown,
            { userId, input }: { userId: string; input: UpdateProfileInput },
            context: Context
        ) => {
            if (!context.user?.id || context.user.id !== userId) {
                return { success: false, message: 'Unauthorized' };
            }

            const { dob, ...rest } = input;
            const data = { ...rest, ...(dob ? { dob: new Date(dob) } : {}) };

            // Profile requires both names; UpdateProfileInput makes every field
            // optional. So an update may touch one field at a time, but a create
            // has to carry a full name or it would violate the schema.
            const existing = await context.prisma.profile.findUnique({
                where: { userId },
                select: { id: true },
            });

            if (!existing) {
                if (!rest.firstName || !rest.lastName) {
                    return {
                        success: false,
                        message: 'First and last name are required to create a profile',
                    };
                }
                await context.prisma.profile.create({
                    data: { ...data, userId, firstName: rest.firstName, lastName: rest.lastName },
                });
            } else {
                await context.prisma.profile.update({ where: { userId }, data });
            }

            return { success: true, message: 'Profile updated' };
        },
    },
};