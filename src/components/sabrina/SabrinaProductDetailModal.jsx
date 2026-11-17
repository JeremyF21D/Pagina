import React from 'react';
import { 
  X, CheckCircle, Shield, Truck, ShoppingBag, 
  MessageSquare, Sparkles, Check, Car, Wrench 
} from 'lucide-react';
import { formatUSD } from '../../utils/formatters';
import { normalizeWaPhone } from '../../utils/whatsapp';
import defaultCoilImage from '../../assets/bobina_tiida_studio.jpg';

export function SabrinaProductDetailModal({ product, isOpen, onClose, onAddToCart, binanceRate, bcvRate, ownerPhone }) {
  if (!isOpen || !product) return null;

  const priceUSD = Number(product.price) || 0;
  const rate = Number(binanceRate) || 1076.87;
  const priceVES = priceUSD * rate;

  const rawOldPrice = Number(product.oldPrice || product.old_price || 0);
  const effectiveOldPrice = rawOldPrice > priceUSD ? rawOldPrice : 0;
  const discountPct = effectiveOldPrice > priceUSD
    ? Math.round(((effectiveOldPrice - priceUSD) / effectiveOldPrice) * 100)
    : 0;

  const handleWhatsAppInquiry = () => {
    const phone = normalizeWaPhone(ownerPhone || '04126497478');
    const msg = encodeURIComponent(
      `¡Hola JF Auto Parts! 🚗 Deseo información y confirmar disponibilidad técnica de este repuesto:\n\n` +
      `📦 *${product.name}*\n` +
      `⚙️ OEM: ${product.oem || product.id}\n` +
      `🚘 Vehículo: ${product.brand} ${product.carModel || ''} (${product.engine || ''})\n` +
      `💵 Precio: $${priceUSD.toFixed(2)} USD (~Bs. ${priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})\n\n` +
      `¿Tienen entrega en Maracaibo o envío nacional hoy?`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto animate-scaleIn text-slate-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
                Ficha de Compatibilidad Verificada
              </h3>
              <p className="text-[11px] text-slate-500">
                Compatibilidad verificada por código OEM • Probado en banco
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Detalle */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
          
          {/* Imagen o Vista de Producto */}
          <div className="sm:col-span-5 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col items-center justify-center min-h-[200px]">
            <img 
              src={product.image || defaultCoilImage} 
              alt={product.name} 
              className="max-h-48 w-auto object-contain rounded-xl drop-shadow-md select-none"
              onError={(e) => { e.target.onerror = null; e.target.src = defaultCoilImage; }}
            />
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Probado en Banco de Prueba</span>
            </div>
          </div>

          {/* Información Técnica y Compatibilidad */}
          <div className="sm:col-span-7 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                {product.brand || 'OEM Direct'}
              </span>
              <h4 className="font-extrabold text-base sm:text-lg text-slate-900 mt-1.5 leading-snug">
                {product.name}
              </h4>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Código OEM Principal:</span>
                <strong className="text-red-600 font-mono font-bold">{product.oem || 'N/A'}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Modelo Aplicación:</span>
                <span className="text-slate-800 font-semibold">{product.carModel || 'Universal'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Motor / Cilindrada:</span>
                <span className="text-slate-800 font-semibold">{product.engine || 'Estándar'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Disponibilidad en Bodega:</span>
                <span className={`font-bold ${product.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {product.stock > 0 ? `${product.stock} unidades en Maracaibo` : 'Agotado temporalmente'}
                </span>
              </div>
            </div>

            {/* Precio */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    ${priceUSD.toFixed(2)}
                  </span>
                  {effectiveOldPrice > priceUSD && (
                    <span className="text-sm sm:text-base text-slate-400 line-through font-mono font-semibold">
                      ${effectiveOldPrice.toFixed(2)}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-400">USD</span>
                  {discountPct > 0 && (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      -{discountPct}% OFF
                    </span>
                  )}
                </div>
                <div className="text-xs text-red-600 font-bold font-mono">
                  ~Bs. {priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Truck className="w-3 h-3 text-red-600" />
                  <span>Entrega Inmediata</span>
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Botones de Acción */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            onClick={handleWhatsAppInquiry}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-200"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Consultar con Técnico</span>
          </button>

          <button
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
            disabled={product.stock <= 0}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 transition shadow-md shadow-red-600/20 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Añadir al Carrito</span>
          </button>
        </div>

      </div>
    </div>
  );
}
