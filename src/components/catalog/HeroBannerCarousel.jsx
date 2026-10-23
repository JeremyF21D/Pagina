import React, { useState, useEffect, useRef } from 'react';
import nissanBannerImg from '../../assets/banner_nissan_lineup.jpg';
import engineBannerImg from '../../assets/banner_engine_parts.jpg';
import fleetBannerImg from '../../assets/banner_multibrand_fleet.jpg';
import logoImg from '../../assets/logo.png';

const SLIDES = [
  {
    id: 'nissan-lineup',
    badge: 'Línea Nissan 2007',
    tagline: 'Nissan 2007: Almera • Tiida • X-Trail',
    image: nissanBannerImg,
    alt: 'Línea Nissan Año 2007: Almera, Tiida y X-Trail'
  },
  {
    id: 'engine-parts',
    badge: 'Encendido & Inyección de Alta Precisión',
    tagline: 'Bobinas de Alto Rendimiento, Bujías & Inyectores',
    image: engineBannerImg,
    alt: 'Bobinas de encendido de alto rendimiento e inyectores'
  },
  {
    id: 'fleet-brands',
    badge: 'Flota Multimarca Nacional',
    tagline: 'Chevrolet • Toyota • Ford • Nissan • Hyundai',
    image: fleetBannerImg,
    alt: 'Repuestos para Chevrolet, Toyota, Ford y Nissan'
  }
];

export function HeroBannerCarousel({ onNavigateTab, onOpenCart, isAdmin }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Transición 100% automática cada 5 segundos
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, 5000);

    return () => clearInterval(timerRef.current);
  }, [isPaused]);

  return (
    <div 
      className="relative overflow-hidden rounded-2xl border border-slate-700/80 shadow-2xl min-h-[350px] sm:min-h-[380px] flex flex-col justify-between transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Background Carousel Image Slides (Con brillo completo para ver claramente los autos) */}
      <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
        {SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className="w-full h-full object-cover object-right sm:object-center filter brightness-100 contrast-[1.02]"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}

        {/* Degradado direccional SOLO detrás del texto izquierdo. El centro y derecha quedan 100% despejados y brillantes para los autos */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-transparent w-full md:w-[62%] z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/30 z-10 pointer-events-none" />
      </div>

      {/* 2. Contenido Frontal */}
      <div className="relative z-20 p-4 sm:p-8 flex-1 flex flex-col justify-center max-w-2xl space-y-3 sm:space-y-3.5">
        
        {/* Ribbon de Insignias y Logo */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Logo JF Auto Parts Integrado */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-slate-700/80 text-[11px] sm:text-xs text-white backdrop-blur-md shadow-sm">
            <img 
              src={logoImg} 
              alt="Logo JF Auto Parts" 
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-slate-600" 
            />
            <span className="font-bold tracking-tight">JF Auto Parts</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/25 border border-brand-500/50 text-brand-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-xs">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Stock Conectado</span>
          </div>

          {/* Insignia dinámica del slide activo */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 border border-slate-700/80 text-slate-200 text-[11px] sm:text-xs font-medium backdrop-blur-md">
            <i className="fa-solid fa-car text-brand-400 text-[10px]"></i>
            <span>{SLIDES[currentSlide].tagline}</span>
          </div>

          {/* Botón rápido Admin */}
          {isAdmin && (
            <button 
              onClick={() => onNavigateTab('database')} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/25 hover:bg-sky-500/40 border border-sky-500/50 text-sky-200 text-[11px] sm:text-xs font-semibold transition cursor-pointer backdrop-blur-md"
            >
              <i className="fa-solid fa-server text-[10px]"></i>
              <span>Gestión DB</span>
            </button>
          )}
        </div>

        {/* Título Principal */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg leading-tight">
          Repuestos Automotrices & Bobinas <span className="text-brand-500 drop-shadow-md">Originales & OEM</span>
        </h1>

        {/* Subtítulo Comercial */}
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed drop-shadow max-w-xl">
          Especialistas en <strong>Nissan Año 2007 (Almera, Tiida, X-Trail)</strong>, Chevrolet, Toyota, Ford, Hyundai y Renault. Bobinas, inyectores, estoperas, bujías y sensores con garantía comprobada y envíos inmediatos.
        </p>

        {/* Botones de Acción */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button 
            onClick={onOpenCart} 
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-brand-500/30 transition cursor-pointer active:scale-95"
          >
            <i className="fa-solid fa-cart-shopping"></i> Ver Mi Carrito y Comprar
          </button>

          <a 
            href="https://wa.me/584126497478?text=Hola,%20deseo%20consultar%20disponibilidad%20de%20repuestos."
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md transition cursor-pointer shadow-lg active:scale-95"
          >
            <i className="fa-brands fa-whatsapp text-base text-emerald-400"></i>
            <span>Consultar Asesor WhatsApp →</span>
          </a>

          {isAdmin && (
            <button 
              onClick={() => onNavigateTab('database')} 
              className="px-3.5 py-2.5 bg-slate-900/85 hover:bg-slate-800 text-rose-300 font-semibold rounded-xl text-xs sm:text-sm border border-rose-500/40 flex items-center gap-2 transition cursor-pointer backdrop-blur-md"
            >
              <i className="fa-solid fa-sliders text-rose-400"></i> Almacén (Admin)
            </button>
          )}
        </div>
      </div>

      {/* 3. Indicador de Puntos (Dots) Automáticos */}
      <div className="relative z-20 pb-3.5 px-6 flex items-center justify-center gap-2">
        {SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentSlide(index)}
              aria-label={`Ir al banner ${index + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                isActive 
                  ? 'w-8 h-2 bg-brand-500 shadow-md shadow-brand-500/60' 
                  : 'w-2.5 h-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
