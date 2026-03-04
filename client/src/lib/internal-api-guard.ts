import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the X-Internal-API-Key header against the INTERNAL_API_KEY env var.
 * Returns a 403 Response on failure, or null on success.
 *
 * Usage:
 *   const deny = validateInternalKey(request);
 *   if (deny) return deny;
 */
export function validateInternalKey(
    request: NextRequest
): NextResponse | null {
    const expected = process.env.INTERNAL_API_KEY;

    if (!expected) {
        console.error('[email-api] INTERNAL_API_KEY env var is not set');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const provided = request.headers.get('X-Internal-API-Key');
    if (provided !== expected) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null; // key valid
}
