import pg from 'pg';
import config from '../config/index.js';
import logger from '../lib/logger.js';

// Plain pg rather than a second Prisma client. This service touches a handful
// of rows in Serenite's database, all of them listed in queries.js; giving it
// its own Prisma client would mean either duplicating schema.prisma or
// cross-importing it, plus a generate step in the container build, for six
// statements. Serenite's schema.prisma stays the single definition.

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (error) => {
  // An idle client failing is not fatal: the pool replaces it. Logged rather
  // than thrown so a transient database blip cannot take down a live call.
  logger.error('idle postgres client error', { error: error.message });
});

export async function query(text, params) {
  return pool.query(text, params);
}

/** Runs `fn` inside a transaction, rolling back on any throw. */
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyConnection() {
  await pool.query('SELECT 1');
}

export async function closePool() {
  await pool.end();
}
