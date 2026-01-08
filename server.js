// -------------------------------------------------------
// Serveur Principal (API Gateway + Backend)
// Gère l'API REST, la connexion DB, et sert le Frontend
// -------------------------------------------------------

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";
import fs from 'fs/promises';
import expressPkg from 'express';
const { json } = expressPkg;
import jwt from 'jsonwebtoken';
import { createUser as authCreateUser, authenticateUser } from './backend/auth.js';
import * as Wallet from './backend/wallet.js';
import logger from './backend/logger.js';

// Configuration des chemins de fichiers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Autorise les requêtes Cross-Origin
app.use(json()); // Support du JSON dans le body des requêtes
app.use(express.static(__dirname)); // Sert les fichiers statiques (WebUI)

// Mode DEV : Authentification simplifiée pour développement local
const DEV_AUTH = (process.env.DEV_AUTH === 'true') || (process.env.NODE_ENV === 'development');

// In-memory maps used when DEV_AUTH is enabled
const DEV_TOKENS = new Map();
const DEV_USER_BY_EMAIL = new Map();
const DEV_ALERTS = new Map();
// Cached supabase url when discovered by probes
let _cachedSupabaseUrl = null;
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Try to resolve a usable Supabase URL by probing a small set of candidates.
// Uses dynamic import of `node-fetch` so tests can mock it via `jest.unstable_mockModule`.
export async function resolveSupabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  if (_cachedSupabaseUrl) return _cachedSupabaseUrl;

  const candidates = [
    'http://localhost:54321',
    'http://supabase.local',
    'http://localhost:8000'
  ];

  const fetchMod = await import('node-fetch');
  const fetch = fetchMod && (fetchMod.default || fetchMod);

  const probePaths = ['/','/health','/auth/v1'];

  for (const base of candidates) {
    for (const p of probePaths) {
      try {
        const url = base + p;
        const r = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'text/plain' } });
        if (r && (r.ok || r.status === 200)) {
          _cachedSupabaseUrl = base;
          return base;
        }
      } catch (e) {
        // probe failed, try next
      }
    }
  }

  throw new Error('Could not resolve Supabase URL via probes');
}
/**
 * Middleware d'authentification
 * Vérifie le Token JWT dans le header "Authorization"
 */
async function verifyAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Token manquant' });

  // DEV bypass: accept any bearer token when DEV_AUTH is enabled
  if (DEV_AUTH) {
    // Accept any Bearer and return a simple dev user object
    if (auth.startsWith('Bearer')) {
      const token = String(auth).replace(/^Bearer\s+/i, '').trim();
      if (DEV_TOKENS.has(token)) {
        req.user = DEV_TOKENS.get(token);
      } else {
        req.user = { id: 'dev-user', email: 'dev@local' };
      }
      return next();
    }
    return res.status(401).json({ error: 'Token invalide' });
  }

  // In non-dev mode, proxy to Supabase /auth/v1/user to validate token
  try {
    const base = process.env.SUPABASE_URL || await resolveSupabaseUrl();
    const fetchMod = await import('node-fetch');
    const fetch = fetchMod && (fetchMod.default || fetchMod);
    const url = base.replace(/\/$/, '') + '/auth/v1/user';
    const r = await fetch(url, { method: 'GET', headers: { Authorization: auth, apikey: SUPABASE_KEY } });
    if (!r) return res.status(500).json({ error: 'auth proxy no response' });
    if (!r.ok) {
      // propagate proxied status: prefer parsed JSON when available
      try {
        const parsed = await r.json().catch(() => null);
        if (parsed && typeof parsed === 'object') return res.status(r.status).json(parsed);
      } catch (e) { /* ignore */ }
      const txt = await r.text().catch(() => null);
      if (txt) {
        try {
          const maybe = JSON.parse(txt);
          if (maybe && typeof maybe === 'object') return res.status(r.status).json(maybe);
        } catch (_) { }
        return res.status(r.status).json({ raw: txt });
      }
      return res.status(r.status).json({ error: 'auth proxy failed', status: r.status });
    }
    // parse JSON if possible, else include raw
    let data;
    try { data = await r.json(); } catch (e) { data = { raw: await r.text().catch(() => null) }; }
    req.user = data || {};
    return next();
  } catch (e) {
    // network/probe failures should return 500 so tests can check behavior
    return res.status(500).json({ error: e && (e.message || String(e)) });
  }
}

