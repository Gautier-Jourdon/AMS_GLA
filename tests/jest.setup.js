// Setup Jest pour Node.js + jsdom + mocks globaux
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock basique pour les éléments DOM attendus dans app.js

const fakeClassList = { add: () => {}, remove: () => {}, toggle: () => {} };
global.loadingEl = { classList: fakeClassList };
global.errorEl = { classList: fakeClassList, textContent: '' };
global.tableBody = { innerHTML: '', appendChild: () => {} };
global.currentUserSpan = { textContent: '' };
global.loginPanel = { classList: fakeClassList };
global.mainPanel = { classList: fakeClassList };
global.alertsList = { innerHTML: '', appendChild: () => {} };

global.document = {
  getElementById: (id) => {
    if(id === 'loading') return global.loadingEl;
    if(id === 'error') return global.errorEl;
    if(id === 'assets-body') return global.tableBody;
    if(id === 'current-user') return global.currentUserSpan;
    if(id === 'login-panel') return global.loginPanel;
    if(id === 'main-panel') return global.mainPanel;
    if(id === 'alerts-list') return global.alertsList;
    return null;
  },
  querySelectorAll: () => []
};
