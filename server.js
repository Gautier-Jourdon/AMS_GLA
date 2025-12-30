import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";
import fs from 'fs/promises';
import fetch from "node-fetch";
import expressPkg from 'express';
const { json } = expressPkg;
import { createUser as authCreateUser, authenticateUser } from './backend/auth.js';
import * as Wallet from './backend/wallet.js';
import logger from './backend/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(json());
app.use(express.static(__dirname));

const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const DEV_AUTH = (process.env.DEV_AUTH === 'true') || (process.env.NODE_ENV === 'development');

// In-memory map of dev tokens -> user info (only for DEV_AUTH mode)
const DEV_TOKENS = new Map();
// Reverse map email -> token for stable dev sessions
const DEV_USER_BY_EMAIL = new Map();
// In-memory alerts per user for DEV_AUTH mode
const DEV_ALERTS = new Map();

let _cachedSupabaseUrl = null;
async function resolveSupabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, '');
  if (_cachedSupabaseUrl) return _cachedSupabaseUrl;
  const candidates = [
    'http://localhost:55321',
    'http://localhost:55332',
    'http://localhost:55432',
    'http://localhost:8000',
    'http://127.0.0.1:54321',
    'http://127.0.0.1:55321',
    'http://127.0.0.1:55332',
    'http://127.0.0.1:55432'
  ];
  for (const c of candidates) {
    try {
      const url = c.replace(/\/$/, '');
      logger.debug('[SUPABASE] probing', { url });
      // ping root to see if the gateway responds
      const r = await fetch(url + '/', { method: 'GET', redirect: 'manual' });
      logger.debug('[SUPABASE] probe', { url, status: r && r.status });
      // consider any response as available (200/302/404 are ok proxy responses)
      if (r && (r.status < 500)) {
        _cachedSupabaseUrl = url;
        logger.info('[SUPABASE] auto-detected SUPABASE_URL = ' + url);
        return url;
      }
    } catch (e) {
      logger.debug('[SUPABASE] probe failed', { candidate: c, err: e && (e.message || String(e)) });
      // continue to next candidate
    }
  }
  // fallback default
  logger.warn('[SUPABASE] Could not auto-detect SUPABASE_URL; using http://localhost:55321');
  _cachedSupabaseUrl = 'http://localhost:55321';
  return _cachedSupabaseUrl;
}

async function verifyAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization token' });
  // DEV_AUTH accepts any Bearer dev-token for local development
  if (DEV_AUTH) {
    try {
      if (typeof auth === 'string' && auth.startsWith('Bearer')) {
        const tok = auth.replace(/^Bearer\s+/i, '').trim();
        if (DEV_TOKENS.has(tok)) {
          req.user = DEV_TOKENS.get(tok);
          logger.debug('[AUTH] DEV token accepted', { user: req.user.email || req.user.id });
          return next();
        }
        // if token unknown, still allow but set email to provided value in header if present
        req.user = { id: 'dev', email: 'dev@local' };
        logger.debug('[AUTH] DEV token unknown - allowing as dev placeholder');
        return next();
      }
    } catch (e) { /* continue to normal flow */ }
  }
  try {
    const base = await resolveSupabaseUrl();
    const url = base + '/auth/v1/user';
    const r = await fetch(url, { headers: { Authorization: auth, apikey: SUPABASE_KEY }, timeout: 5000 });
    if (!r.ok) return res.status(401).json({ error: 'invalid token' });
    const user = await r.json();
    req.user = user;
    return next();
  } catch (e) {
    logger.error('[AUTH] Error validating token', { err: e && (e.message || String(e)) });
    return res.status(500).json({ error: 'auth verification failed' });
  }
}

// request logging middleware (sanitized)
app.use((req, res, next) => {
  try {
    const safeHeaders = { ...req.headers };
    if (safeHeaders.authorization) safeHeaders.authorization = '[REDACTED]';
    logger.info('HTTP ' + req.method + ' ' + req.path, { headers: safeHeaders, query: req.query });
  } catch (e) { logger.debug('request-logger failed', { err: e.message || e }); }
  return next();
});

