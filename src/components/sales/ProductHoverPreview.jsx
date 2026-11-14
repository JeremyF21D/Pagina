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

  const hasMultipleItems = order.items && Array.isArray(order.items) && order.items.length > 1;

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
          <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-red-950/40 border border-[#de2420]/40 flex items-center justify-center text-[#de2420] shadow-sm group-hover:scale-105 transition">
            <i className="fa-solid fa-boxes-packing text-sm"></i>
          </div>
        ) : (
          /* Miniatura para repuesto único */
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
        )}

        {/* Textos del artículo */}
        <div className="min-w-0">
          {hasMultipleItems ? (
            <>
              <div className="text-white font-bold group-hover:text-red-400 transition-colors flex items-center gap-1.5">
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
          className={`${hasMultipleItems ? 'w-96' : 'w-80'} bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-3.5 shadow-2xl shadow-black/80 space-y-3 pointer-events-auto animate-in fade-in zoom-in-95 duration-150`}
          onClick={(e) => e.stopPropagation()}
        >
          {hasMultipleItems ? (
            /* Popover para Múltiples Repuestos */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#de2420] uppercase bg-[#de2420]/15 px-2 py-0.5 rounded border border-[#de2420]/30">
                    Desglose de Pedido
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {order.items.length} Repuestos
                  </span>
                </div>
                {isPinned && (
                  <button
                    type="button"
                    onClick={() => { setIsPinned(false); setIsOpen(false); }}
                    className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 text-xs transition"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {order.items.map((it, idx) => {
                  const coilMatch = coils.find(c => c.id.toLowerCase() === String(it.coilId).toLowerCase());
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          {coilMatch?.image ? (
                            <img src={coilMatch.image} alt={it.name} className="max-h-7 max-w-7 object-contain mix-blend-multiply" />
                          ) : (
                            <i className="fa-solid fa-bolt text-[#de2420] text-xs"></i>
                          )}
                        </div>
                        <div className="truncate">
                          <h5 className="font-bold text-white truncate text-[11px]">{it.name}</h5>
                          <span className="text-[10px] text-slate-400 font-mono">OEM: {it.oem || it.coilId}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-emerald-400 text-xs">{formatUSD(it.subtotal || it.unitPrice)}</span>
                        <span className="block text-[10px] text-slate-400">{it.qty} ud(s)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Total Unificado:</span>
                <strong className="text-emerald-400 font-bold text-sm">{formatUSD(order.totalPrice || order.totalUSD)}</strong>
              </div>
            </div>
          ) : (
            /* Popover para Repuesto Único */
            <>
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
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  )}
                </div>
              </div>

              {productImage ? (
                <div 
                  className="w-full h-36 bg-white rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-700/80 shadow-inner cursor-zoom-in group"
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
                <h4 className="text-xs font-bold text-white line-clamp-2">{displayName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-slate-400">OEM: <strong className="text-white">{displayOem}</strong></span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{formatUSD(displayPrice)}</span>
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
          className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <div className="relative max-w-xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white truncate">{displayName}</h3>
              <button type="button" onClick={() => setIsZoomOpen(false)} className="text-slate-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="max-h-[60vh] flex items-center justify-center bg-white rounded-xl p-4">
              <img src={productImage} alt={displayName} className="max-h-[50vh] object-contain mix-blend-multiply" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
