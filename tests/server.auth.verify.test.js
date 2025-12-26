import { jest } from '@jest/globals';

const requestModule = await import('supertest');
const request = requestModule.default;

describe('verifyAuth and auth proxy branches', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.SUPABASE_URL;
  });

  test('missing Authorization header returns 401', async () => {
    process.env.DEV_AUTH = 'false';
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('DEV_AUTH allows any bearer and returns dev user', async () => {
    process.env.DEV_AUTH = 'true';
    jest.resetModules();
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer whatever');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'dev@local');
  });

  test('non-dev: valid token via Supabase proxy returns user', async () => {
    process.env.DEV_AUTH = 'false';
    // mock fetch to answer probe and auth user
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u, opts) => {
        if (u.includes('/auth/v1/user')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'uX', email: 'x@x' }) });
        }
        // probe
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'x@x');
  });

  test('non-dev: invalid token -> 401', async () => {
    process.env.DEV_AUTH = 'false';
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u) => {
        if (u.includes('/auth/v1/user')) return Promise.resolve({ ok: false, status: 401, text: async () => 'no' });
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
  });

  test('non-dev: fetch throws -> 500', async () => {
    process.env.DEV_AUTH = 'false';
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u) => {
        if (u.includes('/auth/v1/user')) throw new Error('network');
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer whatever');
    expect(res.status).toBe(500);
  });
});
