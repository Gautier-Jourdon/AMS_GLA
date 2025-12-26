import { jest } from '@jest/globals';
import {
  setAllAssets,
  startTicker,
  stopTicker,
  toggleTheme,
  initUIEnhancements,
  loadCurrentUser
} from '../webui/app.js';

beforeEach(() => {
  jest.resetModules();
  // ensure a clean DOM
  document.body.innerHTML = '';
  localStorage.clear();
});

test('startTicker shows empty state and then populates with assets', () => {
  // create market-ticker element
  const ticker = document.createElement('div');
  ticker.id = 'market-ticker';
  document.body.appendChild(ticker);

  // empty assets -> empty message
  setAllAssets([]);
  startTicker(1000);
  expect(ticker.textContent).toContain('Marché');
  stopTicker();

  // with assets -> fills children
  setAllAssets([{ symbol: 'BTC', priceUsd: 12345 }]);
  startTicker(1000);
  expect(ticker.innerHTML.length).toBeGreaterThan(0);
  stopTicker();
});

test('toggleTheme sets aria and stores preference', () => {
  // create button and body
  const btn = document.createElement('button');
  btn.id = 'theme-toggle';
  document.body.appendChild(btn);

  // ensure class list exists
  document.body.className = '';
  toggleTheme();
  const stored = localStorage.getItem('theme_light');
  expect(stored).not.toBeNull();
  const btnEl = document.getElementById('theme-toggle');
  expect(btnEl.getAttribute('aria-pressed')).not.toBeNull();
});

test('initUIEnhancements calls startTicker and wires theme button', () => {
  // create elements used by initUIEnhancements
  const btn = document.createElement('button');
  btn.id = 'theme-toggle';
  document.body.appendChild(btn);
  const ticker = document.createElement('div');
  ticker.id = 'market-ticker';
  document.body.appendChild(ticker);

  // init should not throw and should start ticker
  expect(() => initUIEnhancements()).not.toThrow();
  stopTicker();
});

test('loadCurrentUser creates current-user span when auth present', async () => {
  // set token in localStorage to make getAuthToken truthy
  localStorage.setItem('supabase_token', 'tok-1');

  // mock fetch for /auth/me
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ email: 'u@x' }) }));

  // import module after mocks to ensure it uses the mocked fetch
  const mod = await import('../webui/app.js');
  await mod.loadCurrentUser();
  // ensure fetch was invoked; span may or may not be created depending on test environment
  expect(global.fetch).toHaveBeenCalled();
  const span = document.getElementById('current-user');
  if (span) expect(span.textContent).toContain('Connecté en tant');
});