// Helper to create configured Postgres client (centralized defaults)
function getPgClient() {
  const host = process.env.PGHOST || 'localhost';
  const port = Number(process.env.PGPORT || process.env.PG_PORT || 5433);
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const database = process.env.PGDATABASE || 'postgres';
  try { logger.debug('[PG] getPgClient config', { host, port, user, database }); } catch(e){}
  return new Client({ host, port, user, password, database });
}

// DB helpers used as fallback when Supabase is not available
async function dbGetUserByEmail(email) {
  const client = getPgClient();
  try {
    await client.connect();
    const r = await client.query('select * from public.rpc_get_user($1)', [email]);
    await client.end();
    if (r.rowCount === 0) return null;
    return r.rows[0];
  } catch (e) {
    try { await client.end(); } catch (e) {}
    console.error('[DB] get user error', e.message || e);
    return null;
  }
}

async function dbCreateUser(email) {
  const client = getPgClient();
  try {
    await client.connect();
    const r = await client.query('select * from public.rpc_create_user($1)', [email]);
    await client.end();
    if (r.rowCount === 0) return null;
    return r.rows[0];
  } catch (e) {
    try { await client.end(); } catch (e) {}
    console.error('[DB] create user error', e.message || e);
    return null;
  }
}

app.get("/api/assets", async (req, res) => {
  // In DEV_AUTH mode serve static assets immediately to avoid Postgres connections
  if (DEV_AUTH) {
    try {
      const staticPath = path.join(__dirname, 'collector', 'data', 'assets.json');
      const txt = await fs.readFile(staticPath, 'utf8');
      const data = JSON.parse(txt);
      console.log('[API] DEV_AUTH: serving static assets.json fallback');
      return res.json(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[API] DEV static fallback failed', e.message || e);
      return res.status(503).json({ error: 'assets not available (dev)', details: e && (e.stack || e.message || e) });
    }
  }

  // Try to serve assets from Postgres first
  const client = getPgClient();
  try {
    await client.connect();
    const result = await client.query('SELECT id, symbol, name, rank, price_usd, change_percent_24hr, market_cap_usd, volume_usd_24hr, supply, max_supply, explorer FROM public.assets ORDER BY rank NULLS LAST LIMIT 2000');
    const rows = result.rows.map(r => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      rank: r.rank,
      priceUsd: r.price_usd,
      changePercent24Hr: r.change_percent_24hr,
      marketCapUsd: r.market_cap_usd,
      volumeUsd24Hr: r.volume_usd_24hr,
      supply: r.supply,
      maxSupply: r.max_supply,
      explorer: r.explorer
    }));
    await client.end();
    return res.json(rows);
  } catch (err) {
    try { await client.end(); } catch (e) {}
    console.error('[API] Erreur DB:', err.message || err);
    // Attempt to serve static assets.json as a graceful fallback for local dev
    try {
      const staticPath = path.join(__dirname, 'collector', 'data', 'assets.json');
      const txt = await fs.readFile(staticPath, 'utf8');
      const data = JSON.parse(txt);
      console.log('[API] serving static assets.json fallback');
      return res.json(Array.isArray(data) ? data : []);
    } catch (e2) {
      console.error('[API] static fallback failed', e2.message || e2);
      return res.status(503).json({ error: 'database unavailable', details: err && (err.stack || err.message || err) });
    }
  }
});

  // Alerts endpoints (protected)
  app.post('/api/alerts', verifyAuth, async (req, res) => {
    const { symbol, threshold, direction } = req.body || {};
    if (!symbol || !threshold || !direction) return res.status(400).json({ error: 'missing fields' });
    const userId = req.user?.id || 'unknown';
    if (DEV_AUTH) {
      const arr = DEV_ALERTS.get(userId) || [];
      const id = 'dev-alert-' + Date.now();
      const obj = { id, user_id: userId, symbol, threshold, direction, created_at: new Date().toISOString() };
      arr.unshift(obj);
      DEV_ALERTS.set(userId, arr);
      return res.status(201).json(obj);
    }
    const client = getPgClient();
    try {
      await client.connect();
      const ins = await client.query('INSERT INTO public.alerts (user_id, symbol, threshold, direction) VALUES ($1,$2,$3,$4) RETURNING *', [userId, symbol, threshold, direction]);
      await client.end();
      return res.status(201).json(ins.rows[0]);
    } catch (e) {
      try { await client.end(); } catch (e) {}
      console.error('[API] alerts insert error', e.message);
      return res.status(500).json({ error: 'db error' });
    }
  });

  app.get('/api/alerts', verifyAuth, async (req, res) => {
    const userId = req.user?.id || 'unknown';
    if (DEV_AUTH) {
      return res.json(DEV_ALERTS.get(userId) || []);
    }
    const client = getPgClient();
    try {
      await client.connect();
      const rows = await client.query('SELECT id, symbol, threshold, direction, created_at FROM public.alerts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      await client.end();
      return res.json(rows.rows);
    } catch (e) {
      try { await client.end(); } catch (e) {}
      console.error('[API] alerts list error', e.message);
      return res.status(500).json({ error: 'db error' });
    }
  });

  app.delete('/api/alerts/:id', verifyAuth, async (req, res) => {
    const id = req.params.id;
    const userId = req.user?.id || 'unknown';
    if (DEV_AUTH) {
      const arr = DEV_ALERTS.get(userId) || [];
      const idx = arr.findIndex(a => a.id === id);
      if (idx === -1) return res.status(404).json({ error: 'not found' });
      arr.splice(idx, 1);
      DEV_ALERTS.set(userId, arr);
      return res.json({ ok: true });
    }
    const client = getPgClient();
    try {
      await client.connect();
      // Ensure ownership
      const owner = await client.query('SELECT user_id FROM public.alerts WHERE id = $1', [id]);
      if (owner.rowCount === 0) { await client.end(); return res.status(404).json({ error: 'not found' }); }
      if (owner.rows[0].user_id !== userId) { await client.end(); return res.status(403).json({ error: 'forbidden' }); }
      await client.query('DELETE FROM public.alerts WHERE id = $1', [id]);
      await client.end();
      return res.json({ ok: true });
    } catch (e) {
      try { await client.end(); } catch (e) {}
      console.error('[API] alerts delete error', e.message);
      return res.status(500).json({ error: 'db error' });
    }
  });

const _thisFile = fileURLToPath(import.meta.url);
const _isMain = process.argv[1] === _thisFile;
if (_isMain) {
  app.listen(PORT, () => {
    console.log(`Serveur web démarré sur http://localhost:${PORT}/webui/index.html`);
    if (DEV_AUTH) {
      console.log('[DEV] DEV_AUTH enabled — DB calls are skipped or emulated in dev mode');
    } else {
      // run startup checks (extracted for testability)
      runStartupChecks().catch(() => {});
    }
  });
}

export default app;

// Extracted startup checks to allow tests to exercise startup branches
export async function runStartupChecks() {
  if (DEV_AUTH) {
    console.log('[DEV] DEV_AUTH enabled — DB calls are skipped or emulated in dev mode');
    return;
  }
  try {
    const client = getPgClient();
    await client.connect();
    await client.end();
    logger.info('[PG] Postgres reachable');
  } catch (e) {
    // Detailed diagnostics: log full error and any AggregateError causes
    try {
      const details = {};
      details.msg = e && (e.message || String(e));
      if (e && e.stack) details.stack = e.stack;
      // AggregateError may contain multiple errors
      if (typeof AggregateError !== 'undefined' && e instanceof AggregateError) {
        details.causes = [];
        for (const it of e.errors || []) {
          details.causes.push({ msg: it && (it.message || String(it)), stack: it && it.stack });
        }
      }
      logger.error('[PG] Postgres connection test failed (detailed)', details);
    } catch (logErr) {
      logger.error('[PG] Postgres connection test failed (could not serialize error)', { err: logErr && (logErr.message || String(logErr)) });
    }
    logger.warn('[PG] Check PGHOST/PGPORT/PGUSER/PGPASSWORD env vars and that Postgres is reachable from this host');
  }
}

// Auth proxy endpoints for frontend (signup / login)
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing email or password' });
  if (DEV_AUTH) {
    // permissive dev signup: reuse existing dev token if present, otherwise create one
    if (DEV_USER_BY_EMAIL.has(email)) {
      const token = DEV_USER_BY_EMAIL.get(email);
      const user = DEV_TOKENS.get(token);
      console.log('[AUTH] DEV signup reuse for', email);
      return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, user });
    }
    const token = 'dev-token-' + Date.now();
    const user = { id: 'dev-' + Date.now(), email };
    DEV_TOKENS.set(token, user);
    DEV_USER_BY_EMAIL.set(email, token);
    console.log('[AUTH] DEV signup for', email);
    return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, user });
  }
  try {
    const base = await resolveSupabaseUrl();
    const url = base + '/auth/v1/signup';
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY
      },
      body: JSON.stringify({ email, password })
    });
    const txt = await r.text().catch(() => '');
    let json;
    try { json = txt ? JSON.parse(txt) : {}; } catch(e) { json = { raw: txt }; }
    if (!r.ok) {
      console.error('[AUTH] signup proxied response error', r.status, txt);
    } else {
      console.log('[AUTH] signup proxied response', r.status, txt);
    }
    return res.status(r.status).json(json);
  } catch (e) {
    console.error('[AUTH] signup error', e.message);
    // Supabase unreachable: try DB RPC fallback
    try {
      // Try creating user in our DB and issue JWT
      const created = await authCreateUser(email, password || null);
      if (!created) return res.status(500).json({ error: 'signup failed (db)' });
      return res.json({ access_token: created.token, token_type: 'bearer', expires_in: 28800, user: created.user });
    } catch (e2) {
      console.error('[AUTH] signup fallback failed', e2.message || e2);
      return res.status(500).json({ error: 'signup failed' });
    }
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing email or password' });
  if (DEV_AUTH) {
    // permissive dev login: reuse existing token for email or create one
    if (DEV_USER_BY_EMAIL.has(email)) {
      const token = DEV_USER_BY_EMAIL.get(email);
      const user = DEV_TOKENS.get(token);
      console.log('[AUTH] DEV login reuse for', email);
      return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, user });
    }
    const token = 'dev-token-' + Date.now();
    const user = { id: 'dev-' + Date.now(), email };
    DEV_TOKENS.set(token, user);
    DEV_USER_BY_EMAIL.set(email, token);
    console.log('[AUTH] DEV login for', email);
    return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, user });
  }
  try {
    const base = await resolveSupabaseUrl();
    const url = base + '/auth/v1/token?grant_type=password';
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY
      },
      body: JSON.stringify({ email, password })
    });
    const txt = await r.text().catch(() => '');
    let json;
    try { json = txt ? JSON.parse(txt) : {}; } catch(e) { json = { raw: txt }; }
    if (!r.ok) {
      console.error('[AUTH] login proxied response error', r.status, txt);
    } else {
      console.log('[AUTH] login proxied response', r.status, txt);
    }
    return res.status(r.status).json(json);
  } catch (e) {
    console.error('[AUTH] login error', e.message);
    // Supabase unreachable: try DB lookup fallback
    try {
      const auth = await authenticateUser(email, password || null);
      if (!auth) return res.status(401).json({ error: 'invalid credentials (fallback)' });
      return res.json({ access_token: auth.token, token_type: 'bearer', expires_in: 28800, user: auth.user });
    } catch (e2) {
      console.error('[AUTH] login fallback failed', e2.message || e2);
      return res.status(500).json({ error: 'login failed' });
    }
  }
});

