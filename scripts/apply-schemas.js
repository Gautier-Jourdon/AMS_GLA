#!/usr/bin/env node
/* apply-schemas.js
   Executes all .sql files in supabase/schemas against a Postgres DB using `pg`.

   Usage (env vars):
     PGHOST (default: localhost)
     PGPORT (default: 54322)
     PGUSER (default: postgres)
     PGPASSWORD (default: postgres)
     PGDATABASE (default: postgres)

   Example:
     PGHOST=localhost PGPORT=54322 PGUSER=postgres PGPASSWORD=postgres node scripts/apply-schemas.js
*/

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const schemaDir = path.resolve(process.cwd(), 'supabase', 'schemas');

const PGHOST = process.env.PGHOST || 'localhost';
const PGPORT = process.env.PGPORT ? Number(process.env.PGPORT) : 54322;
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD || 'postgres';
const PGDATABASE = process.env.PGDATABASE || 'postgres';

async function applyFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  if (!sql.trim()) return;
  console.log(`\n--- Applying ${path.basename(filePath)} ---`);
  try {
    await client.query(sql);
    console.log(`OK: ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`ERROR applying ${path.basename(filePath)}:` , err.message || err);
    throw err;
  }
}

async function main() {
  if (!fs.existsSync(schemaDir)) {
    console.error('Schema directory not found:', schemaDir);
    process.exit(2);
  }

  const files = fs.readdirSync(schemaDir)
    .filter(f => f.toLowerCase().endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No .sql files found in', schemaDir);
    process.exit(0);
  }

  const client = new Client({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: PGDATABASE });
  try {
    console.log(`Connecting to Postgres ${PGHOST}:${PGPORT} as ${PGUSER} (db=${PGDATABASE})`);
    await client.connect();
    for (const f of files) {
      const p = path.join(schemaDir, f);
      await applyFile(client, p);
    }
    console.log('\nAll schemas applied successfully.');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to apply schemas:', err.message || err);
    try { await client.end(); } catch(e){}
    process.exit(1);
  }
}

main();
