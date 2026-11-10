import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import { formatUSD } from '../../utils/formatters';

export function CartDrawer() {
  const {
    isCartOpen,
    closeCart,
    cart,
    cartSubtotal,
    updateCartQty,
    removeFromCart,
    clearCart,
    buyerDraft,
    updateBuyerDraft,
    checkoutViaWhatsApp
  } = useCart();
  const { deviceId } = useAuth();
  const { ownerSettings } = useInventory();

  // Selector compacto de Método de Pago (Pago Móvil, Binance, Zelle, Efectivo)
  const [paymentMethod, setPaymentMethod] = useState('PAGO_MOVIL');
  const [paymentNote, setPaymentNote] = useState('');

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    const methodTags = {
      'PAGO_MOVIL': 'PAGO MÓVIL',
      'BINANCE': 'BINANCE PAY',
      'ZELLE': 'ZELLE',
      'EFECTIVO': 'EFECTIVO'
    };
    const tag = methodTags[paymentMethod] || 'PAGO ACORDADO';
    const finalRef = paymentNote.trim() 
      ? `[${tag}] ${paymentNote.trim()}` 
      : `[${tag}] Coordinar por WhatsApp`;

    updateBuyerDraft({
      payRef: finalRef
    });

    checkoutViaWhatsApp();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        onClick={closeCart}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col justify-between animate-drawer-in">
          
          {/* Header Compacto */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <i className="fa-solid fa-cart-shopping text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Mi Carrito de Compra</h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'} • Sesión: <code className="text-brand-400">{deviceId}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="px-2 py-1 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                  title="Vaciar todo el carrito"
                >
                  <i className="fa-solid fa-trash-can mr-1"></i> Vaciar
                </button>
              )}
              <button 
                onClick={closeCart}
                className="text-slate-400 hover:text-white p-2 rounded-lg transition-transform duration-200 hover:rotate-90 cursor-pointer"
                title="Cerrar carrito"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Cart Items List — Espacio Amplio y Despejado */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {cart.length === 0 ? (
              <div className="text-center py-20 text-slate-500 space-y-2">
                <i className="fa-solid fa-cart-plus text-4xl mb-2 opacity-30"></i>
                <p className="text-sm font-semibold text-slate-300">Tu carrito de compra está vacío</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Agrega las piezas que necesites desde el catálogo y envía tu pedido a WhatsApp en 1 clic.
                </p>
                <button 
                  onClick={closeCart}
                  className="mt-2 text-xs text-brand-400 font-semibold hover:underline cursor-pointer"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              cart.map(item => (
                <div 
                  key={item.id} 
                  className="p-3 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 flex items-center justify-between gap-3 shadow-xs transition"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">OEM: {item.oem}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs font-mono font-bold text-brand-400">
                        {formatUSD(item.price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700">
                      <button 
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs cursor-pointer"
                        title="Restar cantidad"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-mono text-white font-semibold">{item.qty}</span>
                      <button 
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs cursor-pointer"
                        title="Sumar cantidad"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-500 hover:text-rose-400 text-xs p-1 cursor-pointer transition"
                      title="Quitar repuesto"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout & Payment Details Section — Compacto, Ordenado y Amigable */}
          {cart.length > 0 && (
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-2.5">
              
              {/* Barra Segmentada de Métodos de Pago (Ultra Compacta en 1 sola fila) */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Método de Pago
                </span>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px]">
                  {/* PAGO MÓVIL */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAGO_MOVIL')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'PAGO_MOVIL'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-mobile-screen text-xs"></i>
                    <span className="truncate">Pago Móvil</span>
                  </button>

                  {/* BINANCE PAY */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BINANCE')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'BINANCE'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <i className="fa-brands fa-bitcoin text-xs"></i>
                    <span className="truncate">Binance</span>
                  </button>

                  {/* ZELLE */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ZELLE')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'ZELLE'
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-building-columns text-xs"></i>
                    <span className="truncate">Zelle</span>
                  </button>

                  {/* EFECTIVO */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('EFECTIVO')}
                    className={`py-1.5 px-1 rounded-lg font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'EFECTIVO'
                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-money-bill-wave text-xs"></i>
                    <span className="truncate">Efectivo</span>
                  </button>
                </div>
              </div>

              {/* Formulario Compacto de Contacto y Nota */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <input 
                    type="text" 
                    value={buyerDraft.name}
                    onChange={(e) => updateBuyerDraft({ name: e.target.value })}
                    placeholder="Tu Nombre / Taller *" 
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <input 
                    type="text" 
                    value={buyerDraft.phone}
                    onChange={(e) => updateBuyerDraft({ phone: e.target.value })}
                    placeholder="Teléfono WhatsApp *" 
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <input 
                    type="text" 
                    value={buyerDraft.car}
                    onChange={(e) => updateBuyerDraft({ car: e.target.value })}
                    placeholder="Vehículo / Motor (Opcional)" 
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <input 
                    type="text" 
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder={
                      paymentMethod === 'PAGO_MOVIL' ? "Banco / Ref (Opcional)" :
                      paymentMethod === 'BINANCE' ? "Usuario Binance (Opcional)" :
                      paymentMethod === 'ZELLE' ? "Titular Zelle (Opcional)" :
                      "¿Pagas exacto o vuelto?"
                    }
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Total y Botón de WhatsApp */}
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Total a Cancelar:</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  {formatUSD(cartSubtotal)} USD
                </span>
              </div>

              <button 
                onClick={handleCheckout}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-brands fa-whatsapp text-base"></i>
                <span>Enviar Pedido a WhatsApp ({formatUSD(cartSubtotal)})</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
