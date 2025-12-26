import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('RPC endpoints in DEV_AUTH', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'true';
  });

  test('/rpc/signup creates then 409 on duplicate, /rpc/login behaviors', async () => {
    const app = (await import('../server.js')).default;
    const email = 'dev1@local';
    const signup = await request(app).post('/rpc/signup').send({ email });
    expect(signup.status).toBe(200);
    expect(signup.body).toHaveProperty('email', email);

    const signup2 = await request(app).post('/rpc/signup').send({ email });
    expect(signup2.status).toBe(409);

    // login for unknown email
    const loginBad = await request(app).post('/rpc/login').send({ email: 'missing@x' });
    expect(loginBad.status).toBe(404);

    // login for created email
    const login = await request(app).post('/rpc/login').send({ email });
    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('email', email);
  });
});
