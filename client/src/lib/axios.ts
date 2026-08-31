import axiosBase, { AxiosInstance } from 'axios';

// Create the base Axios instance
// Points to the Next.js proxy route for client-side calls,
// and directly to FastAPI for server-side calls.
const axios: AxiosInstance = axiosBase.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add authentication token
axios.interceptors.request.use(
    async (config) => {
        try {
            if (typeof window === 'undefined') {
                // ── Server-side (server components, actions, API routes) ──
                // Read the raw DB token from the server-side JWT cookie.
                // It never touches the client.
                const { headers } = await import('next/headers');
                const reqHeaders = await headers();
                const cookieHeader = reqHeaders.get('cookie') ?? undefined;
                const { getToken } = await import('next-auth/jwt');
                // getToken only reads the cookie header off req; the rest of
                // the Next request shape is irrelevant here.
                const jwt = await getToken({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    req: { headers: { cookie: cookieHeader } } as any,
                    secret: process.env.AUTH_SECRET!,
                });
                if (jwt?.accessToken) {
                    config.headers.Authorization = `Bearer ${jwt.accessToken}`;
                }
                // Direct FastAPI call server-side
                config.baseURL = process.env.FASTAPI_URL || 'http://localhost:8000/api/v1';
            } else {
                // ── Client-side ──
                // Route through the Next.js proxy — the proxy attaches the token server-side.
                config.baseURL = '/api/proxy';
            }
        } catch (error) {
            console.error('Error getting session for API request:', error);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle authentication errors
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (typeof window !== 'undefined') {
                console.warn('Session expired, please log in again');
                // Optionally redirect: window.location.href = '/auth/login';
            }
        }

        return Promise.reject(error);
    }
);

export default axios;