// Wallet endpoints
app.post('/api/wallet/create', verifyAuth, async (req, res) =>
{

  const userId = req.user?.id || 'unknown';

  try
  {

    const w = await Wallet.createWalletFor(userId, req.body?.initialCash || 10000);

    return res.json(w);

  }

  catch (e)
  {

    console.error('[WALLET] create error', e.message || e);

    return res.status(500).json({ error: 'wallet create failed' });

  }

});

app.get('/api/wallet/value', verifyAuth, async (req, res) =>
{

  const userId = req.user?.id || 'unknown';

  try

  {

    const w = await Wallet.getWalletFor(userId);

    const syms = Object.keys(w.holdings || {});

    const priceMap = {};

    if (syms.length)

    {

      try

      {

        const client = getPgClient();

        await client.connect();

        const r = await client.query('SELECT symbol, price_usd FROM public.assets WHERE symbol = ANY($1)', [syms]);

        await client.end();

        for (const row of r.rows) priceMap[row.symbol] = row.price_usd;

      }

      catch (e)

      {

        try

        {

          const staticPath = path.join(__dirname, 'collector', 'data', 'assets.json');

          const txt = await fs.readFile(staticPath, 'utf8');

          const assets = JSON.parse(txt);

          for (const a of assets || []) if (syms.includes(a.symbol) || syms.includes(a.id)) priceMap[a.symbol || a.id] = a.priceUsd || a.price_usd;

        }

        catch (e2) { /* ignore */ }

      }

    }

    const val = await Wallet.getWalletValue(userId, priceMap);

    return res.json(val);

  }

  catch (e)

  {

    console.error('[WALLET] value error', e.message || e);

    return res.status(500).json({ error: 'value failed' });

  }

});

