import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { buildOwnerAlertUrl } from '../../utils/whatsapp';
import { formatUSD, parseOrderDate, formatOrderDate } from '../../utils/formatters';
import { ProductHoverPreview } from './ProductHoverPreview';
import { ConfirmSalePaymentModal } from '../modals/ConfirmSalePaymentModal';
import { EditSaleModal } from '../modals/EditSaleModal';
import { ReceiptModal } from '../modals/ReceiptModal';

export function SalesTable() {
  const { salesHistory, confirmSale, revertSale, deleteSale, updateSaleTransaction, ownerSettings, coils } = useInventory();
  const [filter, setFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'
  const [search, setSearch] = useState('');
  const [orderToConfirm, setOrderToConfirm] = useState(null);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [orderForReceipt, setOrderForReceipt] = useState(null);
  const [selectedNoteModal, setSelectedNoteModal] = useState(null);

  const filteredOrders = salesHistory.filter(ord => {
    if (filter === 'CONFIRMED' && ord.status !== 'CONFIRMED') return false;
    if (filter === 'REVERTED' && ord.status !== 'REVERTED') return false;
    if (filter === 'PENDING' && ord.status !== 'PENDING_APPROVAL') return false;

    // Filtro dinámico por fecha para cuadre de caja
    if (dateFilter !== 'ALL') {
      const ordDate = parseOrderDate(ord.timestamp);
      if (!ordDate || isNaN(ordDate.getTime())) {
        if (dateFilter === 'TODAY' && String(ord.timestamp || '').toLowerCase().includes('hoy')) {
          // Pasa si dice 'hoy' explícitamente
        } else {
          return false;
        }
      } else {
        const now = new Date();
        if (dateFilter === 'TODAY') {
          if (ordDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'WEEK') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (ordDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'MONTH') {
          if (ordDate.getMonth() !== now.getMonth() || ordDate.getFullYear() !== now.getFullYear()) return false;
        }
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        ord.orderId.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.coilName.toLowerCase().includes(q) ||
        (ord.paymentRef || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPeriodUSD = filteredOrders.reduce((sum, ord) => sum + (Number(ord.totalPrice) || 0), 0);

  const handleNotifyOwner = (order) => {
    const url = buildOwnerAlertUrl({
      ownerPhone: ownerSettings.ownerPhone,
      order
    });
    window.open(url, '_blank');
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl space-y-4">
      {/* Table Filter Header */}
      <div className="p-4 bg-slate-850 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <i className="fa-solid fa-list-check text-brand-400"></i>
          <h3 className="text-sm font-bold text-white">Registro de Órdenes y Ventas WhatsApp</h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
            {filteredOrders.length}
          </span>
          {dateFilter !== 'ALL' && (
            <span className="text-[11px] bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-mono font-bold inline-flex items-center gap-1.5 shadow-xs">
              <i className="fa-solid fa-cash-register text-[10px]"></i>
              <span>Total {dateFilter === 'TODAY' ? 'Hoy' : dateFilter === 'WEEK' ? 'Semana' : 'Mes'}: {formatUSD(totalPeriodUSD)}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Período para Cuadre de Caja */}
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
            <span className="px-2 text-[10px] text-slate-400 font-bold hidden sm:inline">Período:</span>
            <button
              type="button"
              onClick={() => setDateFilter('ALL')}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                dateFilter === 'ALL' ? 'bg-brand-500 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('TODAY')}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                dateFilter === 'TODAY' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
              title="Filtrar solo las ventas de hoy para cuadre de caja diario"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('WEEK')}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                dateFilter === 'WEEK' ? 'bg-sky-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('MONTH')}
              className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer ${
                dateFilter === 'MONTH' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Mes
            </button>
          </div>

          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por orden, cliente, bobina..." 
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />

          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="ALL">Todas las órdenes</option>
            <option value="PENDING">Pendientes por Aprobar</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="REVERTED">Revertidas / Canceladas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
            <tr>
              <th className="py-3 px-4">Orden</th>
              <th className="py-3 px-4">Fecha / Hora</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Repuesto & OEM</th>
              <th className="py-3 px-4 text-center">Cant.</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Stock DB (Antes ➔ Ahora)</th>
              <th className="py-3 px-4">Pago / Ref</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-8 text-center text-slate-500">
                  No se encontraron ventas con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              filteredOrders.map(ord => (
                <tr key={ord.orderId} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-brand-400">
                    <span className="inline-flex items-center gap-1.5">
                      <i className="fa-solid fa-cloud text-[10px] text-sky-400" title="Sincronizado con Supabase (tabla 'ventas')"></i>
                      #{ord.orderId}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap font-mono text-[11px]" title={ord.timestamp}>
                    <span className="inline-flex items-center gap-1.5">
                      <i className="fa-regular fa-clock text-[10px] text-slate-500"></i>
                      <span>{formatOrderDate(ord.timestamp)}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    <div>{ord.customerName}</div>
                    <div className="text-[10px] text-slate-400">{ord.customerPhone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <ProductHoverPreview order={ord} coils={coils} />
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-white">
                    {ord.qty}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                    {formatUSD(ord.totalPrice)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                    {ord.status === 'PENDING_APPROVAL' ? (
                      <span className="text-amber-300 font-semibold inline-flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        <i className="fa-solid fa-clock text-[10px]"></i>
                        <span>{ord.stockBefore} uds</span>
                        <span className="text-[10px] text-slate-400 font-normal">(-{ord.qty} al confirmar)</span>
                      </span>
                    ) : ord.status === 'REVERTED' ? (
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        <span>{ord.stockBefore} uds</span>
                        <span className="text-[10px] text-rose-400">(Revertida)</span>
                      </span>
                    ) : (
                      <div className="inline-flex items-center">
                        <span className="text-rose-400">{ord.stockBefore}</span>
                        <span className="text-slate-500 mx-1">➔</span>
                        <span className="text-emerald-400 font-bold">{ord.stockAfter} uds</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-300 max-w-[240px]">
                    {(() => {
                      const raw = String(ord.paymentRef || 'Sin referencia');
                      const hasAjuste = raw.includes(' | [AJUSTE: ');
                      const mainText = hasAjuste ? raw.split(' | [AJUSTE: ')[0].trim() : raw.trim();
                      const ajusteText = hasAjuste 
                        ? raw.split(' | [AJUSTE: ')[1]?.replace(/\]$/, '').trim() 
                        : (ord.notes || null);

                      // Detección del tipo de pago e icono para chip visual
                      const getPaymentMeta = (txt) => {
                        const lower = txt.toLowerCase();
                        if (txt.startsWith('[PAGO MÓVIL]') || txt.startsWith('[PAGO MOVIL]') || lower.includes('pago móvil') || lower.includes('pago movil')) {
                          return {
                            name: 'Pago Móvil',
                            icon: 'fa-solid fa-mobile-screen',
                            color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                            cleanText: txt.replace(/^\[PAGO M[ÓO]VIL\]\s*/i, '')
                          };
                        }
                        if (txt.startsWith('[BINANCE') || lower.includes('binance') || lower.includes('usdt')) {
                          return {
                            name: 'Binance Pay',
                            icon: 'fa-brands fa-bitcoin',
                            color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                            cleanText: txt.replace(/^\[BINANCE PAY\]\s*/i, '').replace(/^\[BINANCE\]\s*/i, '')
                          };
                        }
                        if (txt.startsWith('[ZELLE]') || lower.includes('zelle')) {
                          return {
                            name: 'Zelle',
                            icon: 'fa-solid fa-building-columns',
                            color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                            cleanText: txt.replace(/^\[ZELLE\]\s*/i, '')
                          };
                        }
                        if (txt.startsWith('[EFECTIVO]') || lower.includes('efectivo') || lower.includes('cash')) {
                          return {
                            name: 'Efectivo',
                            icon: 'fa-solid fa-money-bill-wave',
                            color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                            cleanText: txt.replace(/^\[EFECTIVO\]\s*/i, '')
                          };
                        }
                        return {
                          name: 'Pago',
                          icon: 'fa-solid fa-receipt',
                          color: 'bg-slate-800 text-slate-300 border-slate-700',
                          cleanText: txt
                        };
                      };

                      const meta = getPaymentMeta(mainText);

                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${meta.color}`}>
                              <i className={`${meta.icon} text-[10px]`}></i>
                              <span>{meta.name}</span>
                            </span>
                          </div>
                          <div className="truncate font-mono text-[10px] text-slate-300" title={mainText}>
                            {meta.cleanText || mainText}
                          </div>
                          {ajusteText && (
                            <button 
                              type="button"
                              onClick={() => setSelectedNoteModal({
                                orderId: ord.orderId,
                                customerName: ord.customerName,
                                customerPhone: ord.customerPhone,
                                paymentRef: mainText,
                                note: ajusteText,
                                total: ord.totalPrice,
                                coilName: ord.coilName,
                                timestamp: ord.timestamp
                              })}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/20 hover:border-amber-500/40 text-[10px] max-w-full font-sans cursor-pointer active:scale-95 transition text-left group"
                              title="Haz clic para leer la nota completa"
                            >
                              <i className="fa-solid fa-arrows-rotate text-[9px] shrink-0 text-amber-400 group-hover:rotate-180 transition duration-300"></i>
                              <span className="truncate">{ajusteText}</span>
                              <i className="fa-solid fa-up-right-from-square text-[8px] text-amber-400/60 group-hover:text-amber-300 shrink-0 ml-0.5"></i>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {ord.status === 'CONFIRMED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        CONFIRMADA
                      </span>
                    )}
                    {ord.status === 'REVERTED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        REVERTIDA
                      </span>
                    )}
                    {ord.status === 'PENDING_APPROVAL' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                        PENDIENTE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {ord.status === 'PENDING_APPROVAL' && (
                        <>
                          <button 
                            onClick={() => setOrderToConfirm(ord)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-sm inline-flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Confirmar pedido, verificar método de pago y descontar stock"
                          >
                            <i className="fa-solid fa-check"></i>
                            <span>Confirmar</span>
                          </button>

                          <button 
                            onClick={() => revertSale(ord.orderId)}
                            className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs transition cursor-pointer"
                            title="Rechazar / Cancelar orden (sin descontar stock)"
                          >
                            <i className="fa-solid fa-ban"></i>
                          </button>
                        </>
                      )}

                      {ord.status === 'CONFIRMED' && (
                        <button 
                          onClick={() => revertSale(ord.orderId)}
                          className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Revertir venta y devolver piezas al inventario en Supabase"
                        >
                          <i className="fa-solid fa-rotate-left"></i>
                          <span>Regresar</span>
                        </button>
                      )}

                      {/* Botón Editar / Cambio de Repuesto */}
                      <button 
                        onClick={() => setOrderToEdit(ord)}
                        className="p-1.5 bg-sky-500/10 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/20 rounded-lg text-xs transition cursor-pointer active:scale-95"
                        title="Editar venta o gestionar cambio de repuesto"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>

                      {/* Botón Comprobante / Recibo Digital de Garantía */}
                      {ord.status === 'CONFIRMED' && (
                        <button 
                          onClick={() => setOrderForReceipt(ord)}
                          className="p-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-lg text-xs transition cursor-pointer active:scale-95"
                          title="Generar e imprimir recibo formal de venta"
                        >
                          <i className="fa-solid fa-receipt"></i>
                        </button>
                      )}

                      <button 
                        onClick={() => handleNotifyOwner(ord)}
                        className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-xs transition cursor-pointer"
                        title="Abrir comprobante en WhatsApp"
                      >
                        <i className="fa-brands fa-whatsapp"></i>
                      </button>

                      <button 
                        onClick={() => {
                          if (window.confirm(`¿Eliminar definitivamente la venta #${ord.orderId}? Se borrará de la base de datos y de la web.`)) {
                            deleteSale(ord.orderId);
                          }
                        }}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg text-xs transition cursor-pointer active:scale-95"
                        title="Eliminar venta permanentemente"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Verificación y Registro de Método de Pago */}
      <ConfirmSalePaymentModal
        isOpen={Boolean(orderToConfirm)}
        order={orderToConfirm}
        coils={coils}
        onClose={() => setOrderToConfirm(null)}
        onConfirm={(orderId, paymentData) => confirmSale(orderId, paymentData)}
      />

      {/* Modal de Recibo Formal / Ticket Imprimible */}
      <ReceiptModal
        isOpen={Boolean(orderForReceipt)}
        order={orderForReceipt}
        onClose={() => setOrderForReceipt(null)}
      />

      {/* Modal de Edición de Venta & Cambio de Repuesto */}
      {orderToEdit && (
        <EditSaleModal
          isOpen={Boolean(orderToEdit)}
          order={orderToEdit}
          coils={coils}
          onClose={() => setOrderToEdit(null)}
          onSave={updateSaleTransaction}
        />
      )}

      {/* Modal / Popup de Lectura de Nota Completa */}
      {selectedNoteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedNoteModal(null)}
        >
          <div 
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-modal-pop"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <i className="fa-solid fa-note-sticky text-base"></i>
                <span>Nota de Venta / Motivo del Cambio</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700 font-mono font-bold">
                  #{selectedNoteModal.orderId}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedNoteModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Texto Completo de la Nota */}
            <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 text-slate-200 text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-quote-left text-amber-400/60"></i>
                <span>Observación Registrada por el Administrador:</span>
              </span>
              <p className="text-sm sm:text-base text-amber-100 font-medium whitespace-pre-wrap leading-relaxed italic">
                "{selectedNoteModal.note}"
              </p>
            </div>

            {/* Ficha Resumen de la Orden */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px]">Cliente:</span>
                <span className="text-white font-semibold truncate block">{selectedNoteModal.customerName}</span>
                {selectedNoteModal.customerPhone && (
                  <span className="text-slate-400 text-[10px] font-mono block">{selectedNoteModal.customerPhone}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Total de la Orden:</span>
                <span className="text-emerald-400 font-mono font-bold text-sm block">
                  {formatUSD(selectedNoteModal.total)}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-800/60">
                <span className="text-slate-500 block text-[10px]">Repuesto Entregado:</span>
                <span className="text-slate-200 font-medium truncate block">{selectedNoteModal.coilName}</span>
              </div>
              <div className="col-span-2 pt-1">
                <span className="text-slate-500 block text-[10px]">Método / Pago:</span>
                <span className="text-slate-300 font-medium truncate block">{selectedNoteModal.paymentRef}</span>
              </div>
            </div>

            {/* Botón Cerrar */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedNoteModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
