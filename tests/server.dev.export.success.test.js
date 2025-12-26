import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('/dev/export-dev-data success path', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'true';
  });

  test('export succeeds even if some alert inserts fail', async () => {
    // Mock pg so rpc_create_user returns created user, and alert insert throws for one
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient {
        async connect() {}
        async end() {}
        async query(sql, params) {
          if (sql && sql.includes('rpc_create_user')) return { rowCount: 1, rows: [{ id: 'u-dev' }] };
          if (sql && sql.startsWith('INSERT INTO public.alerts')) {
            throw new Error('insert fail');
          }
          return { rowCount: 0, rows: [] };
        }
      }
    }));

    const app = (await import('../server.js')).default;
    // create a dev user and an alert
    const create = await request(app).post('/dev/create-test-user').send({ email: 'dev1@x' });
    expect(create.status).toBe(200);
    // create an alert for that user via DEV_AUTH
    const token = create.body.access_token;
    const alert = await request(app).post('/api/alerts').set('Authorization', `Bearer ${token}`).send({ symbol: 'BTC', threshold: '1', direction: 'above' });
    expect(alert.status).toBe(201);

    // now export - pg mock will throw on insert but overall should return ok true
    const res = await request(app).post('/dev/export-dev-data').send({});
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(Array.isArray(res.body.summary)).toBe(true);
  });
});
