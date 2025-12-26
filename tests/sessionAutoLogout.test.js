import { createSession } from '../webui/session.js';

describe('Session auto-logout', () => {
  it('should call onTimeout after inactivity', done => {
    const s = createSession(100); // 100ms
    let called = false;
    s.start(() => { called = true; });
    setTimeout(() => {
      expect(called).toBe(true);
      s.stop();
      done();
    }, 200);
  });
});
