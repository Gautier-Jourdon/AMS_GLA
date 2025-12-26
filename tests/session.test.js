import { createSession } from '../webui/session.js';

test('session timeout triggers after interval', done => {
  const s = createSession(100); // 100ms for test
  let timedOut = false;
  s.start(() => { timedOut = true; });
  // wait 250ms then check
  setTimeout(() => {
    expect(timedOut).toBe(true);
    s.stop();
    done();
  }, 250);
});
