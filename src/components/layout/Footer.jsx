import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { getEngineLabel } from '../../utils/formatters';
import { normalizeWaPhone } from '../../utils/whatsapp';
import logoImg from '../../assets/logo.png';

export function Footer() {
  const { dbEngine, coils, ownerSettings } = useInventory();
  const { isAdmin } = useAuth();

  const handleOpenWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings.ownerPhone);
    const text = encodeURIComponent('¡Hola! Me comunico desde JF Auto Parts para consultar disponibilidad de repuestos.');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-6 px-4 text-slate-400 text-xs mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="JF AUTO PARTS Logo"
            className="h-9 w-9 rounded-xl object-cover border border-slate-800 shadow shrink-0"
          />
          <div>
            <p className="text-white font-bold text-sm">JF Auto Parts &copy; {new Date().getFullYear()}</p>
            <p className="text-[11px] text-slate-500">Distribución de bobinas de encendido y repuestos automotrices directos de importación</p>
          </div>
        </div>

        {/* Right side info */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px]">
          {/* WhatsApp — clickable link */}
          <button
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            title="Abrir WhatsApp"
          >
            <i className="fa-brands fa-whatsapp text-sm"></i>
            <span className="underline underline-offset-2">WhatsApp: {ownerSettings.ownerPhone || '0412-6497478'}</span>
          </button>

          {/* DB engine info — SOLO ADMIN */}
          {isAdmin && (
            <>
              <span className="hidden sm:inline text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-slate-400 bg-slate-900 border border-slate-700/50 px-2.5 py-1 rounded-full">
                <i className="fa-solid fa-database text-sky-400 text-[10px]"></i>
                {getEngineLabel(dbEngine)} ({coils.length} bobinas)
              </span>
            </>
          )}

          <span className="hidden sm:inline text-slate-700">•</span>

          {/* Schedule */}
          <span className="text-slate-500">
            <i className="fa-solid fa-clock mr-1 text-amber-500/70"></i>
            Lun–Sáb: 8:00 AM – 6:00 PM
          </span>
        </div>
      </div>
    </footer>
  );
}
