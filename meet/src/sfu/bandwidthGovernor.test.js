import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import {
    extractAvailableBitrate,
    levelForBitrate,
    attachBandwidthGovernor,
} from './bandwidthGovernor.js';

// The governor decides when a call drops prefetch, caps spatial layers, or
// goes audio-only. Degrading is immediate; recovering waits. These pin that
// asymmetry, because getting it backwards makes the grid oscillate on exactly
// the connections least able to afford it.

const RECOVERY_HOLD_MS = 5000;

function harness() {
    const transport = new EventEmitter();
    const peer = { id: 'peer-1', recvTransport: transport, bandwidthLevel: 0, socket: { emit() {} } };
    const advice = [];
    peer.socket.emit = (event, payload) => advice.push({ event, payload });

    const roomManager = { refreshPeerConsumers: async () => {} };
    attachBandwidthGovernor(peer, {}, roomManager);

    // The governor clocks hysteresis off the event's own timestamp rather than
    // wall clock, which is what lets this run without waiting five seconds.
    const trace = (availableBitrate, timestamp) =>
        transport.emit('trace', { type: 'bwe', timestamp, info: { availableBitrate } });

    return { peer, trace, advice };
}

test('reads availableBitrate, falling back to desiredBitrate', () => {
    assert.equal(extractAvailableBitrate({ availableBitrate: 900_000 }), 900_000);
    assert.equal(extractAvailableBitrate({ desiredBitrate: 400_000 }), 400_000);
});

test('returns null for a shape it does not recognise', () => {
    // Never act on a guess: an unrecognised trace must leave the level alone
    // rather than degrade somebody who is fine.
    assert.equal(extractAvailableBitrate(null), null);
    assert.equal(extractAvailableBitrate({}), null);
    assert.equal(extractAvailableBitrate('600000'), null);
});

test('maps bitrate onto the degradation ladder', () => {
    assert.equal(levelForBitrate(2_000_000), 0);
    assert.equal(levelForBitrate(600_000), 0);
    assert.equal(levelForBitrate(599_999), 1);
    assert.equal(levelForBitrate(150_000), 1);
    assert.equal(levelForBitrate(149_999), 2);
});

test('degrades on the first bad estimate, without waiting', () => {
    const { peer, trace } = harness();
    trace(100_000, 1000);
    assert.equal(peer.bandwidthLevel, 2);
});

test('does not recover on a single good estimate', () => {
    const { peer, trace } = harness();
    trace(100_000, 1000);
    trace(2_000_000, 1500);
    assert.equal(peer.bandwidthLevel, 2, 'one good sample is not evidence the link recovered');
});

test('recovers only after the estimate holds for the full window', () => {
    const { peer, trace } = harness();
    trace(100_000, 0);

    // The window is measured from the first good estimate, not from the moment
    // things went bad: the link has to demonstrate it is better for five
    // seconds, and the first good sample is the start of that demonstration.
    trace(2_000_000, 1000);
    assert.equal(peer.bandwidthLevel, 2);

    trace(2_000_000, 1000 + RECOVERY_HOLD_MS - 1);
    assert.equal(peer.bandwidthLevel, 2, 'one millisecond short still counts as short');

    trace(2_000_000, 1000 + RECOVERY_HOLD_MS);
    assert.equal(peer.bandwidthLevel, 0);
});

test('a dip during recovery restarts the clock', () => {
    const { peer, trace } = harness();
    trace(100_000, 0);
    trace(2_000_000, 1000);
    trace(100_000, 3000);
    trace(2_000_000, 5000);

    // 5000 is past the original window but only 2000ms into the new one.
    assert.equal(peer.bandwidthLevel, 2);
});

test('ignores a trace whose bitrate cannot be read', () => {
    const { peer } = harness();
    peer.recvTransport.emit('trace', { type: 'bwe', timestamp: 1000, info: { bweType: 'unknown' } });
    assert.equal(peer.bandwidthLevel, 0);
});

test('ignores non-bwe trace events', () => {
    const { peer } = harness();
    peer.recvTransport.emit('trace', { type: 'probation', timestamp: 1000, info: { availableBitrate: 1000 } });
    assert.equal(peer.bandwidthLevel, 0);
});

test('tells the client why the quality changed', () => {
    const { trace, advice } = harness();
    trace(100_000, 0);
    trace(2_000_000, 1000);
    trace(2_000_000, 1000 + RECOVERY_HOLD_MS);

    assert.deepEqual(
        advice.map((a) => a.payload.reason),
        ['low_bandwidth', 'recovered']
    );
});

test('does not re-emit advice when the level is unchanged', () => {
    const { trace, advice } = harness();
    trace(100_000, 1000);
    trace(100_000, 2000);
    trace(100_000, 3000);
    assert.equal(advice.length, 1);
});

test('attaching without a receive transport is a no-op, not a crash', () => {
    const peer = { id: 'peer-2', recvTransport: null, bandwidthLevel: 0 };
    assert.doesNotThrow(() => attachBandwidthGovernor(peer, {}, {}));
});
