/**
 * Servicio de Tasas de Cambio para Venezuela (Binance P2P & BCV Oficial)
 * Consume endpoints públicos con CORS habilitado y fallback automático.
 */

const STORAGE_KEY_RATES = 'JF_EXCHANGE_RATES_CACHE';

// Formateador estándar de Bolívares (VES)
export function formatVES(amount) {
  const num = Number(amount || 0);
  return `Bs. ${num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Obtener tasas cacheadas localmente para carga inmediata
export function getCachedExchangeRates() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATES);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Guardar tasas en caché
function setCachedExchangeRates(data) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(data));
  } catch (e) {}
}

/**
 * Consulta las tasas de cambio de Binance P2P y BCV
 * Prioridad 1: https://www.usdt.com.ve/api/v1/rates/current (Binance + BCV en una llamada)
 * Prioridad 2: https://ve.dolarapi.com/v1/dolares (DolarAPI Oficial BCV + Paralelo)
 */
export async function fetchLiveExchangeRates() {
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateFormatted = now.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // 1. Intento primario: usdt.com.ve
  try {
    const res = await fetch('https://www.usdt.com.ve/api/v1/rates/current', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        const binanceBuy = Number(json.data.binance?.buy_rate || 0);
        const binanceSell = Number(json.data.binance?.sell_rate || 0);
        const binanceAvg = binanceBuy && binanceSell ? (binanceBuy + binanceSell) / 2 : (binanceBuy || binanceSell || 0);
        const bcvRate = Number(json.data.bcv?.rate || 0);
        const spread = Number(json.data.brecha_pct || (bcvRate && binanceAvg ? ((binanceAvg - bcvRate) / bcvRate) * 100 : 0));

        const result = {
          success: true,
          binance: binanceAvg,
          binanceBuy,
          binanceSell,
          bcv: bcvRate,
          spreadPct: Number(spread.toFixed(2)),
          lastUpdated: `${dateFormatted} ${timeFormatted}`,
          source: 'usdt.com.ve (Binance P2P & BCV Oficial)'
        };

        setCachedExchangeRates(result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Fallo primario al consultar usdt.com.ve, probando endpoint alternativo dolarapi...', err);
  }

  // 2. Intento secundario de respaldo: ve.dolarapi.com
  try {
    const res2 = await fetch('https://ve.dolarapi.com/v1/dolares', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (res2.ok) {
      const list = await res2.json();
      if (Array.isArray(list)) {
        const oficial = list.find(item => item.fuente === 'oficial' || item.nombre?.toLowerCase().includes('oficial'));
        const paralelo = list.find(item => item.fuente === 'paralelo' || item.nombre?.toLowerCase().includes('paralelo'));

        const bcvRate = Number(oficial?.promedio || 0);
        const binanceRate = Number(paralelo?.promedio || 0);
        const spread = bcvRate && binanceRate ? ((binanceRate - bcvRate) / bcvRate) * 100 : 0;

        const result = {
          success: true,
          binance: binanceRate,
          binanceBuy: binanceRate,
          binanceSell: binanceRate,
          bcv: bcvRate,
          spreadPct: Number(spread.toFixed(2)),
          lastUpdated: `${dateFormatted} ${timeFormatted}`,
          source: 've.dolarapi.com (BCV & Mercado Paralelo/Binance)'
        };

        setCachedExchangeRates(result);
        return result;
      }
    }
  } catch (err2) {
    console.warn('Fallo secundario al consultar dolarapi:', err2);
  }

  // 3. Fallback a datos en caché
  const cached = getCachedExchangeRates();
  if (cached) {
    return {
      ...cached,
      isCached: true,
      source: `${cached.source} (Caché local)`
    };
  }

  // 4. Fallback por defecto si no hay conexión
  return {
    success: false,
    binance: 1060.00,
    binanceBuy: 1060.00,
    binanceSell: 1060.00,
    bcv: 899.00,
    spreadPct: 17.90,
    lastUpdated: `${dateFormatted} ${timeFormatted} (Referencial)`,
    source: 'Valores referenciales offline'
  };
}
