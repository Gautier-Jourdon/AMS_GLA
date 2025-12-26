import { jest } from '@jest/globals';

describe('Additional app.js UI tests', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
  });

  test('renderTable with explorer and maxSupply', async () => {
    const { renderTable } = await import('../webui/app.js');
    const tbody = document.createElement('tbody');
    const assets = [{ rank: 1, symbol: 'BTC', name: 'Bitcoin', priceUsd: 60000, changePercent24Hr: 1.23, marketCapUsd: 1000000, volumeUsd24Hr: 10000, supply: 18000000, maxSupply: 21000000, explorer: 'https://explorer' }];
    renderTable(assets, tbody);
    const html = tbody.innerHTML;
    expect(html).toContain('Lien');
    expect(html).toContain('21');
  });

  test('populateChartSelect fills select options', async () => {
    // create select before importing so module captures it
    const sel = document.createElement('select');
    sel.id = 'chart-crypto';
    document.body.appendChild(sel);
    const period = document.createElement('select');
    period.id = 'chart-period';
    period.value = '24h';
    document.body.appendChild(period);
    const mod = await import('../webui/app.js');
    const assets = [{ symbol: 'ETH', name: 'Ethereum' }, { symbol: 'BTC', name: 'Bitcoin' }];
    mod.populateChartSelect(assets);
    expect(sel.children.length).toBeGreaterThanOrEqual(2);
  });

  test('renderChartFor calls Chart and sets window.cryptoChart', async () => {
    // prepare DOM and Chart mock before import
    const canvas = document.createElement('canvas');
    canvas.id = 'crypto-chart';
    canvas.getContext = () => ({});
    document.body.appendChild(canvas);
    const fakeChart = jest.fn(() => ({}));
    global.Chart = fakeChart;
    const mod = await import('../webui/app.js');
    // set assets for the module
    mod.setAllAssets([{ symbol: 'BTC', priceUsd: '1' }]);
    mod.renderChartFor('BTC', '24h');
    expect(fakeChart).toHaveBeenCalled();
    expect(window.cryptoChart).toBeDefined();
  });

  test('createAlert throws when not authenticated', async () => {
    jest.resetModules();
    delete global.localStorage;
    global.authToken = null;
    const mod = await import('../webui/app.js');
    await expect(mod.createAlert('BTC', 10, 'above')).rejects.toThrow('Non authentifié');
  });

  test('renderChartFor destroys existing chart before creating new one', async () => {
    jest.resetModules();
    document.body.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'crypto-chart';
    canvas.getContext = () => ({});
    document.body.appendChild(canvas);
    const fakeChart = jest.fn(() => ({}));
    global.Chart = fakeChart;
    // import module and set assets
    const mod = await import('../webui/app.js');
    const prev = { destroy: jest.fn() };
    window.cryptoChart = prev;
    mod.setAllAssets([{ symbol: 'BTC', priceUsd: '1' }]);
    mod.renderChartFor('BTC', '24h');
    expect(prev.destroy).toHaveBeenCalled();
  });

  test('renderTable uses module tableBody when no target provided', async () => {
    jest.resetModules();
    // create table body before import so module captures it
    const tbody = document.createElement('tbody');
    tbody.id = 'assets-body';
    document.body.appendChild(tbody);
    const mod = await import('../webui/app.js');
    const assets = [{ rank: 1, symbol: 'X', name: 'Y', priceUsd: 1, changePercent24Hr: 0, marketCapUsd: 1, volumeUsd24Hr: 1, supply: 1, maxSupply: null, explorer: null }];
    mod.renderTable(assets);
    expect(tbody.innerHTML.length).toBeGreaterThan(0);
  });
});
