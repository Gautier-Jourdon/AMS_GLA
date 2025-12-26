


import { jest } from '@jest/globals';
// Mocks globaux AVANT tout import/appel

const fakeClassList = { add: () => {}, remove: () => {}, toggle: () => {} };
global.fetch = () => {};
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};
// Mocks pour tous les éléments DOM utilisés dans app.js
global.alertsList = { innerHTML: '', appendChild: () => {} };
global.tableBody = { innerHTML: '', appendChild: () => {} };
global.loginPanel = { classList: fakeClassList, classList: fakeClassList };
global.mainPanel = { classList: fakeClassList, classList: fakeClassList };
global.currentUserSpan = { textContent: '' };
const loadingElMock = { classList: fakeClassList };
const errorElMock = { classList: fakeClassList, textContent: '' };
global.loadingEl = loadingElMock;
global.errorEl = errorElMock;
global.window.loadingEl = loadingElMock;
global.window.errorEl = errorElMock;
global.loginForm = { classList: fakeClassList, addEventListener: () => {} };
global.signupForm = { classList: fakeClassList, addEventListener: () => {} };
global.tabLogin = { classList: fakeClassList, addEventListener: () => {}, dataset: { tab: 'login' } };
global.tabSignup = { classList: fakeClassList, addEventListener: () => {}, dataset: { tab: 'signup' } };
global.searchInput = { addEventListener: () => {}, value: '' };
global.tabButtons = [global.tabLogin, global.tabSignup];
global.tabSections = [{ id: 'tab-table', classList: fakeClassList }, { id: 'tab-alerts', classList: fakeClassList }];
global.chartSelect = { innerHTML: '', appendChild: () => {} };
global.chartPeriod = { value: '24h' };
global.alertForm = { addEventListener: () => {} };
global.document = {
  getElementById: (id) => {
    console.log('getElementById called with:', id);
    if(id === 'alerts-list') return global.alertsList;
    if(id === 'assets-body') return global.tableBody;
    if(id === 'login-panel') return global.loginPanel;
    if(id === 'main-panel') return global.mainPanel;
    if(id === 'current-user') return global.currentUserSpan;
    if(id === 'loading') return loadingElMock;
    if(id === 'error') return errorElMock;
    if(id === 'login-form') return global.loginForm;
    if(id === 'signup-form') return global.signupForm;
    if(id === 'tab-login') return global.tabLogin;
    if(id === 'tab-signup') return global.tabSignup;
    if(id === 'search') return global.searchInput;
    if(id === 'chart-crypto') return global.chartSelect;
    if(id === 'chart-period') return global.chartPeriod;
    if(id === 'alert-form') return global.alertForm;
    if(id === 'crypto-chart') return { getContext: () => ({}) };
    // Fallback: retourne toujours global.alertsList pour tout id inconnu (pour éviter null sur innerHTML)
    return global.alertsList;
  },
  querySelectorAll: (sel) => {
    if(sel === '.tab-btn') return global.tabButtons;
    if(sel === '.tab-section') return global.tabSections;
    if(sel === '.alert-delete') return [];
    return [];
  }
};


// Mock window et authToken pour empêcher la restauration de session lors de l'import
global.window = {};
global.authToken = null;
// Mock loadingEl, errorEl, mainPanel, loginPanel sur window aussi
global.window.loadingEl = global.loadingEl;
global.window.errorEl = global.errorEl;
global.window.mainPanel = global.mainPanel;
global.window.loginPanel = global.loginPanel;
// Mock allAssets pour éviter undefined lors de l'import
global.allAssets = [];


describe('Alerts API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.localStorage.clear();
  });
  it('creates alert', async () => {
    fetch.mockImplementation((url) => {
      if(url === '/api/alerts') {
        return Promise.resolve({ ok: true, json: async () => ({ symbol: 'BTC', direction: 'above', threshold: 100 }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    localStorage.setItem('supabase_token', 'tok-test');
    const { createAlert } = await import('../webui/app.js');
    await createAlert('BTC', 100, 'above');
    expect(fetch).toHaveBeenCalledWith(
      '/api/alerts',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

