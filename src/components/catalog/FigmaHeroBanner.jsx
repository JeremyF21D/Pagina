import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { normalizeWaPhone } from '../../utils/whatsapp';
import studioPartImg from '../../assets/bobina_banner_transparent.png';

// Función para seleccionar elementos aleatorios de un arreglo
function getRandomItems(array, count = 3) {
  if (!array || array.length === 0) return [];
  // Priorizar artículos que tengan imagen
  const withImages = array.filter(item => item && item.image);
  const pool = withImages.length >= count ? withImages : array;
  
  // Barajar copia del arreglo
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function FigmaHeroBanner({ onScrollToCatalog }) {
  const { coils, ownerSettings } = useInventory();
  const { addToCart, toggleCart } = useCart();
  const { showToast } = useToast();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  // Selección aleatoria dinámica en cada recarga de página (F5 o visita)
  const dynamicItems = useMemo(() => {
    if (!coils || coils.length === 0) return [];
    return getRandomItems(coils, 3);
  }, [coils]);

  const handleOpenGeneralWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const msg = encodeURIComponent('¡Hola JF Auto Parts! 🚗 Deseo solicitar cotización y consultar disponibilidad de repuestos.');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleWhatsAppForProduct = (item) => {
    if (!item) {
      handleOpenGeneralWhatsApp();
      return;
    }
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const priceText = item.price ? `$${Number(item.price).toFixed(2)} USD` : 'a consultar';
    const msg = encodeURIComponent(
      `¡Hola JF Auto Parts! 🚗 Me interesa el repuesto destacado del banner:\n\n` +
      `📦 *${item.name}*\n` +
      `🏷️ Marca/Modelo: ${item.brand || 'Automotriz'} ${item.carModel ? '- ' + item.carModel : ''}\n` +
      `⚙️ Código OEM: ${item.oem || item.id}\n` +
      `💵 Precio: ${priceText}\n\n` +
      `¿Tienen disponibilidad para retiro o despacho inmediato?`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleAddToCart = (item) => {
    if (!item) {
      if (onScrollToCatalog) onScrollToCatalog();
      return;
    }
    addToCart(item);
    try {
      showToast(`¡${item.name} agregado al carrito!`);
    } catch (e) {}
    toggleCart();
  };

  // Construcción de diapositivas dinámicas basadas en los artículos del inventario
  const slides = useMemo(() => {
    if (dynamicItems.length === 0) {
      // Diapositiva por defecto mientras cargan los datos
      return [
        {
          item: null,
          badge: 'Repuestos Automotrices',
          brandModel: 'ESPECIALISTAS EN ENCENDIDO',
          title: 'REPUESTOS AUTOMOTRICES, BOBINA, Y MÁS...',
          description: 'Encuentra repuestos automotrices de alta calidad con envíos a nivel nacional, garantía certificada y asesoría técnica personalizada para tu vehículo.',
          image: studioPartImg,
          price: null,
          stock: null,
        }
      ];
    }

    return dynamicItems.map((item, idx) => {
      const badgeText = item.stock <= 2 && item.stock > 0
        ? `🔥 ¡ÚLTIMAS ${item.stock} UNIDADES!`
        : item.badge || (item.brand ? `${item.brand.toUpperCase()} CERTIFICADO` : 'REPUESTO DESTACADO');

      const brandModelText = item.brand
        ? `${item.brand.toUpperCase()}${item.carModel ? ' • ' + item.carModel.toUpperCase() : ''}`
        : 'REPUESTO AUTOMOTRIZ DE ALTA PRECISIÓN';

      const descText = item.oem
        ? `Código OEM: ${item.oem}. Garantía de fábrica probada y despacho inmediato a toda Venezuela con asesoría técnica directa.`
        : (item.description || 'Repuesto garantizado para encendido de alto rendimiento con envíos a nivel nacional.');

      return {
        item,
        badge: badgeText,
        brandModel: brandModelText,
        title: item.name,
        description: descText,
        image: item.image || studioPartImg,
        price: item.price ? Number(item.price) : null,
        oldPrice: item.oldPrice ? Number(item.oldPrice) : null,
        stock: item.stock,
      };
    });
  }, [dynamicItems]);

  // Rotación automática cada 5.5 segundos (se pausa al pasar el cursor)
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;
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

  const current = slides[currentSlide] || slides[0];

  return (
    <div
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#cfd4db] via-[#ebedf2] to-[#d6dae1] border border-slate-300 shadow-xl mb-6 select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle Metallic Background Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-black/5 pointer-events-none"></div>

      {/* Main Slide Content */}
      <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center min-h-[300px] sm:min-h-[340px]">
        
        {/* Left Content (Figma Typography & Dynamic Product Info) */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          
          {/* Badge Tag Dinámico */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/10 text-red-600 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span>{current.badge}</span>
          </div>

          {/* Subtítulo / Marca y Modelo */}
          <p className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-wider uppercase font-mono">
            {current.brandModel}
          </p>

          {/* Título Principal Dinámico */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight leading-tight uppercase font-sans line-clamp-2">
            {current.title}
          </h1>

          {/* Precio y Stock Dinámico */}
          {current.price !== null && (
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tracking-tight">
                ${current.price.toFixed(2)} <span className="text-xs text-slate-600 font-sans font-bold">USD</span>
              </span>
              {current.oldPrice && current.oldPrice > current.price && (
                <span className="text-sm sm:text-base text-slate-500 line-through font-mono">
                  ${current.oldPrice.toFixed(2)}
                </span>
              )}
              {current.stock !== null && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  current.stock <= 2
                    ? 'bg-amber-500/20 text-amber-900 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-900 border-emerald-500/30'
                }`}>
                  {current.stock > 0 ? `✓ En Stock (${current.stock} disponibles)` : 'Agotado'}
                </span>
              )}
            </div>
          )}

          {/* Descripción Técnica del Repuesto */}
          <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-xl leading-relaxed">
            {current.description}
          </p>

          {/* Action Buttons Dinámicos */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleAddToCart(current.item)}
              className="px-5 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-cart-shopping"></i>
              <span>{current.price ? `Comprar ($${current.price.toFixed(2)})` : 'Solicitar Cotización'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleWhatsAppForProduct(current.item)}
              className="px-5 py-2.5 sm:px-6 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-brands fa-whatsapp text-base"></i>
              <span>Consultar por WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Right Content: Imagen Dinámica del Artículo (Sin bordes, flotando con drop shadow y mix-blend) */}
        <div className="lg:col-span-5 flex items-center justify-center relative min-h-[220px] sm:min-h-[280px]">
          <img
            key={current.image + currentSlide}
            src={current.image}
            alt={current.title}
            className="max-h-56 sm:max-h-72 w-auto object-contain drop-shadow-2xl transition-all duration-700 ease-out hover:scale-105 mix-blend-multiply select-none"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = studioPartImg;
            }}
          />
        </div>
      </div>

      {/* Carousel Navigation: Left & Right Arrows (si hay más de 1 artículo) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/15 hover:bg-black/30 text-slate-900 hover:text-black flex items-center justify-center transition active:scale-90 cursor-pointer z-20 backdrop-blur-xs opacity-70 hover:opacity-100"
            title="Artículo anterior"
            aria-label="Artículo anterior"
          >
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/15 hover:bg-black/30 text-slate-900 hover:text-black flex items-center justify-center transition active:scale-90 cursor-pointer z-20 backdrop-blur-xs opacity-70 hover:opacity-100"
            title="Siguiente artículo"
            aria-label="Siguiente artículo"
          >
            <i className="fa-solid fa-chevron-right text-sm"></i>
          </button>

          {/* Carousel Pagination Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentSlide === idx
                    ? 'w-6 h-2 bg-red-600 shadow-sm'
                    : 'w-2 h-2 bg-slate-500/50 hover:bg-slate-700/80'
                }`}
                aria-label={`Ir al artículo ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
