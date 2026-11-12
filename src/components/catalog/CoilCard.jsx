import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { formatUSD } from '../../utils/formatters';
import { normalizeWaPhone } from '../../utils/whatsapp';

export function CoilCard({ coil, onEditProduct }) {
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { ownerSettings } = useInventory();
  const [isExpanded, setIsExpanded] = useState(false);

  const oemList = (coil.oem || '').split(/[,/]+/).map(s => s.trim()).filter(Boolean);
  const primaryOem = oemList[0] || '';
  const extraOemCount = oemList.length > 1 ? oemList.length - 1 : 0;

  const isCriticalStock = coil.stock > 0 && coil.stock <= 2;

  // Compra directa por WhatsApp (1-click) en USD
  const handleDirectWhatsAppBuy = () => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const text = encodeURIComponent(
      `¡Hola JF Auto Parts! 🚗 Deseo comprar directamente este repuesto:\n\n` +
      `📦 *${coil.name}*\n` +
      `🏷️ Marca/Modelo: ${coil.brand} - ${coil.carModel}\n` +
      `⚙️ Código OEM: ${coil.oem || coil.id}\n` +
      `💵 Precio: ${formatUSD(coil.price)} USD\n\n` +
      `¿Tienen disponibilidad para retiro o despacho inmediato?`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div 
      onClick={() => setIsExpanded(prev => !prev)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-300 ease-out cursor-pointer relative group animate-fade-in ${
        isExpanded 
          ? 'scale-[1.04] sm:scale-[1.05] -translate-y-2 border-2 border-red-500 shadow-2xl shadow-red-500/25 z-30 ring-2 ring-red-500/40 bg-slate-900' 
          : 'bg-slate-900/95 border border-slate-800 hover:border-red-500/60 hover:scale-[1.025] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-red-500/15'
      }`}
      title={isExpanded ? "Toca para reducir" : "Toca para expandir tarjeta"}
    >
      <div>
        {/* Badge & Stock Status */}
        <div className="flex items-center justify-between gap-1 mb-2.5 h-6">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap flex-shrink-0">
              {coil.badge || 'OEM Spec'}
            </span>
            {isExpanded && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-red-600 text-white animate-fade-in flex-shrink-0">
                Expandido
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap flex-shrink-0">
            {coil.stock <= 0 ? (
              <span className="inline-flex items-center gap-1 text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span>Agotado</span>
              </span>
            ) : isCriticalStock ? (
              <span className="inline-flex items-center gap-1 text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                <span>{coil.stock === 1 ? '🔥 ¡Último disponible!' : `🔥 ¡Últimas ${coil.stock} uds!`}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{coil.stock} en stock</span>
              </span>
            )}
          </div>
        </div>

        {/* Product Visual Header / Image con expansión dinámica de altura y zoom */}
        <div 
          className={`rounded-xl ${coil.image ? 'bg-white' : 'bg-slate-950'} border border-slate-800 relative overflow-hidden transition-all duration-300 flex items-center justify-center p-2 sm:p-3 mb-3 select-none ${
            isExpanded ? 'h-36 sm:h-52 border-red-500/50 shadow-inner' : 'h-28 sm:h-44 group-hover:border-slate-700'
          }`}
          style={coil.image ? { backgroundColor: '#ffffff', isolation: 'isolate' } : {}}
        >
          {coil.image ? (
            <img 
              src={coil.image} 
              alt={coil.name} 
              className={`max-h-full max-w-full w-auto h-auto object-contain mx-auto transition-transform duration-300 ease-out drop-shadow-sm mix-blend-multiply ${
                isExpanded 
                  ? 'scale-115' 
                  : 'group-hover:scale-105'
              }`}
              style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div className={`h-full w-full flex-col items-center justify-center p-4 text-center ${coil.image ? 'hidden' : 'flex'}`}>
            <i className={`fa-solid fa-car-battery text-3xl ${coil.stock > 0 ? 'text-red-500' : 'text-slate-600'} mb-1 group-hover:scale-110 transition duration-300`}></i>
            <span className="text-[10px] text-slate-500 font-medium">Repuesto Automotriz</span>
          </div>
          {primaryOem && (
            <span 
              className="absolute bottom-2 right-2 text-[10px] font-mono font-medium text-slate-200 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded border border-slate-700/80 shadow-md pointer-events-none max-w-[170px] truncate"
              title={coil.oem}
            >
              OEM: {primaryOem}{extraOemCount > 0 ? ` (+${extraOemCount})` : ''}
            </span>
          )}
          <span className="absolute top-2 right-2 text-[10px] font-semibold text-slate-200 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded border border-slate-700/80 shadow-md pointer-events-none">
            <i className="fa-solid fa-shield text-rose-400 mr-1"></i>{coil.warranty || '12 meses'}
          </span>
          {isAdmin && (
            <span className="absolute top-2 left-2 text-[10px] font-mono font-bold text-amber-300 bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded border border-amber-500/50 shadow-md pointer-events-none">
              {coil.id}
            </span>
          )}
        </div>

        {/* Titles & Compatibility (Figma Style) */}
        <div className="space-y-1 mb-3">
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block">
            {coil.brand}
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-red-400 transition leading-snug line-clamp-2">
            {coil.name}
          </h3>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5 truncate">
            <i className="fa-solid fa-car-side text-slate-500 text-[10px]"></i>
            <span className="truncate">Compatibilidad: <strong className="text-slate-200">{coil.carModel}</strong></span>
          </p>
        </div>
      </div>

      {/* Price & Actions Footer (Figma Red Style) */}
      <div className="pt-2.5 border-t border-slate-800 space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-xl font-black text-red-500 font-mono">
              {formatUSD(coil.price)}
            </span>
            {Number(coil.oldPrice) > Number(coil.price) && (
              <span className="text-xs text-slate-500 line-through font-mono">
                {formatUSD(coil.oldPrice)}
              </span>
            )}
          </div>

          {isAdmin && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditProduct(coil); }}
              className="text-[10px] text-slate-400 hover:text-sky-400 transition flex items-center gap-1 cursor-pointer" 
              title="Editar en Base de Datos (Solo Admin)"
            >
              <i className="fa-solid fa-lock-open text-emerald-400 text-[9px]"></i> Editar
            </button>
          )}
        </div>

        {/* Acciones principales: Comprar (Rojo) y WhatsApp (Verde/Oscuro) */}
        <div className="grid grid-cols-2 gap-1.5">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); addToCart(coil.id); }} 
            disabled={coil.stock <= 0}
            className={`py-1.5 sm:py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition ${
              coil.stock > 0 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20 active:scale-95 cursor-pointer' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <i className={`fa-solid ${coil.stock > 0 ? 'fa-cart-plus' : 'fa-ban'} text-[11px]`}></i>
            <span>{coil.stock > 0 ? 'Comprar' : 'Agotado'}</span>
          </button>

          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDirectWhatsAppBuy(); }}
            disabled={coil.stock <= 0}
            className="py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Consultar o comprar por WhatsApp"
          >
            <i className="fa-brands fa-whatsapp text-emerald-400 text-xs"></i>
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
