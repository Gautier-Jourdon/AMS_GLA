import { jest } from '@jest/globals';

describe('coincapService extra branches', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.COINCAP_KEY;
  });

  it('returns null on network error', async () => {
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn(() => Promise.reject(new Error('network fail'))) }));
    const { getAssets } = await import('../collector/services/coincapService.js');
    const res = await getAssets();
    expect(res).toBeNull();
  });

  it('retries with apiKey on 403 when API_KEY present', async () => {
    process.env.COINCAP_KEY = 'TESTKEY';
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn() }));
    const { default: fetch } = await import('node-fetch');
    // First response 403, second call returns ok
    fetch.mockResolvedValueOnce({ status: 403, ok: false, text: async () => 'forbidden' });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'btc', symbol: 'BTC', priceUsd: '1000' }] }) });
    const { getAssets } = await import('../collector/services/coincapService.js');
    const assets = await getAssets(1);
    expect(Array.isArray(assets)).toBe(true);
    expect(assets.length).toBe(1);
    expect(assets[0]).toHaveProperty('symbol', 'BTC');
  });

  it('returns null on non-ok status', async () => {
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn(() => Promise.resolve({ ok: false, status: 500, text: async () => 'server err' })) }));
    const { getAssets } = await import('../collector/services/coincapService.js');
    const res = await getAssets();
    expect(res).toBeNull();
  });
});
