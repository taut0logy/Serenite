import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { NextRequest } from 'next/server';

/**
 * POST /api/meetings/[meetingId]/heartbeat
 *
 * Called every 30 seconds by the active call participant to update lastHeartbeat.
 * If heartbeats stop (network failure / tab close), the join endpoint treats the
 * session as inactive after SESSION_TIMEOUT_MS.
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

    let meetingSessionId: string | undefined;
    try {
        const body = await request.json();
        meetingSessionId = body?.meetingSessionId;
    } catch {
        // body is optional
    }

    const updated = await prisma.meetingSession.updateMany({
        where: {
            meetingId,
            userId,
            isActive: true,
            ...(meetingSessionId ? { id: meetingSessionId } : {}),
        },
        data: { lastHeartbeat: new Date() },
    });

    if (updated.count === 0) {
        return Response.json({ error: 'No active session found' }, { status: 404 });
    }

    return Response.json({ success: true });
}
