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
      className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between transition-all duration-300 ease-out cursor-pointer relative group animate-fade-in ${
        isExpanded 
          ? 'scale-[1.03] sm:scale-[1.05] -translate-y-1.5 border-2 border-[#de2420] shadow-2xl shadow-[#de2420]/25 z-30 ring-2 ring-[#de2420]/30 bg-[#1c1d22]' 
          : 'bg-[#1c1d22] border border-[#2d2f35] hover:border-[#de2420]/70 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#de2420]/15'
      }`}
      title={coil.name}
    >
      <div>
        {/* Badge & Stock Status */}
        <div className="flex items-center justify-between gap-1 mb-2 h-5 sm:h-6">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-[#de2420]/15 text-[#de2420] border border-[#de2420]/30 whitespace-nowrap flex-shrink-0">
              {coil.badge || 'OEM Spec'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold whitespace-nowrap flex-shrink-0">
            {coil.stock <= 0 ? (
              <span className="inline-flex items-center gap-1 text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                <span>Agotado</span>
              </span>
            ) : isCriticalStock ? (
              <span className="inline-flex items-center gap-1 text-amber-300 px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] sm:text-[10px] font-bold animate-pulse">
                <span>{coil.stock === 1 ? '🔥 Último' : `🔥 ${coil.stock} uds`}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{coil.stock} en stock</span>
              </span>
            )}
          </div>
        </div>

        {/* Product Visual Header / Image con expansión dinámica de altura y zoom */}
        <div 
          className={`rounded-lg sm:rounded-xl ${coil.image ? 'bg-white' : 'bg-[#141518]'} border border-[#2d2f35] relative overflow-hidden transition-all duration-300 flex items-center justify-center p-2 mb-2 sm:mb-3 select-none ${
            isExpanded ? 'h-32 sm:h-52 border-[#de2420]/50 shadow-inner' : 'h-24 sm:h-40 lg:h-44 group-hover:border-[#3a3c44]'
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
          <div className={`h-full w-full flex-col items-center justify-center p-2 sm:p-4 text-center ${coil.image ? 'hidden' : 'flex'}`}>
            <i className={`fa-solid fa-car-battery text-2xl sm:text-3xl ${coil.stock > 0 ? 'text-[#de2420]' : 'text-slate-600'} mb-1 group-hover:scale-110 transition duration-300`}></i>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">Repuesto Automotriz</span>
          </div>
          {primaryOem && (
            <span 
              className="absolute bottom-1.5 right-1.5 text-[9px] sm:text-[10px] font-mono font-medium text-slate-200 bg-[#000000]/85 backdrop-blur-md px-1.5 sm:px-2 py-0.5 rounded border border-[#2d2f35] shadow-md pointer-events-none max-w-[130px] sm:max-w-[170px] truncate"
              title={coil.oem}
            >
              OEM: {primaryOem}{extraOemCount > 0 ? ` (+${extraOemCount})` : ''}
            </span>
          )}
          <span className="absolute top-1.5 right-1.5 text-[8px] sm:text-[10px] font-semibold text-slate-200 bg-[#000000]/85 backdrop-blur-md px-1.5 py-0.5 rounded border border-[#2d2f35] shadow-md pointer-events-none">
            <i className="fa-solid fa-shield text-rose-400 mr-0.5 sm:mr-1"></i>{coil.warranty || '12m'}
          </span>
          {isAdmin && (
            <span className="absolute top-1.5 left-1.5 text-[8px] sm:text-[10px] font-mono font-bold text-amber-300 bg-[#000000]/90 backdrop-blur-md px-1.5 py-0.2 rounded border border-amber-500/50 shadow-md pointer-events-none">
              {coil.id}
            </span>
          )}
        </div>

        {/* Titles & Compatibility (Figma Style) */}
        <div className="space-y-0.5 sm:space-y-1 mb-2 sm:mb-3">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#de2420] uppercase tracking-wider block">
            {coil.brand}
          </span>
          <h3 className="text-[11px] sm:text-sm font-bold text-white group-hover:text-red-400 transition leading-snug line-clamp-2 min-h-[28px] sm:min-h-[38px]">
            {coil.name}
          </h3>
          <div className={`text-[10px] sm:text-[11px] text-slate-400 flex gap-1 pt-0.5 ${
            isExpanded ? 'items-start leading-snug' : 'items-center truncate'
          }`}>
            <i className={`fa-solid fa-car-side text-slate-500 text-[9px] shrink-0 ${isExpanded ? 'mt-0.5' : ''}`}></i>
            <span className={isExpanded ? 'leading-snug break-words' : 'truncate'}>
              Para: <strong className="text-slate-200 font-medium">{coil.carModel}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Price & Actions Footer (Figma Red Style) */}
      <div className="pt-2 border-t border-[#2d2f35] space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-xl font-black text-white font-mono">
              {formatUSD(coil.price)}
            </span>
            {Number(coil.oldPrice) > Number(coil.price) && (
              <span className="text-[10px] sm:text-xs text-slate-400 line-through font-mono">
                {formatUSD(coil.oldPrice)}
              </span>
            )}
          </div>

          {isAdmin && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditProduct(coil); }}
              className="text-[9px] sm:text-[10px] text-slate-400 hover:text-sky-400 transition flex items-center gap-1 cursor-pointer" 
              title="Editar en Base de Datos (Solo Admin)"
            >
              <i className="fa-solid fa-lock-open text-emerald-400 text-[8px]"></i>
            </button>
          )}
        </div>

        {/* Acciones principales: Comprar (Rojo) y WhatsApp (Verde/Oscuro) */}
        <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); addToCart(coil.id); }} 
            disabled={coil.stock <= 0}
            className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-md transition ${
              coil.stock > 0 
                ? 'bg-[#de2420] hover:bg-[#c81e1a] text-white shadow-[#de2420]/20 active:scale-95 cursor-pointer' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <i className={`fa-solid ${coil.stock > 0 ? 'fa-cart-plus' : 'fa-ban'} text-[10px]`}></i>
            <span>{coil.stock > 0 ? 'Comprar' : 'Agotado'}</span>
          </button>

          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDirectWhatsAppBuy(); }}
            disabled={coil.stock <= 0}
            className="py-1.5 sm:py-2 bg-[#25272e] hover:bg-[#2e313a] text-slate-200 border border-[#2d2f35] rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Consultar o comprar por WhatsApp"
          >
            <i className="fa-brands fa-whatsapp text-emerald-400 text-xs"></i>
            <span className="hidden xs:inline">WhatsApp</span>
            <span className="xs:hidden">Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}
