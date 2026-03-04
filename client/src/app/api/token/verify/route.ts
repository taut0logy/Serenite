import { verifySession } from '@/actions/auth.actions';
import type { NextRequest } from 'next/server';

/**
 * POST /api/token/verify
 *
 * Internal-only endpoint used by the FastAPI agents server to validate
 * a session token without making a GraphQL call.
 *
 * Protected by a shared internal API key (X-Internal-API-Key header).
 * Returns only the minimal user fields FastAPI needs — no profile data,
 * no sensitive fields.
 *
 * Environment variables required:
 *   INTERNAL_API_KEY  — generate with `openssl rand -hex 32` and set on
 *                       both the Next.js and FastAPI sides.
 */
export async function POST(request: NextRequest) {
    // 1. Validate internal API key
    const apiKey = request.headers.get('X-Internal-API-Key');
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
        console.error('[/api/token/verify] INTERNAL_API_KEY env var not set');
        return Response.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (!apiKey || apiKey !== expectedKey) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse request body
    let token: string | undefined;
    try {
        const body = await request.json();
        token = body?.token;
    } catch {
        return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!token || typeof token !== 'string') {
        return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    // 3. Verify the session
    try {
        const { valid, user } = await verifySession(token);

        if (!valid || !user) {
            return Response.json({ valid: false, user: null }, { status: 200 });
        }

        // Return only what FastAPI needs — never profile or sensitive data
        return Response.json({
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                verified: user.verified,
                kycVerified: user.kycVerified,
            },
        });
    } catch (error) {
        console.error('[/api/token/verify] Error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
