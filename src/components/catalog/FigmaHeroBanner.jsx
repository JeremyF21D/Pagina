import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { normalizeWaPhone } from '../../utils/whatsapp';
import studioPartImg from '../../assets/bobina_tiida_studio.jpg';

export function FigmaHeroBanner({ onScrollToCatalog }) {
  const { ownerSettings } = useInventory();

  const handleOpenWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const msg = encodeURIComponent('¡Hola JF Auto Parts! 🚗 Deseo solicitar cotización y consultar disponibilidad de repuestos.');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl p-5 sm:p-8 lg:p-10 mb-6">
      {/* Background Glow Accents */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Content (Figma Typography & Buttons) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Repuestos Automotrices</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight uppercase font-sans">
            REPUESTOS AUTOMOTRICES, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400">
              BOBINA, Y MÁS...
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Encuentra repuestos automotrices de alta calidad con envíos a nivel nacional, garantía certificada y asesoría técnica personalizada para tu vehículo.
          </p>

          {/* Action Buttons (Figma Style: Red Solid + Green WhatsApp) */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onScrollToCatalog}
              className="px-5 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-bolt"></i>
              <span>Solicitar Cotización</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2.5 sm:px-6 sm:py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-brands fa-whatsapp text-base"></i>
              <span>Contactar por WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Right Content: Isolated High-Quality Part Photo (Figma Layout) */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="relative w-full max-w-xs sm:max-w-sm rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-4 border border-slate-700/80 shadow-2xl flex items-center justify-center backdrop-blur-xs group">
            <img
              src={studioPartImg}
              alt="Repuesto Automotriz JF Auto Parts"
              className="max-h-48 sm:max-h-60 w-auto object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
            />
            <span className="absolute bottom-3 right-3 text-[10px] font-mono font-bold bg-slate-950/85 text-red-400 border border-slate-700/80 px-2 py-0.5 rounded-lg shadow-md">
              OEM Certified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
