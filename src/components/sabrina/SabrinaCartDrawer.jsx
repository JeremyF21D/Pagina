import React, { useState } from 'react';
import { 
  ShoppingBag, X, Shield, MessageSquare, Trash2, 
  CreditCard, Smartphone, DollarSign, Sparkles, Check 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { formatUSD } from '../../utils/formatters';
import { SparkOrderOverlay } from '../animations/SparkOrderOverlay/SparkOrderOverlay';

export function SabrinaCartDrawer() {
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
    createOrderFromCart
  } = useCart();
  const { binanceRate, bcvRate } = useCurrency();
  const { ownerSettings } = useInventory();
  const { deviceId } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState('PAGO_MOVIL');
  const [paymentNote, setPaymentNote] = useState('');
  const [sparkModal, setSparkModal] = useState({ open: false, orderData: null });

  if (!isCartOpen && !sparkModal.open) return null;

  const activeRate = Number(binanceRate) || 1076.87;
  const totalVES = cartSubtotal * activeRate;

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

    const result = createOrderFromCart();
    if (result) {
      setSparkModal({ open: true, orderData: result });
    }
  };

  return (
    <>
      {isCartOpen && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn" 
          onClick={closeCart}
        >
          <div 
            className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col justify-between p-5 sm:p-6 shadow-2xl animate-slideInRight text-slate-900" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header del Carrito */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                      Resumen de tu Pedido
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'} seleccionados
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg text-xs transition cursor-pointer"
                      title="Vaciar carrito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={closeCart}
                    className="p-1.5 rounded-xl text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Lista de Repuestos */}
              <div className="py-4 space-y-3 overflow-y-auto max-h-[38vh] scrollbar-none">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                    <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-800">Tu carrito está vacío</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Explora el catálogo y añade los repuestos que necesita tu vehículo.
                    </p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div 
                      key={item.id} 
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-red-600 font-mono font-bold">OEM: {item.oem || item.id}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-xs text-emerald-600 font-bold font-mono">
                            ${(item.price * item.qty).toFixed(2)} USD
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateCartQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-slate-900 px-1 font-mono">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-600 hover:text-rose-400 p-1 ml-1 cursor-pointer transition"
                          title="Eliminar repuesto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Checkout & Formulario */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                
                {/* Selector de Método de Pago */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Método de Pago Preferido
                  </span>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PAGO_MOVIL')}
                      className={`py-1 px-1 rounded-lg font-bold text-center transition truncate cursor-pointer ${
                        paymentMethod === 'PAGO_MOVIL'
                          ? 'bg-red-600 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pago Móvil
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BINANCE')}
                      className={`py-1 px-1 rounded-lg font-bold text-center transition truncate cursor-pointer ${
                        paymentMethod === 'BINANCE'
                          ? 'bg-amber-500 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Binance
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('ZELLE')}
                      className={`py-1 px-1 rounded-lg font-bold text-center transition truncate cursor-pointer ${
                        paymentMethod === 'ZELLE'
                          ? 'bg-purple-600 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Zelle
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('EFECTIVO')}
                      className={`py-1 px-1 rounded-lg font-bold text-center transition truncate cursor-pointer ${
                        paymentMethod === 'EFECTIVO'
                          ? 'bg-slate-800 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Efectivo
                    </button>
                  </div>
                </div>

                {/* Datos del Cliente */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={buyerDraft.name}
                      onChange={(e) => updateBuyerDraft({ name: e.target.value })}
                      placeholder="Tu Nombre / Taller *" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
                    />
                    <input 
                      type="text" 
                      value={buyerDraft.phone}
                      onChange={(e) => updateBuyerDraft({ phone: e.target.value })}
                      placeholder="WhatsApp *" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={buyerDraft.car}
                      onChange={(e) => updateBuyerDraft({ car: e.target.value })}
                      placeholder="Modelo / Año auto" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
                    />
                    <input 
                      type="text" 
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder={
                        paymentMethod === 'PAGO_MOVIL' ? "Banco / Ref pago" :
                        paymentMethod === 'BINANCE' ? "ID Binance Pay" :
                        "¿Pagas exacto o vuelto?"
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Desglose de Totales */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal en Dólares:</span>
                    <strong className="text-slate-900 text-base font-black font-mono">
                      ${cartSubtotal.toFixed(2)} USD
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total en Bolívares:</span>
                    <strong className="text-red-600 font-bold text-xs font-mono">
                      Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* Badge de Confianza */}
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-0.5">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Compra 100% Protegida</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Recibes en Maracaibo o pagas al momento de confirmar el despacho.
                  </p>
                </div>

                {/* Botón Principal de Compra */}
                <button
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                  className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/25 cursor-pointer uppercase tracking-wider"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Confirmar Orden por WhatsApp</span>
                </button>

              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal de Animación de Bujía de Alto Voltaje y Confirmación */}
      <SparkOrderOverlay
        isOpen={sparkModal.open}
        orderData={sparkModal.orderData}
        onClose={() => {
          setSparkModal({ open: false, orderData: null });
          closeCart();
        }}
      />
    </>
  );
}
