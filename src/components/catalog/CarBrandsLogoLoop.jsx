import React from 'react';
import { LogoLoop } from '../animations/LogoLoop/LogoLoop';
import { CAR_BRAND_LOGOS } from '../../data/carBrandLogos';

export function CarBrandsLogoLoop() {
  const logoItems = CAR_BRAND_LOGOS.map((b) => ({
    id: b.id,
    title: b.name,
    node: (
      <div
        className="flex items-center gap-2.5 sm:gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 select-none cursor-default hover:border-red-500 hover:bg-rose-50/30 transition shadow-xs"
      >
        {/* Logo Vectorial SVG */}
        <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center shrink-0 text-slate-700">
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
          <span className="font-black text-xs sm:text-sm tracking-wider uppercase font-sans text-slate-900">
            {b.name}
          </span>
          <span className="text-[9px] font-mono text-red-600 font-semibold mt-1">
            {b.badge || 'Línea OEM'}
          </span>
        </div>
      </div>
    )
  }));

  return (
    <div className="w-full space-y-2 select-none animate-fadeIn">
      {/* Título Informativo */}
      <div className="flex items-center gap-2 px-1">
        <span className="w-2 h-2 rounded-full bg-red-600"></span>
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 font-sans">
          Marcas Compatibles & Líneas de Repuestos
        </span>
      </div>

      {/* Contenedor del LogoLoop en Blanco y Rojo */}
      <div className="relative rounded-3xl bg-white border border-slate-200 py-2.5 sm:py-3.5 shadow-xs overflow-hidden">
        <LogoLoop
          logos={logoItems}
          speed={45}
          direction="left"
          logoHeight={36}
          gap={20}
          pauseOnHover={true}
          scaleOnHover={false}
          fadeOut={true}
          fadeOutWidth={0.10}
          ariaLabel="Marcas automotrices compatibles"
        />
      </div>
    </div>
  );
}
