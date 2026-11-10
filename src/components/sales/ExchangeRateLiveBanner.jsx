import React, { useState, useEffect } from 'react';
import { fetchLiveExchangeRates, getCachedExchangeRates, formatVES } from '../../services/exchangeRatesService';
import { formatUSD } from '../../utils/formatters';

export function ExchangeRateLiveBanner({ initialAmount = 15 }) {
  const [rates, setRates] = useState(() => getCachedExchangeRates() || {
    binance: 1067.45,
    binanceBuy: 1067.45,
    binanceSell: 1068.05,
    bcv: 899.27,
    spreadPct: 18.65,
    lastUpdated: 'Consultando...',
    source: 'Cargando API...'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [calcAmount, setCalcAmount] = useState(initialAmount);
  const [copyStatus, setCopyStatus] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(true);

  const loadRates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLiveExchangeRates();
      if (data) {
        setRates(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
    // Auto-refrescar cada 5 minutos
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
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
      
      {/* Encabezado con Indicador de Estado y Botón de Recarga */}
      <div className="p-3.5 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-sm shadow-sm">
            <i className="fa-solid fa-coins"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Monitor de Tasas en Vivo</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Conexión API en vivo"></span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hidden sm:inline">
                Venezuela (VES)
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              API en tiempo real: <span className="text-slate-300 font-mono">{rates.source}</span> • Actualizado: <span className="text-slate-300 font-mono">{rates.lastUpdated}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Alternar calculadora de ventas"
          >
            <i className="fa-solid fa-calculator text-cyan-400"></i>
            <span className="hidden xs:inline">{isCalculatorOpen ? 'Ocultar Calculadora' : 'Calculadora'}</span>
          </button>

          <button
            type="button"
            onClick={loadRates}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Consultar la API para obtener el precio más reciente"
          >
            <i className={`fa-solid fa-arrows-rotate text-amber-400 ${isLoading ? 'fa-spin' : ''}`}></i>
            <span>{isLoading ? 'Actualizando...' : 'Refrescar'}</span>
          </button>
        </div>
      </div>

      {/* Grid de Tasas: Binance P2P vs Dólar BCV */}
      <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* TARJETA 1: TASA BINANCE P2P */}
        <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-3.5 relative overflow-hidden group hover:border-amber-500/60 transition shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <i className="fa-brands fa-bitcoin text-xs"></i>
              <span>Binance P2P (USDT)</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Mercado Cripto
            </span>
          </div>

          {isLoading ? (
            <div className="h-8 w-44 rounded-lg skeleton-shimmer my-1"></div>
          ) : (
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight animate-fade-in">
              {formatVES(rates.binance)}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <span>Compra: {formatVES(rates.binanceBuy)}</span>
            <span>Venta: {formatVES(rates.binanceSell)}</span>
          </div>
        </div>

        {/* TARJETA 2: TASA OFICIAL BCV */}
        <div className="bg-slate-950/70 border border-sky-500/30 rounded-xl p-3.5 relative overflow-hidden group hover:border-sky-500/60 transition shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <i className="fa-solid fa-building-columns text-xs"></i>
              <span>Dólar Oficial (BCV)</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Banco Central
            </span>
          </div>

          {isLoading ? (
            <div className="h-8 w-40 rounded-lg skeleton-shimmer my-1"></div>
          ) : (
            <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono tracking-tight animate-fade-in">
              {formatVES(rates.bcv)}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <span>Tasa Oficial de Ley</span>
            <span className="text-emerald-400 font-semibold">Válida para Facturación</span>
          </div>
        </div>

        {/* TARJETA 3: BRECHA CAMBIARIA Y DIFERENCIAL */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <i className="fa-solid fa-chart-line text-xs"></i>
              <span>Brecha Cambiaria</span>
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              Diferencia
            </span>
          </div>

          {isLoading ? (
            <div className="h-8 w-32 rounded-lg skeleton-shimmer my-1"></div>
          ) : (
            <div className="flex items-baseline gap-2 animate-fade-in">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                +{rates.spreadPct}%
              </span>
              <span className="text-[11px] font-mono text-amber-400">
                ({formatVES((rates.binance || 0) - (rates.bcv || 0))})
              </span>
            </div>
          )}

          <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80 truncate">
            Margen de cotización entre Oficial y Cripto
          </div>
        </div>

      </div>

      {/* CALCULADORA RÁPIDA DE CONVERSIÓN PARA VENTAS */}
      {isCalculatorOpen && (
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800/80 space-y-3 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <i className="fa-solid fa-calculator text-cyan-400"></i>
                <span>Calculadora Rápida para Ventas & Pago Móvil:</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyQuote}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <i className={`fa-solid ${copyStatus ? 'fa-check text-white' : 'fa-copy'}`}></i>
                <span>{copyStatus ? '¡Copiado para WhatsApp!' : 'Copiar Cotización WhatsApp'}</span>
              </button>
            </div>
          </div>

          {/* Fila de cálculo interactivo */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                Monto de la Venta (USD $)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-500 font-mono text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="15.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[10px] text-amber-300 font-semibold uppercase block">
                Total a Tasa Binance P2P
              </span>
              <span className="text-sm sm:text-base font-black text-amber-400 font-mono truncate">
                {formatVES(totalBinanceVES)}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[10px] text-sky-300 font-semibold uppercase block">
                Total a Tasa Oficial BCV
              </span>
              <span className="text-sm sm:text-base font-black text-sky-400 font-mono truncate">
                {formatVES(totalBcvVES)}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Diferencia Cambiaria
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-200 font-mono truncate">
                {formatVES(differenceVES)}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
