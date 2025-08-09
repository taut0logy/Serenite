/**
 * App API endpoint for fetching multiple user public keys
 * Route: /api/encryption/public-keys
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
        const { userIds } = body;

        if (!Array.isArray(userIds)) {
            return NextResponse.json({ error: 'userIds must be an array' }, { status: 400 });
        }

        const publicKeys = storageService.getPublicKeys(userIds);

        return NextResponse.json(publicKeys);

    } catch (error) {
        console.error('Public keys API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
