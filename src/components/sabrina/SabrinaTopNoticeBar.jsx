import React from 'react';
import { BadgeCheck, Truck, Sparkles, MessageSquare } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { useInventory } from '../../context/InventoryContext';
import { normalizeWaPhone } from '../../utils/whatsapp';

export function SabrinaTopNoticeBar({ onOpenRationale, onToggleViewMode, viewMode }) {
  const { binanceRate } = useCurrency();
  const { ownerSettings } = useInventory();

  const handleOpenWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const msg = encodeURIComponent('¡Hola JF Auto Parts! 🚗 Deseo consultar compatibilidad y disponibilidad de repuestos.');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="bg-white border-b border-slate-200/90 px-3 sm:px-4 py-2 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 shadow-xs">
      
      {/* Indicadores de Confianza Comercial */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] sm:text-xs">
        <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
          <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Repuestos Nuevos & Probados</span>
        </span>
        <span className="text-slate-300 hidden sm:inline">•</span>
        <span className="hidden sm:inline flex items-center gap-1.5 text-slate-600 font-medium">
          <Truck className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>Entrega Inmediata</span>
        </span>
        <span className="text-slate-300 hidden md:inline">•</span>
        <span className="hidden md:inline text-slate-600">
          Tasa de Cambio: <strong className="text-red-600 font-bold font-mono">Bs. {binanceRate?.toFixed(2) || '1,076.87'}</strong>
        </span>
      </div>

      {/* Enlaces de Acción Rápida */}
      <div className="flex items-center gap-3 sm:gap-4 text-xs ml-auto">
        <button
          onClick={handleOpenWhatsApp}
          className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition cursor-pointer text-[11px]"
          title="Consultar por WhatsApp a soporte en Maracaibo"
        >
          <MessageSquare className="w-3 h-3 text-emerald-600" />
          <span className="hidden sm:inline">Asesoría Directa</span>
        </button>

        <span className="text-slate-300 hidden sm:inline">|</span>

        <button 
          onClick={onOpenRationale}
          className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 transition cursor-pointer text-[11px]"
          title="Ver justificación técnica y psicología de diseño de Sabrina"
        >
          <Sparkles className="w-3 h-3 text-red-600" />
          <span>Diseño Sabrina</span>
        </button>
      </div>

    </div>
  );
}
