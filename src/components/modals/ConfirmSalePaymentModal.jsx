import React, { useState, useEffect } from 'react';
import { formatUSD } from '../../utils/formatters';
import { getCachedExchangeRates, formatVES } from '../../services/exchangeRatesService';

export function ConfirmSalePaymentModal({ isOpen, order, coils = [], onClose, onConfirm }) {
  const [method, setMethod] = useState('PAGO_MOVIL'); // 'PAGO_MOVIL' | 'BINANCE' | 'ZELLE' | 'EFECTIVO'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campos específicos
  const [pagoMovilRef, setPagoMovilRef] = useState('');
  const [pagoMovilMonto, setPagoMovilMonto] = useState('');
  const [pagoMovilMontoVES, setPagoMovilMontoVES] = useState('');
  const [pagoMovilMontoUSD, setPagoMovilMontoUSD] = useState('');
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
  const [generateInvoiceNow, setGenerateInvoiceNow] = useState(true);

  // Precargar datos cuando se abre el modal con una orden
  useEffect(() => {
    if (order) {
      const totalUSD = Number(order.totalPrice || 0);
      const totalFormatted = formatUSD(totalUSD);
      const totalNumber = totalUSD.toFixed(2);

      const cachedRates = getCachedExchangeRates();
      const rate = Number(order.exchangeRateBinance) || Number(cachedRates?.binance) || 1;
      const initialVES = (totalUSD * rate).toFixed(2);

      setPagoMovilRef('');
      setPagoMovilMontoUSD(totalUSD > 0 ? totalNumber : '');
      setPagoMovilMontoVES(totalUSD > 0 ? initialVES : '');
      setPagoMovilMonto(totalUSD > 0 ? `Bs. ${initialVES} ($${totalNumber})` : totalFormatted);
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

  const cachedRates = getCachedExchangeRates();
  const effectiveRate = Number(order?.exchangeRateBinance) || Number(cachedRates?.binance) || 1;

  const handleVESChange = (e) => {
    const val = e.target.value;
    setPagoMovilMontoVES(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && effectiveRate > 0) {
      const usd = (num / effectiveRate).toFixed(2);
      setPagoMovilMontoUSD(usd);
      setPagoMovilMonto(`Bs. ${val} ($${usd})`);
    } else {
      setPagoMovilMonto(val ? `Bs. ${val}` : '');
    }
  };

  const handleUSDChange = (e) => {
    const val = e.target.value;
    setPagoMovilMontoUSD(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && effectiveRate > 0) {
      const ves = (num * effectiveRate).toFixed(2);
      setPagoMovilMontoVES(ves);
      setPagoMovilMonto(`Bs. ${ves} ($${val})`);
    } else {
      setPagoMovilMonto(val ? `$${val}` : '');
    }
  };

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
        const displayMonto = pagoMovilMontoVES 
          ? `Bs. ${pagoMovilMontoVES}${pagoMovilMontoUSD ? ` (~$${pagoMovilMontoUSD} USD)` : ''}`
          : (pagoMovilMonto.trim() || formatUSD(order.totalPrice));
        return `[PAGO MÓVIL] Ref: ${pagoMovilRef.trim() || 'S/R'} | Monto: ${displayMonto} | Banco: ${pagoMovilBanco}`;
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
        return Boolean(pagoMovilRef.trim() && (pagoMovilMontoVES.trim() || pagoMovilMonto.trim()));
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
      openReceipt: generateInvoiceNow,
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
      className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-modal-pop text-slate-900 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-lg">
              <i className="fa-solid fa-receipt"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Confirmar Venta & Comprobante</h3>
              <p className="text-xs text-slate-500">
                Selecciona el método de pago recibido para registrarlo en la Base de Datos.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Resumen del Pedido */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
              {order.items && order.items.length > 1 ? (
                <i className="fa-solid fa-boxes-packing text-red-600 text-xl"></i>
              ) : productImage ? (
                <img src={productImage} alt="" className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <i className="fa-solid fa-bolt text-red-600 text-lg"></i>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">#{order.orderId}</span>
                <span className="text-[11px] text-slate-700 font-bold truncate">{order.customerName}</span>
              </div>
              {order.items && order.items.length > 1 ? (
                <>
                  <div className="text-xs font-bold text-slate-900 truncate max-w-xs">
                    {order.items.length} repuestos distintos ({order.items.reduce((acc, it) => acc + (it.qty || 1), 0)} uds)
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-xs">
                    {order.items.map(it => `${it.qty}x ${it.name}`).join(', ')}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold text-slate-900 truncate max-w-xs">{order.qty}x {order.coilName}</div>
                  <div className="text-[10px] font-mono text-slate-500">Stock actual: {order.stockBefore} ➔ Descontará {order.qty} uds</div>
                </>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Total a Cobrar</span>
            <span className="text-base font-extrabold text-emerald-600 font-mono">{formatUSD(order.totalPrice)}</span>
          </div>
        </div>

        {/* Selector de Método de Pago */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            1. Selecciona el Método de Pago:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setMethod('PAGO_MOVIL')}
              className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                method === 'PAGO_MOVIL'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                  ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                  ? 'bg-slate-900 text-white border-slate-950 shadow-md shadow-slate-900/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <i className="fa-solid fa-money-bill-wave text-base"></i>
              <span>Efectivo ($)</span>
            </button>
          </div>
        </div>

        {/* Campos Específicos según el método */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
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
              </div>

              {/* Conversión Dual Limpia: Bolívares <-> Dólares */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center justify-between">
                      <span>Monto en Bolívares (Bs.) <span className="text-rose-400">*</span></span>
                      <span className="text-[10px] text-emerald-400 font-mono">Transferido</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 text-xs font-mono font-bold">Bs.</span>
                      <input
                        type="number"
                        step="any"
                        value={pagoMovilMontoVES}
                        onChange={handleVESChange}
                        placeholder="Ej: 3500.00"
                        className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center justify-between">
                      <span>Equivalente en Dólares ($ USD)</span>
                      <span className="text-[10px] text-amber-400 font-mono">Conversión</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 text-xs font-mono font-bold">$</span>
                      <input
                        type="number"
                        step="any"
                        value={pagoMovilMontoUSD}
                        onChange={handleUSDChange}
                        placeholder="Ej: 15.00"
                        className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Tasa sutil y limpia */}
                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <i className="fa-solid fa-calculator text-amber-400"></i>
                    <span>Tasa aplicada: <strong>1 USD = {effectiveRate} Bs.</strong></span>
                  </span>
                  {order.exchangeRateBinance > 0 ? (
                    <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                      🔒 Tasa congelada de la orden
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                      ⚡ Binance P2P
                    </span>
                  )}
                </div>
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
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <span className="text-[10px] text-slate-500 block font-semibold mb-1">
            <i className="fa-solid fa-database text-red-600 mr-1"></i>
            Registro que se guardará en Supabase (columna <code className="text-red-600 font-bold">referencia_pago</code>):
          </span>
          <div className="font-mono text-[11px] text-emerald-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 break-all shadow-xs">
            {getBuiltPaymentReference()}
          </div>
        </div>

        {/* Opción para generar factura formal inmediatamente */}
        <label className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl cursor-pointer select-none hover:bg-amber-100 transition">
          <input
            type="checkbox"
            checked={generateInvoiceNow}
            onChange={e => setGenerateInvoiceNow(e.target.checked)}
            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-white border-slate-300 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <i className="fa-solid fa-file-invoice text-amber-600"></i> Generar e imprimir factura oficial inmediatamente
            </span>
            <span className="text-[10px] text-slate-600 block mt-0.5">
              Abre el comprobante digital con RIF y desglose listo para imprimir en PDF o enviar por WhatsApp.
            </span>
          </div>
        </label>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/25 flex items-center gap-2 transition cursor-pointer"
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
