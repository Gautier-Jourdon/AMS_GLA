import fs from 'fs/promises';
import path from 'path';
import { Client } from 'pg';

async function main(){
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
  const sql = await Promise.all(sqlFiles.map(f => fs.readFile(path.join(migrationsDir,f),'utf8')));

  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'postgres'
  });
  try{
    await client.connect();
    for (const s of sql){
      console.log('Applying SQL chunk...');
      await client.query(s);
    }
    console.log('Migrations applied.');
    await client.end();
  }catch(e){
    try{ await client.end(); }catch(e){}
    console.error('Failed applying migrations', e.message || e);
    process.exit(1);
  }
}

if (process.argv[1].endsWith('apply-schemas.js')) main();
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
