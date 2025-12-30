import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

dotenv.config({ path: './.env' });

const SERVER_URL = `http://127.0.0.1:${process.env.PORT || 3000}`;
let serverProc = null;

async function ensureServer() {
  try {
    const r = await fetch(SERVER_URL + '/');
    return false; // already running
  } catch (e) {
    console.log('[SMOKE] Server not reachable, starting `node server.js`');
    serverProc = spawn('node', ['server.js'], { stdio: 'inherit' });
    // wait for server to become responsive
    for (let i = 0; i < 20; i++) {
      await setTimeout(500);
      try {
        const r = await fetch(SERVER_URL + '/webui/index.html');
        if (r.ok || r.status < 500) return true;
      } catch (e) {}
    }
    throw new Error('Server did not become ready in time');
  }
}

async function smoke() {
  console.log('[SMOKE] ensuring server...');
  await ensureServer();

  console.log('[SMOKE] checking webui/index.html');
  const idx = await fetch(SERVER_URL + '/webui/index.html');
  if (!idx.ok) throw new Error('/webui/index.html not reachable: ' + idx.status);
  const txt = await idx.text();
  if (!txt.includes('<')) throw new Error('index.html looks invalid');
  console.log('[SMOKE] webui loaded OK');

  console.log('[SMOKE] creating test user via /auth/signup');
  const email = 'smoke+' + Date.now() + '@example.com';
  const signup = await fetch(SERVER_URL + '/auth/signup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password' })
  });
  const signupJson = await signup.json().catch(()=>({}));
  if (!signupJson.access_token) throw new Error('signup failed or no token returned');
  const token = signupJson.access_token;
  console.log('[SMOKE] signup OK, token length=', (token||'').length);

  console.log('[SMOKE] calling /auth/me with token');
  const me = await fetch(SERVER_URL + '/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  const meJson = await me.json().catch(()=>({}));
  if (!meJson.email && !meJson.user) {
    // dev auth returns user directly or object with email
    if (!meJson.email && !meJson.user && !meJson.id) throw new Error('/auth/me returned unexpected payload');
  }
  console.log('[SMOKE] /auth/me OK');

  console.log('[SMOKE] fetching /api/assets');
  const assets = await fetch(SERVER_URL + '/api/assets');
  const assetsJson = await assets.json().catch(()=>null);
  if (!Array.isArray(assetsJson)) throw new Error('/api/assets did not return array');
  console.log('[SMOKE] /api/assets returned', assetsJson.length, 'items');

  console.log('[SMOKE] creating an alert (POST /api/alerts)');
  const alertRes = await fetch(SERVER_URL + '/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ symbol: 'BTC', threshold: 10000, direction: 'above' }) });
  if (alertRes.status >= 400) throw new Error('/api/alerts POST failed: ' + alertRes.status);
  const alertJson = await alertRes.json().catch(()=>({}));
  console.log('[SMOKE] alert created id=', alertJson.id || '(dev-mode)');

  console.log('[SMOKE] smoke tests passed');
}

(async ()=>{
  try {
    await smoke();
    console.log('INTEGRATION SMOKE: SUCCESS');
    process.exit(0);
  } catch (e) {
    console.error('INTEGRATION SMOKE: FAILED', e && (e.stack || e.message || e));
    process.exit(2);
  } finally {
    if (serverProc) {
      serverProc.kill();
    }
  }
})();
