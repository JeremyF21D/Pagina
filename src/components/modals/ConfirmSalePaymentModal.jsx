import React, { useState, useEffect } from 'react';
import { formatUSD } from '../../utils/formatters';

export function ConfirmSalePaymentModal({ isOpen, order, coils = [], onClose, onConfirm }) {
  const [method, setMethod] = useState('PAGO_MOVIL'); // 'PAGO_MOVIL' | 'BINANCE' | 'ZELLE' | 'EFECTIVO'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campos específicos
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [pagoMovilMonto, setPagoMovilMonto] = useState('');
  const [pagoMovilBanco, setPagoMovilBanco] = useState('Banesco');

  const [binanceRef, setBinanceRef] = useState('');
  const [binanceMonto, setBinanceMonto] = useState('');
  const [binanceUser, setBinanceUser] = useState('');

  const [zelleTitular, setZelleTitular] = useState('');
  const [zelleContacto, setZelleContacto] = useState('');
  const [zelleRef, setZelleRef] = useState('');
  const [zelleMonto, setZelleMonto] = useState('');

  const [efectivoMonto, setEfectivoMonto] = useState('');
  const [efectivoDetalle, setEfectivoDetalle] = useState('');

  // Precargar datos cuando se abre el modal con una orden
  useEffect(() => {
    if (order) {
      const totalFormatted = formatUSD(order.totalPrice || 0);
      const totalNumber = Number(order.totalPrice || 0).toFixed(2);

      setPagoMovilRef('');
      setPagoMovilMonto(`${totalFormatted}`);
      setPagoMovilBanco('Banesco');

      setBinanceRef('');
      setBinanceMonto(`${totalNumber}`);
      setBinanceUser('');

      setZelleTitular(order.customerName !== 'Cliente' ? order.customerName : '');
      setZelleContacto(order.customerPhone || '');
      setZelleRef('');
      setZelleMonto(`${totalNumber}`);

      setEfectivoMonto(`${totalNumber}`);
      setEfectivoDetalle('Pago exacto en divisas');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  // Encontrar repuesto e imagen
  const matchedCoil = coils.find(c => 
    (order.coilId && c.id === order.coilId) || 
    (order.oem && c.oem && c.oem.includes(order.oem)) || 
    (order.coilName && c.name === order.coilName)
  );

  let productImage = matchedCoil?.image || order.image || null;
  if (!productImage && typeof localStorage !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
      if (matchedCoil?.id && stored[matchedCoil.id]) productImage = stored[matchedCoil.id];
      else if (order.coilId && stored[order.coilId]) productImage = stored[order.coilId];
    } catch (e) {}
  }

  // Generar cadena formateada para el campo 'referencia_pago' de Supabase
  const getBuiltPaymentReference = () => {
    switch (method) {
      case 'PAGO_MOVIL':
        return `[PAGO MÓVIL] Ref: ${pagoMovilRef.trim() || 'S/R'} | Monto: ${pagoMovilMonto.trim() || formatUSD(order.totalPrice)} | Banco: ${pagoMovilBanco}`;
      case 'BINANCE':
        return `[BINANCE PAY] Ref/ID: ${binanceRef.trim() || 'S/R'} | Monto: ${binanceMonto.trim() || order.totalPrice} USDT${binanceUser.trim() ? ` | Usuario: ${binanceUser.trim()}` : ''}`;
      case 'ZELLE':
        return `[ZELLE] Titular: ${zelleTitular.trim() || 'N/A'} | Cuenta: ${zelleContacto.trim() || 'N/A'} | Ref: ${zelleRef.trim() || 'S/R'} | Monto: $${zelleMonto.trim() || order.totalPrice}`;
      case 'EFECTIVO':
        return `[EFECTIVO] Monto: $${efectivoMonto.trim() || order.totalPrice} USD | ${efectivoDetalle.trim() || 'Entregado en tienda'}`;
      default:
        return 'PAGO VERIFICADO';
    }
  };

  // Validación para habilitar el botón
  const isFormValid = () => {
    switch (method) {
      case 'PAGO_MOVIL':
        return Boolean(pagoMovilRef.trim() && pagoMovilMonto.trim());
      case 'BINANCE':
        return Boolean(binanceRef.trim() && binanceMonto.trim());
      case 'ZELLE':
        return Boolean(zelleTitular.trim() && zelleContacto.trim() && zelleRef.trim() && zelleMonto.trim());
      case 'EFECTIVO':
        return Boolean(efectivoMonto.trim());
      default:
        return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid() || isSubmitting) return;

    setIsSubmitting(true);
    const finalRef = getBuiltPaymentReference();

    const paymentData = {
      paymentMethod: method,
      paymentRef: finalRef,
      paymentDetails: {
        method,
        confirmedAt: new Date().toISOString(),
        ...(method === 'PAGO_MOVIL' ? { ref: pagoMovilRef, monto: pagoMovilMonto, banco: pagoMovilBanco } : {}),
        ...(method === 'BINANCE' ? { ref: binanceRef, montoUsdt: binanceMonto, user: binanceUser } : {}),
        ...(method === 'ZELLE' ? { titular: zelleTitular, contacto: zelleContacto, ref: zelleRef, monto: zelleMonto } : {}),
        ...(method === 'EFECTIVO' ? { montoUsd: efectivoMonto, detalle: efectivoDetalle } : {})
      }
    };

    try {
      await onConfirm(order.orderId, paymentData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg">
              <i className="fa-solid fa-receipt"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirmar Venta & Comprobante</h3>
              <p className="text-xs text-slate-400">
                Selecciona el método de pago recibido para registrarlo en la Base de Datos.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Resumen del Pedido */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
              {productImage ? (
                <img src={productImage} alt="" className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <i className="fa-solid fa-bolt text-amber-400 text-lg"></i>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand-400">#{order.orderId}</span>
                <span className="text-[11px] text-slate-300 font-medium truncate">{order.customerName}</span>
              </div>
              <div className="text-xs font-bold text-white truncate max-w-xs">{order.qty}x {order.coilName}</div>
              <div className="text-[10px] font-mono text-slate-400">Stock actual: {order.stockBefore} ➔ Descontará {order.qty} uds</div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total a Cobrar</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">{formatUSD(order.totalPrice)}</span>
          </div>
        </div>

        {/* Selector de Método de Pago */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">
            1. Selecciona el Método de Pago:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setMethod('PAGO_MOVIL')}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                method === 'PAGO_MOVIL'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-750'
              }`}
            >
              <i className="fa-solid fa-mobile-screen text-base"></i>
              <span>Pago Móvil</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('BINANCE')}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                method === 'BINANCE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-750'
              }`}
            >
              <i className="fa-brands fa-bitcoin text-base"></i>
              <span>Binance</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('ZELLE')}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                method === 'ZELLE'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-lg shadow-purple-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-750'
              }`}
            >
              <i className="fa-solid fa-building-columns text-base"></i>
              <span>Zelle</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('EFECTIVO')}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                method === 'EFECTIVO'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500 shadow-lg shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-750'
              }`}
            >
              <i className="fa-solid fa-money-bill-wave text-base"></i>
              <span>Efectivo ($)</span>
            </button>
          </div>
        </div>

        {/* Campos Específicos según el método */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
          {/* PAGO MÓVIL */}
          {method === 'PAGO_MOVIL' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Número de Referencia <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pagoMovilRef}
                    onChange={e => setPagoMovilRef(e.target.value)}
                    placeholder="Ej: 492019 (últimos 4 o 6 dígitos)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Monto Cobrado <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pagoMovilMonto}
                    onChange={e => setPagoMovilMonto(e.target.value)}
                    placeholder="Ej: Bs 3,250 o $34.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Banco Emisor / Receptor
                </label>
                <select
                  value={pagoMovilBanco}
                  onChange={e => setPagoMovilBanco(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Banesco">Banesco</option>
                  <option value="Mercantil">Banco Mercantil</option>
                  <option value="Banco de Venezuela">Banco de Venezuela (BDV)</option>
                  <option value="Bancaribe">Bancaribe</option>
                  <option value="BBVA Provincial">BBVA Provincial</option>
                  <option value="BNC">Banco Nacional de Crédito (BNC)</option>
                  <option value="BAM">Banco Activo</option>
                  <option value="Otro Banco">Otro Banco Nacional</option>
                </select>
              </div>
            </>
          )}

          {/* BINANCE PAY */}
          {method === 'BINANCE' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    ID / Referencia Binance Pay <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={binanceRef}
                    onChange={e => setBinanceRef(e.target.value)}
                    placeholder="Ej: 284920194 (Order ID)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Monto USDT <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={binanceMonto}
                    onChange={e => setBinanceMonto(e.target.value)}
                    placeholder="Ej: 34.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Usuario o Correo Binance (Opcional)
                </label>
                <input
                  type="text"
                  value={binanceUser}
                  onChange={e => setBinanceUser(e.target.value)}
                  placeholder="Ej: cliente@correo.com o Binance ID 982348"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </>
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
                    onChange={e => setZelleTitular(e.target.value)}
                    placeholder="Ej: Juan Carlos Pérez"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Teléfono o Correo Zelle <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={zelleContacto}
                    onChange={e => setZelleContacto(e.target.value)}
                    placeholder="Ej: +1 305-555-0199 o correo@gmail.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    N° Confirmación / Ref Zelle <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={zelleRef}
                    onChange={e => setZelleRef(e.target.value)}
                    placeholder="Ej: 98124018"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Monto Transferido ($) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={zelleMonto}
                    onChange={e => setZelleMonto(e.target.value)}
                    placeholder="Ej: 34.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* EFECTIVO */}
          {method === 'EFECTIVO' && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Monto Recibido en Dólares ($) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={efectivoMonto}
                  onChange={e => setEfectivoMonto(e.target.value)}
                  placeholder="Ej: 34.00 o 40.00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Detalle / Billetes / Cambio
                </label>
                <input
                  type="text"
                  value={efectivoDetalle}
                  onChange={e => setEfectivoDetalle(e.target.value)}
                  placeholder="Ej: Billete de $50, se entregaron $16 de vuelto"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Vista previa en tiempo real de cómo se guardará en la BDD */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
          <span className="text-[10px] text-slate-400 block font-semibold mb-1">
            <i className="fa-solid fa-database text-brand-400 mr-1"></i>
            Registro que se guardará en Supabase (columna <code className="text-sky-300">referencia_pago</code>):
          </span>
          <div className="font-mono text-[11px] text-emerald-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 break-all">
            {getBuiltPaymentReference()}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Registrando en BDD...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check-double"></i>
                <span>Confirmar & Guardar en BDD</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
