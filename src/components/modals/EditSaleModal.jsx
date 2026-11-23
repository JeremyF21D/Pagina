import React, { useState, useEffect, useMemo } from 'react';
import { formatUSD, detectProductCategory, getCategoryConfig, matchesSearchTerms } from '../../utils/formatters';
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
    if (bancoMatch) result.pagoMovilBanco = bancoMatch[1].trim();
    if (montoMatch) {
      const rawMonto = montoMatch[1].trim();
      result.pagoMovilMonto = rawMonto;
      const bsMatch = rawMonto.match(/Bs\.?\s*([0-9.,]+)/i);
      const usdMatch = rawMonto.match(/~\$([0-9.,]+)/i) || rawMonto.match(/\$([0-9.,]+)/i);
      if (bsMatch) result.pagoMovilMontoVES = bsMatch[1].trim();
      if (usdMatch) result.pagoMovilMontoUSD = usdMatch[1].trim();
      if (!bsMatch && !usdMatch) {
        const numOnly = rawMonto.replace(/[^0-9.]/g, '');
        if (numOnly) result.pagoMovilMontoVES = numOnly;
      }
    }
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

export function EditSaleModal({ isOpen, order, coils = [], onClose, onSave, onUpdateOrder, onDelete }) {
  // ==============================================================
  // 1. TODOS LOS HOOKS ARRIBA (REGLAS ESTRICTAS DE REACT)
  // ==============================================================
  const [itemsList, setItemsList] = useState([]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
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

      const initialItems = (order.items && Array.isArray(order.items) && order.items.length > 0)
        ? JSON.parse(JSON.stringify(order.items))
        : [{
            coilId: order.coilId,
            name: order.coilName,
            oem: order.oem,
            qty: Number(order.qty) || 1,
            unitPrice: Number(order.unitPrice || order.totalPrice || 0),
            subtotal: Number(order.totalPrice || 0)
          }];

      setItemsList(initialItems);
      setActiveItemIndex(0);

      const firstItem = initialItems[0];
      setSelectedCoilId(firstItem.coilId || order.coilId || (Array.isArray(coils) && coils[0]?.id) || '');
      setQty(Number(firstItem.qty) || Number(order.qty) || 1);
      setUnitPrice(Number(firstItem.unitPrice || order.unitPrice || order.totalPrice || 0));
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

      const cachedRates = getCachedExchangeRates();
      const rate = Number(order.exchangeRateBinance) || Number(cachedRates?.binance) || 1;
      const totalOrderUSD = Number(order.totalPrice || order.unitPrice || 0);

      let initialVES = parsedPay.pagoMovilMontoVES || '';
      let initialUSD = parsedPay.pagoMovilMontoUSD || '';

      if (!initialVES && !initialUSD) {
        initialUSD = totalOrderUSD > 0 ? totalOrderUSD.toFixed(2) : '';
        initialVES = totalOrderUSD > 0 && rate > 0 ? (totalOrderUSD * rate).toFixed(2) : '';
      } else if (initialVES && !initialUSD && rate > 0) {
        const numVES = parseFloat(initialVES.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(numVES) && numVES > 0) initialUSD = (numVES / rate).toFixed(2);
      } else if (!initialVES && initialUSD && rate > 0) {
        const numUSD = parseFloat(initialUSD);
        if (!isNaN(numUSD) && numUSD > 0) initialVES = (numUSD * rate).toFixed(2);
      }

      setPaymentMethod(parsedPay.method);
      setPagoMovilRef(parsedPay.pagoMovilRef);
      setPagoMovilMonto(parsedPay.pagoMovilMonto || (initialVES ? `Bs. ${initialVES} (~$${initialUSD} USD)` : ''));
      setPagoMovilMontoVES(initialVES);
      setPagoMovilMontoUSD(initialUSD);
      setPagoMovilBanco(parsedPay.pagoMovilBanco || 'Banesco');

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

      return matchesSearchTerms([
        c.name,
        c.brand,
        c.carModel,
        c.engine,
        c.oem,
        c.id,
        c.type,
        c.connector
      ], searchQuery);
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

  const currentActiveItem = itemsList[activeItemIndex] || itemsList[0] || {};
  const currentSelectedCoil = Array.isArray(coils) ? coils.find(c => c && c.id && String(c.id).toLowerCase() === String(selectedCoilId).toLowerCase()) || null : null;
  const originalCoil = Array.isArray(coils) 
    ? coils.find(c => c && c.id && String(c.id).toLowerCase() === String(currentActiveItem.coilId || order.coilId || '').toLowerCase()) || null 
    : null;

  const isCoilChanged = Boolean(
    selectedCoilId && 
    currentActiveItem.coilId && 
    String(selectedCoilId).toLowerCase() !== String(currentActiveItem.coilId).toLowerCase()
  );

  const cachedRates = getCachedExchangeRates();
  const effectiveRate = Number(order?.exchangeRateBinance) || Number(cachedRates?.binance) || 1;

  const handleVESChange = (e) => {
    const val = e.target.value;
    setPagoMovilMontoVES(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && effectiveRate > 0) {
      const usd = (num / effectiveRate).toFixed(2);
      setPagoMovilMontoUSD(usd);
      setPagoMovilMonto(`Bs. ${val} (~$${usd} USD)`);
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
      setPagoMovilMonto(`Bs. ${ves} (~$${val} USD)`);
    } else {
      setPagoMovilMonto(val ? `$${val}` : '');
    }
  };

  const calculatedTotal = itemsList.length > 1
    ? itemsList.reduce((acc, it, idx) => {
        if (idx === activeItemIndex) {
          return acc + ((Number(unitPrice) || 0) * (Number(qty) || 1));
        }
        return acc + ((Number(it.unitPrice) || 0) * (Number(it.qty) || 1));
      }, 0)
    : (Number(unitPrice) || 0) * (Number(qty) || 1);

  const handleSwitchActiveItem = (newIndex) => {
    if (newIndex === activeItemIndex) return;

    // Guardar los cambios del ítem saliente
    const curCoil = Array.isArray(coils) ? coils.find(c => c && c.id && String(c.id).toLowerCase() === String(selectedCoilId).toLowerCase()) : null;
    const updated = itemsList.map((it, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...it,
          coilId: selectedCoilId,
          name: curCoil ? curCoil.name : it.name,
          oem: curCoil ? curCoil.oem : it.oem,
          qty: Number(qty) || 1,
          unitPrice: Number(unitPrice) || 0,
          subtotal: (Number(unitPrice) || 0) * (Number(qty) || 1)
        };
      }
      return it;
    });

    setItemsList(updated);
    setActiveItemIndex(newIndex);

    const targetItem = updated[newIndex] || itemsList[newIndex];
    if (targetItem) {
      setSelectedCoilId(targetItem.coilId || targetItem.id || '');
      setQty(Number(targetItem.qty) || 1);
      setUnitPrice(Number(targetItem.unitPrice) || 0);
    }
    setIsPickerOpen(false);
  };

  const handleSelectCoil = (coil) => {
    if (!coil) return;
    setSelectedCoilId(coil.id);
    setIsPickerOpen(false);
    setUnitPrice(coil.price || 0);

    setItemsList(prev => prev.map((it, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...it,
          coilId: coil.id,
          name: coil.name,
          oem: coil.oem,
          unitPrice: coil.price || 0,
          subtotal: (coil.price || 0) * (Number(qty) || 1)
        };
      }
      return it;
    }));
  };

  const handleQtyChange = (val) => {
    const q = Math.max(1, parseInt(val || 1, 10));
    setQty(q);
    setItemsList(prev => prev.map((it, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...it,
          qty: q,
          subtotal: (Number(unitPrice) || 0) * q
        };
      }
      return it;
    }));
  };

  const handleUnitPriceChange = (val) => {
    const p = parseFloat(val) || 0;
    setUnitPrice(p);
    setItemsList(prev => prev.map((it, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...it,
          unitPrice: p,
          subtotal: p * (Number(qty) || 1)
        };
      }
      return it;
    }));
  };

  // Construir la cadena de pago formateada según el método activo
  const getBuiltPaymentReference = () => {
    const totalCalc = formatUSD(calculatedTotal);
    const totalNum = Number(calculatedTotal || 0).toFixed(2);

    switch (paymentMethod) {
      case 'PAGO_MOVIL':
        const displayMonto = pagoMovilMontoVES 
          ? `Bs. ${pagoMovilMontoVES}${pagoMovilMontoUSD ? ` (~$${pagoMovilMontoUSD} USD)` : ''}`
          : (pagoMovilMonto.trim() || totalCalc);
        return `[PAGO MÓVIL] Ref: ${pagoMovilRef.trim() || 'S/R'} | Monto: ${displayMonto} | Banco: ${pagoMovilBanco}`;
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

    const curCoil = Array.isArray(coils) ? coils.find(c => c && c.id && String(c.id).toLowerCase() === String(selectedCoilId).toLowerCase()) : null;
    const finalItems = itemsList.map((it, idx) => {
      if (idx === activeItemIndex) {
        return {
          ...it,
          coilId: selectedCoilId,
          name: curCoil ? curCoil.name : it.name,
          oem: curCoil ? curCoil.oem : it.oem,
          qty: Number(qty) || 1,
          unitPrice: Number(unitPrice) || 0,
          subtotal: (Number(unitPrice) || 0) * (Number(qty) || 1)
        };
      }
      return it;
    });

    const isMulti = finalItems.length > 1;
    const totalOrderQty = finalItems.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
    const summaryCoilName = isMulti 
      ? finalItems.map(it => `${it.qty}x ${it.name}`).join(', ')
      : (curCoil ? curCoil.name : order.coilName);

    const inventoryAdjustments = [];
    if (order.status === 'CONFIRMED' && isCoilChanged) {
      if (currentActiveItem.coilId) {
        inventoryAdjustments.push({ coilId: currentActiveItem.coilId, delta: Number(currentActiveItem.qty) || 1 });
      }
      if (selectedCoilId) {
        inventoryAdjustments.push({ coilId: selectedCoilId, delta: -(Number(qty) || 1) });
      }
    }

    try {
      const saveHandler = onSave || onUpdateOrder;
      if (typeof saveHandler === 'function') {
        await saveHandler(order.orderId, {
          items: finalItems,
          inventoryAdjustments: inventoryAdjustments.length > 0 ? inventoryAdjustments : undefined,
          coilId: selectedCoilId || order.coilId,
          coilName: summaryCoilName,
          oem: curCoil ? curCoil.oem : order.oem,
          qty: isMulti ? totalOrderQty : (Number(qty) || 1),
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
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-x-hidden">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-modal-pop text-slate-900">
        
        {/* Encabezado Fijo */}
        <div className="flex items-start sm:items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-white shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <i className="fa-solid fa-pen-to-square text-sm sm:text-base"></i>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">Editar Venta</h3>
                <span className="font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold shrink-0">
                  #{order.orderId}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate mt-0.5">
                Ajusta la pieza, precio o método de pago
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Formulario con Scroll Interno y Footer Fijo */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          <div className="p-3 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto text-xs flex-1 custom-scrollbar">

            {/* Selector de Artículos para Órdenes con Varios Repuestos */}
            {itemsList.length > 1 && (
              <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-2xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-layer-group"></i>
                    <span>Artículos de la Orden ({itemsList.length} repuestos)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Selecciona cuál deseas cambiar:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {itemsList.map((it, idx) => {
                    const isCurActive = idx === activeItemIndex;
                    const itCoil = coils.find(c => {
                      const tid = it.coilId || it.id;
                      return tid && c.id && String(c.id).toLowerCase() === String(tid).toLowerCase();
                    });
                    const itImg = getCoilImage(itCoil) || it.image;

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSwitchActiveItem(idx)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-2.5 text-left relative ${
                          isCurActive
                            ? 'bg-red-50 border-red-500 ring-2 ring-red-500/30 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
                          itImg ? 'bg-white border border-slate-200 p-0.5' : 'bg-slate-100 border border-slate-200'
                        }`}>
                          {itImg ? (
                            <img src={itImg} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                          ) : (
                            <i className="fa-solid fa-bolt text-red-600 text-sm"></i>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono text-slate-500 font-bold">Ítem #{idx + 1}</span>
                            {isCurActive && (
                              <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.2 rounded font-extrabold uppercase">
                                Editando
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-900 truncate text-xs">{it.name}</div>
                          <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono">
                            <span>{it.qty} ud(s)</span>
                            <span className="text-emerald-600 font-bold">{formatUSD(it.subtotal || (it.unitPrice * it.qty))}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SECCIÓN 1: SELECTOR VISUAL DE REPUESTOS CON FOTOS */}
            {/* ============================================================== */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-slate-700 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-box text-red-600"></i>
                  <span>Repuesto Entregado {itemsList.length > 1 ? `(Ítem #${activeItemIndex + 1})` : ''}</span>
                </label>

                {!isPickerOpen && (
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="self-start sm:self-auto px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold text-[10px] sm:text-[11px] transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <i className="fa-solid fa-magnifying-glass text-xs"></i>
                    <span>Cambiar por otro repuesto</span>
                  </button>
                )}
              </div>

              {/* VISTA 1: TARJETA DEL PRODUCTO SELECCIONADO ACTUAL */}
              {!isPickerOpen && (
                <div className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Foto del repuesto */}
                    <div className="w-16 h-16 rounded-xl bg-white p-1 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                      {currentImg ? (
                        <img 
                          src={currentImg} 
                          alt={currentSelectedCoil?.name || order.coilName} 
                          className="max-h-full max-w-full object-contain mix-blend-multiply" 
                        />
                      ) : (
                        <i className={`${currentCat?.icon || 'fa-solid fa-box'} text-2xl text-slate-400`}></i>
                      )}
                    </div>

                    {/* Datos del repuesto */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {currentSelectedCoil ? currentSelectedCoil.name : (order.coilName || 'Repuesto Automotriz')}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                          {currentSelectedCoil?.brand || 'Repuesto'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-700 bg-white border border-slate-200">
                          OEM: {currentSelectedCoil?.oem || order.oem || 'N/A'}
                        </span>
                        {currentSelectedCoil && (
                          <>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              currentSelectedCoil.stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              Stock: {currentSelectedCoil.stock} uds
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-red-700 bg-red-50 border border-red-200">
                              Lista: ${currentSelectedCoil.price}
                            </span>
                          </>
                        )}
                      </div>
                      {currentSelectedCoil?.carModel && (
                        <p className="text-[10px] text-slate-500 truncate">
                          Compatibilidad: {currentSelectedCoil.carModel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <i className="fa-solid fa-arrows-rotate text-red-600"></i>
                      <span>Cambiar</span>
                    </button>
                    {currentSelectedCoil && (
                      <button
                        type="button"
                        onClick={() => setUnitPrice(currentSelectedCoil.price)}
                        className="text-[10px] text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
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
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-md animate-fadeIn">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <i className="fa-solid fa-list-check text-red-600"></i>
                      <span>Catálogo de Repuestos con Fotos (Elige el modelo):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(false)}
                      className="text-[11px] text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-white border border-slate-200 transition cursor-pointer"
                    >
                      <i className="fa-solid fa-xmark mr-1"></i> Cerrar
                    </button>
                  </div>

                  {/* Filtros: Barra de búsqueda + Marca */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre, OEM, carro (ej: Tiida, Sentra, Corsa)..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 text-xs"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          <i className="fa-solid fa-circle-xmark"></i>
                        </button>
                      )}
                    </div>

                    <select
                      value={selectedBrandFilter}
                      onChange={(e) => setSelectedBrandFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="ALL">Todas las marcas ({brandsList.length})</option>
                      {brandsList.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center justify-between px-1">
                    <span>Mostrando {filteredCoils.length} repuestos disponibles</span>
                    <span className="text-slate-400">Haz clic en cualquier pieza para seleccionarla</span>
                  </div>

                  {/* Lista Scrolleable de Repuestos con Fotos */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-200">
                    {filteredCoils.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
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
                                ? 'bg-red-50 border border-red-300' 
                                : 'hover:bg-white border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Foto Thumbnail */}
                              <div className="w-12 h-12 rounded-lg bg-white p-1 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                                {img ? (
                                  <img 
                                    src={img} 
                                    alt={coil.name} 
                                    className="max-h-full max-w-full object-contain mix-blend-multiply" 
                                  />
                                ) : (
                                  <i className={`${cat?.icon || 'fa-solid fa-box'} text-lg text-slate-400`}></i>
                                )}
                              </div>

                              {/* Detalles */}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-slate-900 text-xs truncate">
                                  {coil.name}
                                </h5>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-0.5">
                                  <span className="text-slate-600 font-semibold">{coil.brand}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono text-slate-600">OEM: {coil.oem || 'N/A'}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className={coil.stock > 0 ? 'text-emerald-700 font-medium' : 'text-rose-600 font-medium'}>
                                    {coil.stock} en stock
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Precio y Botón */}
                            <div className="shrink-0 flex items-center gap-2.5">
                              <span className="font-mono font-bold text-emerald-600 text-xs">
                                ${coil.price}
                              </span>
                              <button
                                type="button"
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                                  isSelected 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 animate-fadeIn">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <i className="fa-solid fa-arrows-rotate text-sm text-amber-600"></i>
                  <span>Gestión Automática de Intercambio de Repuestos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {/* Producto Devuelto */}
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center gap-2.5 shadow-xs">
                    <div className="w-10 h-10 rounded-md bg-slate-50 p-0.5 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                      {originalImg ? (
                        <img src={originalImg} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      ) : (
                        <i className={`${originalCat?.icon || 'fa-solid fa-box'} text-slate-400 text-sm`}></i>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                        ↩️ Se Devuelve al Stock (+{qty})
                      </span>
                      <p className="text-slate-900 font-semibold truncate text-[11px]">
                        {currentActiveItem.name || order.coilName || originalCoil?.name || order.coilId}
                      </p>
                    </div>
                  </div>

                  {/* Producto Nuevo Entregado */}
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center gap-2.5 shadow-xs">
                    <div className="w-10 h-10 rounded-md bg-slate-50 p-0.5 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                      {currentImg ? (
                        <img src={currentImg} alt="" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      ) : (
                        <i className={`${currentCat?.icon || 'fa-solid fa-box'} text-slate-400 text-sm`}></i>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-red-600 font-bold uppercase block">
                        📦 Se Descuenta del Stock (-{qty})
                      </span>
                      <p className="text-slate-900 font-semibold truncate text-[11px]">
                        {currentSelectedCoil ? currentSelectedCoil.name : 'Nuevo Repuesto'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Al guardar, el sistema ajustará automáticamente las unidades en Supabase y en la web para que tu inventario físico coincida al 100%.
                </p>
              </div>
            )}

            {/* ============================================================== */}
            {/* SECCIÓN 2: PRECIOS Y CANTIDADES (CASO DE LOS $15) */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-slate-700 font-bold text-[11px] mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={qty}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-center focus:bg-white focus:outline-none focus:border-red-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-[11px] mb-1">
                  Precio Cobrado (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-slate-400 font-mono text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-6 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-red-500 text-xs"
                    placeholder="15.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-[11px] mb-1">
                  Total Ajustado
                </label>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center text-emerald-700 font-extrabold font-mono text-sm flex items-center justify-center">
                  {formatUSD(calculatedTotal)}
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECCIÓN 3: MOTIVO DEL CAMBIO / NOTA DE AUDITORÍA */}
            {/* ============================================================== */}
            <div>
              <label className="block text-slate-700 font-bold text-[11px] mb-1">
                Motivo del Cambio o Ajuste (Auditoría)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Cliente llevó repuesto equivocado, se le cambió por otro modelo y se le cobró $15"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-500 text-xs"
              />
            </div>

            {/* ============================================================== */}
            {/* SECCIÓN 4: DATOS DEL CLIENTE Y ESTADO */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-slate-700 font-bold text-[11px] mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:border-red-500"
                  placeholder="Nombre del cliente"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-[11px] mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-red-500"
                  placeholder="+58 412-0000000"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-[11px] mb-1">
                  Estado de la Orden
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer"
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
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-slate-700 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-wallet text-red-600"></i>
                  <span>Tipo de Pago & Comprobante</span>
                </label>
                <span className="text-[10px] text-slate-500">
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
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                      ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                      ? 'bg-slate-900 text-white border-slate-950 shadow-md shadow-slate-900/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <i className="fa-solid fa-money-bill-wave text-base"></i>
                  <span>Efectivo ($)</span>
                </button>
              </div>

              {/* Campos Específicos según el método */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                {/* PAGO MÓVIL */}
                {paymentMethod === 'PAGO_MOVIL' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Número de Referencia <span className="text-emerald-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={pagoMovilRef}
                          onChange={e => setPagoMovilRef(e.target.value)}
                          placeholder="Ej: 492019 (últimos 4 o 6 dígitos)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Banco Emisor / Receptor
                        </label>
                        <select
                          value={pagoMovilBanco}
                          onChange={e => setPagoMovilBanco(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
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

                    {/* Conversor Dual Limpio: Bolívares <-> Dólares */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                            <span>Monto en Bolívares (Bs.) <span className="text-emerald-600">*</span></span>
                            <span className="text-[10px] text-emerald-600 font-mono font-bold">Transferido</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono font-bold">Bs.</span>
                            <input
                              type="number"
                              step="any"
                              value={pagoMovilMontoVES}
                              onChange={handleVESChange}
                              placeholder="Ej: 38000"
                              className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center justify-between">
                            <span>Equivalente en Dólares ($ USD)</span>
                            <span className="text-[10px] text-amber-600 font-mono font-bold">Conversión</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono font-bold">$</span>
                            <input
                              type="number"
                              step="any"
                              value={pagoMovilMontoUSD}
                              onChange={handleUSDChange}
                              placeholder="Ej: 35.60"
                              className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tasa aplicada sutil y clara */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px] font-mono text-slate-500 border-t border-slate-100">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <i className="fa-solid fa-calculator text-amber-500"></i>
                          <span>Tasa aplicada: <strong>1 USD = {effectiveRate} Bs.</strong></span>
                        </span>
                        {order.exchangeRateBinance > 0 ? (
                          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                            🔒 Tasa congelada de la orden
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                            ⚡ Tasa Binance en vivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* BINANCE PAY */}
                {paymentMethod === 'BINANCE' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          ID / Referencia Binance Pay <span className="text-amber-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={binanceRef}
                          onChange={e => setBinanceRef(e.target.value)}
                          placeholder="Ej: 284920194 (Order ID / Pay ID)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            Monto USDT <span className="text-amber-600">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setBinanceMonto(Number(calculatedTotal || 0).toFixed(2))}
                            className="text-[10px] text-amber-600 hover:underline cursor-pointer font-bold"
                          >
                            Usar {Number(calculatedTotal || 0).toFixed(2)} USDT
                          </button>
                        </div>
                        <input
                          type="text"
                          value={binanceMonto}
                          onChange={e => setBinanceMonto(e.target.value)}
                          placeholder="Ej: 15.00"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Usuario o Pay ID Binance (Opcional)
                      </label>
                      <input
                        type="text"
                        value={binanceUser}
                        onChange={e => setBinanceUser(e.target.value)}
                        placeholder="Ej: cliente@correo.com o Binance ID 982348"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* ZELLE */}
                {paymentMethod === 'ZELLE' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Nombre del Titular de la Cuenta <span className="text-purple-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={zelleTitular}
                          onChange={e => setZelleTitular(e.target.value)}
                          placeholder="Ej: Juan Carlos Pérez"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Teléfono o Correo Zelle <span className="text-purple-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={zelleContacto}
                          onChange={e => setZelleContacto(e.target.value)}
                          placeholder="Ej: +1 305-555-0199 o correo@gmail.com"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          N° Confirmación / Ref Zelle <span className="text-purple-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={zelleRef}
                          onChange={e => setZelleRef(e.target.value)}
                          placeholder="Ej: 98124018"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 font-mono"
                        />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            Monto Transferido ($) <span className="text-purple-600">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setZelleMonto(Number(calculatedTotal || 0).toFixed(2))}
                            className="text-[10px] text-purple-600 hover:underline cursor-pointer font-bold"
                          >
                            Usar ${Number(calculatedTotal || 0).toFixed(2)}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={zelleMonto}
                          onChange={e => setZelleMonto(e.target.value)}
                          placeholder="Ej: 15.00"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* EFECTIVO */}
                {paymentMethod === 'EFECTIVO' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Monto Recibido en Dólares ($) <span className="text-red-600">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEfectivoMonto(Number(calculatedTotal || 0).toFixed(2))}
                          className="text-[10px] text-red-600 hover:underline cursor-pointer font-bold"
                        >
                          Usar ${Number(calculatedTotal || 0).toFixed(2)}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={efectivoMonto}
                        onChange={e => setEfectivoMonto(e.target.value)}
                        placeholder="Ej: 15.00 o 20.00"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Detalle / Billetes / Cambio
                      </label>
                      <input
                        type="text"
                        value={efectivoDetalle}
                        onChange={e => setEfectivoDetalle(e.target.value)}
                        placeholder="Ej: Billete de $20, se entregaron $5 de vuelto"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Vista previa en tiempo real de cómo se guardará en Supabase */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] text-slate-500 block font-semibold mb-1">
                  <i className="fa-solid fa-database text-red-600 mr-1"></i>
                  Registro en Supabase (columna <code className="text-red-600 font-bold">referencia_pago</code>):
                </span>
                <div className="font-mono text-[11px] text-emerald-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 break-all shadow-xs">
                  {getBuiltPaymentReference()}
                  {notes.trim() && <span className="text-amber-700"> | [AJUSTE: {notes.trim()}]</span>}
                </div>
              </div>
            </div>

          </div>

          {/* ============================================================== */}
          {/* BOTONES DE ACCIÓN - PIE FIJO SIEMPRE VISIBLE */}
          {/* ============================================================== */}
          <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-t border-slate-100 bg-slate-50/90 shrink-0">
            {typeof onDelete === 'function' ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de eliminar permanentemente la orden #${order.orderId}? Esta acción borrará la venta del registro y de Supabase.`)) {
                    onDelete(order.orderId);
                    onClose();
                  }
                }}
                disabled={isSubmitting}
                className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm active:scale-95 disabled:opacity-50 shrink-0"
                title="Eliminar orden definitivamente"
              >
                <i className="fa-solid fa-trash-can"></i>
                <span className="hidden sm:inline">Eliminar Venta</span>
                <span className="sm:hidden">Eliminar</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/25 transition cursor-pointer active:scale-95 flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i>
                    <span className="hidden sm:inline">Guardar Cambios</span>
                    <span className="sm:hidden">Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
