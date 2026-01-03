import type { NextApiRequest } from "next"
import { Server } from "socket.io"
import { type NextApiResponseWithSocket } from "@/app/typings/platform";
import { verifySession } from '@/actions/auth.actions';

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
            socket.data.name = user.profile?.firstName

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
        socket.on('join-meeting-chat', async (data: { meetingId: string }) => {
            const { meetingId } = data;
            const userId = socket.data.userId;
            const userName = socket.data.name;

            console.log(`[Chat] User ${userName} joined meeting chat: ${meetingId}`);

            // Join the meeting room
            socket.join(`meeting:${meetingId}`);

            // Load and send chat history to the joining user
            try {
                const prisma = (await import('@/lib/prisma')).default;
                const messages = await prisma.message.findMany({
                    where: { meetingId },
                    include: {
                        sender: {
                            include: {
                                profile: true,
                            },
                        },
                        replyTo: {
                            include: {
                                sender: {
                                    include: {
                                        profile: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                });

                const formattedMessages = messages.map((msg) => ({
                    id: msg.id,
                    userId: msg.senderId,
                    userName: msg.sender.profile?.firstName || 'Unknown',
                    userAvatar: msg.sender.profile?.avatarUrl || undefined,
                    content: msg.isDeleted ? '' : msg.content,
                    timestamp: msg.createdAt.toISOString(),
                    meetingId: msg.meetingId,
                    isDeleted: msg.isDeleted,
                    replyTo: msg.replyTo ? {
                        id: msg.replyTo.id,
                        userName: msg.replyTo.sender?.profile?.firstName || 'Unknown',
                        content: msg.replyTo.isDeleted ? '' : msg.replyTo.content,
                    } : undefined,
                }));

                socket.emit('chat-history', formattedMessages);
                console.log(`[Chat] Sent ${formattedMessages.length} history messages to ${userName}`);
            } catch (error) {
                console.error('[Chat] Error loading chat history:', error);
            }

            // Notify others in the meeting that user joined
            socket.to(`meeting:${meetingId}`).emit('user-joined-meeting', {
                userId,
                userName,
                meetingId
            });
        });

        socket.on('leave-meeting-chat', (data: { meetingId: string }) => {
            const { meetingId } = data;
            const userId = socket.data.userId;
            const userName = socket.data.name;

            console.log(`[Chat] User ${userName} left meeting chat: ${meetingId}`);

            // Leave the meeting room
            socket.leave(`meeting:${meetingId}`);

            // Notify others in the meeting that user left
            socket.to(`meeting:${meetingId}`).emit('user-left-meeting', {
                userId,
                userName,
                meetingId
            });
        });

        socket.on('send-chat-message', async (data: {
            userId: string;
            userName: string;
            userAvatar?: string;
            content: string;
            meetingId: string;
            replyTo?: {
                id: string;
                userName: string;
                content: string;
            };
        }) => {
            const { meetingId, content, userName, userAvatar, replyTo } = data;
            const userId = socket.data.userId;

            // Validate that the user is authorized to send messages in this meeting
            if (data.userId !== userId) {
                console.error(`[Chat] User ID mismatch: ${userId} vs ${data.userId}`);
                return;
            }

            try {
                const prisma = (await import('@/lib/prisma')).default;
                
                // Save message to database
                const savedMessage = await prisma.message.create({
                    data: {
                        senderId: userId,
                        meetingId: meetingId,
                        content: content.trim(),
                        replyToId: replyTo?.id || null,
                    },
                    include: {
                        sender: {
                            include: {
                                profile: true,
                            },
                        },
                        replyTo: {
                            include: {
                                sender: {
                                    include: {
                                        profile: true,
                                    },
                                },
                            },
                        },
                    },
                });

                const messagePayload = {
                    id: savedMessage.id,
                    userId,
                    userName: savedMessage.sender.profile?.firstName || userName,
                    userAvatar: savedMessage.sender.profile?.avatarUrl || userAvatar,
                    content: content.trim(),
                    timestamp: savedMessage.createdAt.toISOString(),
                    meetingId,
                    isDeleted: false,
                    replyTo: savedMessage.replyTo ? {
                        id: savedMessage.replyTo.id,
                        userName: savedMessage.replyTo.sender?.profile?.firstName || 'Unknown',
                        content: savedMessage.replyTo.isDeleted ? '' : savedMessage.replyTo.content,
                    } : undefined,
                };

                console.log(`[Chat] Message saved and sent from ${userName} in meeting ${meetingId}`);

                // Broadcast message to all users in the meeting room (including sender)
                io.to(`meeting:${meetingId}`).emit('chat-message', messagePayload);
            } catch (error) {
                console.error('[Chat] Error saving message:', error);
            }
        });

        // Delete chat message handler
        socket.on('delete-chat-message', async (data: {
            messageId: string;
            meetingId: string;
        }) => {
            const { messageId, meetingId } = data;
            const userId = socket.data.userId;
            const roomName = `meeting:${meetingId}`;

            console.log(`[Chat Delete] Received delete request for message: ${messageId}`);

            try {
                const prisma = (await import('@/lib/prisma')).default;
                
                // Verify ownership and update message
                const message = await prisma.message.findUnique({
                    where: { id: messageId },
                });

                if (!message) {
                    console.error(`[Chat Delete] Message not found: ${messageId}`);
                    return;
                }

                if (message.senderId !== userId) {
                    console.error(`[Chat Delete] User ${userId} cannot delete message owned by ${message.senderId}`);
                    return;
                }

                // Soft delete the message
                await prisma.message.update({
                    where: { id: messageId },
                    data: {
                        isDeleted: true,
                        content: '[deleted]',
                    },
                });

                console.log(`[Chat Delete] Message ${messageId} deleted from DB`);

                // Broadcast delete event to all users in the meeting room
                io.to(roomName).emit('chat-message-deleted', {
                    messageId,
                    deletedBy: userId,
                    meetingId,
                    timestamp: new Date().toISOString(),
                });

                console.log(`[Chat Delete] Broadcasted delete to room: ${roomName}`);
            } catch (error) {
                console.error('[Chat Delete] Error deleting message:', error);
            }
        });

        // Encrypted chat message handler
        socket.on('send-encrypted-chat-message', (data: {
            userId: string;
            userName: string;
            userAvatar?: string;
            encryptedContent: {
                encryptedContent: string;
                iv: string;
                tag: string;
            };
            meetingId: string;
            keyVersion: number;
        }) => {
            const { meetingId, encryptedContent, userName, userAvatar, keyVersion } = data;
            const userId = socket.data.userId;

            // Validate that the user is authorized to send messages in this meeting
            if (data.userId !== userId) {
                console.error(`[Encrypted Chat] User ID mismatch: ${userId} vs ${data.userId}`);
                return;
            }

            const messagePayload = {
                id: `enc_msg_${Date.now()}_${userId}`, // Simple ID generation
                userId,
                userName,
                userAvatar,
                encryptedContent,
                timestamp: new Date().toISOString(),
                meetingId,
                keyVersion
            };

            console.log(`[Encrypted Chat] Encrypted message from ${userName} in meeting ${meetingId}`);

            // Broadcast encrypted message to all users in the meeting room (including sender)
            io.to(`meeting:${meetingId}`).emit('encrypted-chat-message', messagePayload);

            // Optional: Store encrypted message in database here
            // await saveEncryptedMessageToDatabase(messagePayload);
        });

        // Group key rotation handler
        socket.on('group-key-rotated', (data: {
            meetingId: string;
            newMemberId?: string;
            removedMemberId?: string;
        }) => {
            const { meetingId, newMemberId, removedMemberId } = data;
            const userId = socket.data.userId;

            console.log(`[Key Rotation] Key rotated for meeting ${meetingId} by ${userId}`);

            // Notify all members in the meeting about key rotation
            socket.to(`meeting:${meetingId}`).emit('group-key-rotated', {
                meetingId,
                rotatedBy: userId,
                newMemberId,
                removedMemberId,
                timestamp: new Date().toISOString()
            });
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
