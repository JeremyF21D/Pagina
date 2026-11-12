import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { normalizeWaPhone } from '../../utils/whatsapp';

export function FigmaAdviceBanner() {
  const { ownerSettings } = useInventory();

  const handleOpenConsult = () => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const msg = encodeURIComponent('¡Hola JF Auto Parts! 🚗 Tengo dudas sobre la compatibilidad de una pieza para mi vehículo y quisiera asesoría técnica con un especialista.');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#cfd4db] via-[#ebedf2] to-[#d6dae1] text-slate-900 p-5 sm:p-7 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-[#b8bcc6]">
      <div className="space-y-1 text-center md:text-left">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#de2420] uppercase tracking-wider">
          <i className="fa-solid fa-circle-question"></i>
          <span>Asistencia Automotriz Personalizada</span>
        </div>
        <h3 className="text-base sm:text-xl font-extrabold text-[#111317] tracking-tight">
          ¿Tienes dudas sobre compatibilidad para tu vehículo?
        </h3>
        <p className="text-xs text-slate-700 max-w-xl">
          Nuestros asesores técnicos te ayudan a validar el código OEM y compatibilidad exacta antes de realizar tu compra.
        </p>
      </div>

      <button
        type="button"
        onClick={handleOpenConsult}
        className="px-6 py-3 bg-[#de2420] hover:bg-[#c81e1a] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#de2420]/30 transition flex items-center gap-2 cursor-pointer shrink-0"
      >
        <i className="fa-brands fa-whatsapp text-base"></i>
        <span>Consultar Asesor</span>
      </button>
    </div>
  );
}
