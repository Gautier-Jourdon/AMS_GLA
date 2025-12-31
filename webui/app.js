
// Getters for DOM elements and globals (exported for tests)
export function getLoginPanel() {
  return typeof global !== 'undefined' && global.loginPanel
    ? global.loginPanel
    : (typeof window !== 'undefined' && window.loginPanel)
      ? window.loginPanel
      : (typeof document !== 'undefined' ? document.getElementById('login-panel') : null);
}

// Auto-initialize UI when the DOM is ready so auth wiring runs in the browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    try { initApp(); } catch (e) { console.error('initApp auto-call failed', e); }
  } else {
    window.addEventListener('DOMContentLoaded', () => { try { initApp(); } catch (e) { console.error('initApp auto-call failed', e); } });
  }
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

// small debounce helper for input events (UI only)
export function debounce(fn, wait = 180){ let t = null; return function(...args){ clearTimeout(t); t = setTimeout(()=> fn.apply(this,args), wait); }; }

// modal helpers for asset details
export function openAssetModal(html){
  if (typeof document === 'undefined') return;
  const m = document.getElementById('asset-modal');
  const body = document.getElementById('modal-body');
  if (!m || !body) return;
  body.innerHTML = html;
  m.classList.remove('hidden');
}
export function closeAssetModal(){ if (typeof document === 'undefined') return; const m = document.getElementById('asset-modal'); if (!m) return; m.classList.add('hidden'); }

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

    const response = await fetchWithBlocking('/api/assets', {}, { onRetry: () => loadAssets() });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    allAssets = Array.isArray(data) ? data : [];

    renderTable(allAssets);

    populateChartSelect(allAssets);
    try { populateWalletSymbolSelect(allAssets); } catch(e) { /* non-fatal */ }

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

// populate wallet trade symbol select
export function populateWalletSymbolSelect(assets) {
  if (typeof document === 'undefined') return;
  const sel = document.getElementById('w-symbol');
  if (!sel) return;
  // preserve existing first option
  const empty = sel.querySelector('option[value=""]') ? '' : '<option value="">-- choisir --</option>';
  sel.innerHTML = empty;
  (assets || []).slice(0, 500).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.symbol || a.id;
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

  try {
    if (name === 'wallet') {
      try { populateWalletSymbolSelect(allAssets); } catch(e) {}
      if (typeof loadWallet === 'function') loadWallet();
    }
  } catch (e) {}

}

if (typeof document !== 'undefined' && getTabButtons().length) getTabButtons().forEach(b => b.addEventListener('click', (e) => { if (b.hasAttribute && b.hasAttribute('disabled')) { e.preventDefault(); return; } switchToTab(b.dataset.tab); }));

// Login / Signup toggle (show one form, hide the other)
function showLoginForm() {
  if (typeof document === 'undefined') return;
  const loginPanel = document.getElementById('login-panel');
  const signupPanel = document.getElementById('signup-panel');
  const tabL = document.getElementById('tab-login');
  const tabS = document.getElementById('tab-signup');
  if (loginPanel) loginPanel.classList.remove('hidden');
  if (signupPanel) signupPanel.classList.add('hidden');
  if (tabL) tabL.classList.add('active');
  if (tabS) tabS.classList.remove('active');
  const email = document.getElementById('email'); if (email) email.focus();
}

function showSignupForm() {
  if (typeof document === 'undefined') return;
  const loginPanel = document.getElementById('login-panel');
  const signupPanel = document.getElementById('signup-panel');
  const tabL = document.getElementById('tab-login');
  const tabS = document.getElementById('tab-signup');
  if (signupPanel) signupPanel.classList.remove('hidden');
  if (loginPanel) loginPanel.classList.add('hidden');
  if (tabS) tabS.classList.add('active');
  if (tabL) tabL.classList.remove('active');
  const email = document.getElementById('su_email'); if (email) email.focus();
}

