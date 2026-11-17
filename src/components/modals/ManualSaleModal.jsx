import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { formatUSD } from '../../utils/formatters';

export function ManualSaleModal({ isOpen, onClose }) {
  const { coils, processSaleTransaction } = useInventory();
  const { deviceId } = useAuth();

  const [coilId, setCoilId] = useState(coils[0]?.id || '');
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Método de pago: 'PAGO_MOVIL' | 'BINANCE' | 'ZELLE' | 'EFECTIVO'
  const [method, setMethod] = useState('PAGO_MOVIL');

  // Campos específicos
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [pagoMovilMonto, setPagoMovilMonto] = useState('');
  const [pagoMovilBanco, setPagoMovilBanco] = useState('Banesco');

  const [binanceRef, setBinanceRef] = useState('');
  const [binanceMonto, setBinanceMonto] = useState('');

  const [zelleTitular, setZelleTitular] = useState('');
  const [zelleContacto, setZelleContacto] = useState('');
  const [zelleRef, setZelleRef] = useState('');
  const [zelleMonto, setZelleMonto] = useState('');

  const [efectivoMonto, setEfectivoMonto] = useState('');
  const [efectivoDetalle, setEfectivoDetalle] = useState('Pago exacto en divisas');

  if (!isOpen) return null;

  const selectedCoil = coils.find(c => c.id === coilId) || coils[0];
  const totalPrice = selectedCoil ? selectedCoil.price * qty : 0;

  // Generar la cadena que se guardará en la columna 'referencia_pago' de Supabase
  const getBuiltPaymentReference = () => {
    switch (method) {
      case 'PAGO_MOVIL':
        return `[PAGO MÓVIL] Ref: ${pagoMovilRef.trim() || 'S/R'} | Monto: ${pagoMovilMonto.trim() || formatUSD(totalPrice)} | Banco: ${pagoMovilBanco}`;
      case 'BINANCE':
        return `[BINANCE PAY] Ref/ID: ${binanceRef.trim() || 'S/R'} | Monto: ${binanceMonto.trim() || totalPrice} USDT`;
      case 'ZELLE':
        return `[ZELLE] Titular: ${zelleTitular.trim() || 'N/A'} | Cuenta: ${zelleContacto.trim() || 'N/A'} | Ref: ${zelleRef.trim() || 'S/R'} | Monto: $${zelleMonto.trim() || totalPrice}`;
      case 'EFECTIVO':
        return `[EFECTIVO] Monto: $${efectivoMonto.trim() || totalPrice} USD | ${efectivoDetalle.trim() || 'Entregado en almacén'}`;
      default:
        return 'PAGO MANUAL DIRECTO';
    }
  };

  const isFormValid = () => {
    if (!selectedCoil || selectedCoil.stock <= 0) return false;
    switch (method) {
      case 'PAGO_MOVIL':
        return Boolean(pagoMovilRef.trim() && (pagoMovilMonto.trim() || totalPrice > 0));
      case 'BINANCE':
        return Boolean(binanceRef.trim() && (binanceMonto.trim() || totalPrice > 0));
      case 'ZELLE':
        return Boolean(zelleTitular.trim() && zelleContacto.trim() && zelleRef.trim());
      case 'EFECTIVO':
        return Boolean(efectivoMonto.trim() || totalPrice > 0);
      default:
        return true;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCoil || !isFormValid()) return;

    const finalPaymentRef = getBuiltPaymentReference();

    processSaleTransaction({
      coilId: selectedCoil.id,
      qty: parseInt(qty, 10) || 1,
      customerName: customerName.trim() || 'Venta Mostrador',
      customerPhone: customerPhone.trim() || '0412-Directo',
      paymentRef: finalPaymentRef,
      userId: deviceId || 'CLI-MANUAL',
      status: 'PENDING_APPROVAL'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative space-y-4 my-8 text-slate-900 animate-scaleIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-lg">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div>
            <h3 className="text-base font-orbitron font-extrabold text-slate-900">Registrar Pedido (Ingresa como Pendiente)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              El pedido ingresará en estado <strong className="text-amber-700">PENDIENTE</strong> para verificar el pago antes de descontar stock.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selección de Repuesto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Repuesto a Vender *
            </label>
            <select 
              value={coilId}
              onChange={(e) => setCoilId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 cursor-pointer transition"
            >
              {coils.map(b => (
                <option key={b.id} value={b.id} disabled={b.stock <= 0}>
                  {b.name} ({formatUSD(b.price)}) - Stock: {b.stock} uds {b.stock <= 0 ? '(Agotado)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad y Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cantidad *
              </label>
              <input 
                type="number" 
                min={1}
                max={selectedCoil ? selectedCoil.stock : 99}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 font-mono focus:outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Total a Cobrar
              </label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-black text-emerald-600 flex items-center">
                {formatUSD(totalPrice)} USD
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nombre del Cliente
              </label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Taller Mecánico San José" 
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Teléfono de Contacto
              </label>
              <input 
                type="text" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0412-1234567" 
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition font-mono"
              />
            </div>
          </div>

          {/* Selector de Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Método de Pago Verificado:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('PAGO_MOVIL')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'PAGO_MOVIL'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-mobile-screen text-sm text-emerald-600"></i>
                <span>Pago Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('BINANCE')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'BINANCE'
                    ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <i className="fa-brands fa-bitcoin text-sm text-amber-600"></i>
                <span>Binance</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('ZELLE')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'ZELLE'
                    ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-building-columns text-sm text-purple-600"></i>
                <span>Zelle</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('EFECTIVO')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'EFECTIVO'
                    ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <i className="fa-solid fa-money-bill-wave text-sm text-sky-600"></i>
                <span>Efectivo ($)</span>
              </button>
            </div>
          </div>

          {/* Formulario según el Método de Pago */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            {/* PAGO MÓVIL */}
            {method === 'PAGO_MOVIL' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      N° de Referencia <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={pagoMovilRef}
                      onChange={(e) => setPagoMovilRef(e.target.value)}
                      placeholder="Ej: 492019" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 font-mono transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Monto Cobrado (Bs o $) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={pagoMovilMonto || formatUSD(totalPrice)}
                      onChange={(e) => setPagoMovilMonto(e.target.value)}
                      placeholder={formatUSD(totalPrice)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Banco Receptor / Emisor
                  </label>
                  <select 
                    value={pagoMovilBanco}
                    onChange={(e) => setPagoMovilBanco(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 cursor-pointer transition"
                  >
                    <option value="Banesco">Banesco</option>
                    <option value="Mercantil">Banco Mercantil</option>
                    <option value="Banco de Venezuela">Banco de Venezuela (BDV)</option>
                    <option value="Bancaribe">Bancaribe</option>
                    <option value="BBVA Provincial">BBVA Provincial</option>
                    <option value="BNC">Banco Nacional de Crédito (BNC)</option>
                    <option value="Otro Banco">Otro Banco Nacional</option>
                  </select>
                </div>
              </>
            )}

            {/* BINANCE PAY */}
            {method === 'BINANCE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    ID / Referencia Binance <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={binanceRef}
                    onChange={(e) => setBinanceRef(e.target.value)}
                    placeholder="Ej: 298410294" 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 font-mono transition"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Monto USDT <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={binanceMonto || `${totalPrice.toFixed(2)}`}
                    onChange={(e) => setBinanceMonto(e.target.value)}
                    placeholder={`${totalPrice.toFixed(2)}`} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 font-mono transition"
                  />
                </div>
              </div>
            )}

            {/* ZELLE */}
            {method === 'ZELLE' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nombre del Titular de la Cuenta <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={zelleTitular}
                      onChange={(e) => setZelleTitular(e.target.value)}
                      placeholder="Ej: Carlos Mendoza" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Teléfono o Correo Zelle <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={zelleContacto}
                      onChange={(e) => setZelleContacto(e.target.value)}
                      placeholder="Ej: +1 305-555-0199 o correo@gmail.com" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 font-mono transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Referencia / Confirmación Zelle <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={zelleRef}
                      onChange={(e) => setZelleRef(e.target.value)}
                      placeholder="Ej: 98124018" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 font-mono transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Monto ($) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={zelleMonto || `${totalPrice.toFixed(2)}`}
                      onChange={(e) => setZelleMonto(e.target.value)}
                      placeholder={`${totalPrice.toFixed(2)}`} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 font-mono transition"
                    />
                  </div>
                </div>
              </>
            )}

            {/* EFECTIVO */}
            {method === 'EFECTIVO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Monto Recibido en Dólares ($) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={efectivoMonto || `${totalPrice.toFixed(2)}`}
                    onChange={(e) => setEfectivoMonto(e.target.value)}
                    placeholder={`${totalPrice.toFixed(2)}`} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 font-mono transition"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Detalle / Billetes / Cambio
                  </label>
                  <input 
                    type="text" 
                    value={efectivoDetalle}
                    onChange={(e) => setEfectivoDetalle(e.target.value)}
                    placeholder="Ej: Billete de $50, vuelto $16" 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vista Previa del Registro en Supabase */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] text-slate-500 block font-semibold mb-1">
              <i className="fa-solid fa-cloud text-red-600 mr-1"></i>
              Se registrará en Supabase (`referencia_pago`):
            </span>
            <div className="font-mono text-[11px] text-slate-800 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 break-all font-semibold">
              {getBuiltPaymentReference()}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={!isFormValid()}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-red-600/25 transition cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-check"></i>
              <span>Registrar Pedido</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
