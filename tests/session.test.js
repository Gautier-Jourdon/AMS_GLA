import { createSession } from '../webui/session.js';
import { jest } from '@jest/globals';

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

test('createSession start/stop add and remove listeners when window exists', () => {
  const add = jest.spyOn(window, 'addEventListener');
  const remove = jest.spyOn(window, 'removeEventListener');
  const s = createSession(1000);
  s.start(() => {});
  expect(add).toHaveBeenCalled();
  s.stop();
  expect(remove).toHaveBeenCalled();
  add.mockRestore(); remove.mockRestore();
});

test('createSession works when window is undefined (no listeners)', done => {
  const realWindow = global.window;
  try{
    delete global.window;
  }catch(e){ global.window = undefined; }
  const s = createSession(50);
  let fired = false;
  s.start(()=>{ fired = true; });
  setTimeout(()=>{
    expect(fired).toBe(true);
    try{ global.window = realWindow; }catch(e){}
    done();
  }, 120);
});

test('reset keeps session active and schedules new timeout', done => {
  const s = createSession(80);
  let fired = false;
  s.start(()=>{ fired = true; });
  s.reset();
  setTimeout(()=>{
    expect(fired).toBe(true);
    s.stop();
    done();
  }, 150);
});

test('createSession handles window without add/removeEventListener', done => {
  const realAdd = window.addEventListener;
  const realRemove = window.removeEventListener;
  try{
    delete window.addEventListener; delete window.removeEventListener;
  }catch(e){ window.addEventListener = undefined; window.removeEventListener = undefined; }
  const s = createSession(50);
  let fired = false;
  s.start(()=>{ fired = true; });
  setTimeout(()=>{
    expect(fired).toBe(true);
    s.stop();
    // restore
    if(realAdd) window.addEventListener = realAdd; else try{ delete window.addEventListener }catch(e){}
    if(realRemove) window.removeEventListener = realRemove; else try{ delete window.removeEventListener }catch(e){}
    done();
  }, 120);
});
