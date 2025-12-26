import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('alerts delete error paths (non-dev)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
    process.env.SUPABASE_URL = 'http://supabase.local';
  });

  test('delete returns 404 when alert not found', async () => {
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'u1', email: 'me@local' }) })) }));
    jest.unstable_mockModule('pg', () => ({ Client: class MockClient { async connect(){} async end(){} async query(sql, params){ if (sql.includes('SELECT user_id FROM public.alerts')) return { rowCount: 0, rows: [] }; return { rowCount:0, rows:[] }; } } }));
    const app = (await import('../server.js')).default;
    const res = await request(app).delete('/api/alerts/missing').set('Authorization', 'Bearer tok');
    expect(res.status).toBe(404);
  });

  test('delete returns 403 when not owner', async () => {
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'u1', email: 'me@local' }) })) }));
    jest.unstable_mockModule('pg', () => ({ Client: class MockClient { async connect(){} async end(){} async query(sql, params){ if (sql.includes('SELECT user_id FROM public.alerts')) return { rowCount: 1, rows: [{ user_id: 'other' }] }; return { rowCount:0, rows:[] }; } } }));
    const app = (await import('../server.js')).default;
    const res = await request(app).delete('/api/alerts/a1').set('Authorization', 'Bearer tok');
    expect(res.status).toBe(403);
  });
});
