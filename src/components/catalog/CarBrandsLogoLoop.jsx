import React from 'react';
import { LogoLoop } from '../animations/LogoLoop/LogoLoop';
import { CAR_BRAND_LOGOS } from '../../data/carBrandLogos';

export function CarBrandsLogoLoop({ selectedBrand = 'ALL', onSelectBrand, onScrollToCatalog }) {
  const handleBrandClick = (brandName) => {
    if (typeof onSelectBrand === 'function') {
      // Si ya está seleccionada la misma marca, deseleccionar a 'ALL', si no, seleccionar esa marca
      onSelectBrand(selectedBrand === brandName ? 'ALL' : brandName);
    }
    if (typeof onScrollToCatalog === 'function') {
      onScrollToCatalog();
    }
  };

  const logoItems = CAR_BRAND_LOGOS.map((b) => {
    const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();

    return {
      id: b.id,
      title: b.name,
      hoverColor: b.color || '#de2420',
      node: (
        <div
          onClick={() => handleBrandClick(b.name)}
          className={`group flex items-center gap-2.5 sm:gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all duration-300 cursor-pointer select-none ${
            isSelected
              ? 'bg-[#de2420]/20 border-[#de2420] text-white shadow-lg shadow-[#de2420]/30 scale-105 ring-1 ring-[#de2420]'
              : 'bg-[#141518]/90 hover:bg-[#1f2026] border-[#2d2f35] hover:border-slate-500 text-slate-300 hover:text-white hover:scale-105'
          }`}
          title={`Ver todos los repuestos para ${b.name}`}
        >
          {/* Logo Vectorial SVG */}
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
              isSelected ? 'text-[#de2420]' : 'text-slate-200 group-hover:text-white'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-full h-full fill-current"
              role="img"
              aria-label={b.name}
            >
              <path d={b.path} />
            </svg>
          </div>

          {/* Nombre & Subtítulo de Línea */}
          <div className="flex flex-col text-left leading-none">
            <span className="font-black text-xs sm:text-sm tracking-wider uppercase font-sans text-white flex items-center gap-1">
              <span>{b.name}</span>
              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#de2420] inline-block animate-pulse"></span>
              )}
            </span>
            <span className="text-[9px] font-mono text-slate-400 mt-1">
              {b.badge || 'Línea OEM'}
            </span>
          </div>
        </div>
      )
    };
  });

  return (
    <div className="w-full space-y-2 select-none">
      {/* Título & Indicador de Interacción */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#de2420] animate-pulse"></span>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300 font-sans">
            Marcas Compatibles & Líneas de Repuestos
          </span>
          <span className="text-slate-600 text-xs hidden sm:inline">•</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Haz clic en cualquier marca para filtrar el catálogo
          </span>
        </div>

        {selectedBrand !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectBrand && onSelectBrand('ALL')}
            className="text-[10px] text-rose-400 hover:text-rose-300 font-mono font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <span>Mostrar todas ({selectedBrand})</span>
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        )}
      </div>

      {/* Contenedor del LogoLoop de React Bits con Fade Out en bordes */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#141518]/95 via-[#1c1d22]/95 to-[#141518]/95 border border-[#2d2f35] py-2.5 sm:py-3 shadow-xl overflow-hidden">
        <LogoLoop
          logos={logoItems}
          speed={45} // Velocidad fluida y elegante
          direction="left"
          logoHeight={36}
          gap={20}
          pauseOnHover={true}
          scaleOnHover={false} // Ya manejamos scale en la tarjeta interna
          fadeOut={true}
          fadeOutWidth={0.10} // Fade suave en ambos extremos
          ariaLabel="Logos de marcas automotrices compatibles"
        />
      </div>
    </div>
  );
}
