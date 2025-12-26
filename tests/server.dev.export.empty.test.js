import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('/dev/export-dev-data empty maps', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DEV_AUTH = 'true';
  });

  test('export with no users/alerts returns ok true', async () => {
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient { async connect(){} async end(){} async query(){ return { rowCount: 0, rows: [] }; } }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).post('/dev/export-dev-data').send({});
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(Array.isArray(res.body.summary)).toBe(true);
  });
});
