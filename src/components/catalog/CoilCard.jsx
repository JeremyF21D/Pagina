import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatUSD, detectProductCategory, getCategoryConfig } from '../../utils/formatters';

export function CoilCard({ coil, onAskAI, onEditProduct }) {
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const oemList = (coil.oem || '').split(/[,/]+/).map(s => s.trim()).filter(Boolean);
  const primaryOem = oemList[0] || '';
  const extraOemCount = oemList.length > 1 ? oemList.length - 1 : 0;
  const categoryId = coil.category || detectProductCategory(coil);
  const catConfig = getCategoryConfig(categoryId);

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 hover:border-brand-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:shadow-brand-500/10 transition-all duration-300 group">
      <div>
        {/* Badge & Stock Status - Altura fija de 28px sin wrap para nivelar perfectamente todas las fotos */}
        <div className="flex items-center justify-between gap-1.5 mb-3 h-7">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-400 border border-brand-500/30 whitespace-nowrap flex-shrink-0">
              {coil.badge || 'OEM Spec'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-900 text-slate-300 border border-slate-700/80 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
              <i className={`${catConfig.icon} text-[9px] ${catConfig.color}`}></i>
              <span className="truncate max-w-[80px]">{catConfig.singular.split(' ')[0]}</span>
            </span>
          </div>

          <div className={`flex items-center gap-1.5 text-xs ${coil.stock > 0 ? 'text-emerald-400' : 'text-rose-400'} font-semibold whitespace-nowrap flex-shrink-0`}>
            <span className={`h-2 w-2 rounded-full ${coil.stock > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'} flex-shrink-0`}></span>
            <span>{coil.stock > 0 ? `${coil.stock} en stock` : 'Agotado'}</span>
          </div>
        </div>

        {/* Product Visual Header / Image Adaptada al Contenedor */}
        <div 
          className={`h-44 sm:h-48 rounded-xl ${coil.image ? 'bg-white' : 'bg-slate-950'} border border-slate-700/60 relative overflow-hidden group-hover:border-slate-500 transition flex items-center justify-center p-3 mb-4 cursor-pointer`}
          style={coil.image ? { backgroundColor: '#ffffff', isolation: 'isolate' } : {}}
          onClick={() => coil.image && setIsZoomOpen(true)}
          title={coil.image ? "Haz clic para ampliar la foto" : ""}
        >
          {coil.image ? (
            <>
              <img 
                src={coil.image} 
                alt={coil.name} 
                className="max-h-full max-w-full w-auto h-auto object-contain mx-auto group-hover:scale-105 transition duration-300 drop-shadow-sm mix-blend-multiply"
                style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex'; }}
              />
              {/* Overlay hover sutil para indicar zoom */}
              <div className="absolute inset-0 bg-slate-950/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="p-1.5 rounded-full bg-slate-900/80 text-white text-xs border border-slate-700/80 shadow-lg">
                  <i className="fa-solid fa-magnifying-glass-plus"></i>
                </span>
              </div>
            </>
          ) : null}
          <div className={`h-full w-full flex-col items-center justify-center p-4 text-center ${coil.image ? 'hidden' : 'flex'}`}>
            <i className={`${catConfig.icon} text-4xl ${coil.stock > 0 ? catConfig.color : 'text-slate-600'} mb-2 group-hover:scale-110 transition duration-300`}></i>
            <span className="text-[10px] text-slate-500 font-medium">{catConfig.singular}</span>
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
          {/* El código interno / ID solo es visible para el Administrador */}
          {isAdmin && (
            <span className="absolute top-2 left-2 text-[10px] font-mono font-bold text-amber-300 bg-slate-950/90 backdrop-blur-md px-2 py-0.5 rounded border border-amber-500/50 shadow-md pointer-events-none">
              {coil.id}
            </span>
          )}
        </div>

        {/* Titles & Compatibility */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">{coil.brand}</span>
            <span className="text-[10px] text-slate-500 font-mono">• {catConfig.prefix}</span>
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition leading-snug">
            {coil.name}
          </h3>
          <p className="text-xs text-slate-300 flex items-center gap-1.5 pt-1">
            <i className="fa-solid fa-car-side text-slate-400 text-[11px]"></i>
            <span>{coil.carModel}</span>
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <i className="fa-solid fa-gears text-slate-500 text-[11px]"></i>
            <span className="font-mono text-[11px]">{coil.engine}</span>
          </p>
        </div>

        {/* Specs tag pills */}
        <div className="flex flex-wrap gap-1.5 my-3 text-[10px]">
          {coil.connector && (
            <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-700/60 flex items-center gap-1">
              <i className="fa-solid fa-circle-dot text-[7px] text-brand-400"></i>
              <span className="truncate max-w-[140px]">{coil.connector}</span>
            </span>
          )}
          {coil.type && (
            <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-700/60 flex items-center gap-1">
              <i className="fa-solid fa-tag text-[7px] text-sky-400"></i>
              <span className="truncate max-w-[140px]">{coil.type}</span>
            </span>
          )}
        </div>
      </div>

      {/* Price & Actions Footer */}
      <div className="pt-4 border-t border-slate-700/70 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-extrabold text-white font-mono">{formatUSD(coil.price)}</span>
            {Number(coil.oldPrice) > Number(coil.price) && (
              <span className="text-xs text-slate-400 line-through ml-1.5 font-mono">
                {formatUSD(coil.oldPrice)}
              </span>
            )}
          </div>

          {/* Only visible when Admin is logged in */}
          {isAdmin && (
            <button 
              onClick={() => onEditProduct(coil)}
              className="text-[11px] text-slate-400 hover:text-sky-400 transition flex items-center gap-1 cursor-pointer" 
              title="Editar en Base de Datos (Solo Admin)"
            >
              <i className="fa-solid fa-lock-open text-emerald-400 text-[9px]"></i> Editar DB
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => addToCart(coil.id)} 
            disabled={coil.stock <= 0}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition ${
              coil.stock > 0 
                ? 'bg-brand-500 hover:bg-brand-600 text-white cursor-pointer active:scale-95' 
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            <i className={`fa-solid ${coil.stock > 0 ? 'fa-cart-plus' : 'fa-ban'}`}></i>
            <span>{coil.stock > 0 ? 'Agregar' : 'Sin Stock'}</span>
          </button>

          <button 
            onClick={() => onAskAI && onAskAI(coil)}
            className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Consultar disponibilidad y precio al Asistente IA"
          >
            <i className="fa-solid fa-robot text-xs"></i>
            <span>Consultar IA</span>
          </button>
        </div>
      </div>

      {/* Lightbox / Modal de Foto Ampliada Completa */}
      {isZoomOpen && coil.image && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setIsZoomOpen(false); }}
        >
          <div 
            className="relative max-w-xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-brand-400">{coil.id}</span>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">{coil.brand}</span>
                </div>
                <h3 className="text-sm font-bold text-white truncate mt-0.5">{coil.name}</h3>
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
            
            <div className="max-h-[65vh] flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden p-2 border border-slate-800">
              <img 
                src={coil.image} 
                alt={coil.name} 
                className="max-h-[60vh] w-auto max-w-full object-contain mx-auto" 
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 pt-1 gap-2">
              <span>OEM: <strong className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">{primaryOem || 'N/A'}</strong></span>
              <span>Garantía: <strong className="text-emerald-400">{coil.warranty || '12 meses'}</strong></span>
              <span>Stock: <strong className={coil.stock > 0 ? "text-emerald-400" : "text-rose-400"}>{coil.stock > 0 ? `${coil.stock} disponibles` : 'Agotado'}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
