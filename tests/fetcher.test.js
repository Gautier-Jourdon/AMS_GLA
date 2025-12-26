import { jest } from '@jest/globals';

jest.unstable_mockModule('node-fetch', () => ({ default: jest.fn() }));
const fetchMod = await import('node-fetch');
const fetch = fetchMod.default;

const mod = await import('../collector/utils/fetcher.js');
const { fetchJSON } = mod;

describe('fetcher', () => {
  test('fetchJSON returns parsed json when ok', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) });
    const r = await fetchJSON('http://example');
    expect(r).toEqual({ a: 1 });
  });

  test('fetchJSON throws when not ok', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchJSON('http://bad')).rejects.toThrow(/Erreur HTTP/);
  });
});
