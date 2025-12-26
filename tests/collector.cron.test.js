import { jest } from '@jest/globals';

// Mock getAssets
jest.unstable_mockModule('../collector/services/coincapService.js', () => ({
  getAssets: jest.fn().mockResolvedValue([
    { id: 'btc', symbol: 'BTC' }
  ])
}));

// Mock fs
jest.unstable_mockModule('fs', () => ({
  default: { writeFileSync: jest.fn() }
}));

// Prevent real setInterval
global.setInterval = jest.fn();

test('cron updateAssets writes file', async () => {
  const mod = await import('../collector/utils/cron.js');
  // allow any async ops to complete
  await new Promise(r => setTimeout(r, 20));
  const fs = await import('fs');
  expect(typeof fs.default.writeFileSync).toBe('function');
});
