import { jest } from '@jest/globals';

describe('collector/utils/cron.js branches', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllTimers();
  });

  test('import runs updateAssets but does not write when getAssets returns null', async () => {
    // mock getAssets to return null
    jest.unstable_mockModule('../collector/services/coincapService.js', () => ({
      getAssets: jest.fn(() => null)
    }));
    // mock fs to spy on writeFileSync — provide default export for ESM default import
    const writeMock = jest.fn();
    jest.unstable_mockModule('fs', () => ({ default: { writeFileSync: writeMock } }));

    // import module (it runs updateAssets on import)
    await import('../collector/utils/cron.js');

    const fs = await import('fs');
    expect(fs.default.writeFileSync).not.toHaveBeenCalled();
  });

  test('import writes file when getAssets returns array', async () => {
    const assets = [{ id: 'a1' }];
    jest.unstable_mockModule('../collector/services/coincapService.js', () => ({
      getAssets: jest.fn(() => assets)
    }));
    const writeMock2 = jest.fn();
    jest.unstable_mockModule('fs', () => ({ default: { writeFileSync: writeMock2 } }));

    await import('../collector/utils/cron.js');
    const fs2 = await import('fs');
    expect(fs2.default.writeFileSync).toHaveBeenCalled();
  });
});
