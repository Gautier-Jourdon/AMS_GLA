/**
 * Predictions UI Module
 * Gère l'affichage des prévisions dans l'interface
 */

// Charger et afficher les prévisions pour un symbole donné
export async function loadPredictions(symbol) {
    try {
        const panel = document.getElementById('predictions-panel');
        if (!panel) return;

        console.log('[PREDICTIONS] Loading for', symbol);

        // Afficher le panneau
        panel.style.display = 'block';

        // Reset values
        resetPredictions();

        // Fetch predictions
        const response = await fetch(`/api/predictions/${symbol}?days=30`);
        if (!response.ok) {
            console.warn('[PREDICTIONS] API error', response.status);
            panel.style.display = 'none';
            return;
        }

        const data = await response.json();
        console.log('[PREDICTIONS] Data received', data);

        // Afficher les données
        displayPredictions(data);

    } catch (e) {
        console.error('[PREDICTIONS] Error loading predictions', e);
        const panel = document.getElementById('predictions-panel');
        if (panel) panel.style.display = 'none';
    }
}

// Reset all prediction values
function resetPredictions() {
    document.getElementById('pred-sma7').textContent = '--';
    document.getElementById('pred-sma30').textContent = '--';
    document.getElementById('pred-ema12').textContent = '--';
    document.getElementById('pred-ema26').textContent = '--';
    document.getElementById('pred-macd').textContent = '--';
    document.getElementById('pred-trend').textContent = '--';
    document.getElementById('pred-action').textContent = '--';
    document.getElementById('pred-confidence').textContent = '--';
}

// Afficher les prévisions
function displayPredictions(data) {
    const { predictions, recommendation } = data;

    if (!predictions || predictions.error) {
        console.warn('[PREDICTIONS] Insufficient data');
        return;
    }

    // Format currency
    const fmt = (val) => val ? `$${parseFloat(val).toFixed(2)}` : '--';

    // SMA values
    if (predictions.sma) {
        document.getElementById('pred-sma7').textContent = fmt(predictions.sma.sma7);
        document.getElementById('pred-sma30').textContent = fmt(predictions.sma.sma30);
    }

    // EMA values
    if (predictions.ema) {
        document.getElementById('pred-ema12').textContent = fmt(predictions.ema.ema12);
        document.getElementById('pred-ema26').textContent = fmt(predictions.ema.ema26);
    }

    // MACD
    if (predictions.macd !== null) {
        const macdEl = document.getElementById('pred-macd');
        macdEl.textContent = predictions.macd.toFixed(2);
        macdEl.className = 'badge-value ' + (predictions.macd > 0 ? 'bullish' : 'bearish');
    }

    // Trend
    if (predictions.trend) {
        const trendEl = document.getElementById('pred-trend');
        const trendText = {
            'bullish': '📈 Haussière',
            'bearish': '📉 Baissière',
            'neutral': '➡️ Neutre'
        };
        trendEl.textContent = trendText[predictions.trend] || predictions.trend;
        trendEl.className = 'badge-value trend ' + predictions.trend;
    }

    // Recommendation
    if (recommendation) {
        const actionEl = document.getElementById('pred-action');
        const confidenceEl = document.getElementById('pred-confidence');
        const recEl = document.getElementById('pred-recommendation');

        const actionText = {
            'buy': '🟢 ACHETER',
            'sell': '🔴 VENDRE',
            'hold': '🟡 CONSERVER'
        };

        actionEl.textContent = actionText[recommendation.action] || recommendation.action.toUpperCase();
        actionEl.className = 'recommendation-value ' + recommendation.action;

        confidenceEl.textContent = recommendation.confidence;
        confidenceEl.className = 'recommendation-confidence ' + recommendation.confidence;

        recEl.className = 'prediction-recommendation ' + recommendation.action;

        // Update note
        const noteEl = document.getElementById('pred-note');
        if (recommendation.reason) {
            noteEl.textContent = recommendation.reason;
        }
    }
}

// Exporter la fonction pour l'utiliser dans app.js
if (typeof window !== 'undefined') {
    window.loadPredictions = loadPredictions;
}
