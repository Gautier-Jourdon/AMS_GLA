
// Getters for DOM elements and globals (exported for tests)
export function getLoginPanel() {
  return typeof global !== 'undefined' && global.loginPanel
    ? global.loginPanel
    : (typeof window !== 'undefined' && window.loginPanel)
      ? window.loginPanel
      : (typeof document !== 'undefined' ? document.getElementById('login-panel') : null);
}

export function getMainPanel() {
  return typeof global !== 'undefined' && global.mainPanel
    ? global.mainPanel
    : (typeof window !== 'undefined' && window.mainPanel)
      ? window.mainPanel
      : (typeof document !== 'undefined' ? document.getElementById('main-panel') : null);
}

export function getLoginForm() {
  return typeof document !== 'undefined' ? document.getElementById('login-form') : null;
}

export function getSignupForm() {
  return typeof document !== 'undefined' ? document.getElementById('signup-form') : null;
}

export function getTabLogin() {
  return typeof document !== 'undefined' ? document.getElementById('tab-login') : null;
}

export function getTabSignup() {
  return typeof document !== 'undefined' ? document.getElementById('tab-signup') : null;
}

export function getCurrentUserSpan() {
  if (typeof document !== 'undefined') {

    return document.getElementById('current-user') || (typeof global !== 'undefined' ? global.currentUserSpan : null) || (typeof window !== 'undefined' ? window.currentUserSpan : null);

  }

  if (typeof global !== 'undefined' && global.currentUserSpan) return global.currentUserSpan;

  if (typeof window !== 'undefined' && window.currentUserSpan) return window.currentUserSpan;

  return null;
}

export function getLoadingEl() {
  return typeof document !== 'undefined' ? document.getElementById('loading') : null;
}

export function getErrorEl() {
  return typeof document !== 'undefined' ? document.getElementById('error') : null;
}

export function getTableBody() {
  return typeof document !== 'undefined' ? document.getElementById('assets-body') : null;
}

export function getSearchInput() {
  return typeof document !== 'undefined' ? document.getElementById('search') : null;
}

export function getChartSelect() {
  return typeof document !== 'undefined' ? document.getElementById('chart-crypto') : null;
}

export function getChartPeriod() {
  return typeof document !== 'undefined' ? document.getElementById('chart-period') : null;
}

export function getAlertForm() {
  return typeof document !== 'undefined' ? document.getElementById('alert-form') : null;
}

export function getAlertsListEl() {
  return typeof document !== 'undefined' ? document.getElementById('alerts-list') : null;
}

let allAssets = [];

// auth token and user read from localStorage at import-time but exposed via helpers
let authToken = (typeof localStorage !== 'undefined' && localStorage.getItem('supabase_token')) || null;

let authUser = (typeof localStorage !== 'undefined' && localStorage.getItem('supabase_user')) ? JSON.parse(localStorage.getItem('supabase_user')) : null;

export function getAuthToken() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('supabase_token')) || authToken;
}

export function setAuthToken(tok) {
  authToken = tok;
  if (typeof localStorage !== 'undefined') {
    if (tok) localStorage.setItem('supabase_token', tok);
    else localStorage.removeItem('supabase_token');
  }
}

export function getAuthUser() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('supabase_user')) ? JSON.parse(localStorage.getItem('supabase_user')) : authUser;
}

export function setAuthUser(user) {
  authUser = user;
  if (typeof localStorage !== 'undefined') {
    if (user) localStorage.setItem('supabase_user', JSON.stringify(user));
    else localStorage.removeItem('supabase_user');
  }
}


// Gère l'import dynamique du module session (pour tests)
function importSessionModule(){ try { window.Session = window.Session || null; } catch(e){} }
importSessionModule();
let session = null;

// For tests: allow setting assets from outside
export function setAllAssets(arr){ allAssets = Array.isArray(arr) ? arr : []; }


// Formate un nombre pour affichage (2 décimales, FR)
export function formatNumber(num) {
  if (num === null || num === undefined) return "-";
  return Number(num).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}


