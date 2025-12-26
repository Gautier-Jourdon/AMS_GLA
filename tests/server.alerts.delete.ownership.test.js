import { jest } from '@jest/globals';
const requestModule = await import('supertest');
const request = requestModule.default;

describe('alerts delete ownership checks', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
  });

  test('DELETE /api/alerts/:id returns 404 when owner not found', async () => {
    // mock verifyAuth probe to return a valid user
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u) => {
        if (u && u.includes('/auth/v1/user')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'u1', email: 'x@y' }) });
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));

    // mock pg Client: owner select returns zero rows
    jest.unstable_mockModule('pg', () => ({
      Client: jest.fn(() => ({
        connect: async () => {},
        query: async (q) => {
          if (q && q.includes('SELECT user_id FROM public.alerts')) return { rowCount: 0, rows: [] };
          return { rowCount: 0, rows: [] };
        },
        end: async () => {}
      }))
    }));

    const app = (await import('../server.js')).default;
    const res = await request(app).delete('/api/alerts/notfound').set('Authorization', 'Bearer token');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'not found');
  });

  test('DELETE /api/alerts/:id returns 403 when owner mismatch', async () => {
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u) => {
        if (u && u.includes('/auth/v1/user')) return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'u1', email: 'x@y' }) });
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));

    // owner query returns a different user_id
    jest.unstable_mockModule('pg', () => ({
      Client: jest.fn(() => ({
        connect: async () => {},
        query: async (q) => {
          if (q && q.includes('SELECT user_id FROM public.alerts')) return { rowCount: 1, rows: [{ user_id: 'someone-else' }] };
          return { rowCount: 0, rows: [] };
        },
        end: async () => {}
      }))
    }));

    const app = (await import('../server.js')).default;
    const res = await request(app).delete('/api/alerts/abc123').set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'forbidden');
  });
});
