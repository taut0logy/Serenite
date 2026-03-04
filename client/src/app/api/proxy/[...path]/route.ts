import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/**
 * Next.js → FastAPI proxy
 *
 * Purpose: Client-side code cannot safely attach a Bearer token (the raw DB
 * session token must never appear in the browser). Instead, client code calls
 * /api/proxy/<path> which runs server-side, reads the token from the encrypted
 * JWT cookie via getToken(), and forwards the request to FastAPI with the
 * Authorization header attached.
 *
 * Usage (Axios from browser): `axios.post('/api/proxy/agents/chat', body)`
 * which proxies to:           `http://fastapi/api/v1/agents/chat`
 */
async function proxyRequest(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    // Authenticate via the server-side JWT (the encrypted cookie)
    const jwt = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET!,
    });

    if (!jwt?.accessToken) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const targetPath = resolvedParams.path.join('/');
    const targetUrl = `${FASTAPI_URL}/api/v1/${targetPath}${
        request.nextUrl.search ? request.nextUrl.search : ''
    }`;

    // Forward the request to FastAPI
    const body = request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.text()
        : undefined;

    const upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers: {
            'Content-Type': request.headers.get('Content-Type') || 'application/json',
            'Authorization': `Bearer ${jwt.accessToken}`,
            // Forward any custom headers the client sent (except auth/cookie)
            ...(request.headers.get('X-Request-ID')
                ? { 'X-Request-ID': request.headers.get('X-Request-ID')! }
                : {}),
        },
        body,
    });

    // Stream the body back to the client
    const responseBody = await upstreamResponse.text();

    return new Response(responseBody, {
        status: upstreamResponse.status,
        headers: {
            'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json',
        },
    });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
