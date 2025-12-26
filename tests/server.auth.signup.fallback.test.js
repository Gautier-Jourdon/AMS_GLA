import { jest } from '@jest/globals';

const requestModule = await import('supertest');
const request = requestModule.default;

describe('auth signup fallback to DB returning no rows', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
  });

  test('signup proxied fails and dbCreateUser returns null -> 500 signup failed (db)', async () => {
    // Make fetch throw to trigger the catch branch
    jest.unstable_mockModule('node-fetch', () => ({
      default: jest.fn((u) => {
        if (u && u.includes('/auth/v1/signup')) throw new Error('network');
        return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
      })
    }));

    // Mock pg Client so rpc_create_user returns rowCount 0 (-> dbCreateUser returns null)
    jest.unstable_mockModule('pg', () => ({
      Client: jest.fn(() => ({
        connect: async () => {},
        query: async () => ({ rowCount: 0, rows: [] }),
        end: async () => {}
      }))
    }));

    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/signup').send({ email: 'u@x', password: 'p' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/signup failed/i);
  });
});
