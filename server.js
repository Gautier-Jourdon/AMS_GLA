import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";
import fetch from "node-fetch";
import expressPkg from 'express';
const { json } = expressPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(json());
app.use(express.static(__dirname));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

async function verifyAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing authorization token' });
  try {
    const url = SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user';
    const r = await fetch(url, { headers: { Authorization: auth, apikey: SUPABASE_KEY } });
    if (!r.ok) return res.status(401).json({ error: 'invalid token' });
    const user = await r.json();
    req.user = user;
    return next();
  } catch (e) {
    console.error('[AUTH] Error validating token', e.message);
    return res.status(500).json({ error: 'auth verification failed' });
  }
}

app.get("/api/assets", (req, res) => {
  // Try to serve assets from Postgres first
  (async () => {
    const client = new Client({
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || process.env.PG_PORT || 54322),
      user: process.env.PGUSER || process.env.PG_USER || "postgres",
      password: process.env.PGPASSWORD || process.env.PG_PASSWORD || "postgres",
      database: process.env.PGDATABASE || process.env.PG_DATABASE || "postgres"
    });

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
        console.error('[API] Erreur DB:', err.message);
        return res.status(503).json({ error: 'database unavailable' });
    }
  })();
});

  // Alerts endpoints (protected)
  app.post('/api/alerts', verifyAuth, async (req, res) => {
    const { symbol, threshold, direction } = req.body || {};
    if (!symbol || !threshold || !direction) return res.status(400).json({ error: 'missing fields' });
    const userId = req.user?.id || 'unknown';
    const client = new Client({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 54322),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'postgres'
    });
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
    const client = new Client({ host: process.env.PGHOST || 'localhost', port: Number(process.env.PGPORT || 54322), user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD || 'postgres', database: process.env.PGDATABASE || 'postgres' });
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
    const client = new Client({ host: process.env.PGHOST || 'localhost', port: Number(process.env.PGPORT || 54322), user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD || 'postgres', database: process.env.PGDATABASE || 'postgres' });
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

app.listen(PORT, () => {
  console.log(`Serveur web démarré sur http://localhost:${PORT}/webui/index.html`);
});

// Auth proxy endpoints for frontend (signup / login)
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing email or password' });
  try {
    const url = SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/signup';
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY
      },
      body: JSON.stringify({ email, password })
    });
    const json = await r.json();
    return res.status(r.status).json(json);
  } catch (e) {
    console.error('[AUTH] signup error', e.message);
    return res.status(500).json({ error: 'signup failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing email or password' });
  try {
    const url = SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/token?grant_type=password';
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY
      },
      body: JSON.stringify({ email, password })
    });
    const json = await r.json();
    return res.status(r.status).json(json);
  } catch (e) {
    console.error('[AUTH] login error', e.message);
    return res.status(500).json({ error: 'login failed' });
  }
});

// Endpoint to return current user info (requires Authorization header)
app.get('/auth/me', verifyAuth, (req, res) => {
  return res.json(req.user || {});
});