if (typeof document !== 'undefined') {
  const tLogin = document.getElementById('tab-login');
  const tSignup = document.getElementById('tab-signup');
  if (tLogin) tLogin.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
  if (tSignup) tSignup.addEventListener('click', (e) => { e.preventDefault(); showSignupForm(); });
  // ensure initial state: login panel visible, signup hidden
  try { const sp = document.getElementById('signup-panel'); if (sp && !sp.classList.contains('hidden')) showLoginForm(); } catch(e) { /* ignore */ }
}

// Prevent alerts creation when not authenticated and handle form submit
if (typeof document !== 'undefined') {
  const alertForm = document.getElementById('alert-form');
  const alertsTabButton = document.querySelector('.tab-btn[data-tab="alerts"]');
  if (alertsTabButton) alertsTabButton.addEventListener('click', (e) => {
    const user = getAuthUser();
    if (!user) {
      e.preventDefault();
      // show blocking modal prompting login
      const bm = document.getElementById('blocking-modal');
      const msg = document.getElementById('blocking-message');
      const title = document.getElementById('blocking-title');
      if (title) title.textContent = 'Connexion requise';
      if (msg) msg.textContent = 'Vous devez être connecté pour gérer vos alertes. Connectez-vous ou créez un compte.';
      if (bm) bm.classList.remove('hidden');
      // switch to auth area
      try { showLoginForm(); } catch(e){}
    }
  });
  if (alertForm) {
    alertForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const user = getAuthUser();
      if (!user) {
        alert('Vous devez être connecté pour créer une alerte.');
        return;
      }
      const symbol = (document.getElementById('alert-symbol') || {}).value || '';
      const threshold = (document.getElementById('alert-threshold') || {}).value || '';
      const direction = (document.getElementById('alert-direction') || {}).value || '';
      const delivery = (document.getElementById('alert-delivery') || {}).value || 'email';
      console.debug('[UI] alert-form submit values', { symbol, threshold, direction, delivery, user: (user && (user.email || user.id)) });
      // client-side validation
      if (!symbol || symbol.length < 1) { alert('Symbole requis'); return; }
      const thr = Number(threshold);
      if (!isFinite(thr) || thr <= 0 || thr > 1e12) { alert('Seuil invalide'); return; }
      if (!['above','below'].includes(direction)) { alert('Direction invalide'); return; }
      // disable submit to avoid duplicate submissions
      const submitBtn = alertForm.querySelector('button[type=submit]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': getAuthToken() ? ('Bearer ' + getAuthToken()) : '' }, body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), threshold: thr, direction, delivery_method: delivery }) };
        console.debug('[UI] posting alert to /api/alerts', { opts: { method: opts.method, headers: Object.keys(opts.headers), bodyPreview: (opts.body || '').slice(0,200) } });
        const resp = await fetchWithBlocking('/api/alerts', opts, { onRetry: null });
        console.debug('[UI] /api/alerts response', { status: resp && resp.status });
        if (!resp.ok) {
          const j = await resp.json().catch(()=>({ error: 'unknown' }));
          console.warn('[UI] alert create failed', { status: resp.status, body: j });
          alert('Erreur création alerte: ' + (j && j.error ? j.error : resp.status));
        } else {
          const j = await resp.json().catch(()=>null);
          console.info('[UI] alert created', { row: j });
          alert('Alerte créée. Un email de confirmation a été envoyé si applicable.');
          // refresh alerts list if any
          try { loadAlerts && loadAlerts(); } catch(e){ console.warn('loadAlerts failed', e); }
        }
      } catch (e) {
        console.error('alert submit failed', e);
        alert('Erreur réseau lors de la création de l\'alerte: ' + (e && e.message));
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}


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
      scales: { x: { display: true }, y: { display: true } },
      onClick: function(evt, elements){
        try{
          if (!elements || !elements.length) return;
          const idx = elements[0].index;
          const priceAt = history[idx];
          const targetInput = document.getElementById('calc-target');
          if (targetInput) { targetInput.value = priceAt; updateCalculatorForSymbol(asset.symbol); }
        }catch(e){}
      }
    }
  });

}

if (getChartSelect()) {

  getChartSelect().addEventListener('change', () => renderChartFor(getChartSelect().value, getChartPeriod().value));

  getChartPeriod().addEventListener('change', () => renderChartFor(getChartSelect().value, getChartPeriod().value));

}

