import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('login fallback returns token when DB user exists', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
    process.env.SUPABASE_URL = 'http://supabase.local';
  });

  test('dbGetUserByEmail returns user -> login fallback returns token', async () => {
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn(() => { throw new Error('net'); }) }));
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient { async connect(){} async end(){} async query(sql){ if (sql.includes('rpc_get_user')) return { rowCount:1, rows:[{ id: 'dbu', email: 'dbu@x' }] }; return { rowCount:0, rows:[] }; } }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/login').send({ email: 'dbu@x', password: 'p' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
  });
});
