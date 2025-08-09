/**
 * App API endpoint for fetching group encryption key for a specific user
 * Route: /api/encryption/group-keys/[groupId]/[userId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { storageService } from '@/lib/encryption-storage';

export async function GET(
    request: NextRequest,
    { params }: { params: { groupId: string; userId: string } }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { groupId, userId } = params;

        if (!groupId || !userId) {
            return NextResponse.json({ error: 'groupId and userId are required' }, { status: 400 });
        }

        const userKey = storageService.getGroupKey(groupId, userId);

        if (!userKey) {
            return NextResponse.json({ error: 'User key not found in group' }, { status: 404 });
        }

        return NextResponse.json({
            groupId,
            encryptedAESKey: userKey.encryptedKey,
            keyVersion: userKey.keyVersion,
            createdAt: userKey.createdAt,
        });

    } catch (error) {
        console.error('Group key fetch API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
