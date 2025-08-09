/**
 * App API endpoint for managing group encryption keys
 * Route: /api/encryption/group-keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { storageService } from '@/lib/encryption-storage';

export async function POST(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { groupId, encryptedKeys, keyVersion } = body;

        if (!groupId || !Array.isArray(encryptedKeys) || typeof keyVersion !== 'number') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        // Store encrypted keys for each user
        storageService.setGroupKeys(groupId, encryptedKeys, keyVersion);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Group keys API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
