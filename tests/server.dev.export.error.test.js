import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('/dev/export-dev-data error path', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'true';
  });

  test('export fails when dbCreateUser (pg) throws', async () => {
    const app1 = (await import('../server.js')).default;
    // create a dev user so DEV_TOKENS has entries
    await request(app1).post('/dev/create-test-user').send({ email: 'e1@x' });
    // now re-mock pg to throw during dbCreateUser called from export
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient { async connect() { throw new Error('db fail'); } async end() {} async query() { throw new Error('db'); } }
    }));
    const app2 = (await import('../server.js')).default;
    const res = await request(app2).post('/dev/export-dev-data').send({});
    expect([500, 500]).toContain(res.status);
    // should be 500 in error scenario
    expect(res.status).toBe(500);
  });
});
