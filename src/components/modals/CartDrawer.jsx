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

  // Selector de Método de Pago (Pago Móvil, Binance, Zelle, Efectivo)
  const [paymentMethod, setPaymentMethod] = useState('PAGO_MOVIL');

  // Campos opcionales por método de pago
  const [pmBank, setPmBank] = useState('');
  const [pmRef, setPmRef] = useState('');

  const [binanceUser, setBinanceUser] = useState('');
  const [binanceRef, setBinanceRef] = useState('');

  const [zelleHolder, setZelleHolder] = useState('');
  const [zelleRef, setZelleRef] = useState('');

  const [cashBill, setCashBill] = useState('');

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    let builtRef = '';
    if (paymentMethod === 'PAGO_MOVIL') {
      builtRef = `[PAGO MÓVIL] ${pmBank ? `Banco: ${pmBank.trim()}` : 'Pago Móvil'} ${pmRef ? `| Ref: #${pmRef.trim()}` : '| Coordinar datos bancarios'}`;
    } else if (paymentMethod === 'BINANCE') {
      builtRef = `[BINANCE PAY] ${binanceUser ? `User: ${binanceUser.trim()}` : 'Binance Pay'} ${binanceRef ? `| Ref: #${binanceRef.trim()}` : '| Solicita Pay ID / QR'}`;
    } else if (paymentMethod === 'ZELLE') {
      builtRef = `[ZELLE] ${zelleHolder ? `Titular: ${zelleHolder.trim()}` : 'Zelle'} ${zelleRef ? `| Ref: #${zelleRef.trim()}` : '| Solicita correo Zelle'}`;
    } else if (paymentMethod === 'EFECTIVO') {
      builtRef = `[EFECTIVO] ${cashBill.trim() ? `Paga con: ${cashBill.trim()}` : 'Pago en divisas en persona'}`;
    }

    updateBuyerDraft({
      payRef: builtRef
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
          
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <i className="fa-solid fa-cart-shopping text-sm"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Mi Carrito de Compra</h3>
                <p className="text-[10px] text-slate-400">
                  ID: <code className="text-brand-400">{deviceId}</code> • WhatsApp: {ownerSettings.ownerPhone}
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
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <i className="fa-solid fa-cart-plus text-4xl mb-2 opacity-30"></i>
                <p className="text-sm font-semibold text-slate-300">Tu carrito de compra está vacío</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Agrega las bobinas que necesites desde el catálogo y envía tu pedido a WhatsApp sin crear cuenta.
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
                  className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">OEM: {item.oem}</p>
                    <div className="text-xs font-mono font-bold text-brand-400 mt-0.5">
                      {formatUSD(item.price)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700">
                      <button 
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-mono text-white font-semibold">{item.qty}</span>
                      <button 
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-500 hover:text-rose-400 text-xs p-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout & Payment Details Section */}
          {cart.length > 0 && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
              
              {/* Selector de Método de Pago con 4 Iconos */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center justify-between">
                  <span>Método de Pago</span>
                  <span className="text-emerald-400 font-mono text-[9px]">Selecciona cómo deseas pagar</span>
                </span>
                
                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {/* PAGO MÓVIL */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAGO_MOVIL')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      paymentMethod === 'PAGO_MOVIL'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/80 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-mobile-screen text-base mb-1"></i>
                    <span className="font-bold text-[10px] leading-tight">Pago Móvil</span>
                  </button>

                  {/* BINANCE PAY */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BINANCE')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      paymentMethod === 'BINANCE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/80 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <i className="fa-brands fa-bitcoin text-base mb-1"></i>
                    <span className="font-bold text-[10px] leading-tight">Binance</span>
                  </button>

                  {/* ZELLE */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ZELLE')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      paymentMethod === 'ZELLE'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/80 shadow-md shadow-purple-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-building-columns text-base mb-1"></i>
                    <span className="font-bold text-[10px] leading-tight">Zelle</span>
                  </button>

                  {/* EFECTIVO */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('EFECTIVO')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      paymentMethod === 'EFECTIVO'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/80 shadow-md shadow-sky-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <i className="fa-solid fa-money-bill-wave text-base mb-1"></i>
                    <span className="font-bold text-[10px] leading-tight">Efectivo</span>
                  </button>
                </div>

                {/* Caja Informativa sin números de cuenta (Seguro y Privado) */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 animate-fade-in text-xs">
                  {paymentMethod === 'PAGO_MOVIL' && (
                    <>
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] space-y-0.5">
                        <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-circle-info"></i>
                          <span>Pago Móvil (Bolívares):</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          Al enviar tu pedido por WhatsApp, te facilitaremos los datos bancarios activos para realizar tu Pago Móvil.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={pmBank}
                          onChange={(e) => setPmBank(e.target.value)}
                          placeholder="Tu Banco Emisor (Opcional)"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                        />
                        <input
                          type="text"
                          value={pmRef}
                          onChange={(e) => setPmRef(e.target.value)}
                          placeholder="Nº Referencia (si ya pagaste)"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </div>
                    </>
                  )}

                  {paymentMethod === 'BINANCE' && (
                    <>
                      <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] space-y-0.5">
                        <div className="text-amber-300 font-bold flex items-center gap-1.5">
                          <i className="fa-brands fa-bitcoin"></i>
                          <span>Binance Pay (USDT):</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          Al enviar tu pedido por WhatsApp, te suministraremos el Pay ID / QR activo para transferir en USDT sin comisiones.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={binanceUser}
                          onChange={(e) => setBinanceUser(e.target.value)}
                          placeholder="Tu Usuario Binance (Opcional)"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                        />
                        <input
                          type="text"
                          value={binanceRef}
                          onChange={(e) => setBinanceRef(e.target.value)}
                          placeholder="ID de Orden / Ref TX (Opcional)"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </div>
                    </>
                  )}

                  {paymentMethod === 'ZELLE' && (
                    <>
                      <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-[11px] space-y-0.5">
                        <div className="text-purple-300 font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-building-columns"></i>
                          <span>Zelle (USD):</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          Al enviar tu pedido por WhatsApp, te indicaremos el correo Zelle autorizado para realizar tu transferencia.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={zelleHolder}
                          onChange={(e) => setZelleHolder(e.target.value)}
                          placeholder="Titular de la cuenta Zelle (Opcional)"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                        />
                        <input
                          type="text"
                          value={zelleRef}
                          onChange={(e) => setZelleRef(e.target.value)}
                          placeholder="Código / Ref Zelle (Opcional)"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </div>
                    </>
                  )}

                  {paymentMethod === 'EFECTIVO' && (
                    <>
                      <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30 text-[11px] space-y-0.5">
                        <div className="text-sky-300 font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-money-bill-wave"></i>
                          <span>Pago en Divisas Efectivo:</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          Cancelas en efectivo al momento de retirar en tienda o al recibir la pieza.
                        </p>
                      </div>
                      <input
                        type="text"
                        value={cashBill}
                        onChange={(e) => setCashBill(e.target.value)}
                        placeholder="¿Pagas con monto exacto o con qué billete cancelas? (Opcional)"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Buyer Form Inputs */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Datos de Contacto
                </span>

                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={buyerDraft.name}
                    onChange={(e) => updateBuyerDraft({ name: e.target.value })}
                    placeholder="Tu Nombre / Taller *" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <input 
                    type="text" 
                    value={buyerDraft.phone}
                    onChange={(e) => updateBuyerDraft({ phone: e.target.value })}
                    placeholder="Teléfono WhatsApp *" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <input 
                  type="text" 
                  value={buyerDraft.car}
                  onChange={(e) => updateBuyerDraft({ car: e.target.value })}
                  placeholder="Vehículo / Año / Motor (Ej: Tiida 2011 1.8)" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Total a Cancelar en Dólares (Limpio y Oficial) */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Total a Cancelar:</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  {formatUSD(cartSubtotal)} USD
                </span>
              </div>

              {/* Checkout WhatsApp Action Button */}
              <button 
                onClick={handleCheckout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-700/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-brands fa-whatsapp text-base"></i>
                <span>Enviar Pedido a WhatsApp ({formatUSD(cartSubtotal)})</span>
              </button>

              <p className="text-[10px] text-center text-slate-500">
                Al enviar tu pedido se reserva el stock en sistema y se abre WhatsApp con la orden generada.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
