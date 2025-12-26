import { jest } from '@jest/globals';
const requestModule = await import('supertest');
const request = requestModule.default;

describe('alerts delete DB error branch', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
  });

  test('DELETE /api/alerts/:id when DB query throws -> 500', async () => {
    // mock fetch for verifyAuth probe and user validation
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u) => {
        if (u && u.includes('/auth/v1/user')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'u1', email: 'x@y' }) });
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));

    // mock pg Client so the owner-select query throws
    jest.unstable_mockModule('pg', () => ({
      Client: jest.fn(() => ({
        connect: async () => {},
        query: async (q) => { if (q && q.includes('SELECT user_id FROM public.alerts')) throw new Error('boom'); return { rowCount: 0, rows: [] }; },
        end: async () => {}
      }))
    }));

    const app = (await import('../server.js')).default;
    const res = await request(app).delete('/api/alerts/abc').set('Authorization', 'Bearer token');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'db error');
  });
});
