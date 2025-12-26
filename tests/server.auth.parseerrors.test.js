import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('auth proxied parse errors', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
    process.env.SUPABASE_URL = 'http://supabase.local';
  });

  test('signup proxied returns invalid JSON -> raw included', async () => {
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u) => {
        if (u.includes('/auth/v1/signup')) return Promise.resolve({ ok: true, status: 200, text: async () => 'notjson' });
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/signup').send({ email: 'parse@x', password: 'p' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('raw');
  });

  test('login proxied returns invalid JSON -> raw included', async () => {
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u) => {
        if (u.includes('/auth/v1/token')) return Promise.resolve({ ok: true, status: 200, text: async () => 'notjson' });
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/login').send({ email: 'parse@x', password: 'p' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('raw');
  });
});
