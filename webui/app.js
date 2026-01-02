

// Getters for DOM elements and globals (exported for tests)
export function getLoginPanel() {
  return typeof global !== 'undefined' && global.loginPanel
    ? global.loginPanel
    : (typeof window !== 'undefined' && window.loginPanel)
      ? window.loginPanel
      : (typeof document !== 'undefined' ? document.getElementById('login-panel') : null);
}

// Auth state - declared early to avoid initialization errors
let authToken = null;
let authUser = null;

// Inactivity timeout - declared early to avoid initialization errors
let inactivityTimeout = null;

// Auto-initialize UI when the DOM is ready so auth wiring runs in the browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    try { initializeApplication(); } catch (e) { console.error('initApp auto-call failed', e); }
  } else {
    window.addEventListener('DOMContentLoaded', () => { try { initializeApplication(); } catch (e) { console.error('initApp auto-call failed', e); } });
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

// auth token and user initialized from localStorage
// (already declared at top of file)
authToken = (typeof localStorage !== 'undefined' && localStorage.getItem('supabase_token')) || null;

authUser = (typeof localStorage !== 'undefined' && localStorage.getItem('supabase_user')) ? JSON.parse(localStorage.getItem('supabase_user')) : null;

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
function importSessionModule() { try { window.Session = window.Session || null; } catch (e) { } }
importSessionModule();
let session = null;

// For tests: allow setting assets from outside
export function setAllAssets(arr) { allAssets = Array.isArray(arr) ? arr : []; }


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
export function debounce(fn, wait = 180) { let t = null; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); }; }

// modal helpers for asset details
export function openAssetModal(html) {
  if (typeof document === 'undefined') return;
  const m = document.getElementById('asset-modal');
  const body = document.getElementById('modal-body');
  if (!m || !body) return;
  body.innerHTML = html;
  m.classList.remove('hidden');
}
export function closeAssetModal() { if (typeof document === 'undefined') return; const m = document.getElementById('asset-modal'); if (!m) return; m.classList.add('hidden'); }

// Affiche le tableau des assets
export function renderTable(assets, targetTableBody) {

  const body = targetTableBody || getTableBody();

  if (!body) return;

  body.innerHTML = "";

  assets.forEach((asset, index) => {

    const tr = typeof document !== 'undefined' ? document.createElement("tr") : { innerHTML: '' };

    const changeHtml = formatPercent(asset.changePercent24Hr);

    // Generate sparkline data (mock 7-day trend)
    const sparklineData = generateMockHistory(asset.priceUsd || 1, 7);
    const sparklineColor = (asset.changePercent24Hr >= 0) ? '#00ff88' : '#ff4757';

    tr.innerHTML = `
      <td>${asset.rank ?? index + 1}</td>
      <td style="font-weight:700;color:var(--accent-blue)">${asset.symbol}</td>
      <td>${asset.name}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-weight:600">$${formatNumber(asset.priceUsd)}</td>
      <td>${changeHtml}</td>
      <td><div class="sparkline-container" data-sparkline="${sparklineData.join(',')}" data-color="${sparklineColor}"></div></td>
      <td>$${formatNumber(asset.marketCapUsd)}</td>
      <td>$${formatNumber(asset.volumeUsd24Hr)}</td>
      <td>${formatNumber(asset.supply)}</td>
      <td>${asset.explorer ? `<a href="${asset.explorer}" target="_blank" rel="noreferrer" style="color:var(--accent-teal);text-decoration:none;font-weight:600">Explorer</a>` : "-"}</td>
    `;

    body.appendChild(tr);

    // Render sparkline after appending (using imported function if available)
    if (typeof document !== 'undefined') {
      const sparklineContainer = tr.querySelector('.sparkline-container');
      if (sparklineContainer && typeof window !== 'undefined' && window.createSparkline) {
        window.createSparkline(sparklineContainer, sparklineData, sparklineColor);
      } else if (sparklineContainer) {
        // Fallback: create simple inline sparkline
        createInlineSparkline(sparklineContainer, sparklineData, sparklineColor);
      }
    }

  });

}

