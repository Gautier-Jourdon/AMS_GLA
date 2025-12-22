import fs from "fs";
import path from "path";
import { getAssets } from "./services/coincapService.js";
import { Client } from "pg";

async function saveToPostgres(records) {
  // Read connection from env, with sensible defaults for local Supabase
  const client = new Client({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || process.env.PG_PORT || 54322),
    user: process.env.PGUSER || process.env.PG_USER || "postgres",
    password: process.env.PGPASSWORD || process.env.PG_PASSWORD || "postgres",
    database: process.env.PGDATABASE || process.env.PG_DATABASE || "postgres"
  });

  try {
    await client.connect();
    // Upsert each record (could be batched but simple and safe for now)
    const text = `INSERT INTO public.assets (id, symbol, name, rank, price_usd, change_percent_24hr, market_cap_usd, volume_usd_24hr, supply, max_supply, explorer, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
      ON CONFLICT (id) DO UPDATE SET
        symbol = EXCLUDED.symbol,
        name = EXCLUDED.name,
        rank = EXCLUDED.rank,
        price_usd = EXCLUDED.price_usd,
        change_percent_24hr = EXCLUDED.change_percent_24hr,
        market_cap_usd = EXCLUDED.market_cap_usd,
        volume_usd_24hr = EXCLUDED.volume_usd_24hr,
        supply = EXCLUDED.supply,
        max_supply = EXCLUDED.max_supply,
        explorer = EXCLUDED.explorer,
        updated_at = now();`;

    for (const r of records) {
      const vals = [r.id, r.symbol, r.name, r.rank, r.price_usd, r.change_percent_24hr, r.market_cap_usd, r.volume_usd_24hr, r.supply, r.max_supply, r.explorer];
      await client.query(text, vals);
    }

    // Insert simple history snapshot
    try {
      const histText = `INSERT INTO public.assets_history (asset_id, price_usd, market_cap_usd, volume_usd24hr, recorded_at)
        VALUES ($1,$2,$3,$4, now())`;
      for (const r of records) {
        const hvals = [r.id, r.price_usd, r.market_cap_usd, r.volume_usd_24hr];
        await client.query(histText, hvals);
      }
    } catch (e) {
      // do not fail the whole upsert if history insert fails
      console.warn('[PG] Warning inserting history:', e.message);
    }

    await client.end();
    console.log("[PG] Upsert réussi pour assets (count:", records.length, ")");
    return true;
  } catch (err) {
    try { await client.end(); } catch(e){}
    console.error("[PG] Erreur :", err.message);
    return false;
  }
}

async function runCollector() {
  try {
    console.log("[INDEX] Récupération des assets...");
    const assets = await getAssets();
    if (!assets) throw new Error("Assets non disponibles");

    // Attempt to save to Supabase; fallback to file if not configured or on error
    const mapped = assets.map(a => ({
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      rank: a.rank,
      price_usd: a.priceUsd,
      change_percent_24hr: a.changePercent24Hr,
      market_cap_usd: a.marketCapUsd,
      volume_usd_24hr: a.volumeUsd24Hr,
      supply: a.supply,
      max_supply: a.maxSupply,
      explorer: a.explorer
    }));

    // Always persist to Postgres. If it fails, log and exit with error code.
    const savedPg = await saveToPostgres(mapped);
    if (!savedPg) {
      console.error('[INDEX] Échec de la persistance dans Postgres. Vérifiez la configuration PGHOST/PGPORT/PGUSER/PGPASSWORD.');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("[INDEX] Erreur :", err.message);
  }
}

runCollector();