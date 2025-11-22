import fs from "fs";
import path from "path";
import { getAssets } from "./services/coincapService.js";

async function runCollector() {
  try {
    console.log("[INDEX] Récupération des assets...");
    const assets = await getAssets();

    const filePath = path.join("data", "assets.json");
    fs.writeFileSync(filePath, JSON.stringify(assets, null, 2));

    console.log("[INDEX] Données enregistrées dans data/assets.json");
  } catch (err) {
    console.error("[INDEX] Erreur :", err.message);
  }
}

runCollector();