import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { getEngineLabel } from '../../utils/formatters';
import { normalizeWaPhone } from '../../utils/whatsapp';

export function TopNoticeBar() {
  const { dbEngine, coils, ownerSettings } = useInventory();
  const { isAdmin } = useAuth();

  const handleOpenWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings.ownerPhone);
    const text = encodeURIComponent('¡Hola! Me comunico desde JF Auto Parts para consultar disponibilidad de repuestos.');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <aside aria-label="Aviso comercial" className="bg-[#050608] border-b border-white/10 text-[11px] py-1 px-4 text-center font-medium flex flex-wrap items-center justify-center gap-2 text-slate-300">
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
      </span>

      <span>
        ⚡ <strong className="text-white">Despachos Inmediatos a Todo el País</strong> | Asesoría técnica directa por{' '}
        <button 
          onClick={handleOpenWhatsApp}
          className="text-emerald-400 hover:text-emerald-300 font-bold transition cursor-pointer inline-flex items-center gap-1 ml-0.5 underline decoration-emerald-500/40"
          title="Abrir chat en WhatsApp"
        >
          <i className="fa-brands fa-whatsapp text-xs"></i>
          <span>WhatsApp</span>
        </button>
      </span>

      {/* Only show DB & Admin Status when user is logged in as Admin */}
      {isAdmin && (
        <>
          <span className="hidden md:inline-flex items-center gap-1.5 bg-white/5 px-2 py-0.2 rounded-full text-[10px] text-slate-300 border border-white/10">
            <i className="fa-solid fa-database text-[10px] text-emerald-400"></i>
            <span>DB: {getEngineLabel(dbEngine)} ({coils.length} items)</span>
          </span>

          <span className="inline-flex items-center gap-1.5 bg-emerald-950/40 px-2 py-0.2 rounded-full text-[10px] text-emerald-300 border border-emerald-500/30">
            <i className="fa-solid fa-unlock-keyhole text-emerald-400 text-[10px]"></i>
            <span>🔐 Administrador Activo</span>
          </span>
        </>
      )}
    </aside>
  );
}