// Formate un pourcentage pour affichage (badge up/down)
export function formatPercent(num) {
  if (num === null || num === undefined) return "-";
  const value = Number(num);
  const cls = value >= 0 ? "badge-up" : "badge-down";
  const formatted = value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return `<span class="${cls}">${formatted}</span>`;
}

// Affiche le tableau des assets
export function renderTable(assets, targetTableBody) {

  const body = targetTableBody || getTableBody();

  if (!body) return;

  body.innerHTML = "";

  assets.forEach((asset, index) => {

    const tr = typeof document !== 'undefined' ? document.createElement("tr") : { innerHTML: '' };

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

    body.appendChild(tr);

  });

}

export async function loadAssets() {

  const loading = getLoadingEl();

  const error = getErrorEl();

  loading && loading.classList.remove("hidden");

  error && error.classList.add("hidden");

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

    if (error) {

      error.textContent = "Erreur de chargement des données (" + err.message + ")";

      error.classList.remove("hidden");

    }

  } finally {

    loading && loading.classList.add("hidden");

  }

}

// populate chart select with available assets
export function populateChartSelect(assets) {

  const sel = getChartSelect();

  if (!sel) return;

  sel.innerHTML = '';

  assets.slice(0, 200).forEach(a => {

    const opt = document.createElement('option');

    opt.value = a.symbol;

    opt.textContent = `${a.symbol} — ${a.name}`;

    sel.appendChild(opt);

  });

}


// Affiche l'onglet sélectionné
// get tab buttons from globals or document
export function getTabButtons() {
  if (typeof document === 'undefined') return [];

  const src = (typeof global !== 'undefined' && global.tabButtons)
    ? global.tabButtons
    : (typeof window !== 'undefined' && window.tabButtons)
      ? window.tabButtons
      : document.querySelectorAll('.tab-btn');

  return Array.from(src || []);

}

// get tab sections from globals or document
export function getTabSections() {
  if (typeof document === 'undefined') return [];

  const src = (typeof global !== 'undefined' && global.tabSections)
    ? global.tabSections
    : (typeof window !== 'undefined' && window.tabSections)
      ? window.tabSections
      : document.querySelectorAll('.tab-section');

  return Array.from(src || []);

}

export function switchToTab(name) {

  getTabButtons().forEach(b => b.classList.toggle('active', b.dataset.tab === name));

  getTabSections().forEach(s => s.classList.toggle('hidden', s.id !== 'tab-' + name));

  try { if (name === 'wallet' && typeof loadWallet === 'function') loadWallet(); } catch (e) {}

}

if (typeof document !== 'undefined' && getTabButtons().length) getTabButtons().forEach(b => b.addEventListener('click', () => switchToTab(b.dataset.tab)));


// Génère un historique de prix fictif pour les graphiques
export function generateMockHistory(price, points){
  const arr = [];
  let p = Number(price) || 1;
  for(let i=0;i<points;i++){
    const noise = (Math.random()-0.5) * p * 0.02;
    p = Math.max(0.000001, p + noise);
    arr.push(Number(p.toFixed(6)));
  }
  return arr;
}

