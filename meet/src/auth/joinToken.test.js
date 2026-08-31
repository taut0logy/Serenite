import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';

import config from '../config/index.js';
import { verifyJoinToken, mintReconnectToken, verifyReconnectToken } from './joinToken.js';

// This service never mints join tokens; Serenite does, because only Serenite
// knows about group membership, severity bands and risk status. So these tests
// mint the way Serenite does and check what this side refuses.

const secret = new TextEncoder().encode(config.joinToken.secret);

function mint({ typ = 'join', ttl = '120s', key = secret, ...claims } = {}) {
    return new SignJWT({ typ, mid: 'meeting-1', name: 'Someone', role: 'MEMBER', ...claims })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(claims.sub ?? 'user-1')
        .setJti(claims.jti ?? randomUUID())
        .setIssuedAt()
        .setExpirationTime(ttl)
        .sign(key);
}

test('accepts a well-formed join token and unpacks its claims', async () => {
    const claim = await verifyJoinToken(await mint({ sub: 'user-7', mid: 'meeting-9', approve: true }));

    assert.equal(claim.kind, 'join');
    assert.equal(claim.sub, 'user-7');
    assert.equal(claim.meetingId, 'meeting-9');
    assert.equal(claim.approve, true);
});

test('approve defaults to false rather than being merely absent', async () => {
    // The claim gates admitting other people. Anything other than an explicit
    // true has to read as no.
    const claim = await verifyJoinToken(await mint({ approve: 'yes' }));
    assert.equal(claim.approve, false);
});

test('rejects a token signed with the wrong key', async () => {
    const forged = await mint({ key: new TextEncoder().encode('a'.repeat(48)) });
    await assert.rejects(() => verifyJoinToken(forged), /invalid or expired/);
});

test('rejects a token whose signature has been tampered with', async () => {
    const token = await mint();
    const [header, payload, signature] = token.split('.');
    const flipped = signature.slice(0, -2) + (signature.slice(-2) === 'AA' ? 'BB' : 'AA');
    await assert.rejects(() => verifyJoinToken(`${header}.${payload}.${flipped}`), /invalid or expired/);
});

test('rejects an expired token', async () => {
    const stale = await mint({ ttl: '-10s' });
    await assert.rejects(() => verifyJoinToken(stale), /invalid or expired/);
});

test('rejects a reconnect token presented as a join token', async () => {
    // A reconnect token is long-lived and readable from the client's session
    // storage. Without the type check it would double as a join token forever.
    const reconnect = await mintReconnectToken({ pid: 'peer-1', mid: 'meeting-1', sid: 'sess-1' });
    await assert.rejects(() => verifyJoinToken(reconnect), /Wrong token type/);
});

test('rejects a second use of the same token', async () => {
    const token = await mint();
    await verifyJoinToken(token);
    await assert.rejects(() => verifyJoinToken(token), /already been used/);
});

test('replay is keyed on jti, so a distinct token still works', async () => {
    await verifyJoinToken(await mint({ sub: 'user-a' }));
    const second = await verifyJoinToken(await mint({ sub: 'user-b' }));
    assert.equal(second.sub, 'user-b');
});

test('carries the auth session through, and null when absent', async () => {
    // Attendance is recorded per device against a unique constraint the app
    // already maintains, so this has to survive verification intact.
    assert.equal((await verifyJoinToken(await mint({ sid: 'sess-42' }))).authSessionId, 'sess-42');
    assert.equal((await verifyJoinToken(await mint())).authSessionId, null);
});

test('round-trips a reconnect token', async () => {
    const token = await mintReconnectToken({ pid: 'peer-3', mid: 'meeting-3', sid: 'sess-3' });
    const claim = await verifyReconnectToken(token);

    assert.equal(claim.kind, 'reconnect');
    assert.equal(claim.peerId, 'peer-3');
    assert.equal(claim.meetingId, 'meeting-3');
});

test('rejects a join token presented as a reconnect token', async () => {
    const join = await mint();
    await assert.rejects(() => verifyReconnectToken(join), /Wrong token type/);
});
