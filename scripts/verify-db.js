#!/usr/bin/env node
import { Client } from 'pg';

const client = new Client({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 54322),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres'
});

async function main(){
  try{
    await client.connect();
    console.log('Connected to Postgres.');
    const tables = ['public.assets','public.assets_history','public.alerts','public.profiles','public.user_settings'];
    for(const t of tables){
      try{
        const r = await client.query(`select count(*) as cnt from ${t}`);
        console.log(`${t}: ${r.rows[0].cnt}`);
      }catch(e){
        console.warn(`${t}: not found or query failed (${e.message})`);
      }
    }
    // show a sample asset
    try{
      const r = await client.query('select id, symbol, name, price_usd from public.assets limit 5');
      console.log('Sample assets:', r.rows);
    }catch(e){/* ignore */}
    await client.end();
    process.exit(0);
  }catch(e){
    console.error('DB verify failed:', e.message);
    try{ await client.end(); }catch(e){}
    process.exit(2);
  }
}

main();
