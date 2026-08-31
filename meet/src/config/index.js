import 'dotenv/config';
import { z } from 'zod';

// Every environment variable this service reads, validated once at boot. If
// this throws, the process must not start: a media server that comes up with a
// wrong announced address looks healthy and never actually connects anyone.

const booleanFromEnv = (defaultValue) =>
  z
    .enum(['true', 'false', '1', '0', ''])
    .optional()
    .transform((v) => (v === undefined || v === '' ? defaultValue : v === 'true' || v === '1'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  SFU_PORT: z.coerce.number().int().positive().default(4100),
  CLIENT_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().url()).min(1, 'CLIENT_ORIGIN must contain at least one valid URL')),

  // The same Postgres the Next.js app uses. This service reads meeting and
  // group configuration and writes attendance; Serenite's schema.prisma
  // remains the single definition of both.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Shared with the Next.js app, which mints the tokens this service verifies.
  // Verification is local: no callback, no database round-trip on join.
  JOIN_TOKEN_SECRET: z.string().min(16, 'JOIN_TOKEN_SECRET must be set to a real secret'),

  // `listenInfos` does not expand 0.0.0.0 into real interface addresses, so
  // the ICE candidate address always comes from announcedAddress. Production
  // must set it explicitly; falling back silently would produce a deployment
  // that looks fine and never connects.
  MEDIASOUP_ANNOUNCED_ADDRESS: z.string().optional(),
  MEDIASOUP_RTC_BASE_PORT: z.coerce.number().int().positive().default(44440),
  MEDIASOUP_WORKERS: z.string().default('auto'),
  MEDIASOUP_LOG_LEVEL: z.enum(['debug', 'warn', 'error', 'none']).default('warn'),

  MAX_PARTICIPANTS: z.coerce.number().int().positive().default(12),
  MAX_UPLINK_BITRATE: z.coerce.number().int().positive().default(2_500_000),
  CONSUMER_IDLE_CLOSE_MS: z.coerce.number().int().positive().default(30_000),
  PEER_RECONNECT_GRACE_MS: z.coerce.number().int().positive().default(30_000),
  SCREEN_SHARE_MAX_CONCURRENT: z.coerce.number().int().positive().default(2),
  CHAT_HISTORY_LIMIT: z.coerce.number().int().positive().default(500),
  AUDIO_TOP_N: z.coerce.number().int().positive().default(5),
  SPOKE_RECENTLY_MS: z.coerce.number().int().positive().default(30_000),

  // Whether a signed-in member may hold at most one admitted peer, in at most
  // one room, at a time.
  SINGLE_MEETING_ENABLED: booleanFromEnv(true),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment for the meet service:\n${issues}`);
}

const env = parsed.data;

const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.SFU_PORT,
  clientOrigin: env.CLIENT_ORIGIN,
  databaseUrl: env.DATABASE_URL,
  log: { level: env.LOG_LEVEL },
  joinToken: { secret: env.JOIN_TOKEN_SECRET },
  mediasoupLogLevel: env.MEDIASOUP_LOG_LEVEL,
  mediasoup: {
    announcedAddress: env.MEDIASOUP_ANNOUNCED_ADDRESS,
    rtcBasePort: env.MEDIASOUP_RTC_BASE_PORT,
    workers: env.MEDIASOUP_WORKERS,
  },
  meeting: {
    maxParticipants: env.MAX_PARTICIPANTS,
    maxUplinkBitrate: env.MAX_UPLINK_BITRATE,
    consumerIdleCloseMs: env.CONSUMER_IDLE_CLOSE_MS,
    peerReconnectGraceMs: env.PEER_RECONNECT_GRACE_MS,
    screenShareMaxConcurrent: env.SCREEN_SHARE_MAX_CONCURRENT,
    chatHistoryLimit: env.CHAT_HISTORY_LIMIT,
    audioTopN: env.AUDIO_TOP_N,
    spokeRecentlyMs: env.SPOKE_RECENTLY_MS,
    singleMeetingEnabled: env.SINGLE_MEETING_ENABLED,
  },
};

export default config;
