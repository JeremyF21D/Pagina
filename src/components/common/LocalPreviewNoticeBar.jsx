import React, { useState } from 'react';

export function LocalPreviewNoticeBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-600 via-brand-600 to-indigo-600 text-white px-3 py-1.5 text-xs border-b border-amber-400/40 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono font-black border border-white/30 tracking-wider">
            🧪 ENTORNO LOCAL DE PRUEBAS
          </span>
          <span className="text-[11px] font-medium hidden sm:inline">
            Probando mejoras de la auditoría (Métodos de Pago en Carrito, Precios en USD, Cuadre Diario de Caja, Recibos PDF y Edición Rápida). Producción en Vercel está 100% intacta.
          </span>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white text-xs p-1 cursor-pointer"
          title="Ocultar aviso de prueba"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  );
}
