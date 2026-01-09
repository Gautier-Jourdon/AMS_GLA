import { jest } from '@jest/globals'

beforeEach(() => {
  jest.resetModules()
  document.body.innerHTML = ''
})

test('formatNumber and formatPercent produce expected strings', async () => {
  const mod = await import('../webui/app.js')
  expect(mod.formatNumber(1234.567)).toMatch(/1.?234/)
  const p = mod.formatPercent(2.5)
  expect(p).toContain('2')
  expect(p).toContain('badge-up')
})

test('generateMockHistory returns correct length and numbers', async () => {
  const mod = await import('../webui/app.js')
  const arr = mod.generateMockHistory(10, 5)
  expect(Array.isArray(arr)).toBe(true)
  expect(arr.length).toBe(5)
  arr.forEach(v => expect(typeof v).toBe('number'))
})

test('debounce delays calls', async () => {
  jest.useFakeTimers()
  const mod = await import('../webui/app.js')
  const fn = jest.fn()
  const d = mod.debounce(fn, 100)
  d()
  d()
  expect(fn).not.toHaveBeenCalled()
  jest.runAllTimers()
  expect(fn).toHaveBeenCalled()
  jest.useRealTimers()
})

test('populateChartSelect and renderTable and updateMarketStats integrate', async () => {
  const sel = document.createElement('select')
  sel.id = 'chart-crypto'
  document.body.appendChild(sel)
  const origGet = document.getElementById.bind(document)
  document.getElementById = (id) => {
    if (id === 'chart-crypto') return sel
    if (id === 'chart-period') return period
    if (id === 'assets-body') return tbody
    if (id === 'loading') return loading
    if (id === 'error') return error
    if (id === 'total-market-cap') return cap
    if (id === 'total-volume') return vol
    if (id === 'btc-dominance') return btc
    if (id === 'total-assets') return assetsEl
    if (id === 'market-ticker') return ticker
    return origGet(id)
  }
  const period = document.createElement('select')
  period.id = 'chart-period'
  period.value = '24h'
  document.body.appendChild(period)
  const tbody = document.createElement('tbody')
  tbody.id = 'assets-body'
  document.body.appendChild(tbody)
  const loading = document.createElement('div')
  loading.id = 'loading'
  loading.className = 'hidden'
  document.body.appendChild(loading)
  const error = document.createElement('div')
  error.id = 'error'
  document.body.appendChild(error)
  const cap = document.createElement('div')
  cap.id = 'total-market-cap'
  document.body.appendChild(cap)
  const vol = document.createElement('div')
  vol.id = 'total-volume'
  document.body.appendChild(vol)
  const btc = document.createElement('div')
  btc.id = 'btc-dominance'
  document.body.appendChild(btc)
  const assetsEl = document.createElement('div')
  assetsEl.id = 'total-assets'
  document.body.appendChild(assetsEl)
  const ticker = document.createElement('div')
  ticker.id = 'market-ticker'
  document.body.appendChild(ticker)
  global.createSparkline = jest.fn()
  global.Chart = jest.fn(() => ({ destroy: () => {} }))
  const mod = await import('../webui/app.js')
  const assets = [{ symbol: 'BTC', name: 'Bitcoin', priceUsd: '100', changePercent24Hr: '1', marketCapUsd: '200', volumeUsd24Hr: '50', supply: 1000, maxSupply: 2100, explorer: 'https://x' }]
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => assets, text: async () => '' })
  await mod.loadAssets()
  expect(document.getElementById('assets-body').children.length).toBeGreaterThanOrEqual(1)
  expect(document.getElementById('chart-crypto').children.length).toBeGreaterThanOrEqual(1)
  expect(document.getElementById('total-assets').textContent).toBe('1')
  expect(document.getElementById('market-ticker').textContent).toContain('BTC')
})
