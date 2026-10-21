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
  const pendingSales = salesHistory.filter(s => s.status === 'PENDING_APPROVAL');
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
      customerName: 'Cliente Simulado WhatsApp',
      customerPhone: '0412-5558900',
      paymentRef: `Pedido WhatsApp #${Math.floor(100000 + Math.random() * 900000)}`,
      userId: 'CLI-SIMULATED',
      status: 'PENDING_APPROVAL'
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
            Los pedidos de clientes ingresan como <strong>Pendientes</strong>. Al confirmarlos se descuenta el stock en Supabase, y si se regresan se reintegra automáticamente.
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
            title="Simula un pedido nuevo de WhatsApp en estado Pendiente para probar la confirmación"
          >
            <i className="fa-solid fa-bolt text-amber-400"></i> Simular Pedido WA
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
          <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Pedidos Pendientes</span>
            <div className="text-xl font-extrabold text-amber-400 font-mono">{pendingSales.length}</div>
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
      </div>

      {/* Alerta si hay pedidos pendientes */}
      {pendingSales.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-bell animate-bounce"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                Tienes {pendingSales.length} {pendingSales.length === 1 ? 'pedido pendiente' : 'pedidos pendientes'} por autorizar
              </h4>
              <p className="text-xs text-slate-300">
                Los clientes enviaron estos pedidos por WhatsApp. Presiona <strong>Confirmar</strong> en la tabla para validar la venta y descontar las piezas en Supabase, o <strong>Cancelar</strong> si no se concretó el pago.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold rounded-lg text-xs whitespace-nowrap">
            {pendingSales.length} por confirmar
          </span>
        </div>
      )}

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