// Affiche le graphique d'une crypto
export function renderChartFor(symbol, period) {

  if (typeof document === 'undefined') return;

  const asset = allAssets.find(a => a.symbol === symbol) || allAssets[0];

  if (!asset) return;

  const now = Date.now();

  const points = period === '24h' ? 24 : period === '7d' ? 7 * 24 : 30 * 24;

  const history = generateMockHistory(asset.priceUsd || 1, points);

  const labels = history.map((_, i) => new Date(now - ((history.length - i - 1) * 60 * 60 * 1000)).toLocaleString());

  const canvas = document.getElementById('crypto-chart');

  const ctx = canvas.getContext('2d');

  if (window.cryptoChart && typeof window.cryptoChart.destroy === 'function') window.cryptoChart.destroy();

  window.cryptoChart = new Chart(ctx, {

    type: 'line',

    data: {

      labels,

      datasets: [{ label: `${asset.symbol} price (USD)`, data: history, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.12)', tension: 0.15 }]

    },

    options: {

      plugins: { legend: { display: true } },

      scales: { x: { display: true }, y: { display: true } }

    }

  });

}

if (getChartSelect()) {

  getChartSelect().addEventListener('change', () => renderChartFor(getChartSelect().value, getChartPeriod().value));

  getChartPeriod().addEventListener('change', () => renderChartFor(getChartSelect().value, getChartPeriod().value));

}



// Crée une alerte via l'API (exportée pour tests et usage UI)
// create an alert via the API
export async function createAlert(symbol, threshold, direction) {

  const token = getAuthToken();

  if (!token) throw new Error('Non authentifié');

  const r = await fetch('/api/alerts', {

    method: 'POST',

    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

    body: JSON.stringify({ symbol, threshold, direction })

  });

  if (!r.ok) {

    const j = await r.json().catch(() => ({}));

    throw new Error('Erreur: ' + (j.error || r.status));

  }

  return await r.json();

}


// Affiche le panneau principal après connexion
// show main panel after login
export function showLoggedIn() {

  const loginPanel_ = getLoginPanel();

  const mainPanel_ = getMainPanel();

  const currentUserSpan_ = getCurrentUserSpan();

  if (!loginPanel_ || !mainPanel_) return;

  loginPanel_.classList.add('hidden');

  mainPanel_.classList.remove('hidden');

  if (currentUserSpan_) currentUserSpan_.textContent = getAuthUser() ? (getAuthUser().email || getAuthUser().id) : 'connecté';

  switchToTab('table');

  if (typeof startSessionTimer === 'function') startSessionTimer();

}

// Affiche le panneau de connexion après déconnexion
// show login panel after logout
export function showLoggedOut() {

  const loginPanel_ = getLoginPanel();

  const mainPanel_ = getMainPanel();

  const currentUserSpan_ = getCurrentUserSpan();

  if (!loginPanel_ || !mainPanel_) return;

  loginPanel_.classList.remove('hidden');

  mainPanel_.classList.add('hidden');

  if (currentUserSpan_) currentUserSpan_.textContent = '';

  if (typeof stopSessionTimer === 'function') stopSessionTimer();

}

// Effectue la connexion utilisateur
// perform login and store token/user
export async function doLogin(email, password) {

  const r = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });

  const json = await r.json();

  if (!r.ok) throw new Error(json?.error || JSON.stringify(json));

  const token = json?.access_token || json?.token || null;

  setAuthToken(token);

  const user = json?.user || { email };

  setAuthUser(user);

  showLoggedIn();

}

// Effectue l'inscription utilisateur
// perform signup then login
export async function doSignup(email, password) {

  const r = await fetch('/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });

  const json = await r.json();

  if (!r.ok) throw new Error(json?.error || JSON.stringify(json));

  return doLogin(email, password);

}




// Gère la déconnexion automatique après 30s d'inactivité
let inactivityTimeout = null;
// inactivity management
export function resetInactivity() {

  if (inactivityTimeout) clearTimeout(inactivityTimeout);

  inactivityTimeout = setTimeout(() => { doLogout(true); }, 30 * 1000);

}

export function startSessionTimer() {

  if (typeof window === 'undefined') return;

  ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => window.addEventListener(evt, resetInactivity));

  resetInactivity();

}

export function stopSessionTimer() {

  if (typeof window === 'undefined') return;

  ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => window.removeEventListener(evt, resetInactivity));

  if (inactivityTimeout) clearTimeout(inactivityTimeout);

}

export function doLogout(auto = false) {

  setAuthToken(null);

  setAuthUser(null);

  if (typeof localStorage !== 'undefined') {

    localStorage.removeItem('supabase_token');

    localStorage.removeItem('supabase_user');

  }

  showLoggedOut();

  if (auto && typeof alert !== 'undefined') alert('Vous avez été déconnecté pour cause d\'inactivité (30s)');

}



