import React from 'react';

export function FigmaPaymentMethods() {
  const methods = [
    { name: 'Pago Móvil', sub: 'Banesco / Mercantil / BDV', icon: 'fa-solid fa-mobile-screen', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { name: 'Binance Pay', sub: 'USDT al instante', icon: 'fa-brands fa-bitcoin', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
    { name: 'Zelle', sub: 'Cuentas verificadas', icon: 'fa-solid fa-building-columns', color: 'text-purple-300 bg-purple-500/10 border-purple-500/30' },
    { name: 'Efectivo', sub: 'Dólares y Bolívares', icon: 'fa-solid fa-money-bill-wave', color: 'text-sky-300 bg-sky-500/10 border-sky-500/30' }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
          Métodos de Pago Instantáneos
        </h4>
        <span className="text-[10px] text-slate-400 hidden sm:inline">• Coordinación segura por WhatsApp</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {methods.map(m => (
          <div
            key={m.name}
            className={`p-2.5 rounded-xl border flex items-center gap-2.5 shadow-xs transition hover:scale-102 ${m.color}`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800">
              <i className={`${m.icon} text-sm`}></i>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">{m.name}</span>
              <span className="text-[10px] text-slate-400 block truncate">{m.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
