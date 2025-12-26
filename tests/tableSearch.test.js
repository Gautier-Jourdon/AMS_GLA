
// Mock localStorage pour Node
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

describe('Table rendering and search', () => {
  let renderTable, allAssets, mockTableBody;
  beforeEach(async () => {
    // Mock minimal du DOM pour assets-body
    mockTableBody = {
      innerHTML: '',
      children: [],
      appendChild: function(tr) { this.children.push(tr); }
    };
    global.tableBody = mockTableBody;
    ({ renderTable } = await import('../webui/app.js'));
    allAssets = [
      { symbol: 'BTC', name: 'Bitcoin', priceUsd: 100 },
      { symbol: 'ETH', name: 'Ethereum', priceUsd: 50 }
    ];
  });
  it('renders all assets', () => {
    renderTable(allAssets, mockTableBody);
    expect(mockTableBody.children.length).toBe(2);
  });
});
