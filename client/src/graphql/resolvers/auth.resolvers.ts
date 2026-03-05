import type { Context } from '@/types/graphql';

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
            { userId, input }: { userId: string; input: Record<string, string> },
            context: Context
        ) => {
            if (!context.user?.id || context.user.id !== userId) {
                return { success: false, message: 'Unauthorized' };
            }

            await context.prisma.profile.upsert({
                where: { userId },
                create: { userId, ...input },
                update: { ...input, updatedAt: new Date() },
            });

            return { success: true, message: 'Profile updated' };
        },
    },
};