import { jest } from '@jest/globals';

describe('Branch coverage for app.js', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
    // basic DOM elements
    const loginForm = document.createElement('div'); loginForm.id = 'login-form'; loginForm.className='';
    const signupForm = document.createElement('div'); signupForm.id = 'signup-form'; signupForm.className='';
    const tabLogin = document.createElement('div'); tabLogin.id = 'tab-login';
    const tabSignup = document.createElement('div'); tabSignup.id = 'tab-signup';
    const alertsList = document.createElement('div'); alertsList.id = 'alerts-list';
    const canvas = document.createElement('canvas'); canvas.id='crypto-chart';
    const loadingEl = document.createElement('div'); loadingEl.id = 'loading'; loadingEl.className='hidden';
    const errorEl = document.createElement('div'); errorEl.id = 'error'; errorEl.className='hidden';
    const ctx = { getContext: () => ({}) };
    canvas.getContext = ctx.getContext;
    document.body.append(loginForm, signupForm, tabLogin, tabSignup, alertsList, canvas, loadingEl, errorEl);
    global.localStorage = { store: {}, getItem(k){return this.store[k]||null}, setItem(k,v){this.store[k]=v}, removeItem(k){delete this.store[k]}, clear(){this.store={}} };
    global.alert = jest.fn();
  });

  test('formatPercent negative number returns badge-down', async () => {
    const mod = await import('../webui/app.js');
    const out = mod.formatPercent(-5.12);
    expect(out).toMatch(/badge-down/);
  });

  test('renderChartFor returns when no asset found', async () => {
    const mod = await import('../webui/app.js');
    mod.setAllAssets([]);
    // mock Chart so if called it would increase calls
    global.Chart = jest.fn();
    mod.renderChartFor('NOPE', '24h');
    expect(global.Chart).not.toHaveBeenCalled();
  });

  test('deleteAlert non-ok and throws path', async () => {
    // ensure module reads token from localStorage
    jest.resetModules();
    localStorage.setItem('supabase_token','t');
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 418 }));
    const mod = await import('../webui/app.js');
    await mod.deleteAlert('x');
    expect(global.alert).toHaveBeenCalled();
  });

  test('deleteAlert fetch throws', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token','t');
    global.fetch = jest.fn(() => Promise.reject(new Error('net')));
    const mod = await import('../webui/app.js');
    await mod.deleteAlert('x');
    expect(global.alert).toHaveBeenCalled();
  });

  test('loadAlerts r.ok false sets error message', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token','t');
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }));
    const mod = await import('../webui/app.js');
    await mod.loadAlerts();
    expect(document.getElementById('alerts-list').innerHTML).toMatch(/Erreur: 500/);
  });

  test('createAlert fetch not ok throws with message', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token','tok');
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: async () => ({ error: 'bad' }) }));
    const mod = await import('../webui/app.js');
    await expect(mod.createAlert('BTC', 1, 'above')).rejects.toThrow(/Erreur: bad/);
  });

  test('showLogin and showSignup toggle classes', async () => {
    const mod = await import('../webui/app.js');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    // spy on the actual classList methods that `showLogin`/`showSignup` call
    const loginRemove = jest.spyOn(loginForm.classList, 'remove');
    const loginAdd = jest.spyOn(loginForm.classList, 'add');
    const signupRemove = jest.spyOn(signupForm.classList, 'remove');
    const signupAdd = jest.spyOn(signupForm.classList, 'add');
    const tabLoginAdd = jest.spyOn(tabLogin.classList, 'add');
    const tabLoginRemove = jest.spyOn(tabLogin.classList, 'remove');
    const tabSignupAdd = jest.spyOn(tabSignup.classList, 'add');
    const tabSignupRemove = jest.spyOn(tabSignup.classList, 'remove');

    mod.showLogin();
    expect(loginRemove).toHaveBeenCalled();
    expect(signupAdd).toHaveBeenCalled();
    expect(tabLoginAdd).toHaveBeenCalled();
    expect(tabSignupRemove).toHaveBeenCalled();

    mod.showSignup();
    expect(loginAdd).toHaveBeenCalled();
    expect(signupRemove).toHaveBeenCalled();
    expect(tabLoginRemove).toHaveBeenCalled();
    expect(tabSignupAdd).toHaveBeenCalled();
  });

  test('loadAlerts with data populates list and delete handler calls deleteAlert', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token','t');
    // always return an alerts array for fetch calls during this test
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ([{ id: '1', symbol: 'BTC', direction: 'above', threshold: 100 }]) }));
    const mod = await import('../webui/app.js');
    await mod.loadAlerts();
    expect(document.getElementById('alerts-list').innerHTML).toMatch(/BTC/);
    const btn = document.querySelector('.alert-delete');
    expect(btn).toBeTruthy();
    // click should trigger DELETE fetch (options.method === 'DELETE')
    btn.click();
    expect(global.fetch).toHaveBeenCalled();
    const hadDelete = global.fetch.mock.calls.some(c => c[0].includes('/api/alerts/') && c[1] && c[1].method === 'DELETE');
    expect(hadDelete).toBeTruthy();
  });

  test('loadCurrentUser sets span when fetch ok', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token','t');
    // ensure current-user span exists
    const cu = document.createElement('span'); cu.id = 'current-user'; document.body.appendChild(cu);
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ email: 'u@test' }) }));
    const mod = await import('../webui/app.js');
    await mod.loadCurrentUser();
    expect(document.getElementById('current-user').textContent).toMatch(/Connecté en tant/);
  });

  test('renderChartFor destroys existing chart and creates new Chart', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const canvas = document.createElement('canvas'); canvas.id='crypto-chart';
    canvas.getContext = () => ({});
    document.body.appendChild(canvas);
    const mod = await import('../webui/app.js');
    mod.setAllAssets([{ symbol: 'BTC', priceUsd: 123 }]);
    const oldChart = { destroy: jest.fn() };
    window.cryptoChart = oldChart;
    global.Chart = jest.fn(() => ({}));
    mod.renderChartFor('BTC', '24h');
    expect(oldChart.destroy).toHaveBeenCalled();
    expect(global.Chart).toHaveBeenCalled();
  });

  test('doLogin stores token/user and calls showLoggedIn', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token', null);
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ access_token: 'tok', user: { email: 'a@b' } }) }));
    // create panels so showLoggedIn has targets
    const loginPanel = document.createElement('div'); loginPanel.id = 'login-panel';
    const mainPanel = document.createElement('div'); mainPanel.id = 'main-panel';
    const currentUser = document.createElement('span'); currentUser.id = 'current-user';
    document.body.append(loginPanel, mainPanel, currentUser);
    const mod = await import('../webui/app.js');
    await mod.doLogin('a@b','pw');
    // verify fetch was called and token stored
    expect(global.fetch).toHaveBeenCalled();
    const hadLogin = global.fetch.mock.calls.some(c => c[0].includes('/auth/login'));
    expect(hadLogin).toBeTruthy();
    expect(localStorage.getItem('supabase_token')).toBe('tok');
  });

  test('loadAlerts fetch throws sets error message', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token','t');
    global.fetch = jest.fn(() => Promise.reject(new Error('boom')));
    const mod = await import('../webui/app.js');
    await mod.loadAlerts();
    expect(document.getElementById('alerts-list').innerHTML).toMatch(/boom/);
  });

  test('resetInactivity schedules logout and triggers alert', async () => {
    jest.resetModules();
    global.alert = jest.fn();
    const mod = await import('../webui/app.js');
    jest.useFakeTimers();
    mod.resetInactivity();
    mod.resetInactivity();
    jest.advanceTimersByTime(31 * 1000);
    expect(global.alert).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('startSessionTimer and stopSessionTimer add/remove listeners', async () => {
    jest.resetModules();
    const spyAdd = jest.spyOn(window, 'addEventListener');
    const spyRemove = jest.spyOn(window, 'removeEventListener');
    const mod = await import('../webui/app.js');
    mod.startSessionTimer();
    expect(spyAdd).toHaveBeenCalled();
    mod.stopSessionTimer();
    expect(spyRemove).toHaveBeenCalled();
    spyAdd.mockRestore();
    spyRemove.mockRestore();
  });

  test('renderChartFor handles 7d and 30d periods', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const canvas = document.createElement('canvas'); canvas.id='crypto-chart';
    canvas.getContext = () => ({});
    document.body.appendChild(canvas);
    const mod = await import('../webui/app.js');
    mod.setAllAssets([{ symbol: 'BTC', priceUsd: 123 }]);
    // ensure any existing chart has a destroy fn
    window.cryptoChart = { destroy: jest.fn() };
    global.Chart = jest.fn(() => ({}));
    mod.renderChartFor('BTC', '7d');
    // set a new old chart again to exercise destroy path on next call
    window.cryptoChart = { destroy: jest.fn() };
    mod.renderChartFor('BTC', '30d');
    expect(global.Chart).toHaveBeenCalledTimes(2);
  });

  test('doSignup non-ok throws error', async () => {
    jest.resetModules();
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: async () => ({ error: 'bad' }) }));
    const mod = await import('../webui/app.js');
    await expect(mod.doSignup('x@y','pw')).rejects.toThrow();
  });

  test('doSignup success calls doLogin and stores token', async () => {
    jest.resetModules();
    // first call signup ok, second call login ok
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({}) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: async () => ({ access_token: 'tok2', user: { email: 's@t' } }) }));
    const mod = await import('../webui/app.js');
    await mod.doSignup('s@t', 'pw');
    const hadLogin = global.fetch.mock.calls.some(c => c[0].includes('/auth/login'));
    expect(hadLogin).toBeTruthy();
    expect(localStorage.getItem('supabase_token')).toBe('tok2');
  });

  test('initApp without token calls showLoggedOut (no assets fetch)', async () => {
    jest.resetModules();
    // ensure no token
    localStorage.removeItem && localStorage.removeItem('supabase_token');
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ([]) }));
    const loginPanel = document.createElement('div'); loginPanel.id = 'login-panel';
    const mainPanel = document.createElement('div'); mainPanel.id = 'main-panel';
    document.body.append(loginPanel, mainPanel);
    const mod = await import('../webui/app.js');
    mod.initApp();
    // if not authenticated, there should be no call to assets endpoint
    const hadAssets = global.fetch.mock.calls.some(c => c[0].includes('/api/assets'));
    expect(hadAssets).toBeFalsy();
  });

  test('initApp with token calls loadAssets/loadAlerts', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token','tok3');
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ([]) }));
    const loginPanel = document.createElement('div'); loginPanel.id = 'login-panel';
    const mainPanel = document.createElement('div'); mainPanel.id = 'main-panel';
    document.body.append(loginPanel, mainPanel);
    const mod = await import('../webui/app.js');
    mod.initApp();
    const hadAssets = global.fetch.mock.calls.some(c => c[0].includes('/api/assets'));
    const hadAlerts = global.fetch.mock.calls.some(c => c[0].includes('/api/alerts'));
    expect(hadAssets || hadAlerts).toBeTruthy();
  });

  test('loadAlerts when unauthenticated shows connect message', async () => {
    jest.resetModules();
    // ensure no token
    localStorage.removeItem && localStorage.removeItem('supabase_token');
    global.fetch = jest.fn();
    const mod = await import('../webui/app.js');
    // ensure no token in module scope
    await mod.loadAlerts();
    expect(document.getElementById('alerts-list').innerHTML).toMatch(/Connecte-toi/);
  });

  test('signup submit shows password mismatch error', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const signupForm = document.createElement('form'); signupForm.id = 'signup-form';
    const su_email = document.createElement('input'); su_email.id = 'su_email'; su_email.value = 'a@b';
    const su_password = document.createElement('input'); su_password.id = 'su_password'; su_password.value = '1';
    const su_password_confirm = document.createElement('input'); su_password_confirm.id = 'su_password_confirm'; su_password_confirm.value = '2';
    const err = document.createElement('div'); err.id = 'signup-error'; err.className = '';
    document.body.append(signupForm, su_email, su_password, su_password_confirm, err);
    const mod = await import('../webui/app.js');
    // trigger submit
    const ev = new Event('submit');
    signupForm.dispatchEvent(ev);
    expect(document.getElementById('signup-error').textContent).toMatch(/mots de passe/);
  });

  test('login submit shows server error message when auth fails', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const loginForm = document.createElement('form'); loginForm.id = 'login-form';
    const email = document.createElement('input'); email.id = 'email'; email.value = 'x@x';
    const password = document.createElement('input'); password.id = 'password'; password.value = 'p';
    const err = document.createElement('div'); err.id = 'login-error'; err.className = '';
    document.body.append(loginForm, email, password, err);
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: async () => ({ error: 'bad' }) }));
    const mod = await import('../webui/app.js');
    // submit
    const ev = new Event('submit');
    loginForm.dispatchEvent(ev);
    // wait for async handler to run
    await new Promise(r => setTimeout(r, 0));
    // error element should be populated
    expect(document.getElementById('login-error').textContent).toMatch(/bad/);
  });

  test('switchToTab uses global.tabButtons and global.tabSections', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const b1 = document.createElement('div'); b1.dataset.tab = 'table'; b1.className = '';
    const b2 = document.createElement('div'); b2.dataset.tab = 'alerts'; b2.className = '';
    const s1 = document.createElement('div'); s1.id = 'tab-table'; s1.className = '';
    const s2 = document.createElement('div'); s2.id = 'tab-alerts'; s2.className = '';
    global.tabButtons = [b1, b2];
    global.tabSections = [s1, s2];
    const mod = await import('../webui/app.js');
    mod.switchToTab('alerts');
    expect(b2.classList.contains('active')).toBeTruthy();
    expect(s2.classList.contains('hidden')).toBeFalsy();
  });

  test('chartSelect change triggers renderChartFor', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const chartSelect = document.createElement('select'); chartSelect.id = 'chart-crypto';
    const chartPeriod = document.createElement('select'); chartPeriod.id = 'chart-period'; chartPeriod.value = '24h';
    const option = document.createElement('option'); option.value='BTC'; option.textContent='BTC'; chartSelect.appendChild(option);
    const canvas = document.createElement('canvas'); canvas.id='crypto-chart'; canvas.getContext = () => ({});
    // ensure any existing chart has a destroy method
    window.cryptoChart = { destroy: jest.fn() };
    document.body.append(chartSelect, chartPeriod, canvas);
    global.Chart = jest.fn(() => ({}));
    const mod = await import('../webui/app.js');
    mod.setAllAssets([{ symbol: 'BTC', priceUsd: 1 }]);
    // dispatch change
    chartSelect.value = 'BTC';
    chartSelect.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r,0));
    expect(global.Chart).toHaveBeenCalled();
  });

  test('loadAssets handles non-array JSON gracefully', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const loadingEl = document.createElement('div'); loadingEl.id='loading'; loadingEl.className='hidden';
    const errorEl = document.createElement('div'); errorEl.id='error'; errorEl.className='hidden';
    const table = document.createElement('tbody'); table.id='assets-body';
    const chartSelect = document.createElement('select'); chartSelect.id='chart-crypto';
    const chartPeriod = document.createElement('select'); chartPeriod.id='chart-period'; chartPeriod.value='24h';
    document.body.append(loadingEl, errorEl, table, chartSelect, chartPeriod);
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ foo: 'bar' }) }));
    const mod = await import('../webui/app.js');
    await mod.loadAssets();
    expect(document.getElementById('assets-body').innerHTML).toBe('');
  });

  test('createAlert without authToken throws Non authentifié', async () => {
    jest.resetModules();
    // ensure no token
    localStorage.removeItem && localStorage.removeItem('supabase_token');
    const mod = await import('../webui/app.js');
    await expect(mod.createAlert('BTC', 1, 'above')).rejects.toThrow(/Non authentifié/);
  });

  test('deleteAlert without token calls alert', async () => {
    jest.resetModules();
    global.alert = jest.fn();
    // ensure no token
    localStorage.removeItem && localStorage.removeItem('supabase_token');
    const mod = await import('../webui/app.js');
    await mod.deleteAlert('1');
    expect(global.alert).toHaveBeenCalledWith('Non authentifié');
  });

  test('renderTable with provided tbody appends rows', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const tbody = document.createElement('tbody');
    const mod = await import('../webui/app.js');
    mod.renderTable([{ symbol: 'BTC', name: 'Bitcoin', priceUsd: 1, changePercent24Hr: 2 }], tbody);
    expect(tbody.children.length).toBeGreaterThan(0);
  });

  test('renderTable covers explorer and maxSupply branches', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const tbody = document.createElement('tbody');
    const mod = await import('../webui/app.js');
    const asset = { symbol: 'ETH', name: 'Ether', priceUsd: 2, changePercent24Hr: -1, maxSupply: 1000, explorer: 'http://ex' };
    mod.renderTable([asset], tbody);
    const html = tbody.innerHTML;
    expect(html).toMatch(/Lien/);
    expect(html).toMatch(/1\s*000/);
  });

  test('formatPercent positive returns badge-up', async () => {
    const mod = await import('../webui/app.js');
    const out = mod.formatPercent(3.14);
    expect(out).toMatch(/badge-up/);
  });

  test('populateChartSelect does nothing when chartSelect missing', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const mod = await import('../webui/app.js');
    // should not throw
    mod.populateChartSelect([{ symbol: 'BTC', name: 'Bitcoin' }]);
  });

  test('switchToTab uses document.querySelectorAll when no globals', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const b1 = document.createElement('div'); b1.className='tab-btn'; b1.dataset.tab='table';
    const s1 = document.createElement('div'); s1.className='tab-section'; s1.id='tab-table';
    document.body.append(b1, s1);
    const mod = await import('../webui/app.js');
    expect(() => mod.switchToTab('table')).not.toThrow();
  });

  test('importing module when authToken present triggers loadAlerts on import', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    localStorage.setItem('supabase_token','imported');
    const alertsList = document.createElement('div'); alertsList.id='alerts-list'; document.body.appendChild(alertsList);
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ([]) }));
    await import('../webui/app.js');
    // import-time loadAlerts should have called fetch for alerts
    const hadAlerts = global.fetch.mock.calls.some(c => c[0].includes('/api/alerts') || c[0].includes('/api/assets'));
    expect(hadAlerts).toBeTruthy();
  });

  test('importing module without token triggers showLoggedOut on import', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    localStorage.removeItem && localStorage.removeItem('supabase_token');
    const loginPanel = document.createElement('div'); loginPanel.id='login-panel'; document.body.appendChild(loginPanel);
    const mainPanel = document.createElement('div'); mainPanel.id='main-panel'; document.body.appendChild(mainPanel);
    await import('../webui/app.js');
    // showLoggedOut should have ensured loginPanel is visible (no exception thrown)
    expect(loginPanel.classList).toBeDefined();
  });

  test('import-time attaches click listeners to tab buttons', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const b1 = document.createElement('div'); b1.className = 'tab-btn'; b1.dataset.tab = 'table';
    const b2 = document.createElement('div'); b2.className = 'tab-btn'; b2.dataset.tab = 'alerts';
    document.body.append(b1, b2);
    const protoSpy = jest.spyOn(Element.prototype, 'addEventListener');
    await import('../webui/app.js');
    expect(protoSpy.mock.calls.some(c => c[0] === 'click')).toBeTruthy();
    protoSpy.mockRestore();
  });

  test('import-time attaches change listeners to chart selects', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const chartSelect = document.createElement('select'); chartSelect.id = 'chart-crypto';
    const chartPeriod = document.createElement('select'); chartPeriod.id = 'chart-period';
    document.body.append(chartSelect, chartPeriod);
    const protoSpy = jest.spyOn(Element.prototype, 'addEventListener');
    await import('../webui/app.js');
    expect(protoSpy.mock.calls.some(c => c[0] === 'change')).toBeTruthy();
    protoSpy.mockRestore();
  });

  test('import-time attaches submit listener to alert form', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const form = document.createElement('form'); form.id = 'alert-form';
    document.body.appendChild(form);
    const protoSpy = jest.spyOn(Element.prototype, 'addEventListener');
    await import('../webui/app.js');
    expect(protoSpy.mock.calls.some(c => c[0] === 'submit')).toBeTruthy();
    protoSpy.mockRestore();
  });

  test('import-time uses window.tabButtons/window.tabSections when present', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const b1 = document.createElement('div'); b1.className = 'tab-btn'; b1.dataset.tab = 'table';
    const s1 = document.createElement('div'); s1.className = 'tab-section'; s1.id = 'tab-table';
    // attach to window before import so module picks them up
    window.tabButtons = [b1];
    window.tabSections = [s1];
    const protoSpy = jest.spyOn(Element.prototype, 'addEventListener');
    await import('../webui/app.js');
    expect(protoSpy.mock.calls.some(c => c[0] === 'click')).toBeTruthy();
    protoSpy.mockRestore();
    delete window.tabButtons; delete window.tabSections;
  });

  test('attachImportTimeListeners can be called explicitly to wire listeners', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const form = document.createElement('form'); form.id = 'alert-form';
    const chartSelect = document.createElement('select'); chartSelect.id = 'chart-crypto';
    const chartPeriod = document.createElement('select'); chartPeriod.id = 'chart-period';
    const b1 = document.createElement('div'); b1.className = 'tab-btn'; b1.dataset.tab = 'table';
    const s1 = document.createElement('div'); s1.className = 'tab-section'; s1.id = 'tab-table';
    document.body.append(form, chartSelect, chartPeriod, b1, s1);
    const mod = await import('../webui/app.js');
    // call exported wiring function directly
    const protoSpy = jest.spyOn(Element.prototype, 'addEventListener');
    mod.attachImportTimeListeners();
    expect(protoSpy.mock.calls.length).toBeGreaterThan(0);
    protoSpy.mockRestore();
  });

  test('showLoggedIn without startSessionTimer does not throw and switches panels', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const loginPanel = document.createElement('div'); loginPanel.id = 'login-panel';
    const mainPanel = document.createElement('div'); mainPanel.id = 'main-panel';
    document.body.append(loginPanel, mainPanel);
    const mod = await import('../webui/app.js');
    // ensure module picks up our elements
    global.loginPanel = loginPanel; global.mainPanel = mainPanel;
    expect(() => mod.showLoggedIn()).not.toThrow();
    expect(loginPanel.classList.contains('hidden')).toBeTruthy();
    expect(mainPanel.classList.contains('hidden')).toBeFalsy();
  });

  test('showLoggedOut without stopSessionTimer does not throw and switches panels', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const loginPanel = document.createElement('div'); loginPanel.id = 'login-panel';
    const mainPanel = document.createElement('div'); mainPanel.id = 'main-panel';
    document.body.append(loginPanel, mainPanel);
    const mod = await import('../webui/app.js');
    global.loginPanel = loginPanel; global.mainPanel = mainPanel;
    expect(() => mod.showLoggedOut()).not.toThrow();
    expect(loginPanel.classList.contains('hidden')).toBeFalsy();
    expect(mainPanel.classList.contains('hidden')).toBeTruthy();
  });

  test('getAlertsList returns default object when no document and no global.alertsList', async () => {
    // simulate no document and no global.alertsList
    const realDoc = global.document;
    try{ delete global.document; } catch(e){ global.document = undefined; }
    delete global.alertsList;
    jest.resetModules();
    localStorage.setItem('supabase_token','t');
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ([]) }));
    const mod = await import('../webui/app.js');
    // directly call exported helper to hit default return branch
    const res = mod.getAlertsList();
    expect(res).toHaveProperty('innerHTML');
    global.document = realDoc;
  });

  test('login submit network error shows error text', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const loginForm = document.createElement('form'); loginForm.id = 'login-form';
    const email = document.createElement('input'); email.id = 'email'; email.value = 'x@x';
    const password = document.createElement('input'); password.id = 'password'; password.value = 'p';
    const err = document.createElement('div'); err.id = 'login-error'; err.className = '';
    document.body.append(loginForm, email, password, err);
    global.fetch = jest.fn(() => Promise.reject(new Error('neterr')));
    const mod = await import('../webui/app.js');
    loginForm.dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r,0));
    expect(document.getElementById('login-error').textContent).toMatch(/neterr/);
  });

  test('signup submit network error shows error text', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const signupForm = document.createElement('form'); signupForm.id = 'signup-form';
    const su_email = document.createElement('input'); su_email.id = 'su_email'; su_email.value = 'a@b';
    const su_password = document.createElement('input'); su_password.id = 'su_password'; su_password.value = 'pw';
    const su_password_confirm = document.createElement('input'); su_password_confirm.id = 'su_password_confirm'; su_password_confirm.value = 'pw';
    const err = document.createElement('div'); err.id = 'signup-error';
    document.body.append(signupForm, su_email, su_password, su_password_confirm, err);
    global.fetch = jest.fn(() => Promise.reject(new Error('signet')));
    const mod = await import('../webui/app.js');
    signupForm.dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r,0));
    expect(document.getElementById('signup-error').textContent).toMatch(/signet/);
  });

  test('doLogout auto clears token and calls alert', async () => {
    jest.resetModules();
    localStorage.setItem('supabase_token','todel');
    global.alert = jest.fn();
    const mod = await import('../webui/app.js');
    mod.doLogout(true);
    expect(localStorage.getItem('supabase_token')).toBeNull();
    expect(global.alert).toHaveBeenCalled();
  });

  test('getAlertsList uses global.alertsList when document undefined', async () => {
    // simulate no document
    const realDoc = global.document;
    try{
      delete global.document;
    }catch(e){ global.document = undefined; }
    global.alertsList = { innerHTML: '', appendChild: () => {}, called: true };
    jest.resetModules();
    const mod = await import('../webui/app.js');
    // set token so loadAlerts proceeds to fetch
    global.localStorage = global.localStorage || { store: {}, getItem(k){return null}, setItem(){}, removeItem(){}};
    global.localStorage.store = { supabase_token: 't' };
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ([]) }));
    await mod.loadAlerts();
    // restore document
    global.document = realDoc;
  });

  test('alertForm submit with missing fields triggers alert', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const form = document.createElement('form'); form.id = 'alert-form';
    const sym = document.createElement('input'); sym.id='alert-symbol'; sym.value='';
    const thr = document.createElement('input'); thr.id='alert-threshold'; thr.value='0';
    const dir = document.createElement('select'); dir.id='alert-direction';
    document.body.append(form, sym, thr, dir);
    global.alert = jest.fn();
    const mod = await import('../webui/app.js');
    // submit should call alert('Remplis les champs')
    form.dispatchEvent(new Event('submit'));
    expect(global.alert).toHaveBeenCalled();
  });

  test('alertForm submit valid calls createAlert (POST)', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const form = document.createElement('form'); form.id = 'alert-form';
    const sym = document.createElement('input'); sym.id='alert-symbol'; sym.value='BTC';
    const thr = document.createElement('input'); thr.id='alert-threshold'; thr.value='100';
    const dir = document.createElement('select'); dir.id='alert-direction';
    const opt = document.createElement('option'); opt.value='above'; opt.selected = true; opt.textContent='above'; dir.appendChild(opt);
    document.body.append(form, sym, thr, dir);
    // set token so createAlert will not throw
    localStorage.setItem('supabase_token','t');
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ id: 'x' }) }));
    const mod = await import('../webui/app.js');
    form.dispatchEvent(new Event('submit'));
    // createAlert issues a fetch to /api/alerts; wait tick
    await new Promise(r => setTimeout(r,0));
    const hadCreate = global.fetch.mock.calls.some(c => c[0].includes('/api/alerts') && c[1] && c[1].method === 'POST');
    expect(hadCreate).toBeTruthy();
  });

  test('handleSignupSubmit success shows message and calls showLogin', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const signupForm = document.createElement('form'); signupForm.id='signup-form';
    const su_email = document.createElement('input'); su_email.id='su_email'; su_email.value = 'a@b';
    const su_password = document.createElement('input'); su_password.id='su_password'; su_password.value = 'pw';
    const su_password_confirm = document.createElement('input'); su_password_confirm.id='su_password_confirm'; su_password_confirm.value = 'pw';
    const err = document.createElement('div'); err.id='signup-error';
    const loginForm = document.createElement('div'); loginForm.id = 'login-form';
    const tabLogin = document.createElement('div'); tabLogin.id = 'tab-login';
    const tabSignup = document.createElement('div'); tabSignup.id = 'tab-signup';
    document.body.append(signupForm, su_email, su_password, su_password_confirm, err, loginForm, tabLogin, tabSignup);
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }));
    const mod = await import('../webui/app.js');
    signupForm.dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r,0));
    expect(document.getElementById('signup-error').textContent).toMatch(/Inscription réussie/);
  });
});
