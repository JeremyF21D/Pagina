import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatUSD, detectProductCategory, getCategoryConfig } from '../../utils/formatters';

export function ProductHoverPreview({ order, coils = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'bottom' });

  const triggerRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const popoverRef = useRef(null);

  // 1. Encontrar la bobina / repuesto en el catálogo activo
  const matchedCoil = coils.find(c => {
    if (order.coilId && c.id && String(c.id).toLowerCase() === String(order.coilId).toLowerCase()) return true;
    if (order.oem && c.oem && String(c.oem).toLowerCase().includes(String(order.oem).toLowerCase())) return true;
    if (order.coilName && c.name && String(c.name).toLowerCase() === String(order.coilName).toLowerCase()) return true;
    if (order.coilName && c.name && (
      c.name.toLowerCase().includes(String(order.coilName).toLowerCase()) ||
      String(order.coilName).toLowerCase().includes(c.name.toLowerCase())
    )) return true;
    return false;
  });

  // 2. Determinar la imagen del producto
  let productImage = matchedCoil?.image || order.image || null;
  if (!productImage && typeof localStorage !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
      if (matchedCoil?.id && stored[matchedCoil.id]) {
        productImage = stored[matchedCoil.id];
      } else if (order.coilId && stored[order.coilId]) {
        productImage = stored[order.coilId];
      }
    } catch (e) {}
  }

  // 3. Categoría y datos técnicos
  const categoryId = detectProductCategory(matchedCoil || { name: order.coilName, id: order.coilId });
  const catConfig = getCategoryConfig(categoryId);

  const displayName = order.coilName || matchedCoil?.name || 'Repuesto Automotriz';
  const displayOem = order.oem || matchedCoil?.oem || 'N/A';
  const displayBrand = matchedCoil?.brand || 'Repuesto Original';
  const displayModel = matchedCoil?.carModel || '';
  const displayEngine = matchedCoil?.engine || '';
  const displayPrice = Number(order.unitPrice || matchedCoil?.price || 0);
  const currentStock = matchedCoil ? matchedCoil.stock : null;

  // 4. Calcular coordenadas del popover flotante
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const popoverHeight = 360;

    let placement = 'bottom';
    let top = rect.bottom + 8;

    // Si no cabe abajo en el viewport, colocarlo arriba
    if (rect.bottom + popoverHeight + 16 > window.innerHeight && rect.top > popoverHeight + 16) {
      placement = 'top';
      top = rect.top - popoverHeight - 8;
    }

    // Alinear horizontalmente centrado o ajustado a la pantalla
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    setCoords({ top, left, placement });
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleToggleClick = (e) => {
    e.stopPropagation();
    if (isPinned) {
      setIsPinned(false);
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
      setIsPinned(true);
    }
  };

  // Cerrar si se hace click fuera cuando está pineado
  useEffect(() => {
    if (!isOpen && !isPinned) return;
    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsPinned(false);
        setIsOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, isPinned]);

  return (
    <>
      {/* Celda del Repuesto con Miniatura y Nombre Interactivo */}
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleToggleClick}
        className="flex items-center gap-2.5 cursor-pointer group select-none relative"
        title="Pasa el mouse o haz clic para ver la foto y detalles del repuesto"
      >
        {/* Miniatura visual de la pieza */}
        <div className={`w-9 h-9 rounded-xl flex-shrink-0 border overflow-hidden flex items-center justify-center transition shadow-xs ${
          productImage 
            ? 'bg-white border-slate-700/80 group-hover:border-brand-500 group-hover:shadow-md group-hover:shadow-brand-500/10' 
            : 'bg-slate-800 border-slate-700 group-hover:border-slate-500'
        }`}>
          {productImage ? (
            <img 
              src={productImage} 
              alt={displayName} 
              className="w-full h-full object-contain p-0.5 mix-blend-multiply group-hover:scale-110 transition duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-full h-full flex items-center justify-center text-xs ${productImage ? 'hidden' : 'flex'}`}>
            <i className={`${catConfig.icon} ${catConfig.color}`}></i>
          </div>
        </div>

        {/* Textos del artículo */}
        <div className="min-w-0">
          <div className="text-white font-semibold group-hover:text-brand-300 transition-colors flex items-center gap-1.5">
            <span className="truncate max-w-[190px] sm:max-w-xs block">{displayName}</span>
            <span className="text-[10px] text-slate-500 group-hover:text-brand-400 transition-colors flex-shrink-0" title="Ver imagen">
              <i className="fa-regular fa-image"></i>
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span className="truncate max-w-[150px]">OEM: {displayOem}</span>
            {matchedCoil?.brand && (
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] uppercase font-bold border border-slate-700">
                {matchedCoil.brand}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Floating Preview Card via Portal (Sin cortes por overflow del contenedor) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          onMouseEnter={() => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999
          }}
          className="w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-3.5 shadow-2xl shadow-black/80 space-y-3 pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Encabezado del Popover */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                {matchedCoil?.id || order.coilId || 'REP-INFO'}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-300 px-1.5 py-0.5 rounded bg-slate-800">
                {displayBrand}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {productImage && (
                <button
                  type="button"
                  onClick={() => setIsZoomOpen(true)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-xs transition"
                  title="Ampliar foto a pantalla completa"
                >
                  <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
                </button>
              )}
              {isPinned && (
                <button
                  type="button"
                  onClick={() => { setIsPinned(false); setIsOpen(false); }}
                  className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 text-xs transition"
                  title="Cerrar vista previa"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>

          {/* Contenedor de la Imagen */}
          <div 
            onClick={() => productImage && setIsZoomOpen(true)}
            className={`h-40 rounded-xl relative overflow-hidden flex items-center justify-center p-2 border transition ${
              productImage 
                ? 'bg-white border-slate-700/60 cursor-pointer group/img hover:border-brand-500' 
                : 'bg-slate-950 border-slate-800'
            }`}
          >
            {productImage ? (
              <>
                <img 
                  src={productImage} 
                  alt={displayName} 
                  className="max-h-full max-w-full w-auto h-auto object-contain mx-auto drop-shadow-sm mix-blend-multiply group-hover/img:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[11px] font-medium border border-slate-700 shadow-lg flex items-center gap-1.5">
                    <i className="fa-solid fa-magnifying-glass-plus text-brand-400"></i>
                    <span>Ampliar</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-3">
                <i className={`${catConfig.icon} text-4xl ${catConfig.color} mb-2`}></i>
                <span className="text-xs text-slate-400 font-medium">{catConfig.singular}</span>
                <span className="text-[10px] text-slate-500 mt-1">Sin fotografía registrada</span>
              </div>
            )}
          </div>

          {/* Información y especificaciones del producto */}
          <div>
            <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
              {displayName}
            </h4>

            {(displayModel || displayEngine) && (
              <p className="text-[11px] text-slate-300 mt-1 leading-tight">
                {displayModel} {displayEngine ? `• ${displayEngine}` : ''}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between text-[11px] font-mono pt-2 border-t border-slate-800/80">
              <span className="text-slate-400">OEM:</span>
              <span className="text-brand-300 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 max-w-[170px] truncate">
                {displayOem}
              </span>
            </div>
          </div>

          {/* Footer Comercial: Precio & Stock */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Precio Ref:</span>
              <span className="text-base font-extrabold text-emerald-400 font-mono">
                {formatUSD(displayPrice)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Stock en Catálogo:</span>
              {currentStock !== null ? (
                currentStock > 0 ? (
                  <span className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    {currentStock} disponibles
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-400 inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                    Agotado
                  </span>
                )
              ) : (
                <span className="text-xs text-slate-400">Registrado</span>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Zoom de Fotografía en Pantalla Completa */}
      {isZoomOpen && productImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setIsZoomOpen(false); }}
        >
          <div 
            className="relative max-w-xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-brand-400">{matchedCoil?.id || order.coilId}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">{displayBrand}</span>
                </div>
                <h3 className="text-sm font-bold text-white truncate mt-0.5">{displayName}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsZoomOpen(false)} 
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                aria-label="Cerrar vista previa"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <div className="max-h-[65vh] flex items-center justify-center bg-white rounded-xl overflow-hidden p-4 border border-slate-700 shadow-inner">
              <img 
                src={productImage} 
                alt={displayName} 
                className="max-h-[55vh] w-auto max-w-full object-contain mx-auto mix-blend-multiply" 
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 pt-1 gap-2">
              <span>OEM: <strong className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">{displayOem}</strong></span>
              <span>Precio: <strong className="text-emerald-400 font-mono font-bold">{formatUSD(displayPrice)}</strong></span>
              {currentStock !== null && (
                <span>Stock: <strong className={currentStock > 0 ? "text-emerald-400" : "text-rose-400"}>{currentStock > 0 ? `${currentStock} disponibles` : 'Agotado'}</strong></span>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