app.get('/api/wallet/history', verifyAuth, async (req, res) =>
{

  const userId = req.user?.id || 'unknown';

  try

  {

    const h = await Wallet.getHistory(userId);

    return res.json(h || []);

  }

  catch (e)

  {

    console.error('[WALLET] history error', e.message || e);

    return res.status(500).json({ error: 'history failed' });

  }

});
app.post('/api/wallet/trade', verifyAuth, async (req, res) => {

  const userId = req.user?.id || 'unknown';

  const { symbol, side, amountUsd } = req.body || {};

  if (!symbol || !side || !amountUsd) return res.status(400).json({ error: 'missing fields' });

  try
  {

    // try to get price from local assets.json fallback
    const staticPath = path.join(__dirname, 'collector', 'data', 'assets.json');

    let price = null;

    try
    {

      const txt = await fs.readFile(staticPath, 'utf8');

      const assets = JSON.parse(txt);

      const a = (Array.isArray(assets) ? assets.find(x => x.symbol === symbol || x.id === symbol) : null) || null;

      price = a ? (a.priceUsd || a.price_usd || null) : null;

    }

    catch (e)
    {

      price = null;

    }

    if (!price) return res.status(400).json({ error: 'price not available for symbol' });

    const qty = Number((Number(amountUsd) / Number(price)) || 0);

    if (qty <= 0) return res.status(400).json({ error: 'invalid amount' });

    const rec = await Wallet.recordTrade(userId, { symbol, side, qty, priceUsd: Number(price), amountUsd: Number(amountUsd) });

    return res.json(rec);

  }

  catch (e)
  {

    console.error('[WALLET] trade error', e.message || e);

    return res.status(500).json({ error: 'trade failed' });

  }
});

