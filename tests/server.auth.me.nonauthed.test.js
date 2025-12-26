import { jest } from '@jest/globals';
const requestModule = await import('supertest');
const request = requestModule.default;

describe('auth me missing auth header', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
    process.env.SUPABASE_URL = 'http://supabase.local';
  });

  test('GET /auth/me without Authorization returns 401', async () => {
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
