import React, { useState, useEffect, useMemo } from 'react';
import { formatUSD, detectProductCategory, getCategoryConfig } from '../../utils/formatters';

export function EditSaleModal({ isOpen, order, coils = [], onClose, onSave }) {
  const [selectedCoilId, setSelectedCoilId] = useState('');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [status, setStatus] = useState('CONFIRMED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del selector visual de repuestos
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL');

  useEffect(() => {
    if (order) {
      setSelectedCoilId(order.coilId || coils[0]?.id || '');
      setQty(Number(order.qty) || 1);
      setUnitPrice(Number(order.unitPrice || order.totalPrice || 0));
      setCustomerName(order.customerName || '');
      setCustomerPhone(order.customerPhone || '');
      setPaymentRef(order.paymentRef || '');
      setStatus(order.status || 'CONFIRMED');
      setNotes(order.notes || '');
      setIsPickerOpen(false);
      setSearchQuery('');
    }
  }, [order, coils]);

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

  const currentSelectedCoil = coils.find(c => c.id.toLowerCase() === String(selectedCoilId).toLowerCase()) || null;
  const originalCoil = coils.find(c => c.id.toLowerCase() === String(order.coilId || '').toLowerCase()) || null;

  const isCoilChanged = selectedCoilId && order.coilId && selectedCoilId.toLowerCase() !== String(order.coilId).toLowerCase();
  const calculatedTotal = (Number(unitPrice) || 0) * (Number(qty) || 1);

  // Lista de marcas únicas para filtro rápido
  const brandsList = useMemo(() => {
    const brands = new Set();
    coils.forEach(c => { if (c.brand) brands.add(c.brand.trim()); });
    return Array.from(brands).sort();
  }, [coils]);

  // Filtrado en vivo de repuestos
  const filteredCoils = useMemo(() => {
    return coils.filter(c => {
      if (selectedBrandFilter !== 'ALL' && c.brand?.toLowerCase() !== selectedBrandFilter.toLowerCase()) {
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

  const handleSelectCoil = (coil) => {
    setSelectedCoilId(coil.id);
    setIsPickerOpen(false);
    // Si el precio unitario es 0 o coincide con el repuesto anterior, sugerir el precio de lista del nuevo repuesto
    if (!unitPrice || unitPrice === 0 || unitPrice === originalCoil?.price) {
      setUnitPrice(coil.price);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave(order.orderId, {
        coilId: selectedCoilId,
        coilName: currentSelectedCoil ? currentSelectedCoil.name : order.coilName,
        oem: currentSelectedCoil ? currentSelectedCoil.oem : order.oem,
        qty: Number(qty) || 1,
        unitPrice: Number(unitPrice) || 0,
        totalPrice: calculatedTotal,
        customerName,
        customerPhone,
        paymentRef: notes ? `${paymentRef} | [AJUSTE: ${notes}]` : paymentRef,
        status,
        notes
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
                Selecciona la pieza con su foto, ajusta el precio cobrado y gestiona el stock automáticamente.
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
            {!isPickerOpen && currentSelectedCoil && (
              <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Foto del repuesto */}
                  <div className="w-16 h-16 rounded-xl bg-white p-1 border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
                    {currentImg ? (
                      <img 
                        src={currentImg} 
                        alt={currentSelectedCoil.name} 
                        className="max-h-full max-w-full object-contain mix-blend-multiply" 
                      />
                    ) : (
                      <i className={`${currentCat.icon} text-2xl text-slate-700`}></i>
                    )}
                  </div>

                  {/* Datos del repuesto */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-bold text-white text-xs sm:text-sm truncate">
                      {currentSelectedCoil.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-sky-300 border border-slate-700">
                        {currentSelectedCoil.brand || 'Original'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-800">
                        OEM: {currentSelectedCoil.oem || 'N/A'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        currentSelectedCoil.stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        Stock: {currentSelectedCoil.stock} uds
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20">
                        Lista: ${currentSelectedCoil.price}
                      </span>
                    </div>
                    {currentSelectedCoil.carModel && (
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
                  <button
                    type="button"
                    onClick={() => setUnitPrice(currentSelectedCoil.price)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
                    title="Asignar el precio de lista del catálogo"
                  >
                    Usar precio catálogo (${currentSelectedCoil.price})
                  </button>
                </div>
              </div>
            )}

            {/* VISTA 2: PANEL BUSCADOR VISUAL DE REPUESTOS (CUANDO SE HACE CLIC EN CAMBIAR) */}
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
                      const isSelected = coil.id.toLowerCase() === selectedCoilId.toLowerCase();

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
                                <i className={`${cat.icon} text-lg text-slate-700`}></i>
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
                      <i className={`${originalCat.icon} text-slate-700 text-sm`}></i>
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
                      <i className={`${currentCat.icon} text-slate-700 text-sm`}></i>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-sky-400 font-bold uppercase block">
                      📦 Se Descuenta del Stock (-{qty})
                    </span>
                    <p className="text-white font-semibold truncate text-[11px]">
                      {currentSelectedCoil?.name}
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
              placeholder="Ej: Cliente llevó sensor equivocado, se le cambió por otro modelo y se le cobró $15"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
            />
          </div>

          {/* ============================================================== */}
          {/* SECCIÓN 4: DATOS DEL CLIENTE Y ESTADO */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold text-[11px] mb-1">
                Referencia de Pago / Método
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-sky-500"
                placeholder="Ej: Pago Móvil Banesco Ref #12345"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold text-[11px] mb-1">
                Estado de la Orden
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-semibold focus:outline-none focus:border-sky-500"
              >
                <option value="CONFIRMED">CONFIRMADA (Descuenta stock)</option>
                <option value="PENDING_APPROVAL">PENDIENTE (Sin descontar stock)</option>
                <option value="REVERTED">REVERTIDA (Reintegra stock)</option>
              </select>
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
