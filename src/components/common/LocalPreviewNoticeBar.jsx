import React, { useState } from 'react';
import { useCurrency } from '../../context/CurrencyContext';

export function LocalPreviewNoticeBar() {
  const [dismissed, setDismissed] = useState(false);
  const { currency, setCurrency, rates } = useCurrency();

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-600 via-brand-600 to-indigo-600 text-white px-3 py-1.5 text-xs border-b border-amber-400/40 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono font-black border border-white/30 tracking-wider">
            🧪 ENTORNO LOCAL DE PRUEBAS
          </span>
          <span className="text-[11px] font-medium hidden sm:inline">
            Probando mejoras de la auditoría (Precios Bimoneda, Cuadre Diario de Caja, Recibos PDF y Edición Rápida). Producción en Vercel está 100% intacta.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/20 text-[11px]">
            <span className="px-1.5 text-[10px] text-amber-200 font-bold hidden xs:inline">Moneda:</span>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-2 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                currency === 'USD' ? 'bg-white text-slate-900 shadow' : 'text-white/80 hover:text-white'
              }`}
            >
              USD $
            </button>
            <button
              type="button"
              onClick={() => setCurrency('VES_BINANCE')}
              className={`px-2 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                currency === 'VES_BINANCE' ? 'bg-amber-400 text-slate-900 shadow' : 'text-white/80 hover:text-white'
              }`}
              title={`Tasa Binance: Bs. ${rates.binance}`}
            >
              Bs Binance
            </button>
            <button
              type="button"
              onClick={() => setCurrency('VES_BCV')}
              className={`px-2 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                currency === 'VES_BCV' ? 'bg-sky-400 text-slate-900 shadow' : 'text-white/80 hover:text-white'
              }`}
              title={`Tasa BCV: Bs. ${rates.bcv}`}
            >
              Bs BCV
            </button>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-white/70 hover:text-white text-xs p-1"
            title="Ocultar aviso de prueba"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
