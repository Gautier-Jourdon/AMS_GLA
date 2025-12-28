import fs from 'fs/promises';
import path from 'path';

const LOG_TO_FILE = process.env.LOG_TO_FILE === '1' || process.env.LOG_TO_FILE === 'true';
const LOG_PATH = process.env.LOG_PATH || path.join(process.cwd(), 'logs', 'app.log');
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = process.env.LOG_LEVEL || 'debug';

function ts() { return new Date().toISOString(); }

async function maybeWrite(text) {
  if (!LOG_TO_FILE) return;
  try {
    await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
    await fs.appendFile(LOG_PATH, text + '\n', 'utf8');
  } catch (e) {/* best-effort */}
}

function format(level, msg, meta) {
  const base = `[${ts()}] [${level.toUpperCase()}] ${msg}`;
  if (!meta) return base;
  try { return base + ' ' + (typeof meta === 'string' ? meta : JSON.stringify(meta)); } catch(e) { return base + ' [meta]'; }
}

function log(level, msg, meta) {
  if (LEVELS[level] > LEVELS[CURRENT_LEVEL]) return;
  const out = format(level, msg, meta);
  if (level === 'error') console.error(out); else console.log(out);
  maybeWrite(out).catch(() => {});
}

export default {
  info: (m, meta) => log('info', m, meta),
  warn: (m, meta) => log('warn', m, meta),
  error: (m, meta) => log('error', m, meta),
  debug: (m, meta) => log('debug', m, meta),
};
