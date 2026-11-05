import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { formatUSD } from '../../utils/formatters';
import { ProductHoverPreview } from '../sales/ProductHoverPreview';

export function SalesDatabaseTable() {
  const { salesHistory, refreshSalesHistory, coils, dbEngine } = useInventory();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const confirmedCount = salesHistory.filter(s => s.status === 'CONFIRMED').length;
  const pendingCount = salesHistory.filter(s => s.status === 'PENDING_APPROVAL').length;
  const totalRevenue = salesHistory
    .filter(s => s.status === 'CONFIRMED')
    .reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);

  const filteredOrders = salesHistory.filter(ord => {
    if (filter === 'CONFIRMED' && ord.status !== 'CONFIRMED') return false;
    if (filter === 'REVERTED' && ord.status !== 'REVERTED') return false;
    if (filter === 'PENDING' && ord.status !== 'PENDING_APPROVAL') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        String(ord.orderId || '').toLowerCase().includes(q) ||
        String(ord.customerName || '').toLowerCase().includes(q) ||
        String(ord.coilName || '').toLowerCase().includes(q) ||
        String(ord.oem || '').toLowerCase().includes(q) ||
        String(ord.paymentRef || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSync = async () => {
    setIsRefreshing(true);
    try {
      if (typeof refreshSalesHistory === 'function') {
        await refreshSalesHistory(true);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl space-y-4">
      {/* Search & Filter Header */}
      <div className="p-4 bg-slate-850 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-sm shadow-xs">
            <i className="fa-solid fa-cash-register"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Registro de Movimientos de Stock & Ventas</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Supabase: tabla 'ventas'
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Registra cada salida y entrada de inventario con sincronización en la nube.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por orden, cliente, repuesto..." 
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />

          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="ALL">Todos los estados ({salesHistory.length})</option>
            <option value="CONFIRMED">Confirmadas ({confirmedCount})</option>
            <option value="PENDING">Pendientes ({pendingCount})</option>
            <option value="REVERTED">Revertidas</option>
          </select>

          <button
            onClick={handleSync}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
            title="Sincronizar y actualizar con Supabase en vivo"
          >
            <i className={`fa-solid fa-arrows-rotate text-xs ${isRefreshing ? 'fa-spin' : ''}`}></i>
            <span>Sincronizar DB</span>
          </button>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Facturado</span>
          <div className="text-base font-extrabold text-emerald-400 font-mono">{formatUSD(totalRevenue)}</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Movimientos en DB</span>
          <div className="text-base font-extrabold text-white font-mono">{salesHistory.length}</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Confirmadas</span>
          <div className="text-base font-extrabold text-sky-400 font-mono">{confirmedCount}</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Pendientes</span>
          <div className="text-base font-extrabold text-amber-400 font-mono">{pendingCount}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
            <tr>
              <th className="py-3 px-4">N° Orden</th>
              <th className="py-3 px-4">Fecha / Hora</th>
              <th className="py-3 px-4">Cliente & Contacto</th>
              <th className="py-3 px-4">Repuesto & OEM</th>
              <th className="py-3 px-4 text-center">Cant.</th>
              <th className="py-3 px-4">Monto ($)</th>
              <th className="py-3 px-4">Movimiento Stock (Antes ➔ Después)</th>
              <th className="py-3 px-4">Pago / Ref</th>
              <th className="py-3 px-4">Estado en Supabase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-500">
                  No hay movimientos registrados en la tabla 'ventas'.
                </td>
              </tr>
            ) : (
              filteredOrders.map(ord => (
                <tr key={ord.orderId} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-brand-400">
                    <span className="inline-flex items-center gap-1">
                      <i className="fa-solid fa-cloud text-[10px] text-sky-400" title="Guardado en Supabase"></i>
                      #{ord.orderId}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {ord.timestamp}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    <div>{ord.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{ord.customerPhone}</div>
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
                  <td className="py-3 px-4 text-[11px] text-slate-300">
                    <span className="truncate max-w-[140px] block" title={ord.paymentRef}>
                      {ord.paymentRef || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {ord.status === 'CONFIRMED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                        <i className="fa-solid fa-check text-[9px]"></i> CONFIRMADA
                      </span>
                    )}
                    {ord.status === 'REVERTED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-fit">
                        <i className="fa-solid fa-rotate-left text-[9px]"></i> REVERTIDA
                      </span>
                    )}
                    {ord.status === 'PENDING_APPROVAL' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1 w-fit">
                        <i className="fa-solid fa-clock text-[9px]"></i> PENDIENTE
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