// Calculator logic: compute qty/current value/target value/profit
export function updateCalculatorForSymbol(symbol){
  if (typeof document === 'undefined') return;
  const amountEl = document.getElementById('calc-amount');
  const qtyEl = document.getElementById('calc-qty');
  const targetEl = document.getElementById('calc-target');
  const resEl = document.getElementById('calc-results');
  if (!resEl) return;
  const asset = allAssets.find(a => a.symbol === symbol) || allAssets[0];
  const price = Number(asset?.priceUsd) || 0;
  let amount = Number(amountEl?.value) || 0;
  let qty = Number(qtyEl?.value) || 0;
  const target = Number(targetEl?.value) || price;
  if (!qty && amount) qty = amount / (price || 1);
  if (!amount && qty) amount = qty * price;
  // ensure numbers
  qty = Number(qty || 0);
  amount = Number(amount || 0);
  const currentValue = qty * price;
  const targetValue = qty * target;
  const profit = targetValue - amount;
  const roi = amount ? (profit / amount) * 100 : 0;
  resEl.innerHTML = `Prix courant: ${formatNumber(price)} USD · Quantité: ${qty ? qty.toFixed(8) : '-'} · Valeur actuelle: ${formatNumber(currentValue)} USD · Valeur cible: ${formatNumber(targetValue)} USD · Profit: ${formatNumber(profit)} USD · ROI: ${roi ? roi.toFixed(2) + '%' : '-'}`;
}



// Crée une alerte via l'API (exportée pour tests et usage UI)
// create an alert via the API
export async function createAlert(symbol, threshold, direction) {

  const token = getAuthToken();


  if (!token) throw new Error('Non authentifié');

  console.debug('[UI] createAlert called', { symbol, threshold, direction, tokenPresent: !!token });

  const r = await fetch('/api/alerts', {

    method: 'POST',

    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

    body: JSON.stringify({ symbol, threshold, direction })

  });

  console.debug('[UI] createAlert response status', { status: r.status });

  if (!r.ok) {

    const j = await r.json().catch(() => ({}));

    console.warn('[UI] createAlert error body', j);

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

  // hide login panel and ensure main UI is visible
  try { loginPanel_.classList.add('hidden'); } catch (e) {}
  try { mainPanel_.classList.remove('hidden'); } catch (e) {}

  // hide the entire auth area (title + tabs) when logged in
  try { const authArea = document.getElementById('auth-area'); if (authArea) authArea.classList.add('hidden'); } catch(e){}
  // also hide the containing #login-signin-panel if present
  try { const loginPanelWrap = document.getElementById('login-signin-panel'); if (loginPanelWrap) loginPanelWrap.classList.add('hidden'); } catch(e){}

  if (currentUserSpan_) currentUserSpan_.textContent = getAuthUser() ? (getAuthUser().email || getAuthUser().id) : 'connecté';

  switchToTab('table');

  if (typeof startSessionTimer === 'function') startSessionTimer();

  try { updateAuthControls(); } catch(e){}

}

// Affiche le panneau de connexion après déconnexion
// show login panel after logout
export function showLoggedOut() {

  const loginPanel_ = getLoginPanel();

  const mainPanel_ = getMainPanel();

  const currentUserSpan_ = getCurrentUserSpan();

  if (!loginPanel_ || !mainPanel_) return;

  // when logged out, show auth area and login panel, hide main interface
  try { const authArea = document.getElementById('auth-area'); if (authArea) authArea.classList.remove('hidden'); } catch(e){}
  try { loginPanel_.classList.remove('hidden'); } catch(e){}
  try { mainPanel_.classList.add('hidden'); } catch(e){}
  if (currentUserSpan_) currentUserSpan_.textContent = 'Visiteur';
  // ensure #login-signin-panel visible when logged out
  try { const loginPanelWrap = document.getElementById('login-signin-panel'); if (loginPanelWrap) loginPanelWrap.classList.remove('hidden'); } catch(e){}

  if (typeof stopSessionTimer === 'function') stopSessionTimer();
  try { updateAuthControls(); } catch(e){}

}

// Effectue la connexion utilisateur
// perform login and store token/user
export async function doLogin(email, password) {

  console.debug('[UI] doLogin attempt', { email });
  const r = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });

  const json = await r.json();

  if (!r.ok) {
    console.warn('[UI] doLogin failed', { status: r.status, body: json });
    throw new Error(json?.error || JSON.stringify(json));
  }

  const token = json?.access_token || json?.token || null;
  console.info('[UI] doLogin success', { email, tokenPresent: !!token });
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

  console.debug('[UI] doLogout start', { auto });
  try {
    // ask server to clear any Supabase cookies
    try { fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(()=>{}); } catch(e) {}
  } catch (e) { console.debug('[UI] logout proxy call failed', e); }

  setAuthToken(null);
  setAuthUser(null);

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('supabase_user');
  }

  try { showLoggedOut(); } catch (e) { console.debug('showLoggedOut failed', e); }

  try { updateAuthControls(); } catch (e) { console.debug('updateAuthControls failed', e); }

  // force reload to ensure any cookie-based session is cleared in the browser
  try { console.info('[UI] forcing reload to ensure logout'); window.location.reload(); } catch(e) { console.debug('reload failed', e); }

  if (auto && typeof alert !== 'undefined') alert('Vous avez été déconnecté pour cause d\'inactivité (30s)');

}



