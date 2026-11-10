import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { SalesTable } from './SalesTable';
import { SalesDatabaseModal } from '../modals/SalesDatabaseModal';
import { ExchangeRateLiveBanner } from './ExchangeRateLiveBanner';
import { formatUSD } from '../../utils/formatters';

export function SalesView({ onOpenManualSaleModal }) {
  const { salesHistory, coils, processSaleTransaction, refreshSalesHistory, clearAllSales } = useInventory();
  const { rates, formatVES } = useCurrency();
  const [salesDbModalOpen, setSalesDbModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Metrics
  const confirmedSales = salesHistory.filter(s => s.status === 'CONFIRMED');
  const pendingSales = salesHistory.filter(s => s.status === 'PENDING_APPROVAL');
  const totalRevenue = confirmedSales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalUnitsSold = confirmedSales.reduce((sum, s) => sum + s.qty, 0);

  // Desglose por Método de Pago
  const paymentBreakdown = React.useMemo(() => {
    const counts = {
      pagoMovil: { totalUSD: 0, orders: 0 },
      binance: { totalUSD: 0, orders: 0 },
      zelle: { totalUSD: 0, orders: 0 },
      efectivo: { totalUSD: 0, orders: 0 }
    };

    confirmedSales.forEach(s => {
      const ref = (s.paymentRef || '').toLowerCase();
      if (ref.includes('pago móvil') || ref.includes('pago movil')) {
        counts.pagoMovil.totalUSD += (s.totalPrice || 0);
        counts.pagoMovil.orders += 1;
      } else if (ref.includes('binance') || ref.includes('usdt')) {
        counts.binance.totalUSD += (s.totalPrice || 0);
        counts.binance.orders += 1;
      } else if (ref.includes('zelle')) {
        counts.zelle.totalUSD += (s.totalPrice || 0);
        counts.zelle.orders += 1;
      } else {
        counts.efectivo.totalUSD += (s.totalPrice || 0);
        counts.efectivo.orders += 1;
      }
    });

    return counts;
  }, [confirmedSales]);

  const handleQuickSimulation = () => {
    const available = coils.filter(b => b.stock > 0);
    const pick = available[0] || coils[0];
    if (!pick) return;

    processSaleTransaction({
      coilId: pick.id,
      qty: 1,
      customerName: 'Cliente Simulado WhatsApp',
      customerPhone: '0412-5558900',
      paymentRef: `[PAGO MÓVIL] Banesco Ref #448921`,
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

          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            title="Sincronizar y verificar todos los movimientos con la tabla 'ventas' de Supabase"
          >
            <i className={`fa-solid fa-cloud-arrow-up ${isRefreshing ? 'fa-spin' : ''} text-emerald-200`}></i>
            <span>Sincronizar Supabase</span>
          </button>

          <button 
            onClick={() => setSalesDbModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-900/30 active:scale-95"
          >
            <i className="fa-solid fa-file-csv text-emerald-200 text-sm"></i>
            <span>Base de Datos CSV</span>
          </button>

          {salesHistory.length > 0 && (
            <button 
              onClick={() => {
                if (window.confirm(`¿Estás seguro de que deseas eliminar TODOS los ${salesHistory.length} registros de ventas? Se borrarán de Supabase y de la pantalla.`)) {
                  clearAllSales();
                }
              }}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-trash-can text-rose-400"></i>
              <span>Vaciar Historial</span>
            </button>
          )}
        </div>
      </div>

      {/* Monitor de Tasas de Cambio en Vivo (Binance P2P & BCV Oficial) */}
      <ExchangeRateLiveBanner />

      {/* KPI Cards Globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Facturado</span>
            <div className="text-xl font-extrabold text-white font-mono">{formatUSD(totalRevenue)}</div>
            <span className="text-[10px] text-amber-300 font-mono">≈ {formatVES(totalRevenue * (rates.binance || 0))}</span>
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

      {/* KPI Desglose por Método de Pago (Cuadre Administrativo) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-wallet text-brand-400"></i>
            <span>Desglose de Ingresos por Método de Pago (Cuadre de Caja)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Solo órdenes confirmadas</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
              <i className="fa-solid fa-mobile-screen"></i>
              <span>Pago Móvil</span>
            </div>
            <div className="text-base font-extrabold text-white font-mono">{formatUSD(paymentBreakdown.pagoMovil.totalUSD)}</div>
            <div className="text-[10px] text-emerald-300 font-mono mt-0.5">
              ≈ {formatVES(paymentBreakdown.pagoMovil.totalUSD * (rates.binance || 0))}
            </div>
            <span className="text-[9px] text-slate-400 font-mono block mt-1">{paymentBreakdown.pagoMovil.orders} órdenes</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
              <i className="fa-brands fa-bitcoin"></i>
              <span>Binance Pay</span>
            </div>
            <div className="text-base font-extrabold text-white font-mono">{formatUSD(paymentBreakdown.binance.totalUSD)} USDT</div>
            <div className="text-[10px] text-amber-300 font-mono mt-0.5">
              ≈ {formatVES(paymentBreakdown.binance.totalUSD * (rates.binance || 0))}
            </div>
            <span className="text-[9px] text-slate-400 font-mono block mt-1">{paymentBreakdown.binance.orders} órdenes</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold mb-1">
              <i className="fa-solid fa-building-columns"></i>
              <span>Zelle</span>
            </div>
            <div className="text-base font-extrabold text-white font-mono">{formatUSD(paymentBreakdown.zelle.totalUSD)}</div>
            <div className="text-[10px] text-purple-300 font-mono mt-0.5">Directo en USD</div>
            <span className="text-[9px] text-slate-400 font-mono block mt-1">{paymentBreakdown.zelle.orders} órdenes</span>
          </div>

          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30">
            <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold mb-1">
              <i className="fa-solid fa-money-bill-wave"></i>
              <span>Efectivo / Cash</span>
            </div>
            <div className="text-base font-extrabold text-white font-mono">{formatUSD(paymentBreakdown.efectivo.totalUSD)}</div>
            <div className="text-[10px] text-sky-300 font-mono mt-0.5">Divisas en Tienda</div>
            <span className="text-[9px] text-slate-400 font-mono block mt-1">{paymentBreakdown.efectivo.orders} órdenes</span>
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
                Los clientes enviaron estos pedidos por WhatsApp. Presiona <strong>Confirmar</strong> en la tabla para validar la venta y descontar las piezas en Supabase.
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
