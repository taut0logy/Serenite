'use server';

import { currentUser } from '@/lib/auth';
import { StreamChat } from 'stream-chat';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
const STREAM_SECRET_KEY = process.env.STREAM_SECRET_KEY!;

export const tokenProvider = async () => {
    const user = await currentUser();

    if (!user) throw new Error('User is not authenticated');
    if (!STREAM_API_KEY) throw new Error('Stream API key secret is missing');
    if (!STREAM_SECRET_KEY) throw new Error('Stream API secret is missing');

    const streamChat = StreamChat.getInstance(STREAM_API_KEY, STREAM_SECRET_KEY);

    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const issuedAt = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

    const token = streamChat.createToken(user.id, expirationTime, issuedAt);

    return token;
};
