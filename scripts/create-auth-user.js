#!/usr/bin/env node
import { Client } from 'pg';
import crypto from 'crypto';

const client = new Client({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 54322),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres'
});

async function main(){
  const email = process.argv[2] || 'testuser+bot@local.dev';
  try{
    await client.connect();
    const cols = await client.query("select column_name from information_schema.columns where table_schema='auth' and table_name='users'");
    const colNames = cols.rows.map(r=>r.column_name);
    console.log('auth.users columns:', colNames.join(', '));

    // Build a minimal row. We'll set id, email, aud, role, and raw_user_meta if present.
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertCols = [];
    const insertVals = [];
    const params = [];
    let idx = 1;

    function add(col, val){ insertCols.push(col); params.push(`$${idx++}`); insertVals.push(val); }

    // Required columns vary; include common ones
    if (colNames.includes('id')) add('id', id);
    if (colNames.includes('aud')) add('aud', 'authenticated');
    if (colNames.includes('role')) add('role', 'authenticated');
    if (colNames.includes('email')) add('email', email);
    if (colNames.includes('raw_user_meta')) add('raw_user_meta', JSON.stringify({ created_via: 'script' }));
    if (colNames.includes('created_at')) add('created_at', now);

    const sql = `INSERT INTO auth.users (${insertCols.join(',')}) VALUES (${params.join(',')}) RETURNING *`;
    console.log('Inserting user:', email);
    const res = await client.query(sql, insertVals);
    console.log('Inserted:', res.rows[0]);
    await client.end();
    process.exit(0);
  }catch(e){
    console.error('Failed to create auth user:', e.message);
    try{ await client.end(); }catch(e){}
    process.exit(2);
  }
}

main();
