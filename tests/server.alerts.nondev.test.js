import { jest } from '@jest/globals';

process.env.DEV_AUTH = 'false';
process.env.SUPABASE_URL = 'http://supabase.local';

jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn() }));
jest.unstable_mockModule('pg', () => ({
  Client: class MockClient {
    async connect() {}
    async end() {}
    async query(sql, params) {
      if (/INSERT INTO public.alerts/.test(sql)) {
        return { rowCount: 1, rows: [{ id: 'a1', user_id: params[0], symbol: params[1], threshold: params[2], direction: params[3], created_at: new Date().toISOString() }] };
      }
      if (/FROM public.alerts WHERE user_id =/.test(sql)) {
        return { rowCount: 1, rows: [{ id: 'a1', symbol: 'BTC', threshold: '50000', direction: 'above', created_at: new Date().toISOString() }] };
      }
      if (/SELECT user_id FROM public.alerts WHERE id = \$1/.test(sql)) {
        if (params[0] === 'a1') return { rowCount: 1, rows: [{ user_id: 'u1' }] };
        return { rowCount: 0, rows: [] };
      }
      if (/DELETE FROM public.alerts WHERE id = \$1/.test(sql)) return { rowCount: 1 };
      return { rowCount: 0, rows: [] };
    }
  }
}));

const fetchModule = await import('node-fetch');
const fetch = fetchModule.default;
const request = (await import('supertest')).default;
const app = (await import('../server.js')).default;

describe('alerts non-dev', () => {
  beforeEach(() => { fetch.mockReset(); });

  test('create, list and delete alerts (non-dev)', async () => {
    // verifyAuth will call Supabase /auth/v1/user
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'me@local' }) });
    const create = await request(app).post('/api/alerts').set('Authorization', 'Bearer any').send({ symbol: 'BTC', threshold: '50000', direction: 'above' });
    expect(create.status).toBe(201);
    expect(create.body).toHaveProperty('id', 'a1');

    // list
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'me@local' }) });
    const list = await request(app).get('/api/alerts').set('Authorization', 'Bearer any');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    // delete
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'u1', email: 'me@local' }) });
    const del = await request(app).delete('/api/alerts/a1').set('Authorization', 'Bearer any');
    expect(del.status).toBe(200);
    expect(del.body).toHaveProperty('ok', true);
  });
});
