import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { normalizeWaPhone } from '../../utils/whatsapp';
import studioPartImg from '../../assets/bobina_banner_transparent.png';

export function FigmaHeroBanner({ onScrollToCatalog }) {
  const { ownerSettings } = useInventory();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  const handleOpenWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const msg = encodeURIComponent('¡Hola JF Auto Parts! 🚗 Deseo solicitar cotización y consultar disponibilidad de repuestos.');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const slides = [
    {
      badge: 'Repuestos Automotrices',
      titleLine1: 'REPUESTOS AUTOMOTRICES,',
      titleHighlight: 'BOBINA, Y MÁS...',
      description: 'Encuentra repuestos automotrices de alta calidad con envíos a nivel nacional, garantía certificada y asesoría técnica personalizada para tu vehículo.',
      ctaPrimaryText: 'Solicitar Cotización',
      ctaPrimaryAction: onScrollToCatalog,
      ctaPrimaryIcon: 'fa-bolt',
      ctaSecondaryText: 'Contactar por WhatsApp',
      ctaSecondaryAction: handleOpenWhatsApp,
      ctaSecondaryIcon: 'fa-whatsapp',
    },
    {
      badge: 'Encendido de Alto Rendimiento',
      titleLine1: 'BOBINAS ORIGINALES & OEM',
      titleHighlight: 'PARA TODAS LAS MARCAS',
      description: 'Nissan, Chevrolet, Toyota, Ford, Hyundai y más. Soluciona fallas de encendido y pérdida de potencia con repuestos testeados bajo estándares de fábrica.',
      ctaPrimaryText: 'Explorar Catálogo',
      ctaPrimaryAction: onScrollToCatalog,
      ctaPrimaryIcon: 'fa-car-battery',
      ctaSecondaryText: 'Consultar Compatibilidad',
      ctaSecondaryAction: handleOpenWhatsApp,
      ctaSecondaryIcon: 'fa-whatsapp',
    },
    {
      badge: 'Envíos a Toda Venezuela',
      titleLine1: 'DESPACHOS INMEDIATOS',
      titleHighlight: 'CON GARANTÍA TOTAL',
      description: 'Envíos asegurados por Zoom, Tealca y MRW. Recibe tu compra de forma rápida y con asesoramiento técnico directo por WhatsApp.',
      ctaPrimaryText: 'Comprar Repuestos',
      ctaPrimaryAction: onScrollToCatalog,
      ctaPrimaryIcon: 'fa-shield-halved',
      ctaSecondaryText: 'Hablar con un Asesor',
      ctaSecondaryAction: handleOpenWhatsApp,
      ctaSecondaryIcon: 'fa-whatsapp',
    },
  ];

  // Auto avance cada 5.5s (se pausa con hover)
  useEffect(() => {
    if (isHovered) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timerRef.current);
  }, [isHovered, slides.length]);

  const handlePrev = () => {
    setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  };

  const current = slides[currentSlide];

  return (
    <div
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#cfd4db] via-[#ebedf2] to-[#d6dae1] border border-[#b8bcc6] shadow-xl mb-6 select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Reflejo metálico sutil */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-black/5 pointer-events-none"></div>

      {/* Contenido Principal */}
      <div className="relative z-10 px-5 py-6 sm:px-10 sm:py-10 lg:px-14 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center min-h-[260px] sm:min-h-[320px]">
        
        {/* Lado Izquierdo: Textos y Botones */}
        <div className="lg:col-span-7 space-y-2.5 sm:space-y-4">
          
          {/* Badge Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/10 text-[#de2420] text-[11px] sm:text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#de2420] animate-pulse"></span>
            <span>{current.badge}</span>
          </div>

          {/* Título Principal Tipografía Figma (Montserrat / Bold) */}
          <h1 className="text-xl sm:text-3xl lg:text-5xl font-black text-[#111317] tracking-tight leading-tight uppercase font-sans">
            {current.titleLine1} <br />
            <span className="text-[#de2420] font-black">
              {current.titleHighlight}
            </span>
          </h1>

          {/* Descripción */}
          <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-xl leading-relaxed">
            {current.description}
          </p>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
            <button
              type="button"
              onClick={current.ctaPrimaryAction}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-[#de2420] hover:bg-[#c81e1a] active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-[#de2420]/30 transition flex items-center gap-2 cursor-pointer"
            >
              <i className={`fa-solid ${current.ctaPrimaryIcon}`}></i>
              <span>{current.ctaPrimaryText}</span>
            </button>

            <button
              type="button"
              onClick={current.ctaSecondaryAction}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-brands fa-whatsapp text-sm sm:text-base"></i>
              <span>{current.ctaSecondaryText}</span>
            </button>
          </div>
        </div>

        {/* Lado Derecho: Foto Bobina Flotante Sin Bordes */}
        <div className="lg:col-span-5 flex items-center justify-center relative min-h-[160px] sm:min-h-[220px]">
          <img
            src={studioPartImg}
            alt="Bobina de Encendido JF Auto Parts"
            className="max-h-44 sm:max-h-64 lg:max-h-72 w-auto object-contain drop-shadow-2xl transition-transform duration-700 ease-out hover:scale-105 select-none"
          />
        </div>
      </div>

      {/* Flechas de Navegación */}
      <button
        type="button"
        onClick={handlePrev}
        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/15 hover:bg-black/30 text-slate-900 hover:text-black flex items-center justify-center transition active:scale-90 cursor-pointer z-20 backdrop-blur-xs opacity-70 hover:opacity-100"
        title="Anterior"
        aria-label="Diapositiva anterior"
      >
        <i className="fa-solid fa-chevron-left text-xs sm:text-sm"></i>
      </button>

      <button
        type="button"
        onClick={handleNext}
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/15 hover:bg-black/30 text-slate-900 hover:text-black flex items-center justify-center transition active:scale-90 cursor-pointer z-20 backdrop-blur-xs opacity-70 hover:opacity-100"
        title="Siguiente"
        aria-label="Siguiente diapositiva"
      >
        <i className="fa-solid fa-chevron-right text-xs sm:text-sm"></i>
      </button>

      {/* Puntos de Paginación */}
      <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentSlide(idx)}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              currentSlide === idx
                ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-[#de2420] shadow-sm'
                : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-slate-500/50 hover:bg-slate-700/80'
            }`}
            aria-label={`Ir a diapositiva ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
