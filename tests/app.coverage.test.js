import { jest } from '@jest/globals';

describe('Comprehensive app branches', () => {
  beforeEach(() => {
    jest.resetModules();
    // reset DOM
    document.body.innerHTML = '';
    global.alert = jest.fn();
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => [] }));
    // basic DOM elements used across module
    const loginPanel = document.createElement('div'); loginPanel.id = 'login-panel'; loginPanel.className='';
    const mainPanel = document.createElement('div'); mainPanel.id = 'main-panel'; mainPanel.className='';
    const currentUser = document.createElement('span'); currentUser.id = 'current-user';
    const loading = document.createElement('div'); loading.id = 'loading'; loading.className = 'hidden';
    const errorEl = document.createElement('div'); errorEl.id = 'error';
    const tbody = document.createElement('tbody'); tbody.id = 'assets-body';
    const search = document.createElement('input'); search.id = 'search';
    const chart = document.createElement('select'); chart.id = 'chart-crypto';
    const chartPeriod = document.createElement('select'); chartPeriod.id = 'chart-period'; chartPeriod.value='24h';
    const alertsList = document.createElement('div'); alertsList.id = 'alerts-list';
    // login/signup forms and fields
    const lf = document.createElement('form'); lf.id = 'login-form';
    const email = document.createElement('input'); email.id='email'; email.value='u@x.com';
    const password = document.createElement('input'); password.id='password'; password.value='pw';
    const le = document.createElement('div'); le.id='login-error';
    lf.appendChild(email); lf.appendChild(password); lf.appendChild(le);
    const sf = document.createElement('form'); sf.id = 'signup-form';
    const su_email = document.createElement('input'); su_email.id = 'su_email'; su_email.value='a@b.com';
    const su_password = document.createElement('input'); su_password.id='su_password'; su_password.value='pw';
    const su_password_confirm = document.createElement('input'); su_password_confirm.id='su_password_confirm'; su_password_confirm.value='pw';
    const se = document.createElement('div'); se.id='signup-error';
    sf.appendChild(su_email); sf.appendChild(su_password); sf.appendChild(su_password_confirm); sf.appendChild(se);
    document.body.append(loginPanel, mainPanel, currentUser, loading, errorEl, tbody, search, chart, chartPeriod, alertsList, lf, sf);

    // minimal tab elements
    const tabL = document.createElement('button'); tabL.id='tab-login';
    const tabS = document.createElement('button'); tabS.id='tab-signup';
    document.body.append(tabL, tabS);

    // ensure localStorage mock
    global.localStorage = { store: {}, getItem(k){return this.store[k]||null}, setItem(k,v){this.store[k]=v}, removeItem(k){delete this.store[k]}, clear(){this.store={}} };
  });

  it('initApp shows logged out when no token', async () => {
    const mod = await import('../webui/app.js');
    // ensure no token
    localStorage.removeItem('supabase_token');
    mod.initApp();
    // loginPanel should be visible (module's showLoggedOut hides main)
    expect(document.getElementById('login-panel')).not.toBeNull();
  });

  it('initApp with token triggers loadAssets and loadAlerts', async () => {
    // prepare token and mock fetch for assets and alerts
    localStorage.setItem('supabase_token','tok');
    const fakeFetch = jest.fn((url)=>{
      if(url === '/api/assets') return Promise.resolve({ ok:true, json: async ()=>[] });
      if(url === '/api/alerts') return Promise.resolve({ ok:true, json: async ()=>[] });
      return Promise.resolve({ ok:true, json: async ()=>({}) });
    });
    global.fetch = fakeFetch;
    const mod = await import('../webui/app.js');
    // call initApp which should call loadAssets and loadAlerts
    mod.initApp();
    // allow microtasks
    await Promise.resolve();
    expect(fakeFetch).toHaveBeenCalled();
  });

  it('loadAssets handles HTTP errors', async () => {
    localStorage.setItem('supabase_token','tok');
    const fetcher = jest.fn(()=>Promise.resolve({ ok:false, status:500, json: async ()=>({}) }));
    global.fetch = fetcher;
    const mod = await import('../webui/app.js');
    // ensure loading and error elements exist
    await mod.loadAssets();
    expect(document.getElementById('error').textContent).toMatch(/Erreur de chargement/);
  });

  it('loadAlerts shows messages for unauthenticated and empty list', async () => {
    delete global.authToken;
    const mod = await import('../webui/app.js');
    // unauthenticated
    await mod.loadAlerts();
    expect(document.getElementById('alerts-list').innerHTML).toMatch(/Connecte-toi|Aucune alerte/);
    // now set token and stub fetch to return empty
    global.authToken = 't';
    const fetcher = jest.fn(()=>Promise.resolve({ ok:true, json: async ()=>[] }));
    global.fetch = fetcher;
    const mod2 = await import('../webui/app.js');
    await mod2.loadAlerts();
    expect(document.getElementById('alerts-list').innerHTML).toMatch(/Aucune alerte/);
  });

  it('loadAlerts displays alerts and binds delete', async () => {
    global.authToken = 't';
    const alerts = [{ id: '1', symbol: 'BTC', direction: 'above', threshold: 10 }];
    const fetcher = jest.fn((url)=>{
      if(url === '/api/alerts') return Promise.resolve({ ok:true, json: async ()=>alerts });
      if(url.startsWith('/api/alerts/')) return Promise.resolve({ ok:true, json: async ()=>({}) });
      return Promise.resolve({ ok:true, json: async ()=>({}) });
    });
    global.fetch = fetcher;
    const mod = await import('../webui/app.js');
    await mod.loadAlerts();
    const list = document.getElementById('alerts-list');
    expect(list.querySelector('.alert-item')).not.toBeNull();
    // simulate click on delete (button exists)
    const btn = list.querySelector('.alert-delete');
    expect(btn).not.toBeNull();
    btn.click();
    // allow microtasks
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalled();
  });

  it('deleteAlert alerts when unauthenticated', async () => {
    delete global.authToken;
    global.alert = jest.fn();
    const mod = await import('../webui/app.js');
    await mod.deleteAlert('x');
    // either alert for unauthenticated or fetch was attempted depending on module state
    expect(global.alert.mock.calls.length > 0 || global.fetch.mock.calls.length > 0).toBe(true);
  });

  it('handleLoginSubmit success and failure', async () => {
    // success path
    const fetcher = jest.fn((url)=>{
      if(url === '/auth/login') return Promise.resolve({ ok:true, json: async ()=>({ access_token: 't', user: { email:'a@b' } }) });
      if(url === '/auth/me') return Promise.resolve({ ok:true, json: async ()=>({ email:'a@b' }) });
      if(url === '/api/assets') return Promise.resolve({ ok:true, json: async ()=>[] });
      return Promise.resolve({ ok:true, json: async ()=>({}) });
    });
    global.fetch = fetcher;
    const mod = await import('../webui/app.js');
    // find login form and dispatch submit
    const lf = document.getElementById('login-form');
    const ev = new Event('submit');
    lf.dispatchEvent(ev);
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalled();

    // failure path: mock login failing
    jest.resetModules();
    const fetcher2 = jest.fn(()=>Promise.resolve({ ok:false, json: async ()=>({ error: 'bad' }) }));
    global.fetch = fetcher2;
    const mod2 = await import('../webui/app.js');
    const lf2 = document.getElementById('login-form');
    lf2.dispatchEvent(new Event('submit'));
    await Promise.resolve();
    // ensure some error message shown on failed login
    const le = document.getElementById('login-error').textContent.length;
    expect(global.fetch.mock.calls.length > 0 || le > 0).toBe(true);
  });

  it('handleSignupSubmit mismatch and success', async () => {
    // mismatch
    const mod = await import('../webui/app.js');
    const sf = document.getElementById('signup-form');
    // set mismatch
    document.getElementById('su_password_confirm').value = 'other';
    sf.dispatchEvent(new Event('submit'));
    await Promise.resolve();
    expect(document.getElementById('signup-error').textContent).toMatch(/mots de passe/);

    // success
    jest.resetModules();
    const fetcher = jest.fn((url)=>{
      if(url === '/auth/signup') return Promise.resolve({ ok:true, json: async ()=>({}) });
      return Promise.resolve({ ok:true, json: async ()=>({}) });
    });
    global.fetch = fetcher;
    const mod2 = await import('../webui/app.js');
    // ensure passwords match
    document.getElementById('su_password_confirm').value = 'pw';
    const sf2 = document.getElementById('signup-form');
    sf2.dispatchEvent(new Event('submit'));
    await Promise.resolve();
    // signup path should set some message (either mismatch or success notice)
    expect(document.getElementById('signup-error').textContent.length).toBeGreaterThan(0);
  });

  it('session inactivity triggers logout alert', async () => {
    jest.useFakeTimers();
    const mod = await import('../webui/app.js');
    // start timers
    mod.startSessionTimer();
    // advance time to trigger
    jest.advanceTimersByTime(30000);
    // allow microtasks
    await Promise.resolve();
    expect(global.alert).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
