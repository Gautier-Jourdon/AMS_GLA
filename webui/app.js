const loginPanel = document.getElementById("login-panel");
const mainPanel = document.getElementById("main-panel");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const currentUserSpan = document.getElementById("current-user");

const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const tableBody = document.getElementById("assets-body");
const searchInput = document.getElementById("search");

let allAssets = [];
let authToken = localStorage.getItem('supabase_token') || null;

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

/* Alerts: create / list / delete using protected API */
const alertForm = document.getElementById('alert-form');
const alertsList = document.getElementById('alerts-list');

async function loadAlerts(){
  if (!authToken) { alertsList.innerHTML = '<div class="status">Connecte-toi pour voir tes alertes.</div>'; return; }
  try{
    const r = await fetch('/api/alerts', { headers: { Authorization: `Bearer ${authToken}` } });
    if (!r.ok) { alertsList.innerHTML = `<div class="status error">Erreur: ${r.status}</div>`; return; }
    const data = await r.json();
    if (!Array.isArray(data) || data.length===0) { alertsList.innerHTML = '<div class="status">Aucune alerte.</div>'; return; }
    alertsList.innerHTML = '';
    data.forEach(a => {
      const div = document.createElement('div');
      div.className = 'alert-item';
      div.innerHTML = `<strong>${a.symbol}</strong> ${a.direction} ${a.threshold} <button data-id="${a.id}" class="alert-delete">Supprimer</button>`;
      alertsList.appendChild(div);
    });
    // attach delete handlers
    document.querySelectorAll('.alert-delete').forEach(btn => btn.addEventListener('click', async (e)=>{
      const id = e.currentTarget.getAttribute('data-id');
      await deleteAlert(id);
    }));
  }catch(err){ alertsList.innerHTML = `<div class="status error">${err.message}</div>`; }
}

async function createAlert(symbol, threshold, direction){
  if (!authToken) return alert('Non authentifié');
  try{
    const r = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ symbol, threshold, direction }) });
    if (!r.ok) { const j = await r.json().catch(()=>({})); return alert('Erreur: '+(j.error||r.status)); }
    await loadAlerts();
  }catch(e){ alert('Erreur: '+e.message); }
}

async function deleteAlert(id){
  if (!authToken) return alert('Non authentifié');
  try{
    const r = await fetch(`/api/alerts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
    if (!r.ok) { return alert('Erreur suppression: '+r.status); }
    await loadAlerts();
  }catch(e){ alert('Erreur: '+e.message); }
}

alertForm?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const sym = document.getElementById('alert-symbol').value.trim();
  const thr = Number(document.getElementById('alert-threshold').value);
  const dir = document.getElementById('alert-direction').value;
  if(!sym || !thr) return alert('Remplis les champs');
  createAlert(sym, thr, dir);
});

// load alerts after successful login / session restore
if (authToken) loadAlerts();

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
function showLogin() {
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
}

function showSignup() {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
  tabLogin.classList.remove('active');
  tabSignup.classList.add('active');
}

tabLogin?.addEventListener('click', showLogin);
tabSignup?.addEventListener('click', showSignup);

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  try {
    const resp = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
    const json = await resp.json();
    if (!resp.ok) { errEl.textContent = json.error || JSON.stringify(json); errEl.classList.remove('hidden'); return; }
    // Store access token
    authToken = json.access_token || json.access_token || json.access_token;
    if (authToken) localStorage.setItem('supabase_token', authToken);
    await loadCurrentUser();
    loginPanel.classList.add('hidden');
    mainPanel.classList.remove('hidden');
    loadAssets();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  }
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('su_email').value.trim();
  const password = document.getElementById('su_password').value;
  const confirm = document.getElementById('su_password_confirm').value;
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');
  if (password !== confirm) { errEl.textContent = 'Les mots de passe ne correspondent pas'; errEl.classList.remove('hidden'); return; }
  try {
    const resp = await fetch('/auth/signup', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
    const json = await resp.json();
    if (!resp.ok) { errEl.textContent = json.error || JSON.stringify(json); errEl.classList.remove('hidden'); return; }
    // signup may require confirmation; inform user
    errEl.textContent = 'Inscription réussie. Vérifie ta boîte mail si confirmation requise.'; errEl.classList.remove('hidden');
    showLogin();
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  }
}

loginForm?.addEventListener('submit', handleLoginSubmit);
signupForm?.addEventListener('submit', handleSignupSubmit);

async function loadCurrentUser() {
  if (!authToken) return;
  try {
    const r = await fetch('/auth/me', { headers: { Authorization: `Bearer ${authToken}` } });
    if (!r.ok) return;
    const user = await r.json();
    currentUserSpan.textContent = `Connecté en tant ${user.email || user.id || 'Utilisateur'}`;
  } catch(e) { console.warn('get user failed', e.message); }
}

// restore session
if (authToken) {
  loginPanel.classList.add('hidden');
  mainPanel.classList.remove('hidden');
  loadCurrentUser();
  loadAssets();
}
