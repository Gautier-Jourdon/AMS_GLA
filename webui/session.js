// Session helper for inactivity logic (exported for tests)
export function createSession(timeoutMs = 30000){
  let timer = null;
  let active = false;
  const reset = () => {
    if(timer) clearTimeout(timer);
    timer = setTimeout(()=>{ active=false; if(typeof onTimeout === 'function') onTimeout(); }, timeoutMs);
    active = true;
  };
  let onTimeout = null;
  const start = (cb)=>{ onTimeout = cb; reset(); if (typeof globalThis !== 'undefined' && globalThis.window && globalThis.window.addEventListener){ globalThis.window.addEventListener('mousemove', reset); globalThis.window.addEventListener('keydown', reset); globalThis.window.addEventListener('click', reset); } };
  const stop = ()=>{ if(timer) clearTimeout(timer); if (typeof globalThis !== 'undefined' && globalThis.window && globalThis.window.removeEventListener){ globalThis.window.removeEventListener('mousemove', reset); globalThis.window.removeEventListener('keydown', reset); globalThis.window.removeEventListener('click', reset); } active=false; };
  const isActive = ()=>active;
  return { start, stop, reset, isActive };
}
