import {
  setAllAssets,
  populateChartSelect,
  renderChartFor,
  getChartSelect,
  getChartPeriod
} from '../webui/app.js';

test('render chart flow (creates Chart)', () => {
  // prepare DOM mocks for chart elements
  const chartSelect = { value: 'TST', innerHTML: '', appendChild: () => {}, addEventListener: () => {} };
  const chartPeriod = { value: '24h', addEventListener: () => {} };
  const canvas = { getContext: () => ({}) };

  const origGet = global.document.getElementById;
  global.document.getElementById = (id) => {
    if (id === 'chart-crypto') return chartSelect;
    if (id === 'chart-period') return chartPeriod;
    if (id === 'crypto-chart') return canvas;
    return origGet(id);
  };

  // mock Chart global
  global.window = global.window || {};
  global.window.cryptoChart = null;
  global.window.Chart = function(ctx, opts) { this.ctx = ctx; this.opts = opts; };

  // provide assets and run populate + render
  setAllAssets([{ symbol: 'TST', name: 'Test', priceUsd: 2 }]);
  expect(() => populateChartSelect([{ symbol: 'TST', name: 'Test' }])).not.toThrow();
  expect(() => renderChartFor('TST', '24h')).not.toThrow();

  // restore
  global.document.getElementById = origGet;
});
