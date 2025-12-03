import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const COINCAP_URL = "https://rest.coincap.io/v3/assets";
const API_KEY = process.env.COINCAP_KEY;

import fetch from "node-fetch";

export async function getAssets(limit = 2000) {
  try {
    const url = `${COINCAP_URL}?limit=${limit}`;

    // On prépare les headers avec Bearer token s'il est présent
    const headers = {};
    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    // Première tentative d'en-tête avec l'Authorization
    let response;
    try {
      response = await fetch(url, { headers });
    } catch (err) {
      throw new Error(`Erreur réseau lors de la requête CoinCap: ${err.message}`);
    }

    // Si on tombe sur l'erreur 403 mais qu'on a une clé, on retente en fournissant la clé dans l'URL
      if ((response.status === 403 || response.status === 401) && API_KEY) {
      let bodyText = '';
      try { bodyText = await response.text(); } catch (e) { bodyText = '<impossible de lire le corps>'; }
        console.warn(`[SERVICE] ${response.status} reçu avec Authorization header. Corps: ${bodyText}. Re-tentative avec apiKey en paramètre.`);

      const urlWithKey = `${COINCAP_URL}?limit=${limit}&apiKey=${API_KEY}`;
      try {
        response = await fetch(urlWithKey);
      } catch (err) {
        throw new Error(`Erreur réseau lors de la requête CoinCap (fallback): ${err.message}`);
      }
    }

    if (!response.ok) {
      let bodyText;
      try {
        bodyText = await response.text();
      } catch (e) {
        bodyText = '<impossible de lire le corps>';
      }
      throw new Error(`Erreur HTTP : ${response.status} - ${bodyText}`);
    }

    const raw = await response.json();
    const toNum = (v) => (v === null || v === undefined || v === "") ? null : Number(v);

    const mapped = (raw.data || []).map((item) => ({
      id: item.id ?? null,
      symbol: item.symbol ?? null,
      name: item.name ?? null,
      rank: item.rank != null ? Number(item.rank) : null,
      priceUsd: toNum(item.priceUsd),
      changePercent24Hr: toNum(item.changePercent24Hr),
      marketCapUsd: toNum(item.marketCapUsd),
      volumeUsd24Hr: toNum(item.volumeUsd24Hr),
      supply: toNum(item.supply),
      maxSupply: toNum(item.maxSupply),
      explorer: item.explorer ?? null
    }));

    return mapped;
  } catch (err) {
    console.error("[SERVICE] Erreur :", err.message);
    return null;
  }
}