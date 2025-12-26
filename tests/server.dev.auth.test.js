import { jest } from '@jest/globals';

// ensure DEV_AUTH true before importing server
process.env.DEV_AUTH = 'true';

const requestModule = await import('supertest');
const request = requestModule.default;

// import server app
const appModule = await import('../server.js');
const app = appModule.default;

describe('DEV auth endpoints', () => {
  beforeEach(() => {
    // reset module-level maps by reloading server module
    jest.resetModules();
    process.env.DEV_AUTH = 'true';
  });

  test('signup then /auth/me returns same email and stable token', async () => {
    // import fresh app
    const server = (await import('../server.js')).default;
    const email = 'test.user@example.com';
    const res = await request(server).post('/auth/signup').send({ email, password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('user');
    const token = res.body.access_token;

    const me = await request(server).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body).toHaveProperty('email', email);
  });

  test('login reuses token for same email', async () => {
    const server = (await import('../server.js')).default;
    const email = 'reuse.user@example.com';
    const s1 = await request(server).post('/auth/login').send({ email, password: 'pw' });
    expect(s1.status).toBe(200);
    const t1 = s1.body.access_token;
    const s2 = await request(server).post('/auth/login').send({ email, password: 'pw' });
    expect(s2.status).toBe(200);
    const t2 = s2.body.access_token;
    expect(t1).toBe(t2);
  });

  test('rpc signup/login emulated in DEV_AUTH', async () => {
    const server = (await import('../server.js')).default;
    const email = 'rpc.user@example.com';
    const su = await request(server).post('/rpc/signup').send({ email });
    expect([200,201,409]).toContain(su.status);
    const lu = await request(server).post('/rpc/login').send({ email });
    expect([200,404]).toContain(lu.status);
    if (lu.status === 200) {
      expect(lu.body).toHaveProperty('email', email);
    }
  });

  test('/api/assets returns array in DEV_AUTH', async () => {
    const server = (await import('../server.js')).default;
    const r = await request(server).get('/api/assets');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBeGreaterThan(0);
  });

  test('signup reuses token for same email in DEV_AUTH', async () => {
    const server = (await import('../server.js')).default;
    const email = 'signup.reuse@example.com';
    const s1 = await request(server).post('/auth/signup').send({ email, password: 'pw' });
    expect(s1.status).toBe(200);
    const t1 = s1.body.access_token;
    const s2 = await request(server).post('/auth/signup').send({ email, password: 'pw' });
    expect(s2.status).toBe(200);
    const t2 = s2.body.access_token;
    expect(t1).toBe(t2);
  });
});
