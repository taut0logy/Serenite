import prisma from '@/lib/prisma';
import type { NextRequest } from 'next/server';

/**
 * POST /api/webhooks/stream
 *
 * Receives participant events from Stream's webhook system.
 * Used to mark a MeetingSession as inactive when a participant leaves.
 *
 * Stream events handled:
 *   - call.session_participant_left  → mark session inactive
 *   - call.session_ended             → mark all sessions for the call inactive
 *
 * Setup:
 *   1. In Stream dashboard, add a webhook pointing to:
 *      https://<your-domain>/api/webhooks/stream
 *   2. Set STREAM_WEBHOOK_SECRET in your .env
 *   3. Uncomment the signature verification block below.
 */
export async function POST(request: NextRequest) {
    // Optional but strongly recommended: verify Stream signature
    // const rawBody = await request.text();
    // const signature = request.headers.get('x-signature');
    // const expectedSig = createHmac('sha256', process.env.STREAM_WEBHOOK_SECRET!)
    //     .update(rawBody).digest('hex');
    // if (signature !== expectedSig) {
    //     return Response.json({ error: 'Invalid signature' }, { status: 403 });
    // }
    // const event = JSON.parse(rawBody);

    let event: {
        type: string;
        call?: { id?: string };
        participant?: { user_id?: string };
    };

    try {
        event = await request.json();
    } catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const callId = event?.call?.id;
    const userId = event?.participant?.user_id;

    try {
        switch (event.type) {
            case 'call.session_participant_left':
                if (callId && userId) {
                    await prisma.meetingSession.updateMany({
                        where: {
                            meetingId: callId,
                            userId,
                            isActive: true,
                        },
                        data: {
                            isActive: false,
                            leftAt: new Date(),
                        },
                    });
                }
                break;

            case 'call.session_ended':
                if (callId) {
                    await prisma.meetingSession.updateMany({
                        where: {
                            meetingId: callId,
                            isActive: true,
                        },
                        data: {
                            isActive: false,
                            leftAt: new Date(),
                        },
                    });
                }
                break;

            default:
                break;
        }
    } catch (error) {
        console.error('[stream-webhook] Error processing event:', error);
        // Return 200 so Stream doesn't retry — we log the error instead
    }

    return Response.json({ received: true });
}
