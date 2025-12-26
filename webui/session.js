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
  const start = (cb)=>{ onTimeout = cb; reset(); if (typeof window !== 'undefined' && window.addEventListener){ window.addEventListener('mousemove', reset); window.addEventListener('keydown', reset); window.addEventListener('click', reset); } };
  const stop = ()=>{ if(timer) clearTimeout(timer); if (typeof window !== 'undefined' && window.removeEventListener){ window.removeEventListener('mousemove', reset); window.removeEventListener('keydown', reset); window.removeEventListener('click', reset); } active=false; };
  const isActive = ()=>active;
  return { start, stop, reset, isActive };
}
