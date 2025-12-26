import { jest } from '@jest/globals';
const request = (await import('supertest')).default;

describe('/api/assets branches', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.DEV_AUTH;
  });

  test('DEV_AUTH serves static assets.json', async () => {
    process.env.DEV_AUTH = 'true';
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/api/assets');
    // Should return an array from collector/data/assets.json
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('non-dev: PG returns rows', async () => {
    process.env.DEV_AUTH = 'false';
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient {
        async connect() {}
        async end() {}
        async query(sql) {
          if (sql.includes('FROM public.assets')) {
            return { rowCount: 1, rows: [{ id: 'a1', symbol: 'BTC', name: 'Bitcoin', rank: 1, price_usd: '100', change_percent_24hr: '1', market_cap_usd: '1', volume_usd_24hr: '1', supply: '1', max_supply: '1', explorer: 'e' }] };
          }
          return { rowCount: 0, rows: [] };
        }
      }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/api/assets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('symbol', 'BTC');
  });

  test('non-dev: PG error then static fallback works', async () => {
    process.env.DEV_AUTH = 'false';
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient {
        async connect() { throw new Error('db down'); }
        async end() {}
      }
    }));
    jest.unstable_mockModule('fs/promises', () => ({
      default: { readFile: jest.fn(async (p, enc) => JSON.stringify([{ id: 'a2', symbol: 'ETH' }])) }
    }));
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/api/assets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('symbol', 'ETH');
  });

  test('non-dev: PG error and static fallback fails -> 503', async () => {
    process.env.DEV_AUTH = 'false';
    jest.unstable_mockModule('pg', () => ({
      Client: class MockClient { async connect() { throw new Error('db down'); } async end() {} }
    }));
    jest.unstable_mockModule('fs/promises', () => ({ default: { readFile: jest.fn(async () => { throw new Error('no file'); }) } }));
    const app = (await import('../server.js')).default;
    const res = await request(app).get('/api/assets');
    expect(res.status).toBe(503);
  });
});
