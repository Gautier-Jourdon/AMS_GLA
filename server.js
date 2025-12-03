import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname));

app.get("/api/assets", (req, res) => {
  res.sendFile(path.join(__dirname, "collector", "data", "assets.json"));
});

app.listen(PORT, () => {
  console.log(`Serveur web démarré sur http://localhost:${PORT}/webui/index.html`);
});
