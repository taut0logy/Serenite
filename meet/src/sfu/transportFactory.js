import config from '../config/index.js';

// Phase A spec §3.1 / §5.5. Every transport is bound to its worker's single
// WebRtcServer (architecture D9) — no per-transport port allocation. Uplink
// is capped only on the send direction; recv transports get 'bwe' trace
// events enabled for the Milestone A3 bandwidth governor.

export async function createWebRtcTransport({ room, workerPool, direction }) {
  const workerEntry = workerPool.get(room.workerId);
  if (!workerEntry) throw new Error(`Worker ${room.workerId} not found for meeting ${room.meetingId}`);

  const transport = await room.router.createWebRtcTransport({
    webRtcServer: workerEntry.webRtcServer,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 800_000,
  });

  if (direction === 'send') {
    await transport.setMaxIncomingBitrate(config.meeting.maxUplinkBitrate).catch(() => {});
  } else {
    await transport.enableTraceEvent(['bwe']).catch(() => {});
  }

  return transport;
}