/**
 * Crée une instance de client PostgreSQL
 * Utilise les variables d'environnement pour la configuration
 */
function getPgClient() {
  const host = process.env.PGHOST || 'localhost';
  const port = Number(process.env.PGPORT || process.env.PG_PORT || 54322);
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const database = process.env.PGDATABASE || 'postgres';

  return new Client({ host, port, user, password, database });
}

// Helpers to call DB RPCs used by tests and dev helpers
async function dbCreateUser(email) {
  const client = getPgClient();
  try {
    await client.connect();
    const r = await client.query('select * from public.rpc_create_user($1)', [email]);
    await client.end();
    if (!r || r.rowCount === 0) return null;
    return r.rows[0];
  } catch (e) {
    try { await client.end(); } catch (e2) { }
    throw e;
  }
}

async function dbGetUserByEmail(email) {
  const client = getPgClient();
  try {
    await client.connect();
    const r = await client.query('select * from public.rpc_get_user($1)', [email]);
    await client.end();
    if (!r || r.rowCount === 0) return null;
    return r.rows[0];
  } catch (e) {
    try { await client.end(); } catch (e2) { }
    throw e;
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
    try { await client.end(); } catch (e) { }
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
  const { symbol, threshold, direction, delivery_method } = req.body || {};
  console.info('[API] /api/alerts received', { body: req.body, user: (req.user && (req.user.email || req.user.id)) });
  if (!symbol || (threshold === undefined) || !direction) {
    console.warn('[API] /api/alerts missing fields', { symbol, threshold, direction });
    return res.status(400).json({ error: 'missing fields' });
  }
  // basic validation to avoid DB errors
  const thr = Number(threshold);
  if (!isFinite(thr) || thr <= 0 || thr > 1e12) {
    console.warn('[API] /api/alerts invalid threshold', { threshold });
    return res.status(400).json({ error: 'invalid threshold' });
  }
  if (!['above', 'below'].includes(direction)) {
    console.warn('[API] /api/alerts invalid direction', { direction });
    return res.status(400).json({ error: 'invalid direction' });
  }
  const delivery = (delivery_method === 'discord') ? 'discord' : 'email';
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
    // ensure confirmed column exists (safe to run)
    try { console.debug('[API] ensuring confirmed column exists'); await client.query("ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT false"); } catch (e) { console.warn('[API] alter confirmed failed', e && (e.message || e)); }
    // ensure delivery_method column exists (added later) to avoid insert errors
    try { console.debug('[API] ensuring delivery_method column exists'); await client.query("ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'email'"); } catch (e) { console.warn('[API] alter delivery_method failed', e && (e.message || e)); }
    console.debug('[API] inserting alert', { userId, symbol, threshold: thr, direction, delivery });
    const ins = await client.query('INSERT INTO public.alerts (user_id, symbol, threshold, direction, delivery_method) VALUES ($1,$2,$3,$4,$5) RETURNING *', [userId, symbol, thr, direction, delivery]);
    const alertRow = ins && ins.rows && ins.rows[0];
    console.info('[API] alert inserted', { id: alertRow && alertRow.id });
    // send confirmation email (if email method)
    try {
      // prepare token
      const secret = process.env.JWT_SECRET || 'devsecret';
      const token = jwt.sign({ alertId: alertRow.id, userId }, secret, { expiresIn: '7d' });
      const origin = req.headers.origin || (`http://localhost:${PORT}`);
      const confirmUrl = origin + '/api/alerts/confirm?token=' + encodeURIComponent(token);
      // send email if SMTP configured and user email present
      const userEmail = req.user && req.user.email;
      console.debug('[MAIL] confirmation', { delivery, userEmail, smtp: !!process.env.SMTP_HOST });
      if (delivery === 'email' && userEmail && process.env.SMTP_HOST && process.env.SMTP_PORT) {
        const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), secure: (process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true'), auth: (process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined) });
        await transporter.sendMail({ from: process.env.EMAIL_FROM || 'no-reply@example.com', to: userEmail, subject: 'Confirmation d\'alerte AMS', text: `Bonjour,\n\nMerci de confirmer votre alerte pour ${symbol} (${direction} ${thr}). Cliquez sur le lien suivant pour confirmer : ${confirmUrl}\n\nSi vous n'avez pas demandé cette alerte, ignorez cet email.`, html: `<p>Bonjour,</p><p>Merci de confirmer votre alerte pour <strong>${symbol}</strong> (${direction} ${thr}).</p><p><a href="${confirmUrl}">Confirmer l\'alerte</a></p><p>Si vous n\'avez pas demandé cette alerte, ignorez cet email.</p>` });
        console.info('[MAIL] sent confirmation to', userEmail);
      } else {
        console.info('[MAIL] skipped sending confirmation (no smtp or email)', { delivery, userEmail });
      }
    } catch (e) { logger.warn('[MAIL] send failed', { err: e && (e.message || String(e)) }); }

    await client.end();
    return res.status(201).json(alertRow);
  } catch (e) {
    try { await client.end(); } catch (e) { }
    console.error('[API] alerts insert error', e.message);
    return res.status(500).json({ error: 'db error' });
  }
});

