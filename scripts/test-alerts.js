import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const BASE = `http://127.0.0.1:${process.env.PORT || 3000}`;

async function run() {
  console.log('Signing up test user...');
  const email = 'alerts-test+' + Date.now() + '@example.com';
  const signup = await fetch(BASE + '/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password' }) });
  const sj = await signup.json().catch(()=>null);
  if (!sj || !sj.access_token) throw new Error('signup failed: ' + JSON.stringify(sj));
  const token = sj.access_token;
  console.log('Got token (len)', (token||'').length);

  console.log('Creating alert...');
  const post = await fetch(BASE + '/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ symbol: 'ETH', threshold: 1234, direction: 'above' }) });
  const pj = await post.json().catch(()=>null);
  if (!post.ok) throw new Error('create alert failed: ' + JSON.stringify(pj));
  console.log('Created alert:', pj.id || pj);

  console.log('Listing alerts...');
  const list = await fetch(BASE + '/api/alerts', { headers: { Authorization: `Bearer ${token}` } });
  const lj = await list.json().catch(()=>null);
  if (!Array.isArray(lj)) throw new Error('list alerts returned unexpected: ' + JSON.stringify(lj));
  console.log('Alerts count:', lj.length);

  const id = lj[0] && lj[0].id;
  if (!id) throw new Error('no alert id found to delete');

  console.log('Deleting alert id=', id);
  const del = await fetch(BASE + '/api/alerts/' + id, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!del.ok) throw new Error('delete failed: ' + del.status);

  console.log('Verifying deletion...');
  const list2 = await fetch(BASE + '/api/alerts', { headers: { Authorization: `Bearer ${token}` } });
  const l2 = await list2.json().catch(()=>null);
  console.log('Alerts after delete:', Array.isArray(l2) ? l2.length : l2);

  console.log('ALERTS TEST SUCCESS');
}

run().catch(e => { console.error('ALERTS TEST FAILED', e && (e.stack || e.message || e)); process.exit(2); });
