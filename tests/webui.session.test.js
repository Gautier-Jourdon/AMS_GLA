import { jest } from '@jest/globals';

describe('webui/session.js createSession behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('start sets active and triggers timeout callback after delay', async () => {
    const { createSession } = await import('../webui/session.js');
    const s = createSession(1000);
    let called = false;
    s.start(() => { called = true; });
    expect(s.isActive()).toBe(true);
    jest.advanceTimersByTime(999);
    expect(called).toBe(false);
    jest.advanceTimersByTime(2);
    expect(called).toBe(true);
  });

  test('reset restarts timer and stop clears activity', async () => {
    const { createSession } = await import('../webui/session.js');
    const s = createSession(1000);
    let called = false;
    s.start(() => { called = true; });
    jest.advanceTimersByTime(600);
    s.reset();
    jest.advanceTimersByTime(600);
    expect(called).toBe(false);
    s.stop();
    expect(s.isActive()).toBe(false);
  });

});