// Initialise l'UI et la session (à appeler explicitement dans l'UI)
// initialize UI and session
export function initApp() {

  if (typeof window === 'undefined') return;

  if (getAuthToken()) {

    showLoggedIn();

    loadAssets();

    loadAlerts && loadAlerts();

  } else {

    showLoggedOut();

  }

  const search = getSearchInput();

  if (search) {

    search.addEventListener('input', (e) => {

      const q = e.target.value.trim().toLowerCase();

      renderTable(allAssets.filter(a => a.name?.toLowerCase().includes(q) || a.symbol?.toLowerCase().includes(q)));

    });

  }

  // initialize UI enhancements (ticker, theme) in a test-safe way
  try {
    initUIEnhancements();
  } catch (e) { /* non-fatal */ }

}

// UI enhancements: theme toggle and small simulated market ticker
let _tickerInterval = null;
export function startTicker(intervalMs = 2500) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('market-ticker');
  if (!el) return;
  stopTicker();
  const tick = () => {
    const pool = Array.isArray(allAssets) && allAssets.length ? allAssets.slice(0, 8) : [];
    if (!pool.length) { el.textContent = 'Marché: aucune donnée'; return; }
    // create a compact list of items
    el.innerHTML = '';
    pool.forEach(a => {
      const span = document.createElement('span');
      span.className = 'ticker-item';
      const delta = (Math.random() - 0.5) * 2; // percent
      const sign = delta >= 0 ? '+' : '';
      span.textContent = `${a.symbol} ${sign}${delta.toFixed(2)}% ${formatNumber(a.priceUsd)}`;
      el.appendChild(span);
    });
  };
  tick();
  _tickerInterval = setInterval(tick, intervalMs);
}

export function stopTicker(){ if (_tickerInterval) { clearInterval(_tickerInterval); _tickerInterval = null; } }

export function toggleTheme() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const isLight = body.classList.toggle('theme-light');
  try { localStorage.setItem('theme_light', isLight ? '1' : '0'); } catch (e) {}
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.setAttribute('aria-pressed', String(Boolean(isLight)));
}

export function initUIEnhancements() {
  if (typeof document === 'undefined') return;
  // theme from storage
  try {
    const pref = localStorage.getItem('theme_light');
    if (pref === '1') document.body.classList.add('theme-light');
  } catch (e) {}

  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);

  // start a soft market ticker
  startTicker();
}

// Wallet UI helpers
export function getWalletCashEl() {
  return typeof document !== 'undefined' ? document.getElementById('wallet-cash') : null;
}

export function getWalletHoldingsEl() {
  return typeof document !== 'undefined' ? document.getElementById('wallet-holdings') : null;
}

export function getWalletHistoryEl() {
  return typeof document !== 'undefined' ? document.getElementById('wallet-history') : null;
}

export async function loadWallet() {

  if (!getAuthToken()) return;

  try {

    const r = await fetch('/api/wallet', { headers: { Authorization: `Bearer ${getAuthToken()}` } });

    if (!r.ok) return;

    const w = await r.json();

    renderWallet(w);

    const hr = await fetch('/api/wallet/history', { headers: { Authorization: `Bearer ${getAuthToken()}` } });

    if (hr && hr.ok) {

      const h = await hr.json();

      renderWalletHistory(h);

    }

  } catch (e) { console.warn('wallet load failed', e.message); }

}

export function renderWallet(w) {

  const cashEl = getWalletCashEl();

  const holdEl = getWalletHoldingsEl();

  if (cashEl) cashEl.textContent = w?.cash != null ? Number(w.cash).toFixed(2) : '-';

  if (!holdEl) return;

  holdEl.innerHTML = '';

  const h = w?.holdings || {};

  const keys = Object.keys(h);

  if (!keys.length) { holdEl.textContent = 'Aucune position'; return; }

  keys.forEach(sym => {

    const div = document.createElement('div');

    div.textContent = `${sym} : ${Number(h[sym]).toFixed(8)}`;

    holdEl.appendChild(div);

  });

}

