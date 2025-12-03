const loginPanel = document.getElementById("login-panel");
const mainPanel = document.getElementById("main-panel");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const currentUserSpan = document.getElementById("current-user");

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const tableBody = document.getElementById("assets-body");
const searchInput = document.getElementById("search");

let allAssets = [];

function formatNumber(num) {
  if (num === null || num === undefined) return "-";
  return Number(num).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  });
}

function formatPercent(num) {
  if (num === null || num === undefined) return "-";
  const value = Number(num);
  const cls = value >= 0 ? "badge-up" : "badge-down";
  const formatted = value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return `<span class="${cls}">${formatted}</span>`;
}

function renderTable(assets) {
  tableBody.innerHTML = "";

  assets.forEach((asset, index) => {
    const tr = document.createElement("tr");

    const changeHtml = formatPercent(asset.changePercent24Hr);

    tr.innerHTML = `
      <td>${asset.rank ?? index + 1}</td>
      <td>${asset.symbol}</td>
      <td>${asset.name}</td>
      <td>${formatNumber(asset.priceUsd)}</td>
      <td>${changeHtml}</td>
      <td>${formatNumber(asset.marketCapUsd)}</td>
      <td>${formatNumber(asset.volumeUsd24Hr)}</td>
      <td>${formatNumber(asset.supply)}</td>
      <td>${asset.maxSupply ? formatNumber(asset.maxSupply) : "-"}</td>
      <td>${asset.explorer ? `<a href="${asset.explorer}" target="_blank" rel="noreferrer">Lien</a>` : "-"}</td>
    `;

    tableBody.appendChild(tr);
  });
}

async function loadAssets() {
  loadingEl.classList.remove("hidden");
  errorEl.classList.add("hidden");

  try {
    // IMPORTANT : cette URL doit être servie via http:// (npm run webui)
    // On passe par l'API servie par server.js pour éviter les soucis de CORS
    const response = await fetch("/api/assets");
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    const data = await response.json();
    allAssets = Array.isArray(data) ? data : [];
    renderTable(allAssets);
  } catch (err) {
    console.error("Erreur de chargement des assets", err);
    errorEl.textContent = "Erreur de chargement des données (" + err.message + ")";
    errorEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

// Filtre simple par nom ou symbole
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderTable(allAssets);
      return;
    }
    const filtered = allAssets.filter((asset) => {
      return (
        asset.name.toLowerCase().includes(q) ||
        asset.symbol.toLowerCase().includes(q)
      );
    });
    renderTable(filtered);
  });
}

// Simulation de connexion : on accepte n'importe quoi et on passe à la suite
if (loginForm) {
  const handleLogin = (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim() || "Utilisateur";
    currentUserSpan.textContent = `Connecté en tant que ${username}`;

    loginPanel.classList.add("hidden");
    mainPanel.classList.remove("hidden");

    loadAssets();
  };

  loginForm.addEventListener("submit", handleLogin);

  // Validation par touche Entrée sur le champ mot de passe
  loginForm.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleLogin(event);
    }
  });
}
