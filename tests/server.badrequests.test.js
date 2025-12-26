import { jest } from '@jest/globals';
const requestModule = await import('supertest');
const request = requestModule.default;

describe('bad request branches (missing fields)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'true';
  });

  test('auth and rpc endpoints return 400 when fields missing', async () => {
    const app = (await import('../server.js')).default;

    const s1 = await request(app).post('/auth/signup').send({});
    expect(s1.status).toBe(400);

    const s2 = await request(app).post('/auth/login').send({});
    expect(s2.status).toBe(400);

    const s3 = await request(app).post('/rpc/signup').send({});
    expect(s3.status).toBe(400);

    const s4 = await request(app).post('/rpc/login').send({});
    expect(s4.status).toBe(400);

    const s5 = await request(app).post('/dev/create-test-user').send({});
    expect(s5.status).toBe(400);
  });
});
