import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('validation and rpc login error branches', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'false';
    process.env.SUPABASE_URL = 'http://supabase.local';
  });

  test('signup missing fields -> 400', async () => {
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/signup').send({ email: 'only' });
    expect(res.status).toBe(400);
  });

  test('login missing fields -> 400', async () => {
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/auth/login').send({ email: 'only' });
    expect(res.status).toBe(400);
  });

  test('rpc/signup missing email -> 400', async () => {
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/rpc/signup').send({});
    expect(res.status).toBe(400);
  });

  test('rpc/login missing email -> 400', async () => {
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/rpc/login').send({});
    expect(res.status).toBe(400);
  });

  test('rpc/login db throws -> 500', async () => {
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient { async connect(){ throw new Error('db boom'); } async end(){} async query(){} }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/rpc/login').send({ email: 'err@x' });
    expect(res.status).toBe(500);
  });
});
