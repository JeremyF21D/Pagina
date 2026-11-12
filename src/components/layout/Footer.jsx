import React from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { getEngineLabel } from '../../utils/formatters';
import { normalizeWaPhone } from '../../utils/whatsapp';
import jfEmblem from '../../assets/jf_emblem_clean.png';

export function Footer() {
  const { dbEngine, coils, ownerSettings } = useInventory();
  const { isAdmin } = useAuth();

  const handleOpenWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const text = encodeURIComponent('¡Hola JF Auto Parts! Me comunico desde la plataforma web para consultar repuestos y pedidos.');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs mt-12">
      {/* 4 Column Layout (Figma Footer Style) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Columna 1: Brand & Bio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src={jfEmblem}
                alt="JF AUTO PARTS"
                className="h-8 w-auto object-contain shrink-0"
              />
              <span className="text-base font-black text-white font-sans tracking-tight">
                <span className="text-red-500 font-black">JF</span> <span className="font-bold">AUTO PARTS</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Distribución y venta directa de bobinas de encendido, inyectores, conectores y repuestos automotrices garantizados con despachos a toda Venezuela.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              &copy; {new Date().getFullYear()} JF Auto Parts. Todos los derechos reservados.
            </p>
          </div>

          {/* Columna 2: Categorías Principales */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Repuestos & Categorías
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-red-400 transition cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-red-500"></i>
                <span>Bobinas de Encendido Secas & Lápiz</span>
              </li>
              <li className="hover:text-red-400 transition cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-red-500"></i>
                <span>Inyectores de Gasolina Multipunto</span>
              </li>
              <li className="hover:text-red-400 transition cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-red-500"></i>
                <span>Conectores Eléctricos Automotrices</span>
              </li>
              <li className="hover:text-red-400 transition cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-red-500"></i>
                <span>Estoperas & Empacaduras de Motor</span>
              </li>
            </ul>
          </div>

          {/* Columna 3: Información de Contacto y Envíos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Atención & Envíos
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-300">
                <i className="fa-solid fa-location-dot text-red-500 text-xs"></i>
                <span>Caracas / Envíos Nacionales</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <i className="fa-solid fa-truck-fast text-red-500 text-xs"></i>
                <span>MRW, Tealca, Zoom y Domesa</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <i className="fa-brands fa-whatsapp text-emerald-400 text-sm"></i>
                <span>Atención inmediata vía WhatsApp</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <i className="fa-solid fa-clock text-red-500 text-xs"></i>
                <span>Lunes a Sábado: 8:00 AM - 6:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Garantía y Seguridad */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Garantía & Confianza
            </h4>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <i className="fa-solid fa-shield-halved text-red-500"></i>
                <span>100% Repuestos Probados</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Verificamos la impedancia y funcionamiento de cada bobina antes del despacho.
              </p>
            </div>
            {isAdmin && (
              <div className="pt-1 text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono">
                <i className="fa-solid fa-database text-[10px]"></i>
                <span>Motor: {getEngineLabel(dbEngine)} ({coils.length} ítems en catálogo)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Action Pill (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={handleOpenWhatsApp}
          className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-full shadow-2xl shadow-emerald-600/40 border border-emerald-400/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Hablar con un asesor por WhatsApp"
        >
          <i className="fa-brands fa-whatsapp text-2xl"></i>
          <span className="hidden sm:inline text-xs font-extrabold uppercase tracking-wider">
            ¿Dudas? Escríbenos
          </span>
        </button>
      </div>
    </footer>
  );
}
