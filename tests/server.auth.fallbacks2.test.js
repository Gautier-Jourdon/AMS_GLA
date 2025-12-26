import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('auth signup/login fallbacks and rpc errors (non-dev paths)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
    process.env.SUPABASE_URL = 'http://supabase.local';
  });

  test('signup proxied returns non-ok status (400)', async () => {
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn((u, opts) => {
      if (u.includes('/auth/v1/signup')) return Promise.resolve({ ok: false, status: 400, text: async () => JSON.stringify({ error: 'bad' }) });
      return Promise.resolve({ status: 200, ok: true, text: async () => '/' });
    }) }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/signup').send({ email: 'x@x', password: 'p' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('signup proxied throws and dbCreateUser returns null -> 500', async () => {
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn(() => { throw new Error('network'); }) }));
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient {
        async connect() { throw new Error('connect fail'); }
        async end() {}
        async query() { return { rowCount: 0, rows: [] }; }
      }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/signup').send({ email: 'y@y', password: 'p' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('login proxied throws and dbGetUserByEmail returns null -> 401', async () => {
    jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn(() => { throw new Error('network'); }) }));
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient {
        async connect() {}
        async end() {}
        async query(sql) { return { rowCount: 0, rows: [] }; }
      }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/login').send({ email: 'z@z', password: 'p' });
    expect(res.status).toBe(401);
  });

  test('/rpc/signup non-dev: db returns rowCount 0 -> 409', async () => {
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient { async connect(){} async end(){} async query(sql){ return { rowCount: 0, rows: [] }; } }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/rpc/signup').send({ email: 'rpc@x' });
    expect(res.status).toBe(409);
  });

  test('/rpc/login non-dev: db returns rowCount 0 -> 404', async () => {
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient { async connect(){} async end(){} async query(sql){ return { rowCount: 0, rows: [] }; } }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/rpc/login').send({ email: 'rpc@x' });
    expect(res.status).toBe(404);
  });

  test('/rpc/signup db throws -> 500', async () => {
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient { async connect(){ throw new Error('boom'); } async end(){} async query(){} }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/rpc/signup').send({ email: 'e@x' });
    expect(res.status).toBe(500);
  });

});
