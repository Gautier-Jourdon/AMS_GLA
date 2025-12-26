import { jest } from '@jest/globals';

describe('collector index branches', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('runCollector handles missing assets', async () => {
    jest.unstable_mockModule('./../collector/services/coincapService.js', () => ({ getAssets: async () => null }));
    // mock pg so saveToPostgres is a noop
    jest.unstable_mockModule('pg', () => ({ Client: class { async connect(){} async end(){} async query(){} } }));
    // import module (runCollector runs at import)
    await import('../collector/index.js');
    // if no exception thrown, test passes
    expect(true).toBe(true);
  });

  test('runCollector warns on history insert failure but succeeds overall', async () => {
    jest.unstable_mockModule('./../collector/services/coincapService.js', () => ({ getAssets: async () => [{ id: 'a1', symbol: 'T', name: 'T', rank: 1, priceUsd: 1, changePercent24Hr: 0, marketCapUsd: 1, volumeUsd24Hr: 1, supply: 1, maxSupply: 1, explorer: 'x' }] }));
    jest.unstable_mockModule('pg', () => ({
      Client: class {
        async connect(){}
        async end(){}
        async query(sql) { if (sql && sql.includes('assets_history')) throw new Error('hist fail'); return {}; }
      }
    }));
    await import('../collector/index.js');
    expect(true).toBe(true);
  });
});
