import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatUSD, detectProductCategory, getCategoryConfig } from '../../utils/formatters';

export function ProductHoverPreview({ order, coils = [], theme = "light" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'bottom' });

  const triggerRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const popoverRef = useRef(null);

  const hasMultipleItems = order.items && Array.isArray(order.items) && order.items.length > 1;
  const isLight = theme === "light";

  // Helper para resolver la imagen de cualquier repuesto (individual o dentro de items)
  const getItemImage = (it) => {
    if (!it) return null;
    if (it.image) return it.image;
    const coilMatch = coils.find(c => {
      if (it.coilId && c.id && String(c.id).toLowerCase() === String(it.coilId).toLowerCase()) return true;
      if (it.id && c.id && String(c.id).toLowerCase() === String(it.id).toLowerCase()) return true;
      if (it.oem && c.oem && String(c.oem).toLowerCase() === String(it.oem).toLowerCase()) return true;
      if (it.name && c.name && String(c.name).toLowerCase() === String(it.name).toLowerCase()) return true;
      return false;
    });
    if (coilMatch?.image) return coilMatch.image;
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
        if (it.coilId && stored[it.coilId]) return stored[it.coilId];
        if (it.id && stored[it.id]) return stored[it.id];
        if (coilMatch?.id && stored[coilMatch.id]) return stored[coilMatch.id];
      } catch (e) {}
    }
    return null;
  };
  // 1. Encontrar la bobina / repuesto en el catálogo activo (para orden de 1 ítem)
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
  const displayPrice = Number(order.unitPrice || matchedCoil?.price || 0);
  const currentStock = matchedCoil ? matchedCoil.stock : null;
  const qty = Number(order.qty || order.quantity || (order.items && order.items[0]?.qty) || 1);

  // 4. Calcular coordenadas del popover flotante
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = hasMultipleItems ? 360 : 320;
    const popoverHeight = hasMultipleItems ? 380 : 360;

    let placement = 'bottom';
    let top = rect.bottom + 8;

    if (rect.bottom + popoverHeight + 16 > window.innerHeight && rect.top > popoverHeight + 16) {
      placement = 'top';
      top = rect.top - popoverHeight - 8;
    }

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
    }, 180);
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
        title="Pasa el mouse o haz clic para ver la lista y detalles de repuestos"
      >
        {hasMultipleItems ? (
          /* Miniatura especial para orden con varios repuestos */
          <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs group-hover:scale-105 transition">
            <i className="fa-solid fa-boxes-packing text-sm"></i>
          </div>
        ) : (
          /* Miniatura para repuesto único */
          <div className={`w-9 h-9 rounded-xl flex-shrink-0 border overflow-hidden flex items-center justify-center transition shadow-xs ${
            productImage 
              ? 'bg-white border-slate-200 group-hover:border-red-500 group-hover:shadow-md group-hover:shadow-red-500/10' 
              : 'bg-slate-100 border-slate-200 group-hover:border-slate-400'
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
              <i className={`${catConfig.icon} text-red-600`}></i>
            </div>
          </div>
        )}

        {/* Textos del artículo */}
        <div className="min-w-0">
          {hasMultipleItems ? (
            <>
              <div className={`${isLight ? "text-slate-900 group-hover:text-red-600" : "text-white group-hover:text-red-400"} font-bold transition-colors flex items-center gap-1.5`}>
                <span className="truncate max-w-[200px] sm:max-w-xs block text-xs">
                  {order.items.length} repuestos distintos
                </span>
                <span className="text-[10px] bg-[#de2420]/20 text-[#de2420] border border-[#de2420]/40 px-1.5 py-0.2 rounded font-mono font-bold">
                  {order.items.reduce((acc, it) => acc + (it.qty || 1), 0)} uds
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                {order.items.map(it => `${it.qty}x ${it.name}`).join(', ')}
              </div>
            </>
          ) : (
            <>
              <div className={`${isLight ? "text-slate-900 group-hover:text-red-600" : "text-white group-hover:text-brand-300"} font-bold transition-colors flex items-center gap-1.5`}>
                <span className="truncate max-w-[210px] sm:max-w-xs block">
                  <span className={isLight ? "text-red-600 font-extrabold mr-1" : "text-brand-400 font-extrabold mr-1"}>
                    {qty}x
                  </span>
                  {displayName}
                </span>
                <span className={`text-[10px] ${isLight ? "text-slate-400 group-hover:text-red-500" : "text-slate-500 group-hover:text-brand-400"} transition-colors shrink-0`} title="Ver imagen">
                  <i className="fa-regular fa-image"></i>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Preview Popover */}
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
          className={`${hasMultipleItems ? 'w-96' : 'w-80'} bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-3.5 shadow-2xl shadow-slate-900/15 space-y-3 pointer-events-auto animate-in fade-in zoom-in-95 duration-150 text-slate-900`}
          onClick={(e) => e.stopPropagation()}
        >
          {hasMultipleItems ? (
            /* Popover para Múltiples Repuestos */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    Desglose de Pedido
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {order.items.length} Repuestos
                  </span>
                </div>
                {isPinned && (
                  <button
                    type="button"
                    onClick={() => { setIsPinned(false); setIsOpen(false); }}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 text-xs transition"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {order.items.map((it, idx) => {
                  const itemImg = getItemImage(it);
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
                          itemImg ? 'bg-white border border-slate-200 p-0.5' : 'bg-slate-100 border border-slate-200'
                        }`}>
                          {itemImg ? (
                            <img 
                              src={itemImg} 
                              alt={it.name} 
                              className="w-full h-full object-contain mix-blend-multiply" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <i className={`fa-solid fa-bolt text-red-600 text-xs ${itemImg ? 'hidden' : 'block'}`}></i>
                        </div>
                        <div className="truncate">
                          <h5 className="font-bold text-slate-900 truncate text-[11px]">{it.name}</h5>
                          <span className="text-[10px] text-slate-500 font-mono">OEM: {it.oem || it.coilId}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-emerald-600 text-xs">{formatUSD(it.subtotal || it.unitPrice)}</span>
                        <span className="block text-[10px] text-slate-500">{it.qty} ud(s)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Total Unificado:</span>
                <strong className="text-emerald-600 font-bold text-sm">{formatUSD(order.totalPrice || order.totalUSD)}</strong>
              </div>
            </div>
          ) : (
            /* Popover para Repuesto Único */
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    {matchedCoil?.id || order.coilId || 'REP-INFO'}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-700 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    {displayBrand}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {productImage && (
                    <button
                      type="button"
                      onClick={() => setIsZoomOpen(true)}
                      className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 text-xs transition"
                      title="Ampliar foto a pantalla completa"
                    >
                      <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
                    </button>
                  )}
                  {isPinned && (
                    <button
                      type="button"
                      onClick={() => { setIsPinned(false); setIsOpen(false); }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100 text-xs transition"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  )}
                </div>
              </div>

              {productImage ? (
                <div 
                  className="w-full h-36 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-200 shadow-inner cursor-zoom-in group"
                  onClick={() => setIsZoomOpen(true)}
                >
                  <img 
                    src={productImage} 
                    alt={displayName} 
                    className="max-h-full max-w-full object-contain mx-auto mix-blend-multiply group-hover:scale-105 transition"
                  />
                </div>
              ) : null}

              <div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{displayName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-slate-500">OEM: <strong className="text-slate-800">{displayOem}</strong></span>
                  <span className="text-[11px] font-mono text-emerald-600 font-extrabold">{formatUSD(displayPrice)}</span>
                </div>
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Modal Zoom Foto */}
      {isZoomOpen && productImage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsZoomOpen(false)}
        >
          <div className="relative max-w-xl w-full bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 text-slate-900" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 truncate">{displayName}</h3>
              <button type="button" onClick={() => setIsZoomOpen(false)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="max-h-[60vh] flex items-center justify-center bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <img src={productImage} alt={displayName} className="max-h-[50vh] object-contain mix-blend-multiply" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
