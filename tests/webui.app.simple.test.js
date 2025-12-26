import {
  formatNumber,
  formatPercent,
  generateMockHistory,
  setAllAssets,
  renderTable,
  populateChartSelect,
  switchToTab,
  getTabButtons,
  getTabSections
} from '../webui/app.js';

test('webui helpers basic behaviors', () => {
  expect(formatNumber(null)).toBe('-');
  expect(formatNumber(1234.5)).not.toBe('-');

  expect(formatPercent(null)).toBe('-');
  const up = formatPercent(1.23);
  const down = formatPercent(-2.34);
  expect(up).toContain('badge-up');
  expect(down).toContain('badge-down');

  const hist = generateMockHistory(10, 5);
  expect(Array.isArray(hist)).toBe(true);
  expect(hist.length).toBe(5);

  // ensure renderTable doesn't throw with global.tableBody mock
  setAllAssets([{ symbol: 'T', name: 'Test', priceUsd: 1, changePercent24Hr: 0 }]);
  expect(() => renderTable([{ symbol: 'T', name: 'Test', priceUsd: 1, changePercent24Hr: 0 }])).not.toThrow();

  // populateChartSelect will be a no-op because getChartSelect returns null in test setup
  expect(() => populateChartSelect([])).not.toThrow();

  // switchToTab should not throw when no tab buttons
  expect(() => switchToTab('login')).not.toThrow();
  expect(Array.isArray(getTabButtons())).toBeTruthy();
  expect(Array.isArray(getTabSections())).toBeTruthy();
});
