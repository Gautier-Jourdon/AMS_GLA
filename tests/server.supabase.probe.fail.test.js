import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('resolveSupabaseUrl fallback when probes fail', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.SUPABASE_URL;
    process.env.DEV_AUTH = 'false';
  });

  test('probes all candidates and falls back to default', async () => {
    // mock fetch to always throw to simulate network down for probes and auth
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn(() => { throw new Error('probe fail'); }) }));
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer tok');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  }, 20000);
});
