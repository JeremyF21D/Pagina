import React, { useState, useEffect } from 'react';
import { formatUSD } from '../../utils/formatters';

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
    }
  }, [order, coils]);

  if (!isOpen || !order) return null;

  const currentSelectedCoil = coils.find(c => c.id.toLowerCase() === String(selectedCoilId).toLowerCase()) || null;
  const originalCoil = coils.find(c => c.id.toLowerCase() === String(order.coilId || '').toLowerCase()) || null;

  const isCoilChanged = selectedCoilId && order.coilId && selectedCoilId.toLowerCase() !== String(order.coilId).toLowerCase();
  const calculatedTotal = (Number(unitPrice) || 0) * (Number(qty) || 1);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <i className="fa-solid fa-pen-to-square text-base"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Editar Registro / Cambio de Repuesto</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-brand-400 border border-slate-700 font-bold">
                  #{order.orderId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ajusta el producto entregado, el precio cobrado o los datos del cliente sin descuadrar el stock.
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">

          {/* ALERTA VISUAL: Cambio de Repuesto */}
          {isCoilChanged && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <i className="fa-solid fa-arrows-rotate text-sm"></i>
                <span>Gestión Automática de Cambio de Repuesto</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Al guardar, el sistema <strong>devolverá al inventario</strong> el repuesto original (
                <span className="font-semibold text-white">{order.coilName || originalCoil?.name || order.coilId}</span>
                ) y <strong>descontará</strong> del inventario el nuevo repuesto seleccionado (
                <span className="font-semibold text-white">{currentSelectedCoil?.name}</span>
                ) tanto en la web como en Supabase.
              </p>
            </div>
          )}

          {/* SECCIÓN 1: Selección del Repuesto */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
              Repuesto Entregado
            </label>
            <select
              value={selectedCoilId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedCoilId(nextId);
                const nextCoil = coils.find(c => c.id.toLowerCase() === nextId.toLowerCase());
                if (nextCoil && (!unitPrice || unitPrice === 0)) {
                  setUnitPrice(nextCoil.price);
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500 transition text-xs font-medium"
            >
              {coils.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.brand} (OEM: {c.oem || 'N/A'}) [Stock actual: {c.stock} uds | Precio lista: ${c.price}]
                </option>
              ))}
            </select>

            {currentSelectedCoil && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">OEM:</span>
                  <span className="font-mono text-slate-300">{currentSelectedCoil.oem || 'N/A'}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-500">Marca:</span>
                  <span className="text-slate-300 font-semibold">{currentSelectedCoil.brand}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUnitPrice(currentSelectedCoil.price)}
                  className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer text-[10px] underline"
                >
                  Usar precio catálogo (${currentSelectedCoil.price})
                </button>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: Precios y Cantidades */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  placeholder="30.00"
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

          {/* SECCIÓN 3: Motivo / Observaciones del Cambio */}
          <div>
            <label className="block text-slate-300 font-semibold text-[11px] mb-1">
              Motivo del Cambio o Ajuste (Auditoría)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Cliente llevó sensor equivocado, se cambió por otro modelo y se cobraron $15"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
            />
          </div>

          {/* SECCIÓN 4: Datos del Cliente & Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
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

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
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
