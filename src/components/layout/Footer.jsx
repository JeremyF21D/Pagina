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
                src={logoImg}
                alt="JF AUTO PARTS Logo"
                className="h-10 w-10 rounded-xl object-cover border border-slate-800 shadow-md shrink-0"
              />
              <span className="text-base font-black text-white font-sans tracking-tight">
                <span className="text-red-500">JF</span> AUTO PARTS
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
                <span>Bobinas de Encendido (COP)</span>
              </li>
              <li className="hover:text-red-400 transition cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-red-500"></i>
                <span>Inyectores de Gasolina MPFI</span>
              </li>
              <li className="hover:text-red-400 transition cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-red-500"></i>
                <span>Conectores y Ramales Eléctricos</span>
              </li>
              <li className="hover:text-red-400 transition cursor-pointer flex items-center gap-2">
                <i className="fa-solid fa-angle-right text-[10px] text-red-500"></i>
                <span>Estoperas y Retenes de Motor</span>
              </li>
            </ul>
          </div>

          {/* Columna 3: Atención y Envíos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Atención & Despachos
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-truck-fast text-red-500 text-xs mt-0.5"></i>
                <span>Envíos cobro en destino a nivel nacional (MRW, Zoom, Tealca)</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-shield-halved text-emerald-400 text-xs mt-0.5"></i>
                <span>Garantía de 12 meses contra defectos de fábrica</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-clock text-amber-400 text-xs mt-0.5"></i>
                <span>Horario: Lunes a Sábado, 8:00 AM – 6:00 PM</span>
              </div>
            </div>
          </div>

          {/* Columna 4: Contacto Directo WhatsApp */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Contacto Directo
            </h4>
            <p className="text-xs text-slate-400">
              ¿Requieres validar stock o compatibilidad de una pieza? Escríbenos directamente:
            </p>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-brands fa-whatsapp text-base"></i>
              <span>{ownerSettings?.ownerPhone || '0412-6497478'}</span>
            </button>
            {isAdmin && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                <i className="fa-solid fa-database text-sky-400"></i>
                <span>{getEngineLabel(dbEngine)} ({coils.length} repuestos)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Action Pill (Bottom Right) */}
      <button
        type="button"
        onClick={handleOpenWhatsApp}
        className="fixed bottom-5 right-5 z-40 bg-emerald-500 hover:bg-emerald-400 text-white p-3.5 rounded-full shadow-2xl shadow-emerald-600/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
        title="Contactar asesor en WhatsApp"
      >
        <i className="fa-brands fa-whatsapp text-2xl group-hover:rotate-12 transition-transform"></i>
      </button>
    </footer>
  );
}
