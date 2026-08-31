import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';

import config from './config/index.js';
import logger from './lib/logger.js';
import { closePool, verifyConnection } from './db/client.js';
import { endOrphanedMeetings, reconcileOrphanedSessions } from './db/queries.js';
import { WorkerPool } from './sfu/workerPool.js';
import { RoomManager } from './sfu/roomManager.js';
import { attachSignalingNamespace } from './signaling/namespace.js';

// The selective forwarding unit and its signaling namespace. Serenite's
// Next.js app owns identity, group membership and admission; this process
// owns media. The only thing crossing between them is a short-lived, signed
// join token, verified here without a callback.

await verifyConnection();
logger.info('database reachable');

// A previous process holding rooms was killed without ending them. Those rows
// still read as a live participant, which would make overlap control refuse
// the member's next join, so they are closed before anyone can connect.
const [orphanedMeetings, orphanedSessions] = await Promise.all([
  endOrphanedMeetings(),
  reconcileOrphanedSessions(),
]);
if (orphanedMeetings.length > 0 || orphanedSessions > 0) {
  logger.warn('reconciled state left by a previous process', {
    meetingsEnded: orphanedMeetings.length,
    sessionsClosed: orphanedSessions,
  });
}

const workerPool = new WorkerPool();
await workerPool.start();

const roomManager = new RoomManager(workerPool);

workerPool.onWorkerDied = (entry) => {
  roomManager
    .forceCloseRoomsOnWorker(entry.id)
    .catch((error) => logger.error('failed to close rooms of a dead worker', { error: error.message }));
};

const app = express();
app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    workers: workerPool.size(),
    rooms: roomManager.rooms.size,
  });
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: config.clientOrigin, credentials: true },
  // Media is carried over WebRTC; this channel only moves small control
  // messages, so the default buffer is more than enough.
  maxHttpBufferSize: 1e5,
});

attachSignalingNamespace(io, roomManager);

server.listen(config.port, () => {
  logger.info('meet service listening', { port: config.port, env: config.env });
});

async function shutdown(signal) {
  logger.info('shutting down', { signal });
  // Close rooms first so participants are told the meeting ended rather than
  // being dropped, and so meeting rows do not stay stuck at RUNNING.
  await Promise.allSettled(
    [...roomManager.rooms.values()].map((room) => roomManager.closeRoom(room, 'server_shutdown'))
  );
  await workerPool.close();
  io.close();
  server.close();
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