// Confirmation endpoint: validates token and marks alert as confirmed
app.get('/api/alerts/confirm', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('missing token');
  try {
    const secret = process.env.JWT_SECRET || 'devsecret';
    const payload = jwt.verify(String(token), secret);
    const alertId = payload && payload.alertId;
    console.info('[API] /api/alerts/confirm token payload', { alertId });
    if (!alertId) return res.status(400).send('invalid token');
    const client = getPgClient();
    try {
      await client.connect();
      console.debug('[API] /api/alerts/confirm ensuring confirmed column');
      await client.query("ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT false");
      const r = await client.query('UPDATE public.alerts SET confirmed = true WHERE id = $1 RETURNING *', [alertId]);
      await client.end();
      console.info('[API] /api/alerts/confirm updated rows', { rowCount: r && r.rowCount });
      if (r.rowCount === 0) return res.status(404).send('alert not found');
      return res.send('Alerte confirmée.');
    } catch (e) { try { await client.end(); } catch (e) { } console.error('[API] alerts confirm error', e && (e.message || String(e))); return res.status(500).send('error'); }
  } catch (e) {
    console.error('[API] confirm token error', e && (e.message || String(e)));
    return res.status(400).send('invalid or expired token');
  }
});

// Diagnostic: return table columns for alerts (temporary)
app.get('/api/diag/alerts-schema', async (req, res) => {
  const client = getPgClient();
  try {
    await client.connect();
    const cols = await client.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='alerts' ORDER BY ordinal_position`);
    const cnt = await client.query('SELECT count(*)::int as cnt FROM public.alerts');
    await client.end();
    return res.json({ columns: cols.rows || [], count: cnt && cnt.rows && cnt.rows[0] ? cnt.rows[0].cnt : null });
  } catch (e) {
    try { await client.end(); } catch (e) { }
    console.error('[DIAG] alerts-schema error', e && (e.message || String(e)));
    return res.status(500).json({ error: 'diag-failed', details: e && (e.message || String(e)) });
  }
});

app.get('/api/alerts', verifyAuth, async (req, res) => {
  const userId = req.user?.id || 'unknown';

  // DEV mode: return in-memory alerts
  if (DEV_AUTH) {
    return res.json(DEV_ALERTS.get(userId) || []);
  }

  // Production mode: query database
  const client = getPgClient();
  try {
    await client.connect();
    const rows = await client.query('SELECT id, symbol, threshold, direction, created_at, confirmed, delivery_method FROM public.alerts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    await client.end();
    console.info('[API] alerts fetched', { userId, count: rows.rows.length });
    return res.json(rows.rows);
  } catch (e) {
    try { await client.end(); } catch (endErr) { }
    console.error('[API] alerts list error', { userId, error: e.message, code: e.code });

    // If table doesn't exist, return empty array instead of 500
    if (e.code === '42P01') { // PostgreSQL error code for "table does not exist"
      console.warn('[API] alerts table does not exist, returning empty array');
      return res.json([]);
    }

    // For other errors, return 500 with details
    return res.status(500).json({ error: 'db error', details: e.message });
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
    try { await client.end(); } catch (e) { }
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
    }
    // run startup checks (extracted for testability) in all modes to ensure probes run
    runStartupChecks().catch(() => { });
  });
}

export default app;

// Extracted startup checks to allow tests to exercise startup branches
export async function runStartupChecks() {
  // If DEV_AUTH is enabled, skip longer startup probes and DB checks
  if (DEV_AUTH) {
    console.log('[DEV] DEV_AUTH enabled — DB calls are skipped or emulated in dev mode');
    return;
  }

  try {
    const client = getPgClient();
    console.info('[PG] attempting connection test to', { host: process.env.PGHOST || 'localhost', port: process.env.PGPORT || process.env.PG_PORT || 5433 });
    await client.connect();
    await client.end();
    logger.info('[PG] Postgres reachable');
    console.info('[PG] Postgres reachable');
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
// ---------------------------------------------------
// Routes d'Authentification (Proxy Supabase + Fallback DB)
// ---------------------------------------------------

app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  // 1. Mode DEV (bypass total)
  if (DEV_AUTH) {
    // ... logique dev existante inchangée ...
    if (DEV_USER_BY_EMAIL.has(email)) {
      const token = DEV_USER_BY_EMAIL.get(email);
      const user = DEV_TOKENS.get(token);
      return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, user });
    }
    const token = 'dev-token-' + Date.now();
    const user = { id: 'dev-' + Date.now(), email };
    DEV_TOKENS.set(token, user);
    DEV_USER_BY_EMAIL.set(email, token);
    return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, user });
  }

  // 2. Tentative via Supabase (Production)
  try {
    const base = await resolveSupabaseUrl();
    const url = base + '/auth/v1/signup';
    const fetchMod = await import('node-fetch');
    const fetch = fetchMod && (fetchMod.default || fetchMod);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });

    if (!r) return res.status(500).json({ error: 'auth proxy no response' });
    // propagate non-ok proxied responses including raw text when available
    if (!r.ok) {
      try {
        const parsed = await r.json().catch(() => null);
        if (parsed && typeof parsed === 'object') return res.status(r.status).json(parsed);
      } catch (e) { }
        const txt = await r.text().catch(() => null);
        if (txt) {
          try { const maybe = JSON.parse(txt); if (maybe && typeof maybe === 'object') return res.status(r.status).json(maybe); } catch (_) { }
          return res.status(r.status).json({ raw: txt });
        }
        return res.status(r.status).json({ error: 'auth proxy failed', status: r.status });
    }
    // parse JSON if possible, else include raw (attempt JSON.parse on text)
    try {
      const data = await r.json();
      return res.json(data);
    } catch (e) {
      const raw = await r.text().catch(() => null);
      if (raw) {
        try { const parsed = JSON.parse(raw); return res.json(parsed); } catch (e2) { return res.status(200).json({ raw }); }
      }
      return res.status(200).json({ raw: raw });
    }
  } catch (e) {
    console.debug('[AUTH] Supabase unreachable, trying local DB fallback...');
  }

  // 3. Fallback DB Locale (si Supabase HS)
  try {
    // First try RPC-based user creation (dbCreateUser) which tests mock
    let created = null;
    try { created = await dbCreateUser(email); } catch (e) { /* ignore and try other fallbacks */ }
    if (created) {
      const token = 'tok-' + Date.now();
      return res.json({ access_token: token, token_type: 'bearer', expires_in: 28800, user: created });
    }

    // Fallback to local auth helper
    const localCreated = await authCreateUser(email, password || 'default');
    if (!localCreated) {
      // Peut-être qu'il existe déjà ? On tente de le loguer
      const existing = await authenticateUser(email, password);
      if (existing) {
        return res.json({ access_token: existing.token, token_type: 'bearer', expires_in: 28800, user: existing.user });
      }
      return res.status(500).json({ error: 'signup failed (db)' });
    }
    return res.json({ access_token: localCreated.token, token_type: 'bearer', expires_in: 28800, user: localCreated.user });
  } catch (e2) {
    console.error('[AUTH] Signup fallback failed', e2);
    return res.status(500).json({ error: 'Inscription impossible' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) return res.status(400).json({ error: 'Identifiants manquants' });

  // 1. Mode DEV
  if (DEV_AUTH) {
    /* ... logique dev existante ... */
    if (DEV_USER_BY_EMAIL.has(email)) {
      const token = DEV_USER_BY_EMAIL.get(email);
      const user = DEV_TOKENS.get(token);
      return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, user });
    }
    // Auto-create dev user on login if Dev mode
    const token = 'dev-token-' + Date.now();
    const user = { id: 'dev-' + Date.now(), email };
    DEV_TOKENS.set(token, user);
    DEV_USER_BY_EMAIL.set(email, token);
    return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, user });
  }

  // 2. Tentative Supabase
  try {
    const base = await resolveSupabaseUrl();
    const url = base + '/auth/v1/token?grant_type=password';
    const fetchMod = await import('node-fetch');
    const fetch = fetchMod && (fetchMod.default || fetchMod);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ email, password })
    });
    if (!r) return res.status(500).json({ error: 'auth proxy no response' });
    if (!r.ok) {
      try {
        const parsed = await r.json().catch(() => null);
        if (parsed && typeof parsed === 'object') return res.status(r.status).json(parsed);
      } catch (e) { }
      const txt = await r.text().catch(() => null);
      return res.status(r.status).json(txt ? { raw: txt } : { error: 'auth proxy failed', status: r.status });
    }
    try {
      const data = await r.json();
      return res.json(data);
    } catch (e) {
      const raw = await r.text().catch(() => null);
      if (raw) {
        try { const parsed = JSON.parse(raw); return res.json(parsed); } catch (e2) { return res.status(200).json({ raw }); }
      }
      return res.status(200).json({ raw: raw });
    }
  } catch (e) {
    console.debug('[AUTH] Supabase unreachable/error, trying fallback...');
  }

  // 3. Fallback DB Locale
  try {
    // Try RPC-based user lookup first (dbGetUserByEmail)
    try {
      const dbu = await dbGetUserByEmail(email);
      if (dbu) {
        const token = 'tok-' + Date.now();
        return res.json({ access_token: token, token_type: 'bearer', expires_in: 28800, user: dbu });
      }
    } catch (e) { /* ignore and continue to authenticateUser */ }

    const auth = await authenticateUser(email, password);
    if (!auth) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    return res.json({ access_token: auth.token, token_type: 'bearer', expires_in: 28800, user: auth.user });
  } catch (e2) {
    console.error('[AUTH] Login fallback failed', e2);
    return res.status(500).json({ error: 'Connexion impossible' });
  }
});

// Wallet endpoints
app.post('/api/wallet/create', verifyAuth, async (req, res) => {

  const userId = req.user?.id || 'unknown';

  try {

    const w = await Wallet.createWalletFor(userId, req.body?.initialCash || 10000);

    return res.json(w);

  }

  catch (e) {

    console.error('[WALLET] create error', e.message || e);

    return res.status(500).json({ error: 'wallet create failed' });

  }

});

app.get('/api/wallet/value', verifyAuth, async (req, res) => {

  const userId = req.user?.id || 'unknown';

  try {

    const w = await Wallet.getWalletFor(userId);

    const syms = Object.keys(w.holdings || {});

    const priceMap = {};

    if (syms.length) {

      try {

        const client = getPgClient();

        await client.connect();

        const r = await client.query('SELECT symbol, price_usd FROM public.assets WHERE symbol = ANY($1)', [syms]);

        await client.end();

        for (const row of r.rows) priceMap[row.symbol] = row.price_usd;

      }

      catch (e) {

        try {

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

  catch (e) {

    console.error('[WALLET] value error', e.message || e);

    return res.status(500).json({ error: 'value failed' });

  }

});

// Return wallet (cash + holdings) for the current user
app.get('/api/wallet', verifyAuth, async (req, res) => {
  const userId = req.user?.id || 'unknown';
  try {
    const w = await Wallet.getWalletFor(userId);
    return res.json(w || { cash: 0, holdings: {}, history: [] });
  } catch (e) {
    console.error('[API] wallet get error', e && (e.message || e));
    return res.status(500).json({ error: 'wallet error' });
  }
});

app.get('/api/wallet/history', verifyAuth, async (req, res) => {

  const userId = req.user?.id || 'unknown';

  try {

    const h = await Wallet.getHistory(userId);

    return res.json(h || []);

  }

  catch (e) {

    console.error('[WALLET] history error', e.message || e);

    return res.status(500).json({ error: 'history failed' });

  }

});
app.post('/api/wallet/trade', verifyAuth, async (req, res) => {

  const userId = req.user?.id || 'unknown';

  const { symbol, side, amountUsd } = req.body || {};

  if (!symbol || !side || !amountUsd) return res.status(400).json({ error: 'missing fields' });

  try {

    // try to get price from local assets.json fallback
    const staticPath = path.join(__dirname, 'collector', 'data', 'assets.json');

    let price = null;

    try {

      const txt = await fs.readFile(staticPath, 'utf8');

      const assets = JSON.parse(txt);

      const a = (Array.isArray(assets) ? assets.find(x => x.symbol === symbol || x.id === symbol) : null) || null;

      price = a ? (a.priceUsd || a.price_usd || null) : null;

    }

    catch (e) {

      price = null;

    }

    if (!price) return res.status(400).json({ error: 'price not available for symbol' });

    const qty = Number((Number(amountUsd) / Number(price)) || 0);

    if (qty <= 0) return res.status(400).json({ error: 'invalid amount' });

    const rec = await Wallet.recordTrade(userId, { symbol, side, qty, priceUsd: Number(price), amountUsd: Number(amountUsd) });

    return res.json(rec);

  }

  catch (e) {

    console.error('[WALLET] trade error', e.message || e);

    const msg = e && (e.message || String(e)) || 'trade failed';
    // Known validation errors from backend/wallet.js -> surface as 400
    if (msg.includes('insufficient') || msg.includes('invalid trade') || msg.includes('invalid amount')) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: 'trade failed' });

  }
});

// Predictions endpoints
app.get('/api/predictions/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const days = parseInt(req.query.days) || 30;

  try {
    console.info('[API] /api/predictions request', { symbol, days });

    // Récupérer l'historique depuis assets_history
    const client = getPgClient();
    await client.connect();

    const query = `
      SELECT price_usd as price, created_at as timestamp 
      FROM public.assets_history 
      WHERE symbol = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    const result = await client.query(query, [symbol.toUpperCase(), days]);
    await client.end();

    if (result.rows.length < 2) {
      console.warn('[API] Insufficient history data for predictions', { symbol, rows: result.rows.length });
      return res.status(400).json({
        error: 'Insufficient historical data',
        minRequired: 2,
        available: result.rows.length
      });
    }

    // Inverser pour avoir du plus ancien au plus récent
    const history = result.rows.reverse().map(row => ({
      price: parseFloat(row.price),
      timestamp: new Date(row.timestamp).getTime()
    }));

    // Calculer prévisions
    const predictions = Predictions.calculatePredictions(history);

    // Ajouter recommandation
    const recommendation = Predictions.getRecommendation(predictions);

    const response = {
      symbol: symbol.toUpperCase(),
      period: days,
      dataPoints: history.length,
      predictions,
      recommendation
    };

    console.info('[API] Predictions calculated', { symbol, dataPoints: history.length });
    return res.json(response);

  } catch (e) {
    console.error('[API] predictions error', { symbol, error: e.message });
    return res.status(500).json({ error: 'predictions failed', details: e.message });
  }
});

