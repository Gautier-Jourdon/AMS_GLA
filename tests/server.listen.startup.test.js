import { jest } from '@jest/globals';

// Test that the app.listen startup branch runs without opening a real server
describe('server main/listen startup branch', () => {
  beforeEach(async () => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
    // ensure import-time "is main" check matches the real server file path
    const { fileURLToPath } = await import('url');
    const serverPath = fileURLToPath(new URL('../server.js', import.meta.url));
    process.argv[1] = serverPath;
  });

  test('calls app.listen and runs startup checks (mocked express + pg)', async () => {
    const mockApp = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      listen: jest.fn((port, cb) => { cb(); })
    };

    // Mock express to return our lightweight app and attach json/static helpers
    jest.unstable_mockModule('express', () => {
      const fn = () => mockApp;
      fn.json = () => (req, res, next) => next();
      fn.static = () => (req, res, next) => next();
      return { default: fn };
    });

    // Mock pg Client so runStartupChecks connects/ends without network
    jest.unstable_mockModule('pg', () => ({
      Client: jest.fn(() => ({ connect: async () => {}, end: async () => {} }))
    }));

    const appModule = await import('../server.js');
    // import triggers the listen callback which calls runStartupChecks
    const exportedApp = appModule.default;
    expect(mockApp.listen).toHaveBeenCalled();
    expect(exportedApp).toBeDefined();
  });

  test('calls app.listen and logs DEV_AUTH enabled when DEV_AUTH true', async () => {
    jest.resetModules();
    // DEV_AUTH true should hit the DEV_AUTH branch inside listen callback
    process.env.DEV_AUTH = 'true';
    const { fileURLToPath } = await import('url');
    const serverPath = fileURLToPath(new URL('../server.js', import.meta.url));
    process.argv[1] = serverPath;

    const mockApp2 = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      listen: jest.fn((port, cb) => { cb(); })
    };

    jest.unstable_mockModule('express', () => {
      const fn = () => mockApp2;
      fn.json = () => (req, res, next) => next();
      fn.static = () => (req, res, next) => next();
      return { default: fn };
    });
    jest.unstable_mockModule('pg', () => ({ Client: jest.fn(() => ({ connect: async () => {}, end: async () => {} })) }));

    const appModule2 = await import('../server.js');
    expect(mockApp2.listen).toHaveBeenCalled();
    expect(appModule2.default).toBeDefined();
  });
});
