import { formatNumber, formatPercent, generateMockHistory, showLoggedIn, showLoggedOut, switchToTab } from '../webui/app.js';
import { jest } from '@jest/globals';

describe('Utils app.js', () => {
  test('formatNumber formate correctement', () => {
    // Accepte les espaces insécables ou normaux
    expect(formatNumber(1234.567)).toMatch(/1[\s\u202F\u00A0]234,57/);
    expect(formatNumber(null)).toBe('-');
    expect(formatNumber(undefined)).toBe('-');
  });

  test('formatPercent formate correctement', () => {
    // Accepte badge HTML ou %
    expect(formatPercent(12.345)).toMatch(/(badge|%)/);
    expect(formatPercent(null)).toBe('-');
  });

  test('generateMockHistory génère un tableau de la bonne taille', () => {
    const arr = generateMockHistory(100, 10);
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(10);
    arr.forEach(v => expect(typeof v).toBe('number'));
  });
});

describe('UI app.js', () => {
  let loginPanel, mainPanel, currentUserSpan, tabButtons, tabSections;
  beforeEach(() => {
    global.startSessionTimer = jest.fn();
    global.stopSessionTimer = jest.fn();
    loginPanel = { classList: { add: jest.fn(), remove: jest.fn() } };
    mainPanel = { classList: { add: jest.fn(), remove: jest.fn() } };
    currentUserSpan = { textContent: '' };
    tabButtons = [{ dataset: { tab: 'table' }, classList: { toggle: jest.fn() } }];
    tabSections = [{ id: 'tab-table', classList: { toggle: jest.fn() } }];
    global.loginPanel = loginPanel;
    global.mainPanel = mainPanel;
    global.currentUserSpan = currentUserSpan;
    global.tabButtons = tabButtons;
    global.tabSections = tabSections;
    global.searchInput = { addEventListener: jest.fn() };
    global.window = {};
    global.authUser = { email: 'test@example.com' };
  });

  test('showLoggedIn masque loginPanel et affiche mainPanel', () => {
    showLoggedIn();
    expect(loginPanel.classList.add).toHaveBeenCalledWith('hidden');
    expect(mainPanel.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('showLoggedOut affiche loginPanel et masque mainPanel', () => {
    showLoggedOut();
    expect(loginPanel.classList.remove).toHaveBeenCalledWith('hidden');
    expect(mainPanel.classList.add).toHaveBeenCalledWith('hidden');
  });

  test('switchToTab active le bon bouton', () => {
    switchToTab('table');
    expect(tabButtons[0].classList.toggle).toHaveBeenCalled();
    expect(tabSections[0].classList.toggle).toHaveBeenCalled();
  });
});