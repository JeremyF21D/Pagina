import React, { useState, useEffect } from 'react';
import { fetchLiveExchangeRates, getCachedExchangeRates, formatVES } from '../../services/exchangeRatesService';
import { useCurrency } from '../../context/CurrencyContext';
import { formatUSD } from '../../utils/formatters';

export function ExchangeRateLiveBanner({ initialAmount = 15 }) {
  const { rates: contextRates, refreshRates, isLoadingRates } = useCurrency();
  const rates = contextRates || getCachedExchangeRates() || {
    binance: 1076.87,
    binanceBuy: 1076.87,
    binanceSell: 1076.87,
    bcv: 914.02,
    spreadPct: 18.65,
    lastUpdated: 'Consultando...',
    source: 'Cargando API...'
  };

  const [isLoading, setIsLoading] = useState(false);
  const [calcAmount, setCalcAmount] = useState(initialAmount);
  const [copyStatus, setCopyStatus] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const loadRates = async () => {
    setIsLoading(true);
    try {
      if (refreshRates) {
        await refreshRates();
      } else {
        await fetchLiveExchangeRates();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
    const interval = setInterval(loadRates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const numAmount = parseFloat(calcAmount) || 0;
  const totalBinanceVES = numAmount * (rates.binance || 0);
  const totalBcvVES = numAmount * (rates.bcv || 0);
  const differenceVES = totalBinanceVES - totalBcvVES;

  const handleCopyQuote = () => {
    const quoteText = 
`⚡ *JF AUTO PARTS • COTIZACIÓN DE REPUESTOS*
💵 *Total:* ${formatUSD(numAmount)} USD
━━━━━━━━━━━━━━━━━━━━
📱 *Pago Móvil (Tasa Binance P2P ${formatVES(rates.binance)}):*
👉 *${formatVES(totalBinanceVES)}*

🏛️ *Pago Móvil (Tasa Oficial BCV ${formatVES(rates.bcv)}):*
👉 *${formatVES(totalBcvVES)}*
━━━━━━━━━━━━━━━━━━━━
⏰ *Actualizado:* ${rates.lastUpdated}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(quoteText);
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-fadeIn text-slate-800">
      
      {/* Encabezado con Indicador de Estado y Botón de Recarga */}
      <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center justify-center text-sm shadow-xs">
            <i className="fa-solid fa-coins"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>Monitor de Tasas en Vivo (Binance P2P & BCV)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Conexión API en vivo"></span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 hidden sm:inline">
                Venezuela (VES)
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              API en tiempo real: <span className="text-slate-700 font-mono">{rates.source}</span> • Actualizado: <span className="text-slate-700 font-mono">{rates.lastUpdated}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-xs ${
              isCalculatorOpen 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300'
            }`}
            title="Abrir u ocultar calculadora rápida para ventas y cotizaciones"
          >
            <i className={`fa-solid fa-calculator ${isCalculatorOpen ? 'text-slate-600' : 'text-red-600'}`}></i>
            <span>{isCalculatorOpen ? 'Ocultar Calculadora' : 'Calculadora de Cotizaciones'}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
              isCalculatorOpen ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-800'
            }`}>
              {isCalculatorOpen ? '▲' : '▼'}
            </span>
          </button>

          <button
            type="button"
            onClick={loadRates}
            disabled={isLoading}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm shadow-red-600/20"
            title="Consultar la API para obtener el precio más reciente"
          >
            <i className={`fa-solid fa-arrows-rotate text-white ${isLoading ? 'fa-spin' : ''}`}></i>
            <span>{isLoading ? 'Actualizando...' : 'Refrescar'}</span>
          </button>
        </div>
      </div>

      {/* Grid de Tasas: Binance P2P vs Dólar BCV */}
      <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* TARJETA 1: TASA BINANCE P2P */}
        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-3.5 relative overflow-hidden group hover:border-amber-400 transition shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <i className="fa-brands fa-bitcoin text-xs text-amber-600"></i>
              <span>Binance P2P (USDT)</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-white text-amber-700 border border-amber-200">
              Mercado Cripto
            </span>
          </div>

          {isLoading ? (
            <div className="h-8 w-44 rounded-lg skeleton-shimmer my-1"></div>
          ) : (
            <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono tracking-tight animate-fade-in">
              {formatVES(rates.binance)}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-2 border-t border-amber-200/60">
            <span>Compra: {formatVES(rates.binanceBuy)}</span>
            <span>Venta: {formatVES(rates.binanceSell)}</span>
          </div>
        </div>

        {/* TARJETA 2: TASA OFICIAL BCV */}
        <div className="bg-rose-50/50 border border-red-200 rounded-2xl p-3.5 relative overflow-hidden group hover:border-red-400 transition shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
              <i className="fa-solid fa-building-columns text-xs text-red-600"></i>
              <span>Dólar Oficial (BCV)</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-white text-red-700 border border-red-200">
              Banco Central
            </span>
          </div>

          {isLoading ? (
            <div className="h-8 w-40 rounded-lg skeleton-shimmer my-1"></div>
          ) : (
            <div className="text-xl sm:text-2xl font-black text-red-600 font-mono tracking-tight animate-fade-in">
              {formatVES(rates.bcv)}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-2 border-t border-red-200/60">
            <span>Tasa Oficial de Ley</span>
            <span className="text-emerald-700 font-semibold">Válida para Facturación</span>
          </div>
        </div>

        {/* TARJETA 3: BRECHA CAMBIARIA Y DIFERENCIAL */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <i className="fa-solid fa-scale-balanced text-xs"></i>
                <span>Brecha Cambiaria</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-red-100 text-red-700 border border-red-200">
                +{rates.spreadPct}%
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Diferencial Binance vs BCV por dólar:</p>
            <div className="text-sm sm:text-base font-black text-slate-900 font-mono mt-0.5">
              +{formatVES(rates.binance - rates.bcv)} / USD
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-200 truncate">
            Margen de cotización entre Oficial y Cripto
          </div>
        </div>

      </div>

      {/* CALCULADORA RÁPIDA DE CONVERSIÓN PARA VENTAS */}
      {isCalculatorOpen && (
        <div className="p-3.5 sm:p-4 bg-slate-50/80 border-t border-slate-200 space-y-3 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <i className="fa-solid fa-calculator text-red-600"></i>
                <span>Calculadora Rápida para Ventas & Pago Móvil:</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyQuote}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <i className={`fa-solid ${copyStatus ? 'fa-check text-emerald-700' : 'fa-copy'}`}></i>
                <span>{copyStatus ? '¡Copiado para WhatsApp!' : 'Copiar Cotización WhatsApp'}</span>
              </button>
            </div>
          </div>

          {/* Fila de cálculo interactivo */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 font-semibold block mb-1">
                Monto de la Venta (USD $)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 font-mono text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="15.00"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-6 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>
            </div>

            <div className="bg-white border border-amber-300 rounded-xl p-2.5 flex flex-col justify-center shadow-xs">
              <span className="text-[10px] text-amber-700 font-semibold uppercase block">
                Total a Tasa Binance P2P
              </span>
              <span className="text-sm sm:text-base font-black text-amber-600 font-mono truncate">
                {formatVES(totalBinanceVES)}
              </span>
            </div>

            <div className="bg-white border border-red-300 rounded-xl p-2.5 flex flex-col justify-center shadow-xs">
              <span className="text-[10px] text-red-700 font-semibold uppercase block">
                Total a Tasa Oficial BCV
              </span>
              <span className="text-sm sm:text-base font-black text-red-600 font-mono truncate">
                {formatVES(totalBcvVES)}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center shadow-xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                Diferencia Cambiaria
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono truncate">
                {formatVES(differenceVES)}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
