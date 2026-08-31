import config from '../config/index.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[config.log.level] ?? LEVELS.info;

function log(level, msg, meta) {
  if (LEVELS[level] > currentLevel) return;
  const entry = { ts: new Date().toISOString(), level, msg };
  if (meta && typeof meta === 'object') {
    for (const k of Object.keys(meta)) {
      const v = meta[k];
      if (v instanceof Error) {
        entry[k] = { name: v.name, message: v.message };
      } else if (typeof v === 'string' && v.length > 500) {
        entry[k] = v.slice(0, 500) + '…';
      } else {
        entry[k] = v;
      }
    }
  }
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
  child: (context) => ({
    error: (msg, meta) => log('error', msg, { ...context, ...meta }),
    warn: (msg, meta) => log('warn', msg, { ...context, ...meta }),
    info: (msg, meta) => log('info', msg, { ...context, ...meta }),
    debug: (msg, meta) => log('debug', msg, { ...context, ...meta }),
  }),
};

export default logger;
