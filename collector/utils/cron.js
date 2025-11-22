import fs from "fs";
import { getAssets } from "../services/coincapService";

async function updateAssets() {
  console.log("[CRON] Récupération des assets...");
  const assets = await getAssets();
  if (assets) {
    fs.writeFileSync("../data/assets.json", JSON.stringify(assets, null, 2));
    console.log("Assets mis à jour !");
  }
}

updateAssets();
setInterval(updateAssets, 60000); //ici, il y a une update toutes les minutes.