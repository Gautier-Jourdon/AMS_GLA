import dotenv from "dotenv";
dotenv.config();

const COINCAP_URL = "https://rest.coincap.io/v3/assets";
const API_KEY = process.env.COINCAP_KEY;

import fetch from "node-fetch";

export async function getAssets(limit = 2000) {
  try {
    const response = await fetch(`${COINCAP_URL}?limit=${limit}`, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (err) {
    console.error("[SERVICE] Erreur :", err.message);
    return null;
  }
}