// Initialise l'UI et la session (à appeler explicitement dans l'UI)
// initialize UI and session
export function initApp() {

  if (typeof window === 'undefined') return;

  console.debug('[UI] initApp starting', { tokenPresent: !!getAuthToken(), user: getAuthUser() ? (getAuthUser().email || getAuthUser().id) : null });

  if (getAuthToken()) {

    showLoggedIn();

    loadAssets();

    loadAlerts && loadAlerts();

  } else {

    showLoggedOut();

  }

  const search = getSearchInput();

  if (search) {
    const doSearch = debounce((e) => {
      const q = (e.target?.value || '').trim().toLowerCase();
      renderTable(allAssets.filter(a => a.name?.toLowerCase().includes(q) || a.symbol?.toLowerCase().includes(q)));
    }, 180);
    search.addEventListener('input', doSearch);
  }

  // initialize UI enhancements (ticker, theme) in a test-safe way
  try {
    initUIEnhancements();
  } catch (e) { /* non-fatal */ }

  // wire auth UI (tabs, forms, logout)
  try { wireAuthUI(); } catch (e) { /* non-fatal */ }

}

// Wire login/signup tabs and form handlers
export function wireAuthUI() {
  if (typeof document === 'undefined') return;

  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginForm = getLoginForm();
  const signupForm = getSignupForm();
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  const logoutBtn = document.getElementById('logout-btn');

  function showLoginTab() {
    if (tabLogin) tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupForm) signupForm.classList.add('hidden');
  }

  function showSignupTab() {
    if (tabSignup) tabSignup.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
    if (signupForm) signupForm.classList.remove('hidden');
    if (loginForm) loginForm.classList.add('hidden');
  }

  if (tabLogin) tabLogin.addEventListener('click', (e) => { e.preventDefault(); showLoginTab(); });
  if (tabSignup) tabSignup.addEventListener('click', (e) => { e.preventDefault(); showSignupTab(); });

  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginError) { loginError.classList.add('hidden'); loginError.textContent = ''; }
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const email = (document.getElementById('email') || {}).value || '';
    const password = (document.getElementById('password') || {}).value || '';
    try {
      if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('btn-loading'); }
      await doLogin(email.trim(), password);
      // success: init app data
      loadAssets();
      loadAlerts && loadAlerts();
    } catch (err) {
      if (loginError) { loginError.textContent = err && err.message ? err.message : String(err); loginError.classList.remove('hidden'); }
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('btn-loading'); }
    }
  });

  if (signupForm) signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (signupError) { signupError.classList.add('hidden'); signupError.textContent = ''; }
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const email = (document.getElementById('su_email') || {}).value || '';
    const password = (document.getElementById('su_password') || {}).value || '';
    const confirm = (document.getElementById('su_password_confirm') || {}).value || '';
    if (password !== confirm) { if (signupError) { signupError.textContent = 'Les mots de passe ne correspondent pas'; signupError.classList.remove('hidden'); } return; }
    try {
      if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('btn-loading'); }
      await doSignup(email.trim(), password);
      loadAssets();
      loadAlerts && loadAlerts();
    } catch (err) {
      if (signupError) { signupError.textContent = err && err.message ? err.message : String(err); signupError.classList.remove('hidden'); }
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('btn-loading'); }
    }
  });

  if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); doLogout(false); });

  // ensure initial tab state
  const hasSignupVisible = signupForm && !signupForm.classList.contains('hidden');
  if (hasSignupVisible) showSignupTab(); else showLoginTab();

  // ensure logout/login button and restricted tabs are in correct state
  try { updateAuthControls(); } catch (e) {}

}