export function renderWalletHistory(h) {

  const el = getWalletHistoryEl();

  if (!el) return;

  if (!Array.isArray(h) || h.length === 0) { el.innerHTML = '<div class="status">Aucun trade</div>'; return; }

  el.innerHTML = '';

  h.forEach(t => {

    const d = document.createElement('div');

    d.className = 'wallet-trade';

    d.textContent = `${t.side.toUpperCase()} ${t.symbol} ${Number(t.qty).toFixed(8)} @ ${Number(t.priceUsd).toFixed(2)} USD`;

    el.appendChild(d);

  });

}

// trade form
const tradeForm = typeof document !== 'undefined' ? document.getElementById('wallet-trade-form') : null;
if (tradeForm) tradeForm.addEventListener('submit', async (e) => {

  e.preventDefault();

  const sym = document.getElementById('w-symbol').value.trim();

  const side = document.getElementById('w-side').value;

  const amount = Number(document.getElementById('w-amount').value);

  if (!sym || !side || !amount) return alert('Remplis les champs');

  try {

    const r = await fetch('/api/wallet/trade', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` }, body: JSON.stringify({ symbol: sym, side, amountUsd: amount }) });

    const j = await r.json();

    if (!r.ok) return alert('Erreur trade: ' + (j.error || r.status));

    await loadWallet();

    alert('Trade exécuté');

  } catch (e) { alert('Erreur: ' + e.message); }

});

// Exporte les fonctions principales pour les tests


// get the alerts-list element safely
export function getAlertsList() {

  if (typeof document !== 'undefined') {

    return document.getElementById('alerts-list') || { innerHTML: '', appendChild: () => {} };

  }

  if (typeof global !== 'undefined' && global.alertsList) return global.alertsList;

  return { innerHTML: '', appendChild: () => {} };

}

export async function loadAlerts() {

  const alertsListEl = getAlertsList();

  if (!getAuthToken()) {

    alertsListEl.innerHTML = '<div class="status">Connecte-toi pour voir tes alertes.</div>';

    return;

  }

  try {

    const r = await fetch('/api/alerts', { headers: { Authorization: `Bearer ${getAuthToken()}` } });

    if (!r.ok) { alertsListEl.innerHTML = `<div class="status error">Erreur: ${r.status}</div>`; return; }

    const data = await r.json();

    if (!Array.isArray(data) || data.length === 0) { alertsListEl.innerHTML = '<div class="status">Aucune alerte.</div>'; return; }

    alertsListEl.innerHTML = '';

    data.forEach(a => {

      const div = document.createElement('div');

      div.className = 'alert-item';

      div.innerHTML = `<strong>${a.symbol}</strong> ${a.direction} ${a.threshold} <button data-id="${a.id}" class="alert-delete">Supprimer</button>`;

      alertsListEl.appendChild(div);

    });

    // attach delete handlers

    document.querySelectorAll('.alert-delete').forEach(btn => btn.addEventListener('click', async (e) => {

      const id = e.currentTarget.getAttribute('data-id');

      await deleteAlert(id);

    }));

  } catch (err) {

    alertsListEl.innerHTML = `<div class="status error">${err.message}</div>`;

  }

}


// (supprimé: doublon createAlert)

export async function deleteAlert(id) {

  if (!getAuthToken()) return alert('Non authentifié');

  try {

    const r = await fetch(`/api/alerts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getAuthToken()}` } });

    if (!r.ok) { return alert('Erreur suppression: ' + r.status); }

    await loadAlerts();

  } catch (e) { alert('Erreur: ' + e.message); }

}

function handleAlertFormSubmit(e){
  e.preventDefault();
  const sym = document.getElementById('alert-symbol').value.trim();
  const thr = Number(document.getElementById('alert-threshold').value);
  const dir = document.getElementById('alert-direction').value;
  if(!sym || !thr) return alert('Remplis les champs');
  createAlert(sym, thr, dir);
}

export function attachImportTimeListeners(){
  try{
    if (typeof document !== 'undefined' && getTabButtons().length) getTabButtons().forEach(b => b.addEventListener('click', () => switchToTab(b.dataset.tab)));

    const cs = getChartSelect();

    const cp = getChartPeriod();

    if (cs) {

      cs.addEventListener('change', () => renderChartFor(cs.value, cp.value));

      cp.addEventListener('change', () => renderChartFor(cs.value, cp.value));

    }

    getAlertForm()?.addEventListener('submit', handleAlertFormSubmit);

    getTabLogin()?.addEventListener('click', showLogin);

    getTabSignup()?.addEventListener('click', showSignup);
  }catch(e){ /* defensive */ }
}

// load alerts after successful login / session restore
if (getAuthToken()) loadAlerts();

// (search input handler is defined earlier)

// Simulation de connexion : on accepte n'importe quoi et on passe à la suite
export function showLogin() {

  const lf = getLoginForm();

  const sf = getSignupForm();

  const tl = getTabLogin();

  const ts = getTabSignup();

  lf && lf.classList.remove('hidden');

  sf && sf.classList.add('hidden');

  tl && tl.classList.add('active');

  ts && ts.classList.remove('active');

}

export function showSignup() {

  const lf = getLoginForm();

  const sf = getSignupForm();

  const tl = getTabLogin();

  const ts = getTabSignup();

  lf && lf.classList.add('hidden');

  sf && sf.classList.remove('hidden');

  tl && tl.classList.remove('active');

  ts && ts.classList.add('active');

}

// attach listeners at import-time (keeps previous behavior)
attachImportTimeListeners();

async function handleLoginSubmit(e) {

  e.preventDefault();

  const email = document.getElementById('email').value.trim();

  const password = document.getElementById('password').value;

  const errEl = document.getElementById('login-error');

  errEl.classList.add('hidden');

  try {

    const resp = await fetch('/auth/login', {
      method: 'POST', headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const json = await resp.json();

    if (!resp.ok) {
      errEl.textContent = json.error || JSON.stringify(json);
      errEl.classList.remove('hidden');
      return;
    }

    // Store access token

    const token = json.access_token || json.access_token || json.access_token;

    setAuthToken(token);

    const user = json?.user || { email };

    setAuthUser(user);

    await loadCurrentUser();

    const lp = getLoginPanel();

    const mp = getMainPanel();

    lp && lp.classList.add('hidden');

    mp && mp.classList.remove('hidden');

    loadAssets();

  } catch (err) {

    errEl.textContent = err.message;
    errEl.classList.remove('hidden');

  }

}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('su_email').value.trim();
  const password = document.getElementById('su_password').value;
  const confirm = document.getElementById('su_password_confirm').value;
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');
  if (password !== confirm) {
    errEl.textContent = 'Les mots de passe ne correspondent pas';
    errEl.classList.remove('hidden');
    return;
  }
  try {
    const resp = await fetch('/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json' },
        body: JSON.stringify({
          email,
          password
        })
    });
    const json = await resp.json();
    if (!resp.ok) {
      errEl.textContent = json.error || JSON.stringify(json);
      errEl.classList.remove('hidden');
      return;
    }
    // signup may require confirmation; inform user
    errEl.textContent = 'Inscription réussie. Vérifie ta boîte mail si confirmation requise.';
    errEl.classList.remove('hidden');
    showLogin();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

getLoginForm()?.addEventListener('submit', handleLoginSubmit);

getSignupForm()?.addEventListener('submit', handleSignupSubmit);

export async function loadCurrentUser() {

  try {

    const opts = getAuthToken() ? { 
      headers: {
        Authorization: `Bearer ${getAuthToken()}` 
      }
    } : {};

    const r = await fetch('/auth/me', opts);

    if (!r || !r.ok) return;

    const user = await r.json();

    let span = getCurrentUserSpan();

    if (!span && typeof document !== 'undefined') {

      span = document.getElementById('current-user') || document.createElement('span');

      span.id = 'current-user';

      document.body.appendChild(span);

    }

    if (span) span.textContent = `Connecté en tant ${user.email || user.id || 'Utilisateur'}`;

  } catch (e) {
    console.warn('get user failed', e.message);
  }

}


// (Plus de code d'exécution automatique à l'import)