// Simple inline sparkline creator (fallback)
function createInlineSparkline(container, data, color) {
  if (!container || !data || data.length === 0) return;

  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 30;
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  ctx.beginPath();
  data.forEach((value, i) => {
    const x = (i / (data.length - 1)) * canvas.width;
    const y = canvas.height - ((value - min) / range) * canvas.height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  container.appendChild(canvas);
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

    // Update market statistics
    try { updateMarketStats(allAssets); } catch (e) { console.warn('updateMarketStats failed', e); }

    populateChartSelect(allAssets);
    try { populateWalletSymbolSelect(allAssets); } catch (e) { /* non-fatal */ }

    // Charge le graphique BTC par défaut si disponible
    if (allAssets.length > 0) {
      const defaultAsset = allAssets.find(a => a.symbol === 'BTC') || allAssets[0];
      if (typeof renderChartFor === 'function') {
        renderChartFor(defaultAsset.symbol, '24h');
        // update select value to match
        const sel = getChartSelect();
        if (sel) sel.value = defaultAsset.symbol;
      }
    }

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

// Calculate and update market statistics
export function updateMarketStats(assets) {
  if (typeof document === 'undefined' || !assets || assets.length === 0) return;

  try {
    // Calculate total market cap
    const totalMarketCap = assets.reduce((sum, asset) => {
      return sum + (parseFloat(asset.marketCapUsd) || 0);
    }, 0);

    // Calculate total 24h volume
    const totalVolume = assets.reduce((sum, asset) => {
      return sum + (parseFloat(asset.volumeUsd24Hr) || 0);
    }, 0);

    // Calculate BTC dominance
    const btc = assets.find(a => a.symbol === 'BTC');
    const btcDominance = btc && totalMarketCap > 0
      ? ((parseFloat(btc.marketCapUsd) || 0) / totalMarketCap * 100)
      : 0;

    // Update DOM elements with animation
    const marketCapEl = document.getElementById('total-market-cap');
    const volumeEl = document.getElementById('total-volume');
    const btcDomEl = document.getElementById('btc-dominance');
    const assetsEl = document.getElementById('total-assets');

    if (marketCapEl) {
      const formatted = '$' + (totalMarketCap / 1e12).toFixed(2) + 'T';
      marketCapEl.textContent = formatted;
    }

    if (volumeEl) {
      const formatted = '$' + (totalVolume / 1e9).toFixed(2) + 'B';
      volumeEl.textContent = formatted;
    }

    if (btcDomEl) {
      btcDomEl.textContent = btcDominance.toFixed(2) + '%';
    }

    if (assetsEl) {
      assetsEl.textContent = assets.length.toString();
    }

    // Update ticker with top cryptos
    updateTicker(assets.slice(0, 10));

  } catch (e) {
    console.warn('Failed to update market stats:', e);
  }
}

// Update ticker with top crypto prices
function updateTicker(topAssets) {
  if (typeof document === 'undefined' || !topAssets) return;

  const ticker = document.getElementById('market-ticker');
  if (!ticker) return;

  const tickerText = topAssets.map(asset => {
    const change = parseFloat(asset.changePercent24Hr) || 0;
    const arrow = change >= 0 ? '↑' : '↓';
    const price = parseFloat(asset.priceUsd) || 0;
    return `${asset.symbol} $${price.toFixed(2)} ${arrow}${Math.abs(change).toFixed(2)}%`;
  }).join('  •  ');

  ticker.textContent = tickerText + '  •  ' + tickerText; // Duplicate for smooth scroll
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
      try {
        // Populate wallet select
        const storedAssets = typeof allAssets !== 'undefined' ? allAssets : [];
        const select = document.getElementById('w-symbol');
        if (select && storedAssets.length > 0 && select.options.length <= 1) {
          const sorted = [...storedAssets].sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
          sorted.forEach(asset => {
            const opt = document.createElement('option');
            opt.value = asset.symbol;
            opt.textContent = `${asset.symbol} - ${asset.name}`;
            select.appendChild(opt);
          });
        }

        populateWalletSymbolSelect(allAssets);
      } catch (e) { }
      if (typeof loadWallet === 'function') loadWallet();
    }
  } catch (e) { }

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
  try { const sp = document.getElementById('signup-panel'); if (sp && !sp.classList.contains('hidden')) showLoginForm(); } catch (e) { /* ignore */ }
}

// Prevent alerts creation when not authenticated and handle form submit
if (typeof document !== 'undefined') {
  const alertForm = document.getElementById('alert-form');
  const alertsTabButton = document.querySelector('.tab-btn[data-tab="alerts"]');
  if (alertsTabButton) alertsTabButton.addEventListener('click', (e) => {
    // Populate symbol select
    const storedAssets = typeof allAssets !== 'undefined' ? allAssets : [];
    const select = document.getElementById('alert-symbol');
    if (select && storedAssets.length > 0 && select.options.length <= 1) {
      // Sort and populate
      const sorted = [...storedAssets].sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
      sorted.forEach(asset => {
        const opt = document.createElement('option');
        opt.value = asset.symbol;
        opt.textContent = `${asset.symbol} - ${asset.name}`;
        select.appendChild(opt);
      });
    }

    // Check auth from memory or fallback to localStorage
    let user = getAuthUser();
    if (!user && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('authUser');
        if (stored) user = JSON.parse(stored);
      } catch (e) { }
    }

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
      try { showLoginForm(); } catch (e) { }
    }
  });
  if (alertForm) {
    alertForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      // Check auth from memory or fallback to localStorage
      let user = getAuthUser();
      if (!user && typeof localStorage !== 'undefined') {
        try {
          const stored = localStorage.getItem('authUser');
          if (stored) user = JSON.parse(stored);
        } catch (e) { }
      }

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
      if (!['above', 'below'].includes(direction)) { alert('Direction invalide'); return; }
      // disable submit to avoid duplicate submissions
      const submitBtn = alertForm.querySelector('button[type=submit]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        let token = getAuthToken();
        if (!token && typeof localStorage !== 'undefined') token = localStorage.getItem('authToken');

        const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token ? ('Bearer ' + token) : '' }, body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), threshold: thr, direction, delivery_method: delivery }) };
        console.debug('[UI] posting alert to /api/alerts', { opts: { method: opts.method, headers: Object.keys(opts.headers), bodyPreview: (opts.body || '').slice(0, 200) } });
        const resp = await fetchWithBlocking('/api/alerts', opts, { onRetry: null });
        console.debug('[UI] /api/alerts response', { status: resp && resp.status });
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({ error: 'unknown' }));
          console.warn('[UI] alert create failed', { status: resp.status, body: j });
          alert('Erreur création alerte: ' + (j && j.error ? j.error : resp.status));
        } else {
          const j = await resp.json().catch(() => null);
          console.info('[UI] alert created', { row: j });
          alert('Alerte créée. Un email de confirmation a été envoyé si applicable.');
          // refresh alerts list if any
          try { loadAlerts && loadAlerts(); } catch (e) { console.warn('loadAlerts failed', e); }
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
export function generateMockHistory(price, points) {
  const arr = [];
  let p = Number(price) || 1;
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * p * 0.02;
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

  // Create gradient for chart
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
  gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.05)');

  window.cryptoChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${asset.symbol} Prix (USD)`,
        data: history,
        borderColor: '#00d4ff',
        backgroundColor: gradient,
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#00d4ff',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#e6eef8',
            font: { size: 14, weight: '600' },
            padding: 16
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(15, 23, 36, 0.95)',
          titleColor: '#00d4ff',
          bodyColor: '#e6eef8',
          borderColor: '#00d4ff',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          titleFont: { size: 14, weight: '700' },
          bodyFont: { size: 13, weight: '600' },
          callbacks: {
            label: function (context) {
              return 'Prix: $' + context.parsed.y.toFixed(6);
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#9aa4b2',
            font: { size: 11 },
            maxRotation: 0,
            autoSkipPadding: 20
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#9aa4b2',
            font: { size: 11, family: "'JetBrains Mono', monospace" },
            callback: function (value) {
              return '$' + value.toFixed(2);
            }
          }
        }
      },
      onClick: function (evt, elements) {
        try {
          if (!elements || !elements.length) return;
          const idx = elements[0].index;
          const priceAt = history[idx];
          const targetInput = document.getElementById('calc-target');
          if (targetInput) {
            targetInput.value = priceAt;
            updateCalculatorForSymbol(asset.symbol);
          }
        } catch (e) { }
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      }
    }
  });

}

if (getChartSelect()) {

  getChartSelect().addEventListener('change', () => renderChartFor(getChartSelect().value, getChartPeriod().value));

  getChartPeriod().addEventListener('change', () => renderChartFor(getChartSelect().value, getChartPeriod().value));

}

// Calculator logic: compute qty/current value/target value/profit
// Calculator logic: compute qty/current value/target value/profit
export function updateCalculatorForSymbol(symbol) {
  if (typeof document === 'undefined') return;
  const amountEl = document.getElementById('calc-amount');
  const targetEl = document.getElementById('calc-target'); // Prix cible
  const resEl = document.getElementById('calc-results');
  if (!resEl) return;

  const asset = allAssets.find(a => a.symbol === symbol) || allAssets[0];
  const price = Number(asset?.priceUsd) || 0;

  const amount = Number(amountEl?.value) || 0;
  let target = Number(targetEl?.value) || 0;

  if (amount <= 0) {
    resEl.innerHTML = `Entrez un montant à investir (ex: 1000$). Prix actuel: ${formatNumber(price)} $`;
    return;
  }

  // If no target set, default to price * 1.05 (5% profit) for demo
  if (!target) target = price;

  const qty = amount / (price || 1);
  const futureValue = qty * target;
  const profit = futureValue - amount;
  const roi = amount ? (profit / amount) * 100 : 0;

  const profitClass = profit >= 0 ? 'text-green' : 'text-red';
  const sign = profit >= 0 ? '+' : '';

  resEl.innerHTML = `
    <div style="margin-bottom:4px;">Si le ${symbol} atteint <b>${formatNumber(target)} $</b> :</div>
    <div>Portefeuille: <b>${formatNumber(futureValue)} $</b></div>
    <div class="${profitClass}" style="font-weight:bold; margin-top:4px;">
      Gains: ${sign}${formatNumber(profit)} $ (${sign}${roi.toFixed(2)}%)
    </div>
  `;
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
  try { loginPanel_.classList.add('hidden'); } catch (e) { }
  try { mainPanel_.classList.remove('hidden'); } catch (e) { }

  // hide the entire auth area (title + tabs + panels) when logged in
  try {
    const authArea = document.getElementById('auth-area');
    if (authArea) {
      authArea.classList.add('hidden');
      authArea.style.display = 'none'; // Force hide
    }
  } catch (e) { }

  // also hide the containing #login-signin-panel if present - FORCE with inline style
  try {
    const loginPanelWrap = document.getElementById('login-signin-panel');
    if (loginPanelWrap) {
      loginPanelWrap.classList.add('hidden');
      loginPanelWrap.style.display = 'none'; // Force inline style
    }
  } catch (e) { }

  // Show sidebar when logged in
  try {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.remove('hidden');
    }
  } catch (e) { }

  if (currentUserSpan_) currentUserSpan_.textContent = getAuthUser() ? (getAuthUser().email || getAuthUser().id) : 'connecté';

  switchToTab('table');

  if (typeof startSessionTimer === 'function') startSessionTimer();

  try { updateAuthControls(); } catch (e) { }

}

// Affiche le panneau de connexion après déconnexion
// show login panel after logout
export function showLoggedOut() {

  const loginPanel_ = getLoginPanel();

  const mainPanel_ = getMainPanel();

  const currentUserSpan_ = getCurrentUserSpan();

  if (!loginPanel_ || !mainPanel_) return;

  // when logged out, show auth area and login panel, hide main interface
  try {
    const authArea = document.getElementById('auth-area');
    if (authArea) {
      authArea.classList.remove('hidden');
      authArea.style.display = ''; // Reset inline style
    }
  } catch (e) { }

  try { loginPanel_.classList.remove('hidden'); } catch (e) { }
  try { mainPanel_.classList.add('hidden'); } catch (e) { }
  if (currentUserSpan_) currentUserSpan_.textContent = 'Visiteur';

  // ensure #login-signin-panel visible when logged out - reset inline style
  try {
    const loginPanelWrap = document.getElementById('login-signin-panel');
    if (loginPanelWrap) {
      loginPanelWrap.classList.remove('hidden');
      loginPanelWrap.style.display = ''; // Reset inline style
    }
  } catch (e) { }

  // Hide sidebar when logged out
  try {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('hidden');
    }
  } catch (e) { }

  if (typeof stopSessionTimer === 'function') stopSessionTimer();
  try { updateAuthControls(); } catch (e) { }

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
    try { fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => { }); } catch (e) { }
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
  try { console.info('[UI] forcing reload to ensure logout'); window.location.reload(); } catch (e) { console.debug('reload failed', e); }

  if (auto && typeof alert !== 'undefined') alert('Vous avez été déconnecté pour cause d\'inactivité (30s)');

}



// Initialise l'UI et la session (à appeler explicitement dans l'UI)
// initialize UI and session
// Deprecated initApp function removed. The application now uses initializeApplication() which is exported as initApp.

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
  try { updateAuthControls(); } catch (e) { }

}

// Update header auth button and restricted tabs based on login state
export function updateAuthControls() {
  if (typeof document === 'undefined') return;
  const logoutBtn = document.getElementById('logout-btn');
  const currentUserSpan_ = getCurrentUserSpan();
  const isAuthed = Boolean(getAuthToken());
  if (isAuthed) {
    if (logoutBtn) { logoutBtn.textContent = 'Déconnexion'; logoutBtn.classList.remove('ghost'); logoutBtn.onclick = (e) => { e.preventDefault(); doLogout(false); } }
    if (currentUserSpan_) currentUserSpan_.textContent = getAuthUser() ? (getAuthUser().email || getAuthUser().id) : 'connecté';
    // enable tabs
    try { getTabButtons().forEach(b => { if (b.dataset && (b.dataset.tab === 'alerts' || b.dataset.tab === 'wallet')) { b.removeAttribute('disabled'); b.classList.remove('disabled'); } }); } catch (e) { }
    // hide auth area (title, tabs, login/signup panels)
    try { const authArea = document.getElementById('auth-area'); if (authArea) authArea.classList.add('hidden'); } catch (e) { }
  } else {
    if (logoutBtn) { logoutBtn.textContent = 'Déconnexion'; logoutBtn.classList.add('ghost'); logoutBtn.onclick = (e) => { e.preventDefault(); const authArea = document.getElementById('auth-area'); if (authArea) authArea.classList.remove('hidden'); showLoginForm(); } }
    if (currentUserSpan_) currentUserSpan_.textContent = 'Visiteur';
    // disable restricted tabs
    try { getTabButtons().forEach(b => { if (b.dataset && (b.dataset.tab === 'alerts' || b.dataset.tab === 'wallet')) { b.setAttribute('disabled', 'true'); b.classList.add('disabled'); } }); } catch (e) { }
    // ensure auth area visible when logged out
    try { const authArea = document.getElementById('auth-area'); if (authArea) authArea.classList.remove('hidden'); } catch (e) { }
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

export function stopTicker() { if (_tickerInterval) { clearInterval(_tickerInterval); _tickerInterval = null; } }

export function toggleTheme() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const isLight = body.classList.toggle('theme-light');
  try { localStorage.setItem('theme_light', isLight ? '1' : '0'); } catch (e) { }
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.setAttribute('aria-pressed', String(Boolean(isLight)));
}

export function initUIEnhancements() {
  if (typeof document === 'undefined') return;
  // theme from storage
  try {
    const pref = localStorage.getItem('theme_light');
    if (pref === '1') document.body.classList.add('theme-light');
  } catch (e) { }

  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);

  // start a soft market ticker
  startTicker();

  // modal close handler
  const modal = document.getElementById('asset-modal');
  if (modal) {
    modal.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); closeAssetModal(); }));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAssetModal(); });
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
    setTimeout(() => {
      try {
        const canvas = document.getElementById('modal-chart');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          const history = generateMockHistory(asset?.priceUsd || 1, 36);
          if (window.modalChart && typeof window.modalChart.destroy === 'function') window.modalChart.destroy();
          window.modalChart = new Chart(ctx, { type: 'line', data: { labels: history.map((_, i) => i), datasets: [{ data: history, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.08)', tension: 0.25 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { display: false } } } });
        }
      } catch (_) {/* ignore */ }
    }, 50);
  });

  // refresh button
  const refresh = document.getElementById('refresh-assets');
  if (refresh) refresh.addEventListener('click', (e) => { e.preventDefault(); loadAssets(); });

  // ------------------------------------------------------------------
  // Projet AMS GLA - Interface Web Dynamique
  // Gestion de l'authentification (JWT), des Websockets et de l'UI
  // ------------------------------------------------------------------

  // État global de l'application
  let user = null;            // Utilisateur connecté
  let authToken = null;       // Token JWT pour les requêtes API
  let chartInstance = null;   // Instance du graphique Chart.js
  let allAssets = [];         // Liste complète des cryptos disponibles

  // Refs aux éléments DOM pour éviter de les re-chercher tout le temps
  const sections = document.querySelectorAll('.tab-section');
  const mainHeader = document.querySelector('header');
  const authSection = document.getElementById('auth-section');

  // Initialisation au chargement de la page
  document.addEventListener('DOMContentLoaded', () => {

    // Récupère les préférences de l'utilisateur (thème, token stocké)
    loadSettings();

    // Prépare les écouteurs d'événements (boutons, formulaires...)
    initializeApplication();

    // Lance l'animation de fond (particules)
    initParticles();

    // Tente de récupérer les données initiales
    fetchAssets();
  });

  // ---------------------------------------------------
  // Gestion de l'Authentification (Login / Inscription)
  // ---------------------------------------------------

  /**
   * Configure les boutons et formulaires de login/signup
   */
  function setupAuthListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Gestion de la connexion
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;

        try {
          // Envoi des identifiants au backend
          const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
          });

          const data = await res.json();
          if (res.ok && data.access_token) {
            // Connexion réussie : on sauvegarde le token et on met à jour l'UI
            setAuthToken(data.access_token, data.user);
            showToast('Connexion réussie !', 'success');
            loginForm.reset();
          } else {
            showToast('Erreur : ' + (data.error || 'Identifiants invalides'), 'error');
          }
        } catch (err) {
          showToast('Erreur réseau lors de la connexion', 'error');
        }
      });
    }

    // Gestion de l'inscription
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... logique similaire au login (implémentation backend create_user)
      });
    }
  }

  /**
   * Sauvegarde le token JWT dans le navigateur (localStorage)
   * pour rester connecté même après rafraîchissement
   */
  function setAuthToken(token, userData) {
    authToken = token;
    user = userData;

    if (token) {
      localStorage.setItem('ams_auth_token', token);
      localStorage.setItem('ams_user', JSON.stringify(userData));
      updateUIState(true); // Passe l'interface en mode "Connecté"
    } else {
      localStorage.removeItem('ams_auth_token');
      localStorage.removeItem('ams_user');
      updateUIState(false); // Passe l'interface en mode "Invité"
    }
  }

  /**
   * Met à jour l'affichage selon si l'utilisateur est connecté ou non
   * (Affiche/Masque les boutons Login, le Wallet, etc.)
   */
  function updateUIState(isLoggedIn) {
    const loginPanel = document.getElementById('auth-section');
    const userMenu = document.getElementById('user-menu'); // Si on en a un

    if (isLoggedIn) {
      if (loginPanel) loginPanel.classList.add('hidden');
      // Active les fonctionnalités restreintes
    } else {
      if (loginPanel) loginPanel.classList.remove('hidden');
    }
  }
  // calculator bindings
  const amountEl = document.getElementById('calc-amount');
  const qtyEl = document.getElementById('calc-qty');
  const targetEl = document.getElementById('calc-target');
  const swapBtn = document.getElementById('calc-swap');
  const chartSel = getChartSelect();
  const update = debounce(() => { const sym = chartSel ? chartSel.value : (allAssets[0] && allAssets[0].symbol); updateCalculatorForSymbol(sym); }, 120);
  if (amountEl) amountEl.addEventListener('input', update);
  if (qtyEl) qtyEl.addEventListener('input', update);
  if (targetEl) targetEl.addEventListener('input', update);
  if (swapBtn) swapBtn.addEventListener('click', (e) => { e.preventDefault(); if (!amountEl || !qtyEl) return; const a = amountEl.value; amountEl.value = qtyEl.value; qtyEl.value = a; update(); });
  if (chartSel) chartSel.addEventListener('change', () => update());
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
    try { retry.removeEventListener('click', onRetryWrap); } catch (e) { }
    try { reload.removeEventListener('click', onReload); } catch (e) { }
    try { close.removeEventListener('click', onClose); } catch (e) { }
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
      try { txt = await r.text(); } catch (e) { }
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

// ---------------------------------------------------
// Gestion du Portefeuille (Wallet) & Trading
// ---------------------------------------------------

/**
 * Affiche l'état du portefeuille (Solde, Actifs détenus)
 * Met à jour le DOM sans tout casser (pour garder le formulaire actif)
 */
export function renderWallet(w) {

  const cashEl = getWalletCashEl();
  const holdEl = getWalletHoldingsEl();
  const valueEl = document.getElementById('wallet-value');

  // Met à jour le solde Cash disponible
  if (cashEl) cashEl.textContent = w?.cash != null ? Number(w.cash).toFixed(2) : '-';

  // Calcul de la valeur totale estimée (Cash + Valeur des cryptos)
  let totalVal = Number(w?.cash || 0);

  // Affiche la liste des cryptos possédées
  if (holdEl) {
    holdEl.innerHTML = ''; // Nettoie la liste précédente
    const h = w?.holdings || {};
    const keys = Object.keys(h);

    if (!keys.length) {
      holdEl.innerHTML = '<div class="wallet-trade" style="text-align: center; color: var(--text-muted);">Aucune position active</div>';
    } else {
      keys.forEach(sym => {
        // Récupère le prix actuel pour calculer la valorisation
        let currentPrice = 0;
        if (typeof allAssets !== 'undefined') {
          const asset = allAssets.find(a => a.symbol === sym);
          if (asset) currentPrice = Number(asset.priceUsd);
        }

        const qty = Number(h[sym]);
        const val = qty * currentPrice;
        if (currentPrice > 0) totalVal += val;

        // Crée l'élément HTML pour chaque ligne d'actif
        const item = document.createElement('div');
        item.className = 'holding-item';
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="background:var(--accent-blue-dim); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--accent-blue); font-weight:bold;">${sym[0]}</div>
                <div>
                    <div style="font-weight:bold;">${sym}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">${qty.toFixed(6)} unités</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:bold;">$${val > 0 ? val.toFixed(2) : '---'}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${currentPrice > 0 ? '@ $' + currentPrice.toFixed(2) : ''}</div>
            </div>
        `;
        holdEl.appendChild(item);
      });
    }
  }

  // Met à jour l'affichage de la Valeur Totale
  if (valueEl) valueEl.textContent = totalVal.toFixed(2);
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

    // Force exact refresh sequence
    await loadWallet();

    // Refresh history specifically if separate function exists
    if (typeof loadWalletHistory === 'function') {
      const hRes = await fetch('/api/wallet/history', { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      if (hRes.ok) {
        const h = await hRes.json();
        renderWalletHistory(h);
      }
    }

    alert('Trade exécuté avec succès !');

    // Reset form
    document.getElementById('w-amount').value = '';

  } catch (e) { alert('Erreur: ' + e.message); }

});


