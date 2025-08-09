/**
 * App API endpoint for managing user public keys
 * Route: /api/encryption/public-key
 */

import { currentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/encryption-storage';

export async function POST(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId, publicKey, createdAt } = body;

        if (!publicKey) {
            return NextResponse.json({ error: 'Public key is required' }, { status: 400 });
        }

        storageService.setPublicKey(userId, publicKey, createdAt);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Public key API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const userKey = storageService.getPublicKey(userId);

        if (!userKey) {
            return NextResponse.json({ error: 'Public key not found' }, { status: 404 });
        }

        return NextResponse.json(userKey);

    } catch (error) {
        console.error('Public key API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