// Update header auth button and restricted tabs based on login state
export function updateAuthControls(){
  if (typeof document === 'undefined') return;
  const logoutBtn = document.getElementById('logout-btn');
  const currentUserSpan_ = getCurrentUserSpan();
  const isAuthed = Boolean(getAuthToken());
  if (isAuthed){
    if (logoutBtn){ logoutBtn.textContent = 'Déconnexion'; logoutBtn.classList.remove('ghost'); logoutBtn.onclick = (e)=>{ e.preventDefault(); doLogout(false); } }
    if (currentUserSpan_) currentUserSpan_.textContent = getAuthUser() ? (getAuthUser().email || getAuthUser().id) : 'connecté';
    // enable tabs
    try{ getTabButtons().forEach(b => { if (b.dataset && (b.dataset.tab === 'alerts' || b.dataset.tab === 'wallet')) { b.removeAttribute('disabled'); b.classList.remove('disabled'); } }); }catch(e){}
    // hide auth area (title, tabs, login/signup panels)
    try { const authArea = document.getElementById('auth-area'); if (authArea) authArea.classList.add('hidden'); } catch(e){}
  } else {
    if (logoutBtn){ logoutBtn.textContent = 'Se connecter'; logoutBtn.classList.add('ghost'); logoutBtn.onclick = (e)=>{ e.preventDefault(); const authArea = document.getElementById('auth-area'); if (authArea) authArea.classList.remove('hidden'); showLoginForm(); } }
    if (currentUserSpan_) currentUserSpan_.textContent = 'Visiteur';
    // disable restricted tabs
    try{ getTabButtons().forEach(b => { if (b.dataset && (b.dataset.tab === 'alerts' || b.dataset.tab === 'wallet')) { b.setAttribute('disabled','true'); b.classList.add('disabled'); } }); }catch(e){}
    // ensure auth area visible when logged out
    try { const authArea = document.getElementById('auth-area'); if (authArea) authArea.classList.remove('hidden'); } catch(e){}
  }
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
  
  // modal close handler
  const modal = document.getElementById('asset-modal');
  if (modal) {
    modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', (e)=>{ e.preventDefault(); closeAssetModal(); }));
    modal.addEventListener('click', (e)=>{ if (e.target === modal) closeAssetModal(); });
  }

  // clickable table rows -> show quick details modal
  const tbody = getTableBody();
  if (tbody) tbody.addEventListener('click', (e) => {
    let tr = e.target.closest && e.target.closest('tr');
    if (!tr) return;
    const sym = tr.children[1] ? tr.children[1].textContent.trim() : null;
    if (!sym) return;
    const asset = allAssets.find(a => a.symbol === sym) || allAssets[tr.rowIndex - 1];
    const html = `<div style="display:flex;gap:12px;align-items:center"><div style="flex:1"><h3>${asset?.symbol} — ${asset?.name}</h3><div>Prix: ${formatNumber(asset?.priceUsd)} USD</div><div>Variation 24h: ${formatPercent(asset?.changePercent24Hr)}</div><div>Market Cap: ${formatNumber(asset?.marketCapUsd)}</div></div><div style="width:420px"><canvas id="modal-chart" width="420" height="180"></canvas></div></div>`;
    openAssetModal(html);
    // render mini chart
    setTimeout(()=>{
      try{
        const canvas = document.getElementById('modal-chart');
        if (canvas){
          const ctx = canvas.getContext('2d');
          const history = generateMockHistory(asset?.priceUsd || 1, 36);
          if (window.modalChart && typeof window.modalChart.destroy === 'function') window.modalChart.destroy();
          window.modalChart = new Chart(ctx, { type:'line', data:{ labels:history.map((_,i)=>i), datasets:[{ data:history, borderColor:'#60a5fa', backgroundColor:'rgba(96,165,250,0.08)', tension:0.25 }] }, options:{plugins:{legend:{display:false}},scales:{x:{display:false}} } });
        }
      }catch(_){/* ignore */}
    }, 50);
  });

  // refresh button
  const refresh = document.getElementById('refresh-assets');
  if (refresh) refresh.addEventListener('click', (e)=>{ e.preventDefault(); loadAssets(); });

  // calculator bindings
  const amountEl = document.getElementById('calc-amount');
  const qtyEl = document.getElementById('calc-qty');
  const targetEl = document.getElementById('calc-target');
  const swapBtn = document.getElementById('calc-swap');
  const chartSel = getChartSelect();
  const update = debounce(()=> { const sym = chartSel ? chartSel.value : (allAssets[0] && allAssets[0].symbol); updateCalculatorForSymbol(sym); }, 120);
  if (amountEl) amountEl.addEventListener('input', update);
  if (qtyEl) qtyEl.addEventListener('input', update);
  if (targetEl) targetEl.addEventListener('input', update);
  if (swapBtn) swapBtn.addEventListener('click', (e)=>{ e.preventDefault(); if (!amountEl || !qtyEl) return; const a = amountEl.value; amountEl.value = qtyEl.value; qtyEl.value = a; update(); });
  if (chartSel) chartSel.addEventListener('change', ()=> update());
}