// Toggle Panel Logic
if (typeof document !== 'undefined') {
  const toggles = document.querySelectorAll('.panel-toggle');
  toggles.forEach(t => {
    t.addEventListener('click', (e) => {
      const content = t.nextElementSibling;
      const icon = t.querySelector('.toggle-icon');
      if (content) {
        if (content.style.display === 'none') {
          content.style.display = 'block'; // Show
          if (icon) icon.className = 'fa fa-chevron-down toggle-icon';
        } else {
          content.style.display = 'none'; // Hide
          if (icon) icon.className = 'fa fa-chevron-right toggle-icon';
        }
      }
    });
  });
}

// Exporte les fonctions principales pour les tests


// get the alerts-list element safely
export function getAlertsList() {

  if (typeof document !== 'undefined') {

    return document.getElementById('alerts-list') || { innerHTML: '', appendChild: () => { } };

  }

  if (typeof global !== 'undefined' && global.alertsList) return global.alertsList;

  return { innerHTML: '', appendChild: () => { } };

}

export async function loadAlerts() {

  const alertsListEl = getAlertsList();

  if (!getAuthToken()) {
    // Try fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) setAuthToken(storedToken); // Restore it
    }
  }

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

  // Check auth from memory or fallback to localStorage
  let token = getAuthToken();
  if (!token && typeof localStorage !== 'undefined') token = localStorage.getItem('authToken');

  if (!token) return alert('Non authentifié');

  try {

    const r = await fetch(`/api/alerts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

    if (r.status === 401) { setAuthToken(null); setAuthUser(null); showLoggedOut(); return alert('Non authentifié'); }

    if (!r.ok) { return alert('Erreur suppression: ' + r.status); }

    await loadAlerts();

  } catch (e) { alert('Erreur: ' + e.message); }

}

function handleAlertFormSubmit(e) {
  e.preventDefault();
  const sym = document.getElementById('alert-symbol').value.trim();
  const thr = Number(document.getElementById('alert-threshold').value);
  const dir = document.getElementById('alert-direction').value;
  if (!sym || !thr) return alert('Remplis les champs');
  createAlert(sym, thr, dir);
}

export function attachImportTimeListeners() {
  try {
    if (typeof document !== 'undefined' && getTabButtons().length) getTabButtons().forEach(b => b.addEventListener('click', () => switchToTab(b.dataset.tab)));

    const cs = getChartSelect();

    const cp = getChartPeriod();

    if (cs) {

      cs.addEventListener('change', () => renderChartFor(cs.value, cp.value));

      cp.addEventListener('change', () => renderChartFor(cs.value, cp.value));

    }

    // (redondant) getAlertForm()?.addEventListener('submit', handleAlertFormSubmit);

    getTabLogin()?.addEventListener('click', showLogin);

    getTabSignup()?.addEventListener('click', showSignup);
  } catch (e) { /* defensive */ }
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

    // COMPLETELY REMOVE login panel from DOM instead of hiding
    if (lp && lp.parentNode) {
      lp.parentNode.removeChild(lp);
    }

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

// Initialize app - check for existing auth and auto-login
function initializeApplication() {
  console.log('[INIT] Starting app initialization (renamed)');

  // Check for existing token in localStorage
  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('authUser');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log('[INIT] Found existing auth, auto-logging in', { email: user.email });

      // Set auth state
      authToken = token;
      authUser = user;

      // Show main panel
      const mainPanel = document.getElementById('main-panel');
      if (mainPanel) {
        mainPanel.classList.remove('hidden');
      }

      // Update user email in header
      const userEmailEl = document.getElementById('current-user-email');
      if (userEmailEl && user.email) {
        userEmailEl.textContent = `Connecté en tant que ${user.email}`;
      }

      // Load user data and assets
      loadCurrentUser();
      loadAssets();

      // Enable restricted tabs for authenticated users
      if (typeof document !== 'undefined') {
        setTimeout(() => {
          const restrictedTabs = document.querySelectorAll('.tab-btn[data-tab="alerts"], .tab-btn[data-tab="wallet"]');
          console.log('[INIT] Enabling restricted tabs:', restrictedTabs.length);
          restrictedTabs.forEach(btn => {
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
            btn.style.pointerEvents = 'auto'; // Force clickable
            btn.style.opacity = '1'; // Force visible
          });
        }, 500); // Small delay to ensure DOM is ready
      }

      console.log('[INIT] Auto-login successful');
    } catch (e) {
      console.error('[INIT] Failed to parse stored auth', e);
      // Clear invalid data
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      // Redirect to login
      window.location.href = '/webui/';
    }
  } else {
    console.log('[INIT] No existing auth found');
    if (window.location.pathname.includes('home.html')) {
      window.location.href = '/webui/';
    }
  }

  // Setup logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    // Remove old listeners to avoid duplicates
    const newBtn = logoutBtn.cloneNode(true);
    if (logoutBtn.parentNode) logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
    newBtn.addEventListener('click', handleLogout);
    console.log('[INIT] Logout button configured');
  }
}

// Handle logout
function handleLogout(e) {
  if (e) e.preventDefault();
  console.log('[AUTH] User logging out');

  // Clear auth state
  authToken = null;
  authUser = null;

  // Clear localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');

  // Redirect to login
  window.location.href = '/webui/';
}

// Export for use
export { initializeApplication as initApp, handleLogout };