// RPC endpoints that call DB functions directly (useful for local dev)
app.post('/rpc/signup', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'missing email' });
  if (DEV_AUTH) {
    // in DEV mode, emulate rpc_create_user
    if (DEV_USER_BY_EMAIL.has(email)) return res.status(409).json({ error: 'user exists' });
    const token = 'dev-token-' + Date.now();
    const user = { id: 'dev-' + Date.now(), email };
    DEV_TOKENS.set(token, user);
    DEV_USER_BY_EMAIL.set(email, token);
    DEV_ALERTS.set(user.id, []);
    return res.json({ id: user.id, email });
  }
  const client = getPgClient();
  try {
    await client.connect();
    const r = await client.query('select * from public.rpc_create_user($1)', [email]);
    await client.end();
    if (r.rowCount === 0) return res.status(409).json({ error: 'user exists' });
    return res.json(r.rows[0]);
  } catch (e) {
    try { await client.end(); } catch(e){}
    console.error('[RPC] signup error', e.message);
    return res.status(500).json({ error: 'rpc signup failed' });
  }
});

app.post('/rpc/login', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'missing email' });
  if (DEV_AUTH) {
    // emulate rpc_get_user
    if (!DEV_USER_BY_EMAIL.has(email)) return res.status(404).json({ error: 'not found' });
    const token = DEV_USER_BY_EMAIL.get(email);
    const u = DEV_TOKENS.get(token);
    return res.json({ id: u.id, email: u.email });
  }
  const client = getPgClient();
  try {
    await client.connect();
    const r = await client.query('select * from public.rpc_get_user($1)', [email]);
    await client.end();
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    return res.json(r.rows[0]);
  } catch (e) {
    try { await client.end(); } catch(e){}
    console.error('[RPC] login error', e.message);
    return res.status(500).json({ error: 'rpc login failed' });
  }
});