// Blocking modal helpers for critical errors
export function showBlockingModal(title, message, onRetry) {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('blocking-modal');
  const t = document.getElementById('blocking-title');
  const m = document.getElementById('blocking-message');
  const retry = document.getElementById('blocking-retry');
  const reload = document.getElementById('blocking-reload');
  const close = document.getElementById('blocking-close');
  if (!modal || !t || !m) return;
  t.textContent = title || 'Erreur';
  m.textContent = message || '';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  function cleanup() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    try { retry.removeEventListener('click', onRetryWrap); } catch(e){}
    try { reload.removeEventListener('click', onReload); } catch(e){}
    try { close.removeEventListener('click', onClose); } catch(e){}
  }
  function onRetryWrap(e) { e.preventDefault(); if (typeof onRetry === 'function') onRetry(); cleanup(); }
  function onReload(e) { e.preventDefault(); cleanup(); window.location.reload(); }
  function onClose(e) { e.preventDefault(); cleanup(); }
  retry.addEventListener('click', onRetryWrap);
  reload.addEventListener('click', onReload);
  close.addEventListener('click', onClose);
}

export function hideBlockingModal() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('blocking-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

// fetch wrapper that shows blocking modal on network/5xx errors
export async function fetchWithBlocking(url, opts = {}, opts2 = {}) {
  try {
    const r = await fetch(url, opts);
    if (r.status === 401) return r; // let caller handle 401
    if (r.status >= 500) {
      let txt = '';
      try { txt = await r.text(); } catch (e) {}
      showBlockingModal('Erreur serveur', `Le serveur a retourné ${r.status}. ${txt || ''}`, opts2.onRetry);
    }
    return r;
  } catch (e) {
    showBlockingModal('Erreur réseau', 'Impossible de contacter le serveur. Vérifie ta connexion et réessaie.', opts2.onRetry);
    throw e;
  }
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

    const r = await fetchWithBlocking('/api/wallet', { headers: { Authorization: `Bearer ${getAuthToken()}` } }, { onRetry: () => loadWallet() });
    if (r.status === 401) {
      // token invalid -> clear and show login
      setAuthToken(null);
      setAuthUser(null);
      showLoggedOut();
      return;
    }
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

  // build a nicer wallet card: holdings + quick actions + tips
  holdEl.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'wallet-card';

  const left = document.createElement('div'); left.className = 'left';
  const right = document.createElement('div'); right.className = 'right';

  // holdings list
  const h = w?.holdings || {};
  const keys = Object.keys(h);
  if (!keys.length) {
    left.innerHTML = '<div class="status">Aucune position</div>';
  } else {
    keys.forEach(sym => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '8px';
      card.innerHTML = `<strong>${sym}</strong><div>${Number(h[sym]).toFixed(8)} coins</div>`;
      left.appendChild(card);
    });
  }

  // right: enhance existing trade form with quick buttons and tips
  const tradeForm = document.getElementById('wallet-trade-form');
  if (tradeForm) {
    // ensure trade form has nice spacing
    tradeForm.classList.add('trade-form');
    // quick percent buttons (only add once)
    if (!tradeForm.querySelector('.quick-pct')) {
      const pctWrap = document.createElement('div'); pctWrap.className = 'trade-actions quick-pct';
      ['25%','50%','75%','100%'].forEach(lbl => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost'; b.textContent = lbl;
        b.addEventListener('click', (e)=>{
          e.preventDefault();
          const cash = Number(w?.cash) || 0;
          const pct = Number(lbl.replace('%',''))/100;
          const amountInput = document.getElementById('w-amount');
          if (amountInput) amountInput.value = (cash * pct).toFixed(2);
        });
        pctWrap.appendChild(b);
      });
      tradeForm.insertBefore(pctWrap, tradeForm.firstChild);
    }
    // move form into right panel for card layout
    right.appendChild(tradeForm);
  } else {
    right.innerHTML = '<div class="status">Formulaire de trading indisponible</div>';
  }

  // tips section
  const tips = document.createElement('div'); tips.className = 'tips';
  tips.textContent = 'Conseils: Diversifiez vos positions, utilisez des ordres limités, et ne tradez qu’avec des montants que vous pouvez vous permettre de perdre.';
  right.appendChild(tips);

  container.appendChild(left);
  container.appendChild(right);
  holdEl.appendChild(container);

}

