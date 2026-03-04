import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { NextRequest } from 'next/server';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes without heartbeat = inactive

/**
 * POST /api/meetings/[meetingId]/join
 *
 * Enforces the per-device call constraint. Only one active Session per user
 * may be in a given meeting at a time.
 *
 * Flow:
 * 1. Resolve the DB Session that backs the current NextAuth session.
 * 2. Check for any other active MeetingSession rows for this user in this meeting
 *    that have a live heartbeat.
 * 3. Block with 409 if found; otherwise create a new MeetingSession.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ meetingId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId } = await params;
    const userId = session.user.id;

    // Find the db Session row that currently has an active token for this user.
    // We pick the most recently created non-expired session.
    const dbSession = await prisma.session.findFirst({
        where: {
            userId,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!dbSession) {
        return Response.json({ error: 'No active session found' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);

    // Check for an existing active MeetingSession from this user in this meeting
    const existing = await prisma.meetingSession.findFirst({
        where: {
            meetingId,
            userId,
            isActive: true,
            lastHeartbeat: { gt: cutoff },
        },
    });

    if (existing) {
        return Response.json(
            {
                error: 'already_in_call',
                message: 'Your account is already in this call from another device.',
            },
            { status: 409 }
        );
    }

    // Upsert — if this exact session already has a stale row, reactivate it;
    // otherwise create a fresh one.
    const meetingSession = await prisma.meetingSession.upsert({
        where: { meetingId_sessionId: { meetingId, sessionId: dbSession.id } },
        create: {
            meetingId,
            sessionId: dbSession.id,
            userId,
            isActive: true,
            lastHeartbeat: new Date(),
        },
        update: {
            isActive: true,
            leftAt: null,
            lastHeartbeat: new Date(),
        },
    });

    return Response.json({
        success: true,
        meetingSessionId: meetingSession.id,
    });
}