// Endpoint to return current user info (requires Authorization header)
app.get('/auth/me', verifyAuth, (req, res) => {
  return res.json(req.user || {});
});

// Debug endpoint to inspect environment (only when DEV_AUTH or DEBUG_ALLOW=1)
app.get('/debug/env', (req, res) => {
  if (!DEV_AUTH && process.env.DEBUG_ALLOW !== '1') return res.status(403).json({ error: 'forbidden' });
  const env = {
    PGHOST: process.env.PGHOST || null,
    PGPORT: process.env.PGPORT || process.env.PG_PORT || null,
    PGUSER: process.env.PGUSER || null,
    PGDATABASE: process.env.PGDATABASE || null,
    SUPABASE_URL: process.env.SUPABASE_URL || _cachedSupabaseUrl || null,
    SUPABASE_KEY: process.env.SUPABASE_KEY ? '[REDACTED]' : null,
    DEV_AUTH: !!DEV_AUTH,
    LOG_LEVEL: process.env.LOG_LEVEL || null
  };
  return res.json(env);
});

// Dev helper: create a test user (in-memory when DEV_AUTH, otherwise try DB)
app.post('/dev/create-test-user', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'missing email' });
  if (DEV_AUTH) {
    const token = 'dev-token-' + Date.now();
    const user = { id: 'dev-' + Date.now(), email };
    DEV_TOKENS.set(token, user);
    DEV_ALERTS.set(user.id, []);
    console.log('[DEV] created in-memory test user', email);
    return res.json({ access_token: token, user });
  }
  // Not DEV_AUTH: attempt to create in DB and return a dev-token mapped to the created user
  try {
    const user = await dbCreateUser(email);
    if (!user) return res.status(500).json({ error: 'could not create user' });
    const token = 'dev-token-' + Date.now();
    const uobj = { id: user.id || ('dev-' + Date.now()), email };
    DEV_TOKENS.set(token, uobj);
    DEV_ALERTS.set(uobj.id, []);
    return res.json({ access_token: token, user: uobj });
  } catch (e) {
    console.error('[DEV] create-test-user error', e.message || e);
    return res.status(500).json({ error: 'create test user failed' });
  }
});

// Dev helper: export in-memory dev users/alerts to Postgres (DEV_AUTH only)
app.post('/dev/export-dev-data', async (req, res) => {
  if (!DEV_AUTH) return res.status(403).json({ error: 'only available in DEV_AUTH' });
  const summaries = [];
  try {
    // Create users via RPC if available
    for (const [token, user] of DEV_TOKENS.entries()) {
      const email = user.email;
      const created = await dbCreateUser(email);
      summaries.push({ email, created: !!created });
    }
    // Insert alerts
    const client = getPgClient();
    await client.connect();
    for (const [userId, alerts] of DEV_ALERTS.entries()) {
      for (const a of alerts) {
        try {
          await client.query('INSERT INTO public.alerts (user_id, symbol, threshold, direction) VALUES ($1,$2,$3,$4)', [userId, a.symbol, a.threshold, a.direction]);
        } catch (e) {
          console.error('[DEV EXPORT] alert insert error for', userId, e.message || e);
        }
      }
    }
    await client.end();
    return res.json({ ok: true, summary: summaries });
  } catch (e) {
    console.error('[DEV EXPORT] failed', e.message || e);
    return res.status(500).json({ error: 'export failed', details: e.message || e });
  }
});
