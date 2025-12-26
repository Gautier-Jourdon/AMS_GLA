import { jest } from '@jest/globals';

// Ensure non-dev mode
process.env.DEV_AUTH = 'false';
process.env.SUPABASE_URL = 'http://supabase.local';

// Mock node-fetch
jest.unstable_mockModule('node-fetch', () => ({
  default: jest.fn()
}));
// Mock pg Client
jest.unstable_mockModule('pg', () => ({
  Client: class MockClient {
    constructor() {
      this._connected = false;
      this.queries = [];
    }
    async connect() { this._connected = true; }
    async end() { this._connected = false; }
    async query(sql, params) {
      this.queries.push({ sql, params });
      if (/rpc_create_user/.test(sql)) {
        return { rowCount: 1, rows: [{ id: 'db-user-1', email: params[0] }] };
      }
      if (/rpc_get_user/.test(sql)) {
        return { rowCount: 1, rows: [{ id: 'db-user-1', email: params[0] }] };
      }
      if (/FROM public.assets/.test(sql)) {
        return { rowCount: 2, rows: [
          { id: 'btc', symbol: 'BTC', name: 'Bitcoin', rank: 1, price_usd: '60000', change_percent_24hr: '1', market_cap_usd: '1e12', volume_usd_24hr: '1e9', supply: '21000000', max_supply: '21000000', explorer: 'https://' },
          { id: 'eth', symbol: 'ETH', name: 'Ethereum', rank: 2, price_usd: '4000', change_percent_24hr: '2', market_cap_usd: '4e11', volume_usd_24hr: '5e8', supply: '115000000', max_supply: null, explorer: 'https://' }
        ] };
      }
      // default
      return { rowCount: 0, rows: [] };
    }
  }
}));

const fetchModule = await import('node-fetch');
const fetch = fetchModule.default;

const requestModule = await import('supertest');
const request = requestModule.default;

const serverModule = await import('../server.js');
const app = serverModule.default;

describe('server non-DEV flows', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  test('/auth/login proxies to Supabase token endpoint', async () => {
    const tokenResp = { access_token: 'tok-1', token_type: 'bearer', user: { id: 'u1', email: 'x@y' } };
    fetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(tokenResp), status: 200 });

    const res = await request(app).post('/auth/login').send({ email: 'x@y', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token', 'tok-1');
  });

  test('/auth/me validates token with Supabase', async () => {
    const userResp = { id: 'u1', email: 'me@local' };
    // resolveSupabaseUrl probing is skipped because SUPABASE_URL set; fetch will be called for /auth/v1/user
    fetch.mockResolvedValueOnce({ ok: true, json: async () => userResp, status: 200 });

    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer any');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'me@local');
  });

  test('/rpc/signup calls DB RPC and returns created user', async () => {
    const res = await request(app).post('/rpc/signup').send({ email: 'dbuser@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'dbuser@example.com');
  });

  test('/rpc/login retrieves user from DB RPC', async () => {
    const res = await request(app).post('/rpc/login').send({ email: 'dbuser@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'dbuser@example.com');
  });

  test('/api/assets reads from Postgres and returns mapped rows', async () => {
    const res = await request(app).get('/api/assets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('symbol');
  });
});
