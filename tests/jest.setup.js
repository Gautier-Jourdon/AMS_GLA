// Setup Jest pour Node.js + jsdom + mocks globaux
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Polyfill setImmediate (manquant dans jsdom, requis par Express/Router)
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

// Mock Canvas pour Chart.js et Sparklines
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      beginPath: () => { },
      moveTo: () => { },
      lineTo: () => { },
      stroke: () => { },
      fill: () => { },
      arc: () => { },
      closePath: () => { },
      createLinearGradient: () => ({
        addColorStop: () => { }
      }),
      fillRect: () => { },
      clearRect: () => { },
      getImageData: () => ({ data: [] }),
      putImageData: () => { },
      setLineDash: () => { },
      getLineDash: () => [],
      measureText: () => ({ width: 0 }),
      save: () => { },
      restore: () => { },
      fillText: () => { },
      strokeText: () => { },
      transform: () => { },
      translate: () => { },
      scale: () => { },
      rotate: () => { },
    };
  };
}

// Mock de Chart.js global (car il est souvent attaché à window)
global.Chart = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
  }
  destroy() { }
  update() { }
};

// Mock basique pour les éléments DOM attendus dans app.js
const fakeClassList = { add: () => { }, remove: () => { }, toggle: () => { }, contains: () => false };

const createFakeElem = (overrides = {}) => {
  const elem = {
    classList: fakeClassList,
    value: '',
    textContent: '',
    innerHTML: '',
    children: [],
    parentNode: null,
    style: {},
    dataset: {},
    attributes: {},

    addEventListener: () => { },
    removeEventListener: () => { },
    appendChild: (child) => { elem.children.push(child); return child; },
    removeChild: (child) => { elem.children = elem.children.filter(c => c !== child); return child; },
    replaceChild: (newChild, oldChild) => {
      const idx = elem.children.indexOf(oldChild);
      if (idx >= 0) elem.children[idx] = newChild;
      return oldChild;
    },
    querySelector: () => createFakeElem(),
    querySelectorAll: () => [],
    setAttribute: (name, value) => { elem.attributes[name] = value; },
    getAttribute: (name) => elem.attributes[name],
    removeAttribute: (name) => { delete elem.attributes[name]; },
    cloneNode: (deep) => createFakeElem({ ...overrides }),
    click: () => { },
    dispatchEvent: () => true,
    focus: () => { },
    blur: () => { },

    getContext: () => ({
      beginPath: () => { },
      moveTo: () => { },
      lineTo: () => { },
      stroke: () => { },
      fill: () => { },
      arc: () => { },
      closePath: () => { },
      createLinearGradient: () => ({
        addColorStop: () => { }
      }),
      fillRect: () => { },
      clearRect: () => { },
      save: () => { },
      restore: () => { },
    }),
    width: 800,
    height: 600,
    ...overrides
  };
  return elem;
};

// Elements spécifiques (Fake)
global.loadingEl = createFakeElem();
global.errorEl = createFakeElem();
global.tableBody = createFakeElem();
global.currentUserSpan = createFakeElem();
global.loginPanel = createFakeElem({ id: 'login-panel' });
global.mainPanel = createFakeElem({ id: 'main-panel' });
global.alertsList = createFakeElem();

global.document.getElementById = (id) => {
  if (id === 'loading') return global.loadingEl;
  if (id === 'error') return global.errorEl;
  if (id === 'assets-body') return global.tableBody;
  if (id === 'current-user') return global.currentUserSpan;
  if (id === 'login-panel') return global.loginPanel;
  if (id === 'main-panel') return global.mainPanel;
  if (id === 'alerts-list') return global.alertsList;

  // Nouveaux éléments pour le calculateur et stats
  if (['calc-amount', 'calc-qty', 'calc-target', 'calc-results', 'calc-swap'].includes(id)) {
    return createFakeElem({ id, value: '100' });
  }
  if (['total-market-cap', 'total-volume', 'btc-dominance', 'total-assets'].includes(id)) {
    return createFakeElem({ id });
  }
  if (['login-email', 'login-pass', 'signup-email', 'signup-pass', 'su_password_confirm'].includes(id)) {
    return createFakeElem({ id, value: 'test' });
  }
  if (['login-error', 'signup-error'].includes(id)) {
    return createFakeElem({ id });
  }
  if (['login-form', 'signup-form', 'alert-form'].includes(id)) {
    return createFakeElem({ id });
  }
  if (['logout-btn', 'theme-toggle'].includes(id)) {
    return createFakeElem({ id });
  }
  if (['crypto-chart', 'modal-chart'].includes(id)) {
    return createFakeElem({ id, width: 800, height: 600 });
  }
  if (['chart-select', 'chart-period'].includes(id)) {
    return createFakeElem({ id, value: 'BTC', children: [] });
  }
  if (id === 'market-ticker') {
    return createFakeElem({ id });
  }

  // Retourner un élément générique pour éviter les crashs null
  return createFakeElem({ id });
};

// Laisser jsdom fournir `createElement` natif pour que les tests qui utilisent
// de vrais noeuds DOM fonctionnent correctement. Nous conservons les mocks
// ciblées via `createFakeElem` pour `getElementById` et autres helpers.
