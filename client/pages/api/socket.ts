import type { NextApiRequest } from "next"
import { Server } from "socket.io"
import { type NextApiResponseWithSocket } from "@/app/typings/platform";
import { verifySession } from '@/services/auth.service';

export default function SocketHandler(_req: NextApiRequest, res: NextApiResponseWithSocket) {
    if (res.socket.server.io) {
        res.end();
        return;
    }
    const io = new Server(res.socket.server, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
            origin: '*',
            credentials: true,
            methods: ['GET', 'POST'],
        },
    })

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token

            if (!token) {
                console.error('❌ [Socket] No authentication token provided')
                return next(new Error('Authentication token required'))
            }

            // Verify the session token
            const { valid, user } = await verifySession(token)

            if (!valid || !user) {
                console.error('❌ [Socket] Invalid authentication token')
                return next(new Error('Invalid authentication token'))
            }

            // Attach user data to socket
            socket.data.userId = user.id
            socket.data.email = user.email

            console.log(`✅ [Socket] User authenticated: ${user.email} (${user.id})`)
            next()
        } catch (error) {
            console.error('❌ [Socket] Authentication error:', error)
            next(new Error('Socket Authentication failed'))
        }
    })

    io.on('connection', (socket) => {
        console.log('[socket] client connected', socket.id)

        socket.on('ping', (data) => {
            console.log('[socket]', data)
            socket.emit('pong', { time: Date.now() })
        })
        socket.on("test:echo", (data) => {
            console.info(`[Socket Test] Received test:echo:`, data);
            socket.emit("test:echo:response", {
                received: data,
                serverTime: new Date().toISOString(),
            });
        });

        socket.on("test:broadcast", (data) => {
            console.info(`[Socket Test] Broadcasting:`, data);
            io.emit("test:broadcast:response", {
                broadcasted: data,
                serverTime: new Date().toISOString(),
            });
        });

        socket.on('disconnect', () =>
            console.log('[socket] client disconnected')
        )
    });

    // Monkey patching to access socket instance globally.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).io = io
    res.socket.server.io = io;
    res.end();

    res.send({});
}
