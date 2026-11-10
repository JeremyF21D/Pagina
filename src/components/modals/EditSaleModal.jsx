import React, { useState, useEffect, useMemo } from 'react';
import { formatUSD, detectProductCategory, getCategoryConfig } from '../../utils/formatters';
import { getCachedExchangeRates, formatVES } from '../../services/exchangeRatesService';

// Helper de parsing para extraer datos estructurados de referencia_pago
export function parsePaymentReference(rawText, defaultPrice = 0, defaultCustomer = '', defaultPhone = '') {
  const formattedTotal = formatUSD(defaultPrice || 0);
  const numTotal = Number(defaultPrice || 0).toFixed(2);

  const result = {
    method: 'PAGO_MOVIL',
    pagoMovilRef: '',
    pagoMovilMonto: formattedTotal,
    pagoMovilBanco: 'Banesco',
    binanceRef: '',
    binanceMonto: numTotal,
    binanceUser: '',
    zelleTitular: defaultCustomer && defaultCustomer !== 'Cliente' ? defaultCustomer : '',
    zelleContacto: defaultPhone || '',
    zelleRef: '',
    zelleMonto: numTotal,
    efectivoMonto: numTotal,
    efectivoDetalle: 'Pago exacto en divisas'
  };

  if (!rawText || typeof rawText !== 'string') return result;

  const text = rawText.trim();

  // 1. [PAGO MÓVIL]
  if (text.startsWith('[PAGO MÓVIL]') || text.startsWith('[PAGO MOVIL]')) {
    result.method = 'PAGO_MOVIL';
    const refMatch = text.match(/Ref:\s*([^|]+)/i);
    const montoMatch = text.match(/Monto:\s*([^|]+)/i);
    const bancoMatch = text.match(/Banco:\s*([^|]+)/i);
    if (refMatch) result.pagoMovilRef = refMatch[1].trim();
    if (montoMatch) result.pagoMovilMonto = montoMatch[1].trim();
    if (bancoMatch) result.pagoMovilBanco = bancoMatch[1].trim();
    return result;
  }

  // 2. [BINANCE PAY] o [BINANCE]
  if (text.startsWith('[BINANCE') || text.includes('BINANCE PAY')) {
    result.method = 'BINANCE';
    const refMatch = text.match(/Ref(?:\/ID)?:\s*([^|]+)/i);
    const montoMatch = text.match(/Monto:\s*([^|]+)/i);
    const userMatch = text.match(/Usuario:\s*([^|]+)/i);
    if (refMatch) result.binanceRef = refMatch[1].trim();
    if (montoMatch) result.binanceMonto = montoMatch[1].replace(/USDT/i, '').trim();
    if (userMatch) result.binanceUser = userMatch[1].trim();
    return result;
  }

  // 3. [ZELLE]
  if (text.startsWith('[ZELLE]')) {
    result.method = 'ZELLE';
    const titularMatch = text.match(/Titular:\s*([^|]+)/i);
    const cuentaMatch = text.match(/Cuenta:\s*([^|]+)/i);
    const refMatch = text.match(/Ref:\s*([^|]+)/i);
    const montoMatch = text.match(/Monto:\s*([^|]+)/i);
    if (titularMatch) result.zelleTitular = titularMatch[1].trim();
    if (cuentaMatch) result.zelleContacto = cuentaMatch[1].trim();
    if (refMatch) result.zelleRef = refMatch[1].trim();
    if (montoMatch) result.zelleMonto = montoMatch[1].replace(/^\$/, '').trim();
    return result;
  }

  // 4. [EFECTIVO]
  if (text.startsWith('[EFECTIVO]')) {
    result.method = 'EFECTIVO';
    const montoMatch = text.match(/Monto:\s*([^|]+)/i);
    if (montoMatch) {
      result.efectivoMonto = montoMatch[1].replace(/^\$/, '').replace(/USD/i, '').trim();
    }
    const parts = text.split('|');
    if (parts.length > 1) {
      result.efectivoDetalle = parts.slice(1).join('|').trim();
    }
    return result;
  }

  // Fallbacks para referencias de texto libre existentes
  const lower = text.toLowerCase();
  if (lower.includes('zelle')) {
    result.method = 'ZELLE';
    result.zelleRef = text.replace(/zelle/i, '').trim();
  } else if (lower.includes('binance') || lower.includes('usdt')) {
    result.method = 'BINANCE';
    result.binanceRef = text.replace(/binance/i, '').trim();
  } else if (lower.includes('efectivo') || lower.includes('cash') || lower.includes('dolar') || lower.includes('divisa')) {
    result.method = 'EFECTIVO';
    result.efectivoDetalle = text;
  } else {
    result.method = 'PAGO_MOVIL';
    result.pagoMovilRef = text.replace(/pago\s*m[oó]vil/i, '').replace(/ref:?/i, '').replace(/#/i, '').trim() || text;
  }

  return result;
}

export function EditSaleModal({ isOpen, order, coils = [], onClose, onSave }) {
  // ==============================================================
  // 1. TODOS LOS HOOKS ARRIBA (REGLAS ESTRICTAS DE REACT)
  // ==============================================================
  const [selectedCoilId, setSelectedCoilId] = useState('');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [status, setStatus] = useState('CONFIRMED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del selector visual de repuestos
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL');

  // Estados de Método y Campos de Pago (4 Métodos)
  const [paymentMethod, setPaymentMethod] = useState('PAGO_MOVIL'); // 'PAGO_MOVIL' | 'BINANCE' | 'ZELLE' | 'EFECTIVO'
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

  // Actualizar estados locales cuando cambia la orden
  useEffect(() => {
    if (order) {
      let rawPayment = order.paymentRef || '';
      let rawNotes = order.notes || '';
      if (rawPayment.includes(' | [AJUSTE: ')) {
        const parts = rawPayment.split(' | [AJUSTE: ');
        rawPayment = parts[0].trim();
        rawNotes = rawNotes || parts[1]?.replace(/\]$/, '').trim() || '';
      }

      setSelectedCoilId(order.coilId || (Array.isArray(coils) && coils[0]?.id) || '');
      setQty(Number(order.qty) || 1);
      setUnitPrice(Number(order.unitPrice || order.totalPrice || 0));
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setStatus(order.status || 'CONFIRMED');
      setNotes(rawNotes);
      setIsPickerOpen(false);
      setSearchQuery('');
      setSelectedBrandFilter('ALL');

      // Parsear datos de pago existentes
      const parsedPay = parsePaymentReference(
        rawPayment,
        order.totalPrice || order.unitPrice || 0,
        order.customerName,
        order.customerPhone
      );

      setPaymentMethod(parsedPay.method);
      setPagoMovilRef(parsedPay.pagoMovilRef);
      setPagoMovilMonto(parsedPay.pagoMovilMonto);
      setPagoMovilBanco(parsedPay.pagoMovilBanco);

      setBinanceRef(parsedPay.binanceRef);
      setBinanceMonto(parsedPay.binanceMonto);
      setBinanceUser(parsedPay.binanceUser);

      setZelleTitular(parsedPay.zelleTitular);
      setZelleContacto(parsedPay.zelleContacto);
      setZelleRef(parsedPay.zelleRef);
      setZelleMonto(parsedPay.zelleMonto);

      setEfectivoMonto(parsedPay.efectivoMonto);
      setEfectivoDetalle(parsedPay.efectivoDetalle);
    }
  }, [order, coils]);

  // Lista de marcas únicas para filtro rápido (siempre antes de cualquier return)
  const brandsList = useMemo(() => {
    if (!Array.isArray(coils)) return [];
    const brands = new Set();
    coils.forEach(c => { 
      if (c && c.brand) brands.add(String(c.brand).trim()); 
    });
    return Array.from(brands).sort();
  }, [coils]);

  // Filtrado en vivo de repuestos (siempre antes de cualquier return)
  const filteredCoils = useMemo(() => {
    if (!Array.isArray(coils)) return [];
    return coils.filter(c => {
      if (!c) return false;
      if (selectedBrandFilter !== 'ALL' && c.brand && c.brand.toLowerCase() !== selectedBrandFilter.toLowerCase()) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.brand || '').toLowerCase().includes(q) ||
        (c.carModel || '').toLowerCase().includes(q) ||
        (c.engine || '').toLowerCase().includes(q) ||
        (c.oem || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q)
      );
    });
  }, [coils, searchQuery, selectedBrandFilter]);

  // ==============================================================
  // 2. RETORNO CONDICIONAL DESPUÉS DE DECLARAR TODOS LOS HOOKS
  // ==============================================================
  if (!isOpen || !order) return null;

  // Obtener imagen del repuesto (bien sea coil.image o del almacén local de fotos)
  const getCoilImage = (coil) => {
    if (!coil) return null;
    if (coil.image) return coil.image;
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
        if (coil.id && stored[coil.id]) return stored[coil.id];
      } catch (e) {}
    }
    return null;
  };

  const currentSelectedCoil = Array.isArray(coils) ? coils.find(c => c && c.id && String(c.id).toLowerCase() === String(selectedCoilId).toLowerCase()) || null : null;
  const originalCoil = Array.isArray(coils) ? coils.find(c => c && c.id && String(c.id).toLowerCase() === String(order.coilId || '').toLowerCase()) || null : null;

  const isCoilChanged = Boolean(selectedCoilId && order.coilId && String(selectedCoilId).toLowerCase() !== String(order.coilId).toLowerCase());
  const calculatedTotal = (Number(unitPrice) || 0) * (Number(qty) || 1);

  const handleSelectCoil = (coil) => {
    if (!coil) return;
    setSelectedCoilId(coil.id);
    setIsPickerOpen(false);
    // Si el precio unitario es 0 o coincide con el repuesto anterior, sugerir el precio de lista del nuevo repuesto
    if (!unitPrice || unitPrice === 0 || unitPrice === originalCoil?.price) {
      setUnitPrice(coil.price || 0);
    }
  };

  // Construir la cadena de pago formateada según el método activo
  const getBuiltPaymentReference = () => {
    const totalCalc = formatUSD(calculatedTotal);
    const totalNum = Number(calculatedTotal || 0).toFixed(2);

    switch (paymentMethod) {
      case 'PAGO_MOVIL':
        return `[PAGO MÓVIL] Ref: ${pagoMovilRef.trim() || 'S/R'} | Monto: ${pagoMovilMonto.trim() || totalCalc} | Banco: ${pagoMovilBanco}`;
      case 'BINANCE':
        return `[BINANCE PAY] Ref/ID: ${binanceRef.trim() || 'S/R'} | Monto: ${binanceMonto.trim() || totalNum} USDT${binanceUser.trim() ? ` | Usuario: ${binanceUser.trim()}` : ''}`;
      case 'ZELLE':
        return `[ZELLE] Titular: ${zelleTitular.trim() || 'N/A'} | Cuenta: ${zelleContacto.trim() || 'N/A'} | Ref: ${zelleRef.trim() || 'S/R'} | Monto: $${zelleMonto.trim() || totalNum}`;
      case 'EFECTIVO':
        return `[EFECTIVO] Monto: $${efectivoMonto.trim() || totalNum} USD | ${efectivoDetalle.trim() || 'Entregado en tienda'}`;
      default:
        return 'PAGO VERIFICADO';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const builtRef = getBuiltPaymentReference();
    const finalPaymentRef = notes.trim() ? `${builtRef} | [AJUSTE: ${notes.trim()}]` : builtRef;

    try {
      await onSave(order.orderId, {
        coilId: selectedCoilId || order.coilId,
        coilName: currentSelectedCoil ? currentSelectedCoil.name : order.coilName,
        oem: currentSelectedCoil ? currentSelectedCoil.oem : order.oem,
        qty: Number(qty) || 1,
        unitPrice: Number(unitPrice) || 0,
        totalPrice: calculatedTotal,
        customerName,
        customerPhone,
        paymentRef: finalPaymentRef,
        status,
        notes: notes.trim(),
        paymentMethod,
        paymentDetails: {
          method: paymentMethod,
          ...(paymentMethod === 'PAGO_MOVIL' ? { ref: pagoMovilRef, monto: pagoMovilMonto, banco: pagoMovilBanco } : {}),
          ...(paymentMethod === 'BINANCE' ? { ref: binanceRef, montoUsdt: binanceMonto, user: binanceUser } : {}),
          ...(paymentMethod === 'ZELLE' ? { titular: zelleTitular, contacto: zelleContacto, ref: zelleRef, monto: zelleMonto } : {}),
          ...(paymentMethod === 'EFECTIVO' ? { montoUsd: efectivoMonto, detalle: efectivoDetalle } : {})
        }
      });
      onClose();
    } catch (err) {
      console.error('Error al guardar cambios de la venta:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentImg = getCoilImage(currentSelectedCoil);
  const originalImg = getCoilImage(originalCoil);

  const currentCat = getCategoryConfig(detectProductCategory(currentSelectedCoil));
  const originalCat = getCategoryConfig(detectProductCategory(originalCoil));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <i className="fa-solid fa-pen-to-square text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Editar Registro / Cambio de Repuesto</h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-sky-500/30 font-bold">
                  #{order.orderId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Selecciona la pieza con su foto, ajusta el precio cobrado y el método de pago dinámicamente.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Formulario con Scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs flex-1">

          {/* ============================================================== */}
          {/* SECCIÓN 1: SELECTOR VISUAL DE REPUESTOS CON FOTOS */}
          {/* ============================================================== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-box text-sky-400"></i>
                <span>Repuesto Entregado al Cliente</span>
              </label>

              {!isPickerOpen && (
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="px-3 py-1 bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                  <span>Cambiar por otro repuesto</span>
                </button>
              )}
            </div>

            {/* VISTA 1: TARJETA DEL PRODUCTO SELECCIONADO ACTUAL */}
            {!isPickerOpen && (
              <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Foto del repuesto */}
                  <div className="w-16 h-16 rounded-xl bg-white p-1 border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
                    {currentImg ? (
                      <img 
                        src={currentImg} 
                        alt={currentSelectedCoil?.name || order.coilName} 
                        className="max-h-full max-w-full object-contain mix-blend-multiply" 
                      />
                    ) : (
                      <i className={`${currentCat?.icon || 'fa-solid fa-box'} text-2xl text-slate-700`}></i>
                    )}
                  </div>

                  {/* Datos del repuesto */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-bold text-white text-xs sm:text-sm truncate">
                      {currentSelectedCoil ? currentSelectedCoil.name : (order.coilName || 'Repuesto Automotriz')}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-sky-300 border border-slate-700">
                        {currentSelectedCoil?.brand || 'Repuesto'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-800">
                        OEM: {currentSelectedCoil?.oem || order.oem || 'N/A'}
                      </span>
                      {currentSelectedCoil && (
                        <>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            currentSelectedCoil.stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            Stock: {currentSelectedCoil.stock} uds
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20">
                            Lista: ${currentSelectedCoil.price}
                          </span>
                        </>
                      )}
                    </div>
                    {currentSelectedCoil?.carModel && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Compatibilidad: {currentSelectedCoil.carModel}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-arrows-rotate text-sky-400"></i>
                    <span>Cambiar</span>
                  </button>
                  {currentSelectedCoil && (
                    <button
                      type="button"
                      onClick={() => setUnitPrice(currentSelectedCoil.price)}
                      className="text-[10px] text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
                      title="Asignar el precio de lista del catálogo"
                    >
                      Usar precio catálogo (${currentSelectedCoil.price})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* VISTA 2: PANEL BUSCADOR VISUAL DE REPUESTOS */}
            {isPickerOpen && (
              <div className="bg-slate-950 border border-sky-500/40 rounded-xl p-3.5 space-y-3 shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <i className="fa-solid fa-list-check text-sky-400"></i>
                    <span>Catálogo de Repuestos con Fotos (Elige el modelo):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(false)}
                    className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark mr-1"></i> Cerrar
                  </button>
                </div>

                {/* Filtros: Barra de búsqueda + Marca */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-500 text-xs"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, OEM, carro (ej: Tiida, Sentra, Corsa)..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
                      >
                        <i className="fa-solid fa-circle-xmark"></i>
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedBrandFilter}
                    onChange={(e) => setSelectedBrandFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="ALL">Todas las marcas ({brandsList.length})</option>
                    {brandsList.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
                  <span>Mostrando {filteredCoils.length} repuestos disponibles</span>
                  <span className="text-slate-500">Haz clic en cualquier pieza para seleccionarla</span>
                </div>

                {/* Lista Scrolleable de Repuestos con Fotos */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
                  {filteredCoils.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No se encontraron repuestos con el término "{searchQuery}".
                    </div>
                  ) : (
                    filteredCoils.map(coil => {
                      const img = getCoilImage(coil);
                      const cat = getCategoryConfig(detectProductCategory(coil));
                      const isSelected = String(coil.id).toLowerCase() === String(selectedCoilId).toLowerCase();

                      return (
                        <div
                          key={coil.id}
                          onClick={() => handleSelectCoil(coil)}
                          className={`pt-1.5 first:pt-0 p-2 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-sky-950/60 border border-sky-500/50' 
                              : 'hover:bg-slate-900/90 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Foto Thumbnail */}
                            <div className="w-12 h-12 rounded-lg bg-white p-1 border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
                              {img ? (
                                <img 
                                  src={img} 
                                  alt={coil.name} 
                                  className="max-h-full max-w-full object-contain mix-blend-multiply" 
                                />
                              ) : (
                                <i className={`${cat?.icon || 'fa-solid fa-box'} text-lg text-slate-700`}></i>
                              )}
                            </div>

                            {/* Detalles */}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-white text-xs truncate">
                                {coil.name}
                              </h5>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-0.5">
                                <span className="text-slate-400 font-semibold">{coil.brand}</span>
                                <span className="text-slate-600">•</span>
                                <span className="font-mono text-slate-300">OEM: {coil.oem || 'N/A'}</span>
                                <span className="text-slate-600">•</span>
                                <span className={coil.stock > 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                                  {coil.stock} en stock
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Precio y Botón */}
                          <div className="shrink-0 flex items-center gap-2.5">
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              ${coil.price}
                            </span>
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                isSelected 
                                ? 'bg-sky-600 text-white' 
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                              }`}
                            >
                              {isSelected ? 'Seleccionado' : 'Elegir'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* BANNER VISUAL COMPARATIVO: CAMBIO DE PRODUCTO DETECTADO */}
          {/* ============================================================== */}
          {isCoilChanged && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <i className="fa-solid fa-arrows-rotate text-sm"></i>
                <span>Gestión Automática de Intercambio de Repuestos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {/* Producto Devuelto */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-md bg-white p-0.5 border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                    {originalImg ? (
                      <img src={originalImg} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                    ) : (
                      <i className={`${originalCat?.icon || 'fa-solid fa-box'} text-slate-700 text-sm`}></i>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                      ↩️ Se Devuelve al Stock (+{qty})
                    </span>
                    <p className="text-white font-semibold truncate text-[11px]">
                      {order.coilName || originalCoil?.name || order.coilId}
                    </p>
                  </div>
                </div>

                {/* Producto Nuevo Entregado */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-md bg-white p-0.5 border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                    {currentImg ? (
                      <img src={currentImg} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                    ) : (
                      <i className={`${currentCat?.icon || 'fa-solid fa-box'} text-slate-700 text-sm`}></i>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-sky-400 font-bold uppercase block">
                      📦 Se Descuenta del Stock (-{qty})
                    </span>
                    <p className="text-white font-semibold truncate text-[11px]">
                      {currentSelectedCoil ? currentSelectedCoil.name : 'Nuevo Repuesto'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-amber-200/80 leading-relaxed">
                Al guardar, el sistema ajustará automáticamente las unidades en Supabase y en la web para que tu inventario físico coincida al 100%.
              </p>
            </div>
          )}

          {/* ============================================================== */}
          {/* SECCIÓN 2: PRECIOS Y CANTIDADES (CASO DE LOS $15) */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
            <div>
              <label className="block text-slate-300 font-semibold text-[11px] mb-1">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || 1, 10)))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold text-[11px] mb-1">
                Precio Cobrado (USD)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-500 font-mono text-xs">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 pl-6 text-white font-mono font-bold focus:outline-none focus:border-sky-500 text-xs"
                  placeholder="15.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold text-[11px] mb-1">
                Total Ajustado
              </label>
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2 text-center text-emerald-400 font-bold font-mono text-sm flex items-center justify-center">
                {formatUSD(calculatedTotal)}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECCIÓN 3: MOTIVO DEL CAMBIO / NOTA DE AUDITORÍA */}
          {/* ============================================================== */}
          <div>
            <label className="block text-slate-300 font-semibold text-[11px] mb-1">
              Motivo del Cambio o Ajuste (Auditoría)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Cliente llevó repuesto equivocado, se le cambió por otro modelo y se le cobró $15"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
            />
          </div>

          {/* ============================================================== */}
          {/* SECCIÓN 4: DATOS DEL CLIENTE Y ESTADO */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
            <div>
              <label className="block text-slate-300 font-semibold text-[11px] mb-1">
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-sky-500"
                placeholder="Nombre del cliente"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold text-[11px] mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-sky-500"
                placeholder="+58 412-0000000"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold text-[11px] mb-1">
                Estado de la Orden
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="CONFIRMED">CONFIRMADA (Descuenta stock)</option>
                <option value="PENDING_APPROVAL">PENDIENTE (Sin descontar stock)</option>
                <option value="REVERTED">REVERTIDA (Reintegra stock)</option>
              </select>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECCIÓN 5: TIPO DE PAGO DINÁMICO CON 4 ICONOS INTERACTIVOS */}
          {/* ============================================================== */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-wallet text-sky-400"></i>
                <span>Tipo de Pago & Comprobante</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Haz clic en el icono para alternar el método y sus campos
              </span>
            </div>

            {/* 4 Iconos de Métodos de Pago */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('PAGO_MOVIL')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                  paymentMethod === 'PAGO_MOVIL'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                }`}
              >
                <i className="fa-solid fa-mobile-screen text-base"></i>
                <span>Pago Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('BINANCE')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                  paymentMethod === 'BINANCE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                }`}
              >
                <i className="fa-brands fa-bitcoin text-base"></i>
                <span>Binance Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ZELLE')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                  paymentMethod === 'ZELLE'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                }`}
              >
                <i className="fa-solid fa-building-columns text-base"></i>
                <span>Zelle</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('EFECTIVO')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                  paymentMethod === 'EFECTIVO'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500 shadow-lg shadow-sky-500/20'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-900'
                }`}
              >
                <i className="fa-solid fa-money-bill-wave text-base"></i>
                <span>Efectivo ($)</span>
              </button>
            </div>

            {/* Campos Específicos según el método */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              {/* PAGO MÓVIL */}
              {paymentMethod === 'PAGO_MOVIL' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Número de Referencia <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={pagoMovilRef}
                        onChange={e => setPagoMovilRef(e.target.value)}
                        placeholder="Ej: 492019 (últimos 4 o 6 dígitos)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-300">
                          Monto Cobrado
                        </label>
                        <button
                          type="button"
                          onClick={() => setPagoMovilMonto(formatUSD(calculatedTotal))}
                          className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                        >
                          Usar {formatUSD(calculatedTotal)}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={pagoMovilMonto}
                        onChange={e => setPagoMovilMonto(e.target.value)}
                        placeholder="Ej: Bs 3,250 o $15.00"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      {/* Botones de conversión rápida a tasa Binance y BCV */}
                      {(() => {
                        const cachedRates = getCachedExchangeRates();
                        if (!cachedRates) return null;
                        return (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {cachedRates.binance > 0 && (
                              <button
                                type="button"
                                onClick={() => setPagoMovilMonto(formatVES(calculatedTotal * cachedRates.binance))}
                                className="text-[10px] bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded cursor-pointer transition font-mono"
                                title="Calcular automáticamente en Bolívares a tasa Binance P2P"
                              >
                                ⚡ Binance: {formatVES(calculatedTotal * cachedRates.binance)}
                              </button>
                            )}
                            {cachedRates.bcv > 0 && (
                              <button
                                type="button"
                                onClick={() => setPagoMovilMonto(formatVES(calculatedTotal * cachedRates.bcv))}
                                className="text-[10px] bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded cursor-pointer transition font-mono"
                                title="Calcular automáticamente en Bolívares a tasa oficial BCV"
                              >
                                🏛️ BCV: {formatVES(calculatedTotal * cachedRates.bcv)}
                              </button>
                            )}
                          </div>
                        );
                      })()}
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
                </div>
              )}

              {/* BINANCE PAY */}
              {paymentMethod === 'BINANCE' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        ID / Referencia Binance Pay <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={binanceRef}
                        onChange={e => setBinanceRef(e.target.value)}
                        placeholder="Ej: 284920194 (Order ID / Pay ID)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-300">
                          Monto USDT <span className="text-amber-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setBinanceMonto(Number(calculatedTotal || 0).toFixed(2))}
                          className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                        >
                          Usar {Number(calculatedTotal || 0).toFixed(2)} USDT
                        </button>
                      </div>
                      <input
                        type="text"
                        value={binanceMonto}
                        onChange={e => setBinanceMonto(e.target.value)}
                        placeholder="Ej: 15.00"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Usuario o Pay ID Binance (Opcional)
                    </label>
                    <input
                      type="text"
                      value={binanceUser}
                      onChange={e => setBinanceUser(e.target.value)}
                      placeholder="Ej: cliente@correo.com o Binance ID 982348"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* ZELLE */}
              {paymentMethod === 'ZELLE' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Nombre del Titular de la Cuenta <span className="text-purple-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={zelleTitular}
                        onChange={e => setZelleTitular(e.target.value)}
                        placeholder="Ej: Juan Carlos Pérez"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Teléfono o Correo Zelle <span className="text-purple-400">*</span>
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
                        N° Confirmación / Ref Zelle <span className="text-purple-400">*</span>
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-300">
                          Monto Transferido ($) <span className="text-purple-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setZelleMonto(Number(calculatedTotal || 0).toFixed(2))}
                          className="text-[10px] text-purple-400 hover:underline cursor-pointer"
                        >
                          Usar ${Number(calculatedTotal || 0).toFixed(2)}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={zelleMonto}
                        onChange={e => setZelleMonto(e.target.value)}
                        placeholder="Ej: 15.00"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* EFECTIVO */}
              {paymentMethod === 'EFECTIVO' && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300">
                        Monto Recibido en Dólares ($) <span className="text-sky-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setEfectivoMonto(Number(calculatedTotal || 0).toFixed(2))}
                        className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                      >
                        Usar ${Number(calculatedTotal || 0).toFixed(2)}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={efectivoMonto}
                      onChange={e => setEfectivoMonto(e.target.value)}
                      placeholder="Ej: 15.00 o 20.00"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
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
                      placeholder="Ej: Billete de $20, se entregaron $5 de vuelto"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Vista previa en tiempo real de cómo se guardará en Supabase */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-semibold mb-1">
                <i className="fa-solid fa-database text-sky-400 mr-1"></i>
                Registro en Supabase (columna <code className="text-sky-300">referencia_pago</code>):
              </span>
              <div className="font-mono text-[11px] text-emerald-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 break-all">
                {getBuiltPaymentReference()}
                {notes.trim() && <span className="text-amber-300"> | [AJUSTE: {notes.trim()}]</span>}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* BOTONES DE ACCIÓN */}
          {/* ============================================================== */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 transition cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Guardando en Supabase...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
