import React from 'react';
import { useCart } from '../../context/CartContext';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { buildPreOrderUrl, normalizeWaPhone } from '../../utils/whatsapp';
import { formatUSD } from '../../utils/formatters';
import logoImg from '../../assets/logo.png';

export function ChatMessage({ message, onTriggerSaleModal }) {
  const { addToCart } = useCart();
  const { ownerSettings } = useInventory();
  const { isAdmin } = useAuth();
  const isUser = message.sender === 'user';

  const handlePreOrder = (product) => {
    const url = buildPreOrderUrl({
      targetPhone: ownerSettings.ownerPhone,
      product,
      customerName: 'Cliente Chat IA'
    });
    window.open(url, '_blank');
  };

  const handleDirectWA = (product) => {
    const phone = normalizeWaPhone(ownerSettings.ownerPhone || '04126497478');
    const msg = encodeURIComponent(
      `¡Hola JF Auto Parts! Vengo del Asesor Virtual y deseo confirmar compra de:\n\n` +
      `📦 *${product.name}*\n` +
      `⚙️ OEM: ${product.oem || product.id}\n` +
      `💵 Precio: ${formatUSD(product.price)} USD\n\n` +
      `¿Tienen punto de entrega o despacho activo hoy?`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {isUser ? (
        <div className="relative bg-[#d9fdd3] dark:bg-[#005c4b] dark:text-[#e9edef] rounded-lg rounded-tr-none p-3 shadow max-w-[85%] chat-bubble-tail-out">
          <p className="text-xs sm:text-sm">{message.text}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[9px] text-gray-500 dark:text-gray-300">{message.time}</span>
            <i className="fa-solid fa-check-double text-[10px] text-sky-500"></i>
          </div>
        </div>
      ) : (
        <div className="relative bg-white dark:bg-[#202c33] dark:text-[#e9edef] rounded-lg rounded-tl-none p-3 shadow max-w-[88%] chat-bubble-tail-in">
          <div className="font-semibold text-brand-600 dark:text-brand-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <img src={logoImg} alt="Logo" className="w-3.5 h-3.5 rounded-full object-cover inline-block" /> Asesor JF Auto Parts AI
          </div>

          {isAdmin && message.badge && (
            <div className="mb-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-mono text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
              <i className="fa-solid fa-database mr-1"></i>{message.badge}
            </div>
          )}

          {/* Render formatted HTML bot response safely */}
          <div 
            className="text-xs sm:text-sm space-y-1.5"
            dangerouslySetInnerHTML={{ __html: message.html }}
          />

          {/* Mini-Tarjeta Interactiva de Producto dentro del Chat */}
          {message.product && (
            <div className="mt-3 p-2.5 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2 text-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {message.product.image ? (
                    <img 
                      src={message.product.image} 
                      alt={message.product.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <i className="fa-solid fa-car-battery text-brand-400 text-sm"></i>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-white truncate">{message.product.name}</h5>
                  <p className="text-[10px] text-slate-400 font-mono">OEM: {message.product.oem || message.product.id}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {formatUSD(message.product.price)} USD
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
                {message.product.stock > 0 ? (
                  <>
                    <button 
                      onClick={() => addToCart(message.product.id)}
                      className="flex-1 px-2.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow transition cursor-pointer active:scale-95"
                    >
                      <i className="fa-solid fa-cart-plus"></i> Al Carrito
                    </button>
                    <button 
                      onClick={() => handleDirectWA(message.product)}
                      className="flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow transition cursor-pointer active:scale-95"
                    >
                      <i className="fa-brands fa-whatsapp"></i> Pedir por WA
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handlePreOrder(message.product)}
                    className="w-full px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1.5 shadow transition cursor-pointer active:scale-95"
                  >
                    <i className="fa-brands fa-whatsapp"></i> Encargar Bajo Pedido
                  </button>
                )}
              </div>
            </div>
          )}

          <span className="block text-right text-[9px] text-gray-400 mt-1.5">{message.time}</span>
        </div>
      )}
    </div>
  );
}