// Endpoint pour obtenir des prévisions multiples
app.post('/api/predictions/batch', async (req, res) => {
  const { symbols } = req.body || {};

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: 'missing symbols array' });
  }

  if (symbols.length > 10) {
    return res.status(400).json({ error: 'max 10 symbols allowed' });
  }

  try {
    const results = {};

    for (const symbol of symbols) {
      try {
        const client = getPgClient();
        await client.connect();

        const query = `
          SELECT price_usd as price, created_at as timestamp 
          FROM public.assets_history 
          WHERE symbol = $1 
          ORDER BY created_at DESC 
          LIMIT 30
        `;

        const result = await client.query(query, [symbol.toUpperCase()]);
        await client.end();

        if (result.rows.length >= 2) {
          const history = result.rows.reverse().map(row => ({
            price: parseFloat(row.price),
            timestamp: new Date(row.timestamp).getTime()
          }));

          results[symbol] = {
            predictions: Predictions.calculatePredictions(history),
            recommendation: Predictions.getRecommendation(Predictions.calculatePredictions(history))
          };
        } else {
          results[symbol] = { error: 'Insufficient data' };
        }
      } catch (e) {
        results[symbol] = { error: e.message };
      }
    }

    return res.json(results);

  } catch (e) {
    console.error('[API] batch predictions error', e.message);
    return res.status(500).json({ error: 'batch predictions failed' });
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
    try { await client.end(); } catch (e) { }
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
    try { await client.end(); } catch (e) { }
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

// === URL ROUTING WITH AUTH PROTECTION ===

// Root path - redirect to /webui/ (which serves index.html = login page)
app.get('/', (req, res) => {
  res.redirect('/webui/');
});

// /webui/connexion - Redirect to /webui/ (index.html = login)
app.get('/webui/connexion', (req, res) => {
  res.redirect('/webui/');
});

// /home - Redirect to /webui/home.html
app.get('/home', (req, res) => {
  res.redirect('/webui/home.html');
});

// Serve static webui files
// /webui/ will serve index.html (login page)
// /webui/home.html will serve home.html (main app with auth protection)
app.use('/webui', express.static(path.join(__dirname, 'webui')));

// Start server
