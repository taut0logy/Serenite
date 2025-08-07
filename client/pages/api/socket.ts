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

        // Meeting Chat Events
        socket.on('join-meeting-chat', (data: { meetingId: string }) => {
            const { meetingId } = data;
            const userId = socket.data.userId;
            const userEmail = socket.data.email;

            console.log(`[Chat] User ${userEmail} joined meeting chat: ${meetingId}`);

            // Join the meeting room
            socket.join(`meeting:${meetingId}`);

            // Notify others in the meeting that user joined
            socket.to(`meeting:${meetingId}`).emit('user-joined-meeting', {
                userId,
                userName: userEmail, // You might want to get full name from user profile
                meetingId
            });
        });

        socket.on('leave-meeting-chat', (data: { meetingId: string }) => {
            const { meetingId } = data;
            const userId = socket.data.userId;
            const userEmail = socket.data.email;

            console.log(`[Chat] User ${userEmail} left meeting chat: ${meetingId}`);

            // Leave the meeting room
            socket.leave(`meeting:${meetingId}`);

            // Notify others in the meeting that user left
            socket.to(`meeting:${meetingId}`).emit('user-left-meeting', {
                userId,
                userName: userEmail,
                meetingId
            });
        });

        socket.on('send-chat-message', (data: {
            userId: string;
            userName: string;
            userAvatar?: string;
            content: string;
            meetingId: string;
        }) => {
            const { meetingId, content, userName, userAvatar } = data;
            const userId = socket.data.userId;

            // Validate that the user is authorized to send messages in this meeting
            if (data.userId !== userId) {
                console.error(`[Chat] User ID mismatch: ${userId} vs ${data.userId}`);
                return;
            }

            const messagePayload = {
                id: `msg_${Date.now()}_${userId}`, // Simple ID generation
                userId,
                userName,
                userAvatar,
                content: content.trim(),
                timestamp: new Date().toISOString(),
                meetingId
            };

            console.log(`[Chat] Message from ${userName} in meeting ${meetingId}: ${content}`);

            // Broadcast message to all users in the meeting room (including sender)
            io.to(`meeting:${meetingId}`).emit('chat-message', messagePayload);

            // Optional: Store message in database here
            // await saveMessageToDatabase(messagePayload);
        });

        socket.on('disconnect', () => {
            console.log('[socket] client disconnected')

            // Clean up: Leave all meeting rooms
            const rooms = Array.from(socket.rooms);
            rooms.forEach(room => {
                if (room.startsWith('meeting:')) {
                    const meetingId = room.replace('meeting:', '');
                    socket.to(room).emit('user-left-meeting', {
                        userId: socket.data.userId,
                        userName: socket.data.email,
                        meetingId
                    });
                }
            });
        });
    });

    // Monkey patching to access socket instance globally.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).io = io
    res.socket.server.io = io;
    res.end();

    res.send({});
}
