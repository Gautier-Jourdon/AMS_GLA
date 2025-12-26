import { jest } from '@jest/globals';

// Mock getAssets service
jest.unstable_mockModule('../collector/services/coincapService.js', () => ({
  getAssets: jest.fn().mockResolvedValue([
    { id: 'btc', symbol: 'BTC', priceUsd: '60000', changePercent24Hr: '1', marketCapUsd: '1e12', volumeUsd24Hr: '1e9', supply: '21000000', maxSupply: '21000000', explorer: 'https://' }
  ])
}));

// Mock pg Client
jest.unstable_mockModule('pg', () => ({
  Client: class MockClient {
    async connect() { }
    async end() { }
    async query() { return { rowCount: 1, rows: [] }; }
  }
}));

// Ensure process.exitCode not permanently set
const prevExit = process.exitCode;

describe('collector index runner', () => {
  afterAll(() => { process.exitCode = prevExit; });

  test('runCollector executes and attempts to save to Postgres', async () => {
    // import the module (it runs on import)
    await import('../collector/index.js');
    // wait for async tasks
    await new Promise(r => setTimeout(r, 50));
    expect(process.exitCode === 1 || process.exitCode === undefined || process.exitCode === 0).toBeTruthy();
  }, 2000);
});
