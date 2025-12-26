import { jest } from '@jest/globals';

describe('runStartupChecks branches', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('DEV_AUTH true logs and returns quickly', async () => {
    process.env.DEV_AUTH = 'true';
    const mod = await import('../server.js');
    await expect(mod.runStartupChecks()).resolves.toBeUndefined();
  });

  test('PG reachable path', async () => {
    process.env.DEV_AUTH = 'false';
    jest.unstable_mockModule('pg', () => ({ Client: class MockClient { async connect(){} async end(){} } }));
    const mod = await import('../server.js');
    await expect(mod.runStartupChecks()).resolves.toBeUndefined();
  });

  test('PG connect throws path', async () => {
    process.env.DEV_AUTH = 'false';
    jest.unstable_mockModule('pg', () => ({ Client: class MockClient { async connect(){ throw new Error('boom'); } async end(){} } }));
    const mod = await import('../server.js');
    await expect(mod.runStartupChecks()).resolves.toBeUndefined();
  });
});
