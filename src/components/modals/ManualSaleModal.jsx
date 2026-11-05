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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 my-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Registrar Pedido (Ingresa como Pendiente)</h3>
            <p className="text-xs text-slate-400">
              El pedido ingresará en estado <strong>PENDIENTE</strong> para que puedas verificar el pago por WhatsApp antes de descontar stock.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selección de Repuesto */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Repuesto a Vender *
            </label>
            <select 
              value={coilId}
              onChange={(e) => setCoilId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Cantidad *
              </label>
              <input 
                type="number" 
                min={1}
                max={selectedCoil ? selectedCoil.stock : 99}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Total a Cobrar
              </label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400">
                {formatUSD(totalPrice)} USD
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Nombre del Cliente
              </label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Taller Mecánico San José" 
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Teléfono de Contacto
              </label>
              <input 
                type="text" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0412-1234567" 
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Selector de Método de Pago */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Método de Pago Verificado:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('PAGO_MOVIL')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'PAGO_MOVIL'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-mobile-screen text-sm"></i>
                <span>Pago Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('BINANCE')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'BINANCE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <i className="fa-brands fa-bitcoin text-sm"></i>
                <span>Binance</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('ZELLE')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'ZELLE'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-building-columns text-sm"></i>
                <span>Zelle</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('EFECTIVO')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'EFECTIVO'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-money-bill-wave text-sm"></i>
                <span>Efectivo ($)</span>
              </button>
            </div>
          </div>

          {/* Formulario según el Método de Pago */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
            {/* PAGO MÓVIL */}
            {method === 'PAGO_MOVIL' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      N° de Referencia <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={pagoMovilRef}
                      onChange={(e) => setPagoMovilRef(e.target.value)}
                      placeholder="Ej: 492019" 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Monto Cobrado (Bs o $) <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={pagoMovilMonto || formatUSD(totalPrice)}
                      onChange={(e) => setPagoMovilMonto(e.target.value)}
                      placeholder={formatUSD(totalPrice)} 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Banco Receptor / Emisor
                  </label>
                  <select 
                    value={pagoMovilBanco}
                    onChange={(e) => setPagoMovilBanco(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    ID / Referencia Binance <span className="text-rose-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={binanceRef}
                    onChange={(e) => setBinanceRef(e.target.value)}
                    placeholder="Ej: 298410294" 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Monto USDT <span className="text-rose-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={binanceMonto || `${totalPrice.toFixed(2)}`}
                    onChange={(e) => setBinanceMonto(e.target.value)}
                    placeholder={`${totalPrice.toFixed(2)}`} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* ZELLE */}
            {method === 'ZELLE' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Nombre del Titular de la Cuenta <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={zelleTitular}
                      onChange={(e) => setZelleTitular(e.target.value)}
                      placeholder="Ej: Carlos Mendoza" 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Teléfono o Correo Zelle <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={zelleContacto}
                      onChange={(e) => setZelleContacto(e.target.value)}
                      placeholder="Ej: +1 305-555-0199 o correo@gmail.com" 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Referencia / Confirmación Zelle <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={zelleRef}
                      onChange={(e) => setZelleRef(e.target.value)}
                      placeholder="Ej: 98124018" 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Monto ($) <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={zelleMonto || `${totalPrice.toFixed(2)}`}
                      onChange={(e) => setZelleMonto(e.target.value)}
                      placeholder={`${totalPrice.toFixed(2)}`} 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {/* EFECTIVO */}
            {method === 'EFECTIVO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Monto Recibido en Dólares ($) <span className="text-rose-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={efectivoMonto || `${totalPrice.toFixed(2)}`}
                    onChange={(e) => setEfectivoMonto(e.target.value)}
                    placeholder={`${totalPrice.toFixed(2)}`} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Detalle / Billetes / Cambio
                  </label>
                  <input 
                    type="text" 
                    value={efectivoDetalle}
                    onChange={(e) => setEfectivoDetalle(e.target.value)}
                    placeholder="Ej: Billete de $50, vuelto $16" 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vista Previa del Registro en Supabase */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-semibold mb-1">
              <i className="fa-solid fa-cloud text-sky-400 mr-1"></i>
              Se registrará en Supabase (`referencia_pago`):
            </span>
            <div className="font-mono text-[11px] text-emerald-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 break-all">
              {getBuiltPaymentReference()}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={!isFormValid()}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-600/30 transition cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-clock"></i>
              <span>Registrar como Pendiente (Verificar por WA)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
