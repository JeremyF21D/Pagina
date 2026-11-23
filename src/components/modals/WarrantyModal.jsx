import { createPortal } from 'react-dom';
import React, { useState } from 'react';
import { formatUSD } from '../../utils/formatters';

export function WarrantyModal({ isOpen, order, coils = [], onClose, onProcessReplacement, onProcessRefund }) {
  const [activeTab, setActiveTab] = useState('REPLACEMENT'); // 'REPLACEMENT' | 'REFUND'
  const [selectedCoilId, setSelectedCoilId] = useState('');
  const [replacementCoilId, setReplacementCoilId] = useState('');
  const [reason, setReason] = useState('');
  const [refundRef, setRefundRef] = useState('');
  const [refundAmountUSD, setRefundAmountUSD] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalize items array
  const items = React.useMemo(() => {
    if (!order) return [];
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      return order.items;
    }
    return [{
      coilId: order.coilId,
      name: order.coilName,
      oem: order.oem,
      qty: order.qty || 1,
      unitPrice: order.unitPrice || order.totalPrice,
      subtotal: order.totalPrice
    }];
  }, [order]);

  // Set default selected coil when modal opens
  React.useEffect(() => {
    if (order && items.length > 0) {
      const defaultId = items[0].coilId;
      setSelectedCoilId(defaultId);
      setReplacementCoilId(defaultId);
      setRefundAmountUSD(String(items[0].subtotal || items[0].unitPrice || order.totalPrice));
    }
  }, [order, items]);

  const getProductImage = (item) => {
    if (!item) return null;
    if (item.image) return item.image;
    const match = coils.find(c => {
      if (item.coilId && c.id && String(c.id).toLowerCase() === String(item.coilId).toLowerCase()) return true;
      if (item.id && c.id && String(c.id).toLowerCase() === String(item.id).toLowerCase()) return true;
      if (item.oem && c.oem && String(c.oem).toLowerCase() === String(item.oem).toLowerCase()) return true;
      if (item.name && c.name && String(c.name).toLowerCase() === String(item.name).toLowerCase()) return true;
      return false;
    });
    if (match?.image) return match.image;
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('JF_PRODUCT_CUSTOM_IMAGES') || '{}');
        if (item.coilId && stored[item.coilId]) return stored[item.coilId];
        if (item.id && stored[item.id]) return stored[item.id];
        if (match?.id && stored[match.id]) return stored[match.id];
      } catch (e) {}
    }
    return null;
  };

  if (!isOpen || !order) return null;

  const currentDefectiveItem = items.find(it => it.coilId === selectedCoilId) || items[0];
  const replacementCoil = coils.find(c => c.id.toLowerCase() === String(replacementCoilId || '').toLowerCase());

  // Historical rate information
  const frozenBinance = order.exchangeRateBinance || null;
  const frozenVES = order.totalVES || null;

  const handleDefectiveItemChange = (coilId) => {
    setSelectedCoilId(coilId);
    setReplacementCoilId(coilId);
    const item = items.find(it => it.coilId === coilId);
    if (item) {
      setRefundAmountUSD(String(item.subtotal || item.unitPrice || ''));
    }
  };

  const handleSubmitReplacement = async (e) => {
    e.preventDefault();
    if (!selectedCoilId) return;

    if (!replacementCoil) {
      alert('Por favor selecciona la bobina o repuesto de reemplazo');
      return;
    }

    if (replacementCoil.stock <= 0) {
      if (!window.confirm(`⚠️ La bobina ${replacementCoil.name} figura con stock 0. ¿Deseas entregarla igualmente como garantía?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onProcessReplacement({
        orderId: order.orderId,
        defectiveCoilId: selectedCoilId,
        defectiveItemName: currentDefectiveItem?.name || 'Repuesto',
        replacementCoilId: replacementCoil.id,
        replacementCoilName: replacementCoil.name,
        reason: reason.trim() || 'Defecto de fábrica reportado por el cliente'
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    const amount = parseFloat(refundAmountUSD);
    if (!amount || amount <= 0) {
      alert('Por favor indica un monto válido a reembolsar en USD');
      return;
    }

    setIsSubmitting(true);
    try {
      await onProcessRefund({
        orderId: order.orderId,
        defectiveCoilId: selectedCoilId,
        defectiveItemName: currentDefectiveItem?.name || 'Repuesto',
        refundAmountUSD: amount,
        refundRef: refundRef.trim() || 'Devolución acordada con el cliente',
        reason: reason.trim() || 'Pieza defectuosa sin disponibilidad de reemplazo'
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in" role="dialog">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-auto text-slate-900 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 text-lg">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>Gestión de Garantía y Devoluciones</span>
                <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  #{order.orderId}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cliente: <strong className="text-slate-800">{order.customerName}</strong> ({order.customerPhone})
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Snapshot Summary Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div>
            <span className="text-slate-500">Total Venta Original: </span>
            <strong className="text-emerald-600 font-mono font-black text-sm">{formatUSD(order.totalPrice || order.totalUSD)}</strong>
          </div>
          {frozenBinance && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                Tasa Binance: {frozenBinance} Bs/$
              </span>
              {frozenVES && (
                <span className="text-slate-500 font-semibold">({frozenVES})</span>
              )}
            </div>
          )}
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* 1. Selector de Repuesto Defectuoso (si la orden tiene más de 1 artículo) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Selecciona el repuesto reportado con falla:
            </label>
            <div className="space-y-2">
              {items.map(it => (
                <div 
                  key={it.coilId}
                  onClick={() => handleDefectiveItemChange(it.coilId)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    selectedCoilId === it.coilId
                      ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50 shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const itemImg = getProductImage(it);
                      return (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
                          itemImg ? 'bg-white border border-slate-700/80 p-0.5' : 'bg-slate-950 border border-slate-800 text-slate-400'
                        }`}>
                          {itemImg ? (
                            <img 
                              src={itemImg} 
                              alt={it.name} 
                              className="w-full h-full object-contain mix-blend-multiply" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <i className={`fa-solid fa-bolt text-[#de2420] text-sm ${itemImg ? 'hidden' : 'block'}`}></i>
                        </div>
                      );
                    })()}
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-white truncate">{it.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        OEM: {it.oem || it.coilId} · Cantidad: {it.qty} ud(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-white text-xs">{formatUSD(it.subtotal || it.unitPrice)}</span>
                    <span className="block text-[10px] text-purple-400 font-bold">
                      {selectedCoilId === it.coilId ? '✓ Seleccionado' : 'Elegir'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Selector de Tipo de Garantía */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de trámite a ejecutar:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('REPLACEMENT')}
                className={`py-3 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'REPLACEMENT'
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850'
                }`}
              >
                <i className="fa-solid fa-rotate text-base"></i>
                <span>1. Cambio por Reemplazo</span>
                <span className="text-[10px] font-normal text-slate-400 text-center">Entrega de pieza nueva (descuenta stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('REFUND')}
                className={`py-3 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'REFUND'
                    ? 'bg-rose-600/20 text-rose-300 border-rose-500 shadow-lg shadow-rose-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850'
                }`}
              >
                <i className="fa-solid fa-hand-holding-dollar text-base"></i>
                <span>2. Devolver Dinero</span>
                <span className="text-[10px] font-normal text-slate-400 text-center">Reembolso al cliente por pieza dañada</span>
              </button>
            </div>
          </div>

          {/* Regla de negocio visible */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
            <i className="fa-solid fa-triangle-exclamation text-sm shrink-0 mt-0.5"></i>
            <p>
              <strong>Regla de Inventario:</strong> La pieza defectuosa <u>NUNCA</u> regresa al stock vendible. Queda apartada en el registro de mermas/defectuosos para reclamos a fábrica.
            </p>
          </div>

          {/* 3. Formulario según Opción Seleccionada */}
          {activeTab === 'REPLACEMENT' ? (
            <form onSubmit={handleSubmitReplacement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Repuesto a entregar como reemplazo (descuenta 1 unidad):
                </label>
                <select
                  value={replacementCoilId}
                  onChange={e => setReplacementCoilId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {coils.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — (Stock disponible: {c.stock} uds)
                    </option>
                  ))}
                </select>
                {replacementCoil && (
                  <div className="flex items-center gap-2.5 mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {(() => {
                      const repImg = getProductImage(replacementCoil);
                      return (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
                          repImg ? 'bg-white border border-slate-700/80 p-0.5' : 'bg-slate-900 border border-slate-800'
                        }`}>
                          {repImg ? (
                            <img src={repImg} alt={replacementCoil.name} className="w-full h-full object-contain mix-blend-multiply" />
                          ) : (
                            <i className="fa-solid fa-bolt text-purple-400 text-xs"></i>
                          )}
                        </div>
                      );
                    })()}
                    <div className="text-[11px] min-w-0">
                      <div className="font-semibold text-white truncate">{replacementCoil.name}</div>
                      <div className="text-slate-400">Stock actual: <strong className="text-white">{replacementCoil.stock} uds</strong> ➔ quedará en <strong className="text-emerald-400">{Math.max(0, replacementCoil.stock - 1)} uds</strong></div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo de la falla / Diagnóstico:
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ej: Falla de encendido en cilindro 2, chispa débil al calentar motor..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  <i className="fa-solid fa-check"></i>
                  <span>{isSubmitting ? 'Procesando...' : 'Confirmar Entrega de Reemplazo'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitRefund} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Monto a Reembolsar en USD:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={refundAmountUSD}
                      onChange={e => setRefundAmountUSD(e.target.value)}
                      required
                      className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  {frozenBinance && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Equivalente a tasa de compra ({frozenBinance} Bs): <strong className="text-amber-300">Bs. {(parseFloat(refundAmountUSD || 0) * frozenBinance).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Comprobante de Devolución (Pago Móvil / Ref):
                  </label>
                  <input
                    type="text"
                    value={refundRef}
                    onChange={e => setRefundRef(e.target.value)}
                    placeholder="Ej: Pago Móvil Banesco #984210 al cliente"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo de la devolución:
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ej: Pieza defectuosa, no hay repuesto disponible en stock para cambio..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                >
                  <i className="fa-solid fa-hand-holding-dollar"></i>
                  <span>{isSubmitting ? 'Procesando...' : 'Confirmar Reembolso al Cliente'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. Historial de Garantías Previas de esta Orden si existen */}
          {order.warrantyEvents && order.warrantyEvents.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Historial de Garantías procesadas en esta orden:
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {order.warrantyEvents.map((w, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] flex items-center justify-between">
                    <div>
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] mr-1.5 ${
                        w.type === 'REPLACEMENT' ? 'bg-purple-500/20 text-purple-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {w.type === 'REPLACEMENT' ? 'REEMPLAZO' : 'REEMBOLSO'}
                      </span>
                      <span className="text-slate-300">{w.defectiveItemName || 'Repuesto'}: {w.reason}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(w.date).toLocaleDateString('es-VE')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