export function renderWalletHistory(h) {

  const el = getWalletHistoryEl();

  if (!el) return;

  if (!Array.isArray(h) || h.length === 0) { el.innerHTML = '<div class="status">Aucun trade</div>'; return; }

  el.innerHTML = '';

  h.forEach(t => {

    const d = document.createElement('div');

    d.className = 'wallet-trade';

    const ts = t.createdAt ? (new Date(t.createdAt)).toLocaleString() : (t.createdAtStr || '');
    d.textContent = `${ts} — ${t.side.toUpperCase()} ${t.symbol} ${Number(t.qty).toFixed(8)} @ ${Number(t.priceUsd).toFixed(2)} USD (USD ${Number(t.amountUsd || (t.qty * t.priceUsd)).toFixed(2)})`;

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

    const r = await fetchWithBlocking('/api/alerts', { headers: { Authorization: `Bearer ${getAuthToken()}` } }, { onRetry: () => loadAlerts() });
    if (r.status === 401) {
      // token invalid or expired: clear and prompt login
      setAuthToken(null);
      setAuthUser(null);
      alertsListEl.innerHTML = '<div class="status">Connecte-toi pour voir tes alertes.</div>';
      showLoggedOut();
      return;
    }

    if (!r.ok) { alertsListEl.innerHTML = `<div class="status error">Erreur: ${r.status}</div>`; return; }

    const data = await r.json();

    if (!Array.isArray(data) || data.length === 0) { alertsListEl.innerHTML = '<div class="status">Aucune alerte.</div>'; return; }

    alertsListEl.innerHTML = '';

    data.forEach(a => {

      const div = document.createElement('div');

      div.className = 'alert-item';

      div.innerHTML = `<strong>${a.symbol}</strong> ${a.direction} ${a.threshold} <button data-id="${a.id}" class="btn ghost alert-delete">Supprimer</button>`;

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

    if (r.status === 401) { setAuthToken(null); setAuthUser(null); showLoggedOut(); return alert('Non authentifié'); }

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
