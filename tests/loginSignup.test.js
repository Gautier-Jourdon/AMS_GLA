import { jest } from '@jest/globals';

global.fetch = jest.fn();
 
// Mock localStorage pour Node
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

describe('Login/Signup', () => {
  beforeEach(() => { fetch.mockClear(); localStorage.clear(); });

  it('should store token after login', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok123', user: { email: 'a@b.com' } }) });
    const { doLogin } = await import('../webui/app.js');
    await doLogin('a@b.com', 'pw');
    expect(localStorage.getItem('supabase_token')).toBe('tok123');
  });

  it('should show error on failed login', async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'fail' }) });
    const { doLogin } = await import('../webui/app.js');
    await expect(doLogin('a@b.com', 'pw')).rejects.toThrow('fail');
  });
});
