import { Client } from 'pg';

function getPgClient() {
  const host = process.env.PGHOST || 'localhost';
  const port = Number(process.env.PGPORT || process.env.PG_PORT || 5433);
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const database = process.env.PGDATABASE || 'postgres';
  console.log('[DBG] pg config', { host, port, user, database });
  return new Client({ host, port, user, password, database });
}

async function run() {
  const client = getPgClient();
  try {
    await client.connect();
    console.log('[DBG] connected');
    const r = await client.query('INSERT INTO public.alerts (user_id, symbol, threshold, direction) VALUES ($1,$2,$3,$4) RETURNING id', ['dbg-user', 'DBG', 1, 'above']);
    console.log('[DBG] insert result', r.rows[0]);
    await client.end();
  } catch (e) {
    try { await client.end(); } catch (_) {}
    console.error('[DBG] insert error', e && (e.message || e));
    process.exit(1);
  }
}

run();
