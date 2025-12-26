import { jest } from '@jest/globals';

// Ensure we are testing non-DEV behavior
process.env.DEV_AUTH = 'false';
process.env.SUPABASE_URL = 'http://supabase.local';

jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn() }));
jest.unstable_mockModule('pg', () => ({
  Client: class MockClient {
    async connect() {}
    async end() {}
    async query(sql, params) {
      if (/rpc_create_user/.test(sql)) return { rowCount: 1, rows: [{ id: 'u-db', email: params[0] }] };
      if (/rpc_get_user/.test(sql)) return { rowCount: 1, rows: [{ id: 'u-db', email: params[0] }] };
      return { rowCount: 0, rows: [] };
    }
  }
}));

const fetchMod = await import('node-fetch');
const fetch = fetchMod.default;
const request = (await import('supertest')).default;
const app = (await import('../server.js')).default;

describe('server auth fallback flows', () => {
  beforeEach(() => { fetch.mockReset(); });

  test('signup fallback to dbCreateUser when fetch throws', async () => {
    fetch.mockRejectedValueOnce(new Error('network fail'));
    const res = await request(app).post('/auth/signup').send({ email: 'fb@ex', password: 'p' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user).toHaveProperty('email', 'fb@ex');
  });

  test('login fallback to dbGetUserByEmail when fetch throws', async () => {
    fetch.mockRejectedValueOnce(new Error('network fail'));
    const res = await request(app).post('/auth/login').send({ email: 'fb2@ex', password: 'p' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body.user).toHaveProperty('email', 'fb2@ex');
  });

  test('signup proxied bad response returns proxied status and raw body', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'bad' });
    const res = await request(app).post('/auth/signup').send({ email: 'x@y', password: 'p' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('raw', 'bad');
  });
});
