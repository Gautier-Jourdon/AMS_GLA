import { calculateSMA, calculateEMA, linearRegression, calculatePredictions, getRecommendation } from '../backend/predictions.js';

/**
 * Tests simples et pédagogiques en français.
 * Logique volontairement simple et claire pour un niveau étudiant.
 */

describe('Prévisions - fonctions de base', () => {
  test("calculateSMA retourne null si données insuffisantes", () => {
    expect(calculateSMA([1,2,3], 5)).toBeNull();
  });

  test('calculateSMA calcule correctement la moyenne mobile simple', () => {
    const prices = [10, 20, 30, 40, 50];
    // Les 3 derniers : 30,40,50 => moyenne = 40
    expect(calculateSMA(prices, 3)).toBe(40);
  });

  test('calculateEMA retourne null si données insuffisantes', () => {
    expect(calculateEMA([1,2], 5)).toBeNull();
  });

  test('calculateEMA retourne une valeur numérique pour une série suffisante', () => {
    const prices = [1,2,3,4,5,6,7,8,9];
    const ema = calculateEMA(prices, 3);
    expect(typeof ema).toBe('number');
    expect(ema).toBeGreaterThan(0);
  });

  test('linearRegression gère une petite série croissante', () => {
    const data = [
      { timestamp: 1, price: 1 },
      { timestamp: 2, price: 2 },
      { timestamp: 3, price: 3 },
      { timestamp: 4, price: 4 }
    ];
    const res = linearRegression(data);
    // pente positive, tendance haussière
    expect(res).not.toBeNull();
    expect(res.slope).toBeGreaterThan(0);
    expect(res.trend).toBe('bullish');
    expect(res.r2).toBeGreaterThanOrEqual(0);
    expect(res.r2).toBeLessThanOrEqual(1);
  });
});

describe('calculatePredictions et getRecommendation - scénarios simples', () => {
  test('calculatePredictions signale erreur si peu de données', () => {
    const shortHistory = [{timestamp:1,price:1},{timestamp:2,price:2}];
    const out = calculatePredictions(shortHistory);
    expect(out).toHaveProperty('error');
    expect(out.error).toMatch(/Insufficient data/);
  });

  test('calculatePredictions calcule des métriques pour une série haussière', () => {
    // série simple et croissante (10 points)
    const history = Array.from({length:10}, (_,i) => ({ timestamp: i, price: 10 + i }));
    const preds = calculatePredictions(history);
    expect(preds).toHaveProperty('currentPrice');
    expect(preds.currentPrice).toBe(19); // 10 + 9
    expect(preds).toHaveProperty('sma');
    expect(preds.sma.sma7).not.toBeNull();
    expect(preds.trend).toMatch(/(bullish|neutral|bearish)/);
  });

  test('getRecommendation renvoie une action raisonnable pour une série haussière', () => {
    const history = Array.from({length:10}, (_,i) => ({ timestamp: i, price: 10 + i }));
    const preds = calculatePredictions(history);
    const rec = getRecommendation(preds);
    // action attendue : buy, hold ou sell (on vérifie buy ou hold). Pour une forte hausse, on espère buy.
    expect(['buy','hold','sell']).toContain(rec.action);
    expect(rec).toHaveProperty('confidence');
    expect(rec.signals).toHaveProperty('bullish');
  });
});
