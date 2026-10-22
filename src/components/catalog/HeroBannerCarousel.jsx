import React, { useState, useEffect, useRef } from 'react';
import nissanBannerImg from '../../assets/banner_nissan_lineup.jpg';
import logoImg from '../../assets/logo.png';

const SLIDES = [
  {
    id: 'nissan-lineup',
    badge: 'Línea Especializada Nissan',
    tagline: 'Nissan Almera • Nissan Tiida • Nissan X-Trail',
    image: nissanBannerImg,
    alt: 'Línea de vehículos Nissan Almera, Tiida y X-Trail'
  },
  {
    id: 'engine-parts',
    badge: 'Sistemas de Encendido & Inyección',
    tagline: 'Bobinas de Alto Rendimiento, Bujías & Inyectores',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1920&q=80',
    alt: 'Motor de alto rendimiento y repuestos automotrices de precisión'
  },
  {
    id: 'fleet-brands',
    badge: 'Catálogo Multimarca Nacional',
    tagline: 'Chevrolet • Toyota • Ford • Nissan • Hyundai • Renault',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80',
    alt: 'Vehículos multimarca y repuestos originales con garantía'
  }
];

export function HeroBannerCarousel({ onNavigateTab, onOpenCart, isAdmin }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Auto-play interval: cycles every 5.5 seconds
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % SLIDES.length);
    }, 5500);

    return () => clearInterval(timerRef.current);
  }, [isPaused]);

  const handleNext = () => {
    setCurrentSlide(prev => (prev + 1) % SLIDES.length);
  };

  const handlePrev = () => {
    setCurrentSlide(prev => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  return (
    <div 
      className="relative overflow-hidden rounded-2xl border border-slate-700/80 shadow-2xl group transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Background Carousel Image Slides */}
      <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
        {SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
              style={{ transitionProperty: 'opacity, transform' }}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className="w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.1]"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}

        {/* Cinematic Gradient Overlays to guarantee 100% text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/50 z-10" />
        <div className="absolute inset-0 bg-radial-vignette opacity-70 z-10" />
      </div>

      {/* 2. Interactive Navigation Arrows (appear on hover) */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Imagen anterior"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg cursor-pointer"
      >
        <i className="fa-solid fa-chevron-left text-xs"></i>
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Siguiente imagen"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg cursor-pointer"
      >
        <i className="fa-solid fa-chevron-right text-xs"></i>
      </button>

      {/* 3. Foreground Content */}
      <div className="relative z-20 p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          {/* Top Ribbons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/25 border border-brand-500/50 text-brand-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Stock Conectado en Tiempo Real</span>
            </div>

            {/* Dynamic Slide Tag */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 text-xs font-medium backdrop-blur-md transition-all">
              <i className="fa-solid fa-car-side text-brand-400"></i>
              <span>{SLIDES[currentSlide].tagline}</span>
            </div>

            {/* Admin Quick DB Button */}
            {isAdmin && (
              <button 
                onClick={() => onNavigateTab('database')} 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/25 hover:bg-sky-500/40 border border-sky-500/50 text-sky-200 text-xs font-semibold transition cursor-pointer backdrop-blur-md"
              >
                <i className="fa-solid fa-server"></i>
                <span>Gestión DB</span>
              </button>
            )}
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
            Repuestos Automotrices & Bobinas <span className="text-brand-500">Originales & OEM</span>
          </h1>

          {/* Commercial Subtitle */}
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed drop-shadow">
            Catálogo oficial <strong>JF AUTO PARTS</strong>. Bobinas, inyectores, estoperas, bujías y sensores para Chevrolet, Ford, Toyota, Hyundai, Nissan, Renault y más. Consulta disponibilidad inmediata o escribe a nuestro <strong>Asesor por WhatsApp</strong>.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap gap-3">
            <button 
              onClick={onOpenCart} 
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-brand-500/30 transition cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-cart-shopping"></i> Ver Mi Carrito y Comprar
            </button>

            <a 
              href="https://wa.me/584126497478?text=Hola,%20deseo%20consultar%20disponibilidad%20de%20repuestos."
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md transition cursor-pointer"
            >
              <i className="fa-brands fa-whatsapp text-base text-emerald-400"></i>
              <span>Consultar Asesor WhatsApp →</span>
            </a>

            {isAdmin && (
              <button 
                onClick={() => onNavigateTab('database')} 
                className="px-3.5 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-rose-300 font-semibold rounded-xl text-xs sm:text-sm border border-rose-500/40 flex items-center gap-2 transition cursor-pointer backdrop-blur-md"
              >
                <i className="fa-solid fa-sliders text-rose-400"></i> Panel Almacén (Admin)
              </button>
            )}
          </div>
        </div>

        {/* Hero Logo Card with Glassmorphism */}
        <div className="relative shrink-0 hidden md:flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/75 border border-slate-700/80 shadow-2xl backdrop-blur-md">
          <img 
            src={logoImg} 
            alt="JF AUTO PARTS Logo Oficial" 
            className="w-40 h-40 lg:w-48 lg:h-48 object-cover rounded-xl shadow-lg border border-slate-800" 
          />
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mt-2">
            Logo Oficial • JF Auto Parts
          </span>
        </div>
      </div>

      {/* 4. Elegant Carousel Dots Indicators */}
      <div className="relative z-20 pb-4 px-6 flex items-center justify-center gap-2">
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
                  ? 'w-7 h-2 bg-brand-500 shadow-md shadow-brand-500/50' 
                  : 'w-2 h-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
