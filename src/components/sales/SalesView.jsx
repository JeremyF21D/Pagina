import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { SalesTable } from './SalesTable';
import { SalesDatabaseModal } from '../modals/SalesDatabaseModal';
import { formatUSD } from '../../utils/formatters';

export function SalesView({ onOpenManualSaleModal }) {
  const { salesHistory, coils, processSaleTransaction, refreshSalesHistory } = useInventory();
  const [salesDbModalOpen, setSalesDbModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Metrics
  const confirmedSales = salesHistory.filter(s => s.status === 'CONFIRMED');
  const totalRevenue = confirmedSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalUnitsSold = confirmedSales.reduce((sum, s) => sum + s.qty, 0);
  const totalInStock = coils.filter(b => b.stock > 0).length;

  const handleQuickSimulation = () => {
    const available = coils.filter(b => b.stock > 0);
    const pick = available[0] || coils[0];
    if (!pick) return;

    processSaleTransaction({
      coilId: pick.id,
      qty: 1,
      customerName: 'Cliente Rápido Simulador',
      customerPhone: '0412-5558900',
      paymentRef: `Pago Móvil Ref #${Math.floor(100000 + Math.random() * 900000)}`,
      userId: 'CLI-SIMULATED'
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (typeof refreshSalesHistory === 'function') {
        await refreshSalesHistory();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Auditoría de Ventas & Despachos en Tiempo Real
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cada compra confirmada en WhatsApp descuenta el stock de la base de datos y envía el recibo al teléfono del dueño (0412-6497478).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={onOpenManualSaleModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-700/30 transition cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i> Registrar Venta Manual
          </button>

          <button 
            onClick={handleQuickSimulation}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <i className="fa-solid fa-bolt text-amber-400"></i> Simular Venta Rápida WA
          </button>

          {/* Botón: Actualizar registro de ventas realizadas */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
            title="Actualizar y verificar las ventas que se hayan realizado en tiempo real"
          >
            <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'fa-spin' : ''} text-sky-400`}></i>
            <span>Actualizar Registro</span>
          </button>

          {/* Botón: Importar y exportar CSV conectado al catálogo para Supabase */}
          <button 
            onClick={() => setSalesDbModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-900/30 active:scale-95"
            title="Importar y exportar CSV como base de datos para subir a Supabase con campos conectados al catálogo"
          >
            <i className="fa-solid fa-file-csv text-emerald-200 text-sm"></i>
            <span>Base de Datos CSV (Supabase)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Facturado</span>
            <div className="text-xl font-extrabold text-white font-mono">{formatUSD(totalRevenue)}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-receipt"></i>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Órdenes Confirmadas</span>
            <div className="text-xl font-extrabold text-white font-mono">{confirmedSales.length}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Unidades Despachadas</span>
            <div className="text-xl font-extrabold text-white font-mono">{totalUnitsSold} uds</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-warehouse"></i>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Bobinas en Stock</span>
            <div className="text-xl font-extrabold text-white font-mono">{totalInStock} de {coils.length}</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <SalesTable />

      {/* Modal Base de Datos CSV & Supabase */}
      <SalesDatabaseModal 
        isOpen={salesDbModalOpen} 
        onClose={() => setSalesDbModalOpen(false)} 
      />
    </div>
  );
}
