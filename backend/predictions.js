/**
 * Module de prévisions pour cryptomonnaies
 * Calculs : SMA, EMA, Régression linéaire
 */

/**
 * Calcule la moyenne mobile simple (SMA)
 * @param {number[]} prices - Tableau des prix
 * @param {number} period - Période (ex: 7, 30)
 * @returns {number} Moyenne des N derniers prix
 */
export function calculateSMA(prices, period) {
    if (!prices || prices.length < period) {
        return null;
    }

    const slice = prices.slice(-period);
    const sum = slice.reduce((acc, price) => acc + price, 0);
    return sum / period;
}

/**
 * Calcule la moyenne mobile exponentielle (EMA)
 * @param {number[]} prices - Tableau des prix
 * @param {number} period - Période (ex: 12, 26)
 * @returns {number} EMA calculée
 */
export function calculateEMA(prices, period) {
    if (!prices || prices.length < period) {
        return null;
    }

    const k = 2 / (period + 1);

    // Commencer avec SMA pour la première valeur
    let ema = calculateSMA(prices.slice(0, period), period);

    // Calculer EMA pour le reste
    for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
}

/**
 * Calcule la régression linéaire
 * Formule: y = mx + b
 * @param {Array<{timestamp: number, price: number}>} data - Points de données
 * @returns {Object} {slope, intercept, r2, prediction}
 */
export function linearRegression(data) {
    if (!data || data.length < 2) {
        return null;
    }

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    data.forEach((point, index) => {
        const x = index; // Utiliser l'index comme x
        const y = point.price;

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
    });

    // Calcul de la pente (m)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Calcul de l'ordonnée à l'origine (b)
    const intercept = (sumY - slope * sumX) / n;

    // Calcul du coefficient de détermination R² (qualité de la régression)
    const meanY = sumY / n;
    let ssTotal = 0;
    let ssResidual = 0;

    data.forEach((point, index) => {
        const predicted = slope * index + intercept;
        ssTotal += Math.pow(point.price - meanY, 2);
        ssResidual += Math.pow(point.price - predicted, 2);
    });

    const r2 = 1 - (ssResidual / ssTotal);

    // Prédiction pour le prochain point
    const nextX = n;
    const prediction = slope * nextX + intercept;

    return {
        slope,
        intercept,
        r2,
        prediction,
        confidence: r2 > 0.7 ? 'high' : r2 > 0.4 ? 'medium' : 'low',
        trend: slope > 0 ? 'bullish' : slope < 0 ? 'bearish' : 'neutral'
    };
}

/**
 * Calcule toutes les prévisions pour un asset
 * @param {Array<{timestamp: number, price: number}>} history - Historique des prix
 * @returns {Object} Toutes les prévisions
 */
export function calculatePredictions(history) {
    if (!history || history.length < 7) {
        return {
            error: 'Insufficient data',
            minRequired: 7,
            available: history?.length || 0
        };
    }

    const prices = history.map(h => h.price);

    // Calculs
    const sma7 = calculateSMA(prices, 7);
    const sma30 = calculateSMA(prices, Math.min(30, prices.length));
    const ema12 = calculateEMA(prices, Math.min(12, prices.length));
    const ema26 = calculateEMA(prices, Math.min(26, prices.length));
    const regression = linearRegression(history);

    // Signal MACD basique (EMA12 - EMA26)
    const macd = ema12 && ema26 ? ema12 - ema26 : null;

    // Prix actuel
    const currentPrice = prices[prices.length - 1];

    // Tendance globale basée sur SMA
    let trend = 'neutral';
    if (sma7 && sma30) {
        if (sma7 > sma30 * 1.02) trend = 'bullish';
        else if (sma7 < sma30 * 0.98) trend = 'bearish';
    }

    return {
        currentPrice,
        sma: {
            sma7: sma7 ? parseFloat(sma7.toFixed(2)) : null,
            sma30: sma30 ? parseFloat(sma30.toFixed(2)) : null
        },
        ema: {
            ema12: ema12 ? parseFloat(ema12.toFixed(2)) : null,
            ema26: ema26 ? parseFloat(ema26.toFixed(2)) : null
        },
        macd: macd ? parseFloat(macd.toFixed(2)) : null,
        regression: regression ? {
            prediction: parseFloat(regression.prediction.toFixed(2)),
            confidence: regression.confidence,
            trend: regression.trend,
            r2: parseFloat(regression.r2.toFixed(4))
        } : null,
        trend,
        timestamp: new Date().toISOString()
    };
}

/**
 * Obtient une recommandation basée sur les prévisions
 * @param {Object} predictions - Résultat de calculatePredictions
 * @returns {Object} Recommandation
 */
export function getRecommendation(predictions) {
    if (!predictions || predictions.error) {
        return { action: 'hold', confidence: 'low', reason: 'Insufficient data' };
    }

    let bullishSignals = 0;
    let bearishSignals = 0;

    // Signal 1: SMA crossover
    if (predictions.sma.sma7 && predictions.sma.sma30) {
        if (predictions.sma.sma7 > predictions.sma.sma30) bullishSignals++;
        else bearishSignals++;
    }

    // Signal 2: MACD
    if (predictions.macd) {
        if (predictions.macd > 0) bullishSignals++;
        else bearishSignals++;
    }

    // Signal 3: Régression
    if (predictions.regression) {
        if (predictions.regression.trend === 'bullish') bullishSignals++;
        else if (predictions.regression.trend === 'bearish') bearishSignals++;
    }

    // Signal 4: Tendance générale
    if (predictions.trend === 'bullish') bullishSignals++;
    else if (predictions.trend === 'bearish') bearishSignals++;

    // Décision
    let action = 'hold';
    let confidence = 'medium';

    if (bullishSignals >= 3) {
        action = 'buy';
        confidence = 'high';
    } else if (bullishSignals >= 2) {
        action = 'buy';
        confidence = 'medium';
    } else if (bearishSignals >= 3) {
        action = 'sell';
        confidence = 'high';
    } else if (bearishSignals >= 2) {
        action = 'sell';
        confidence = 'medium';
    }

    return {
        action,
        confidence,
        signals: { bullish: bullishSignals, bearish: bearishSignals },
        reason: `${bullishSignals} bullish / ${bearishSignals} bearish signals`
    };
}
