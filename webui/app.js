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

const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const tabSections = Array.from(document.querySelectorAll('.tab-section'));
const chartSelect = document.getElementById('chart-crypto');
const chartPeriod = document.getElementById('chart-period');
const alertForm = document.getElementById('alert-form');
const alertsList = document.getElementById('alerts-list');

let allAssets = [];
let authToken = localStorage.getItem('supabase_token') || null;
let authUser = localStorage.getItem('supabase_user') ? JSON.parse(localStorage.getItem('supabase_user')) : null;

// Session inactivity
importSessionModule();
let session = null;

function importSessionModule(){
  // dynamic import for session helper used in tests
  try { window.Session = window.Session || null; } catch(e){}
}

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
    populateChartSelect(allAssets);
  } catch (err) {
    console.error("Erreur de chargement des assets", err);
    errorEl.textContent = "Erreur de chargement des données (" + err.message + ")";
    errorEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function populateChartSelect(assets){
  if(!chartSelect) return;
  chartSelect.innerHTML = '';
  assets.slice(0,200).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.symbol;
    opt.textContent = `${a.symbol} — ${a.name}`;
    chartSelect.appendChild(opt);
  });
}

// ---- Tabs handling ----
function switchToTab(name){
  tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  tabSections.forEach(s => s.classList.toggle('hidden', s.id !== 'tab-'+name));
}
tabButtons.forEach(b => b.addEventListener('click', () => switchToTab(b.dataset.tab)));

// ---- Chart.js setup ----
let cryptoChart = null;
function generateMockHistory(price, points){
  const arr = [];
  let p = Number(price) || 1;
  for(let i=0;i<points;i++){
    const noise = (Math.random()-0.5) * p * 0.02;
    p = Math.max(0.000001, p + noise);
    arr.push(Number(p.toFixed(6)));
  }
  return arr;
}

function renderChartFor(symbol, period){
  const asset = allAssets.find(a => a.symbol === symbol) || allAssets[0];
  if(!asset) return;
  const now = Date.now();
  const points = period === '24h' ? 24 : period === '7d' ? 7*24 : 30*24;
  const history = generateMockHistory(asset.priceUsd || 1, points);
  const labels = history.map((_,i) => new Date(now - ((history.length - i -1) * 60*60*1000)).toLocaleString());

  const ctx = document.getElementById('crypto-chart').getContext('2d');
  if(cryptoChart) cryptoChart.destroy();
  cryptoChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: `${asset.symbol} price (USD)`, data: history, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.12)', tension: 0.15 }]
    },
    options: { plugins: { legend: { display: true } }, scales: { x: { display: true }, y: { display: true } } }
  });
}

if(chartSelect){
  chartSelect.addEventListener('change', () => renderChartFor(chartSelect.value, chartPeriod.value));
  chartPeriod.addEventListener('change', () => renderChartFor(chartSelect.value, chartPeriod.value));
}

// ---- Alerts UI ----
if(alertForm){
  alertForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!authToken) return alert('Vous devez être connecté pour créer une alerte');
    const symbol = document.getElementById('alert-symbol').value.trim();
    const threshold = Number(document.getElementById('alert-threshold').value);
    const direction = document.getElementById('alert-direction').value;
    try{
      const r = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+authToken }, body: JSON.stringify({ symbol, threshold, direction }) });
      if(!r.ok) throw new Error('HTTP '+r.status);
      const json = await r.json();
      appendAlertToList(json);
    }catch(err){ console.error('create alert', err); alert('Erreur création alerte'); }
  });
}

function appendAlertToList(a){
  const div = document.createElement('div');
  div.className = 'alert-item';
  div.textContent = `${a.symbol} ${a.direction} ${a.threshold}`;
  alertsList.appendChild(div);
}

// ---- Auth flow ----
function showLoggedIn(){
  loginPanel.classList.add('hidden');
  mainPanel.classList.remove('hidden');
  currentUserSpan.textContent = authUser ? (authUser.email || authUser.id) : 'connecté';
  switchToTab('table');
  // start session inactivity
  startSessionTimer();
}

function showLoggedOut(){
  loginPanel.classList.remove('hidden');
  mainPanel.classList.add('hidden');
  currentUserSpan.textContent = '';
  stopSessionTimer();
}

async function doLogin(email, password){
  const r = await fetch('/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
  const json = await r.json();
  if(!r.ok) throw new Error(json?.error || JSON.stringify(json));
  // save token if present
  authToken = json?.access_token || json?.token || null;
  if(authToken) localStorage.setItem('supabase_token', authToken);
  authUser = json?.user || { email };
  localStorage.setItem('supabase_user', JSON.stringify(authUser));
  showLoggedIn();
}

async function doSignup(email, password){
  const r = await fetch('/auth/signup', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
  const json = await r.json();
  if(!r.ok) throw new Error(json?.error || JSON.stringify(json));
  // after signup, try login
  return doLogin(email, password);
}



// ---- Session inactivity (30s) ----
let inactivityTimeout = null;
function resetInactivity(){
  if(inactivityTimeout) clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(()=>{
    // auto logout after 30s
    doLogout(true);
  }, 30 * 1000);
}

function startSessionTimer(){
  ['mousemove','keydown','click','scroll'].forEach(evt => window.addEventListener(evt, resetInactivity));
  resetInactivity();
}
function stopSessionTimer(){
  ['mousemove','keydown','click','scroll'].forEach(evt => window.removeEventListener(evt, resetInactivity));
  if(inactivityTimeout) clearTimeout(inactivityTimeout);
}

function doLogout(auto=false){
  authToken = null; authUser = null; localStorage.removeItem('supabase_token'); localStorage.removeItem('supabase_user');
  showLoggedOut();
  if(auto) alert('Vous avez été déconnecté pour cause d\'inactivité (30s)');
}

// Init
if(authToken){ showLoggedIn(); loadAssets(); } else { showLoggedOut(); }

// ensure search filters
searchInput && searchInput.addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  renderTable(allAssets.filter(a => a.name?.toLowerCase().includes(q) || a.symbol?.toLowerCase().includes(q)));
});

/* Alerts: create / list / delete using protected API */

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

// (search input handler is defined earlier)

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
