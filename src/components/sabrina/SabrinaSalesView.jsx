import React, { useState, useMemo, useEffect } from 'react';
import { 
  Receipt, Plus, RefreshCw, MessageSquare, Search, 
  DollarSign, CheckCircle, Clock, Smartphone, Shield, ArrowUpRight,
  Edit3, RotateCcw, FileText, Check, Ban, Filter, Calendar, CreditCard, Trash2
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { formatUSD, parseOrderDate, formatOrderDate } from '../../utils/formatters';
import { ExchangeRateLiveBanner } from '../sales/ExchangeRateLiveBanner';
import { ProductHoverPreview } from '../sales/ProductHoverPreview';
import { WarrantyModal } from '../modals/WarrantyModal';
import { EditSaleModal } from '../modals/EditSaleModal';
import { ReceiptModal } from '../modals/ReceiptModal';
import { ConfirmSalePaymentModal } from '../modals/ConfirmSalePaymentModal';

// Función para clasificar y normalizar métodos de pago
export const detectPaymentMethodKey = (order) => {
  if (!order) return 'otro';
  const method = (order.paymentMethod || order.metodo_pago || '').toUpperCase();
  const raw = String(order.paymentRef || order.referencia_pago || order.notes || '').toLowerCase();

  if (method === 'PAGO_MOVIL' || raw.includes('pago móvil') || raw.includes('pago movil') || raw.startsWith('[pago')) {
    return 'pago_movil';
  }
  if (method === 'BINANCE' || raw.includes('binance') || raw.includes('usdt') || raw.startsWith('[binance')) {
    return 'binance';
  }
  if (method === 'ZELLE' || raw.includes('zelle') || raw.startsWith('[zelle')) {
    return 'zelle';
  }
  if (method === 'EFECTIVO' || raw.includes('efectivo') || raw.includes('cash') || raw.includes('dólares') || raw.includes('dolares') || raw.startsWith('[efectivo')) {
    return 'efectivo';
  }
  return 'otro';
};

export function SabrinaSalesView({ onOpenManualSaleModal }) {
  const { 
    salesHistory, 
    refreshSalesHistory,
    confirmSale,
    revertSale,
    deleteSale,
    updateSaleTransaction,
    processWarrantyReplacement,
    processWarrantyRefund,
    coils,
    ownerSettings
  } = useInventory();
  
  const { binanceRate, bcvRate, rates } = useCurrency();
  const activeRate = Number(binanceRate || rates?.binance || 1076.87);

  // Auto-recarga en segundo plano cada 15 segundos para pedidos nuevos en tiempo real
  useEffect(() => {
    const timer = setInterval(() => {
      refreshSalesHistory(false);
    }, 15000);
    return () => clearInterval(timer);
  }, [refreshSalesHistory]);

  // Estados de Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'PENDING' | 'REVERTED'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'
  const [paymentFilter, setPaymentFilter] = useState('ALL'); // 'ALL' | 'pago_movil' | 'binance' | 'zelle' | 'efectivo'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados de Modales de Acción
  const [orderForWarranty, setOrderForWarranty] = useState(null);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [orderForReceipt, setOrderForReceipt] = useState(null);
  const [orderToConfirm, setOrderToConfirm] = useState(null);
  const [selectedNoteModal, setSelectedNoteModal] = useState(null);

  // Filtrado reactivo completo por estado, período, método de pago y término de búsqueda
  const filteredSales = useMemo(() => {
    return (salesHistory || []).filter(s => {
      // 1. Filtro por Estado
      if (filterStatus === 'CONFIRMED' && s.status !== 'CONFIRMED' && s.status) return false;
      if (filterStatus === 'PENDING' && s.status !== 'PENDING_APPROVAL') return false;
      if (filterStatus === 'REVERTED' && s.status !== 'REVERTED') return false;

      // 2. Filtro por Período
      if (dateFilter !== 'ALL') {
        const rawDate = s.timestamp || s.fecha_hora || s.created_at || s.fecha;
        const ordDate = parseOrderDate(rawDate);
        if (!ordDate || isNaN(ordDate.getTime())) {
          if (dateFilter === 'TODAY' && String(rawDate || '').toLowerCase().includes('hoy')) {
            // Pasa
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

      // 3. Filtro por Método de Pago (Pago Móvil, Binance, Zelle, Efectivo)
      if (paymentFilter !== 'ALL') {
        const m = detectPaymentMethodKey(s);
        if (m !== paymentFilter) return false;
      }

      // 4. Filtro por Búsqueda (Cliente, Teléfono, Orden, OEM, Producto, Referencia)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const custName = (s.customerName || s.customer_name || '').toLowerCase();
        const custPhone = (s.customerPhone || s.customer_phone || '').toLowerCase();
        const ordId = (s.orderId || s.order_id || s.id || '').toLowerCase();
        const partName = (s.coilName || s.coil_name || '').toLowerCase();
        const oemCode = (s.oem || '').toLowerCase();
        const payRef = (s.paymentRef || s.referencia_pago || '').toLowerCase();

        return custName.includes(q) || custPhone.includes(q) || ordId.includes(q) || 
               partName.includes(q) || oemCode.includes(q) || payRef.includes(q);
      }

      return true;
    }).sort((a, b) => {
      const dateA = parseOrderDate(a.timestamp || a.fecha_hora || a.created_at || a.fecha);
      const dateB = parseOrderDate(b.timestamp || b.fecha_hora || b.created_at || b.fecha);
      const timeA = dateA && !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
      const timeB = dateB && !isNaN(dateB.getTime()) ? dateB.getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      const numA = parseInt(String(a.orderId || a.order_id || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.orderId || b.order_id || '').replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });
  }, [salesHistory, filterStatus, dateFilter, paymentFilter, searchQuery]);

  // Totales por Método de Pago calculados sobre el historial de ventas
  const paymentMethodTotals = useMemo(() => {
    const stats = {
      pago_movil: { name: 'Pago Móvil', count: 0, usd: 0, icon: '📱' },
      binance: { name: 'Binance Pay', count: 0, usd: 0, icon: '🟡' },
      zelle: { name: 'Zelle', count: 0, usd: 0, icon: '🟣' },
      efectivo: { name: 'Efectivo USD', count: 0, usd: 0, icon: '💵' }
    };
    
    (salesHistory || []).forEach(s => {
      if (s.status === 'REVERTED') return;
      const m = detectPaymentMethodKey(s);
      if (stats[m]) {
        stats[m].count += 1;
        stats[m].usd += Number(s.totalPrice || s.unit_price * (s.qty || 1) || 0);
      }
    });

    return stats;
  }, [salesHistory]);

  // Cálculos de Totales sobre órdenes confirmadas del período
  const confirmedSales = useMemo(() => {
    return filteredSales.filter(s => s.status === 'CONFIRMED' || !s.status);
  }, [filteredSales]);

  const pendingSales = useMemo(() => {
    return filteredSales.filter(s => s.status === 'PENDING_APPROVAL');
  }, [filteredSales]);

  const totalUSD = useMemo(() => {
    return confirmedSales.reduce((acc, s) => acc + (Number(s.totalPrice) || Number(s.unit_price) * (s.qty || 1) || 0), 0);
  }, [confirmedSales]);

  const totalUnits = useMemo(() => {
    return confirmedSales.reduce((acc, s) => acc + (Number(s.qty) || 1), 0);
  }, [confirmedSales]);

  const totalVES = totalUSD * activeRate;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (refreshSalesHistory) {
      await refreshSalesHistory();
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      
      {/* 1. Encabezado del Módulo de Ventas Adaptado a Sabrina */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
            <Receipt className="w-4 h-4 text-red-400" />
            Registro de Órdenes & Despachos en Maracaibo
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Historial de Ventas
          </h2>
          <p className="text-xs text-slate-400">
            Administra órdenes confirmadas, tramita garantías, emite facturas y contacta clientes por WhatsApp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Refrescar órdenes desde Supabase en tiempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Recargando...' : 'Recargar Pedidos'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sincronización activa en tiempo real"></span>
          </button>

          {salesHistory.some(s => s.status === 'REVERTED') && (
            <button
              onClick={() => {
                const count = salesHistory.filter(s => s.status === 'REVERTED').length;
                if (window.confirm(`¿Deseas purgar permanentemente las ${count} órdenes revertidas del historial? No afectará el catálogo ni el stock.`)) {
                  salesHistory.filter(s => s.status === 'REVERTED').forEach(s => {
                    const id = s.orderId || s.order_id || s.id;
                    if (id) deleteSale(id);
                  });
                }
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Eliminar permanentemente del historial las órdenes revertidas"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Limpiar Revertidas</span>
            </button>
          )}

          <button
            onClick={onOpenManualSaleModal}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-red-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Venta Manual</span>
          </button>
        </div>
      </div>

      {/* 2. Monitor de Tasas de Cambio en Vivo (Binance P2P & BCV Oficial) */}
      <ExchangeRateLiveBanner />

      {/* 3. Tarjetas KPI de Ventas con Estilo Sabrina */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="sabrina-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Facturado
          </span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
            ${totalUSD.toFixed(2)} <span className="text-[10px] sm:text-xs text-slate-400">USD</span>
          </div>
          <span className="text-[10px] sm:text-xs text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{confirmedSales.length} confirmadas</span>
          </span>
        </div>

        <div className="sabrina-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1" style={{ animationDelay: '0.08s' }}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Bolívares (BCV)
          </span>
          <div className="text-lg sm:text-2xl font-black text-red-600 font-mono truncate">
            Bs. {totalVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-mono">
            Tasa: Bs. {bcvRate?.toFixed(2)}
          </span>
        </div>

        <div className="sabrina-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1" style={{ animationDelay: '0.16s' }}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Unidades Despachadas
          </span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
            {totalUnits} <span className="text-[10px] sm:text-xs text-slate-400">uds</span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400">
            Salidas de bodega
          </span>
        </div>

        <div className="sabrina-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1" style={{ animationDelay: '0.24s' }}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pedidos Pendientes
          </span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 font-mono">
            {pendingSales.length}
          </div>
          <span className="text-[10px] sm:text-xs text-amber-600 font-semibold truncate">
            {pendingSales.length === 1 ? '1 por confirmar' : `${pendingSales.length} por confirmar`}
          </span>
        </div>

      </div>

      {/* 4. Barra de Filtros: Búsqueda, Período, Estado y Desglose por Método de Pago */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Buscador de Texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono, OEM, repuesto o referencia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selector de Período */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs shrink-0">
            <span className="px-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Período:</span>
            {[
              { id: 'ALL', label: 'Todo' },
              { id: 'TODAY', label: 'Hoy' },
              { id: 'WEEK', label: 'Semana' },
              { id: 'MONTH', label: 'Mes' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id)}
                className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer text-xs ${
                  dateFilter === p.id 
                    ? 'bg-red-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Selector de Estado */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs shrink-0">
            <span className="px-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estado:</span>
            {[
              { id: 'ALL', label: `Todas (${salesHistory.length})` },
              { id: 'CONFIRMED', label: 'Confirmadas' },
              { id: 'PENDING', label: 'Pendientes' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer text-xs ${
                  filterStatus === st.id 
                    ? 'bg-red-600 text-white font-black shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desglose y Filtro Rápido por Métodos de Pago */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <span>Método de Pago:</span>
          </span>

          <button
            onClick={() => setPaymentFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              paymentFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Todos los métodos</span>
          </button>

          {/* Pago Móvil */}
          <button
            onClick={() => setPaymentFilter(paymentFilter === 'pago_movil' ? 'ALL' : 'pago_movil')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              paymentFilter === 'pago_movil'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span>📱 Pago Móvil</span>
            <span className={`text-[10px] font-mono px-1 rounded ${paymentFilter === 'pago_movil' ? 'bg-emerald-700 text-white' : 'bg-white/80'}`}>
              ${paymentMethodTotals.pago_movil.usd.toFixed(2)} ({paymentMethodTotals.pago_movil.count})
            </span>
          </button>

          {/* Binance */}
          <button
            onClick={() => setPaymentFilter(paymentFilter === 'binance' ? 'ALL' : 'binance')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              paymentFilter === 'binance'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>🟡 Binance Pay</span>
            <span className={`text-[10px] font-mono px-1 rounded ${paymentFilter === 'binance' ? 'bg-amber-600 text-white' : 'bg-white/80'}`}>
              ${paymentMethodTotals.binance.usd.toFixed(2)} ({paymentMethodTotals.binance.count})
            </span>
          </button>

          {/* Zelle */}
          <button
            onClick={() => setPaymentFilter(paymentFilter === 'zelle' ? 'ALL' : 'zelle')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              paymentFilter === 'zelle'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
            }`}
          >
            <span>🟣 Zelle</span>
            <span className={`text-[10px] font-mono px-1 rounded ${paymentFilter === 'zelle' ? 'bg-purple-700 text-white' : 'bg-white/80'}`}>
              ${paymentMethodTotals.zelle.usd.toFixed(2)} ({paymentMethodTotals.zelle.count})
            </span>
          </button>

          {/* Efectivo */}
          <button
            onClick={() => setPaymentFilter(paymentFilter === 'efectivo' ? 'ALL' : 'efectivo')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              paymentFilter === 'efectivo'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
            }`}
          >
            <span>💵 Efectivo</span>
            <span className={`text-[10px] font-mono px-1 rounded ${paymentFilter === 'efectivo' ? 'bg-sky-700 text-white' : 'bg-white/80'}`}>
              ${paymentMethodTotals.efectivo.usd.toFixed(2)} ({paymentMethodTotals.efectivo.count})
            </span>
          </button>

          {paymentFilter !== 'ALL' && (
            <button
              onClick={() => setPaymentFilter('ALL')}
              className="text-[11px] text-red-500 hover:underline font-bold ml-1 cursor-pointer"
            >
              ✕ Quitar filtro de pago
            </button>
          )}
        </div>

      </div>

      {/* 5. Tabla de Órdenes con Todos los Botones (Editar, Garantía, Factura, Confirmar, Revertir) */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Vista Móvil: Tarjetas Ordenadas 100% Responsive (Sin Scroll Horizontal) */}
        <div className="block lg:hidden space-y-3 p-3">
          {filteredSales.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No se registran órdenes que coincidan con los filtros aplicados.
            </div>
          ) : (
            filteredSales.map(order => {
              const orderId = order.orderId || order.order_id || order.id || 'ORD-000';
              const custName = order.customerName || order.customer_name || 'Cliente';
              const custPhone = (order.customerPhone || order.customer_phone || '04126497478').replace(/[^0-9]/g, '');
              const partName = order.coilName || order.coil_name || 'Bobina OEM';
              const qty = Number(order.qty) || 1;
              const total = Number(order.totalPrice || order.total_price || order.unit_price || 0);
              const isConfirmed = order.status === 'CONFIRMED' || !order.status;
              const isPending = order.status === 'PENDING_APPROVAL';
              const isReverted = order.status === 'REVERTED';
              const hasWarranty = order.warrantyEvents && order.warrantyEvents.length > 0;

              const waMessage = encodeURIComponent(
                `¡Hola ${custName}! 🚗 Te escribimos de *JF Auto Parts Maracaibo* respecto a tu orden *${orderId}*:\n\n` +
                `📦 Repuesto: ${qty}x ${partName}\n` +
                `💵 Total: $${total.toFixed(2)} USD (~Bs. ${(total * bcvRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })})\n\n` +
                `¿Deseas entrega personal en tienda o delivery directo a tu taller?`
              );

              return (
                <div key={`mob-${orderId}`} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                  {/* Cabecera Móvil: ID, Fecha y Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-black text-red-600 text-xs">{orderId}</span>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {order.timestamp ? formatOrderDate(order.timestamp, false) : 'Reciente'}
                      </span>
                    </div>
                    <div>
                      {isConfirmed && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          CONFIRMADA
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          PENDIENTE
                        </span>
                      )}
                      {isReverted && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          REVERTIDA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cliente & Repuesto */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{custName}</span>
                      <span className="font-mono text-[10px] text-slate-500">{order.customerPhone || order.customer_phone || ''}</span>
                    </div>
                    <div className="text-slate-700 text-[11px] bg-white p-2 rounded-xl border border-slate-200/80">
                      <div className="font-semibold line-clamp-1">{partName}</div>
                      <div className="text-[10px] text-slate-400">Cantidad: {qty} unidad{qty > 1 ? 'es' : ''}</div>
                    </div>
                  </div>

                  {/* Montos y Referencia */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                    <div>
                      <div className="font-black text-slate-900 font-mono text-sm">${total.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">USD</span></div>
                      <div className="text-[10px] text-red-600 font-mono font-bold">
                        Bs. {(total * activeRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 inline-block truncate max-w-[140px]">
                        {String(order.paymentRef || order.referencia_pago || 'Pago Acordado')}
                      </span>
                    </div>
                  </div>

                  {/* Acciones Móviles */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                    {isPending && (
                      <button
                        onClick={() => setOrderToConfirm(order)}
                        className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Confirmar</span>
                      </button>
                    )}
                    {isConfirmed && (
                      <button
                        onClick={() => setOrderForReceipt(order)}
                        className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Factura</span>
                      </button>
                    )}
                    {isConfirmed && (
                      <button
                        onClick={() => setOrderForWarranty(order)}
                        className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Shield className="w-3 h-3" />
                        <span>Garantía</span>
                      </button>
                    )}
                    <button
                      onClick={() => setOrderToEdit(order)}
                      className="px-2 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <a
                      href={`https://wa.me/${custPhone.startsWith('58') ? custPhone : '58' + custPhone.replace(/^0/, '')}?text=${waMessage}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de eliminar permanentemente la orden #${orderId}? Se borrará del registro y de Supabase.`)) {
                          deleteSale(orderId);
                        }
                      }}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Eliminar venta definitivamente"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista Escritorio: Tabla Completa con 7 Columnas */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px]">
                <th className="py-3.5 px-4 font-bold">ORDEN</th>
                <th className="py-3.5 px-4 font-bold">CLIENTE</th>
                <th className="py-3.5 px-4 font-bold">REPUESTOS</th>
                <th className="py-3.5 px-4 font-bold">TOTAL USD</th>
                <th className="py-3.5 px-4 font-bold">PAGO / REF</th>
                <th className="py-3.5 px-4 font-bold">ESTADO</th>
                <th className="py-3.5 px-4 text-right font-bold min-w-[200px]">ACCIONES DE GESTIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No se registran órdenes que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredSales.map(order => {
                  const orderId = order.orderId || order.order_id || order.id || 'ORD-000';
                  const custName = order.customerName || order.customer_name || 'Cliente';
                  const custPhone = (order.customerPhone || order.customer_phone || '04126497478').replace(/[^0-9]/g, '');
                  const partName = order.coilName || order.coil_name || 'Bobina OEM';
                  const qty = Number(order.qty) || 1;
                  const total = Number(order.totalPrice || order.total_price || order.unit_price || 0);
                  const isConfirmed = order.status === 'CONFIRMED' || !order.status;
                  const isPending = order.status === 'PENDING_APPROVAL';
                  const isReverted = order.status === 'REVERTED';
                  const hasWarranty = order.warrantyEvents && order.warrantyEvents.length > 0;

                  const waMessage = encodeURIComponent(
                    `¡Hola ${custName}! 🚗 Te escribimos de *JF Auto Parts Maracaibo* respecto a tu orden *${orderId}*:\n\n` +
                    `📦 Repuesto: ${qty}x ${partName}\n` +
                    `💵 Total: $${total.toFixed(2)} USD (~Bs. ${(total * bcvRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })})\n\n` +
                    `¿Deseas entrega personal en tienda o delivery directo a tu taller?`
                  );

                  return (
                    <tr key={orderId} className="hover:bg-rose-50/30 transition">
                      
                      {/* Código de Orden y Fecha */}
                      <td className="py-3.5 px-4 font-mono font-bold text-red-600">
                        <div>{orderId}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {order.timestamp ? formatOrderDate(order.timestamp, false) : 'Reciente'}
                        </div>
                      </td>

                      {/* Cliente y Teléfono */}
                      <td className="py-3.5 px-4">
                        <strong className="block text-slate-900">{custName}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {order.customerPhone || order.customer_phone || 'Sin teléfono'}
                        </span>
                      </td>

                      {/* Repuestos con Vista Previa Hover */}
                      <td className="py-3.5 px-4 text-slate-800">
                        <ProductHoverPreview order={order} coils={coils} theme="light" />
                        {/* Indicador de Descuento de Stock */}
                        {order.stockBefore !== undefined && order.stockAfter !== undefined && (
                          <div className="text-[10px] font-mono text-slate-400 mt-1 pl-11">
                            Bodega: <span className="text-rose-500 font-semibold">{order.stockBefore}</span> ➔ <span className="text-emerald-600 font-bold">{order.stockAfter}</span> uds
                          </div>
                        )}
                      </td>

                      {/* Total USD & Bs (Calculado Dinámicamente con Tasa Binance) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-black text-slate-900 font-mono">${total.toFixed(2)}</div>
                        <div className="text-[10px] text-red-600 font-mono font-bold">
                          Bs. {(total * activeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Pago y Referencia con Botón de Nota */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const raw = String(order.paymentRef || order.referencia_pago || 'Pago Acordado');
                          const hasAjuste = raw.includes(' | [AJUSTE: ');
                          const mainText = hasAjuste ? raw.split(' | [AJUSTE: ')[0].trim() : raw.trim();
                          const ajusteText = hasAjuste 
                            ? raw.split(' | [AJUSTE: ')[1]?.replace(/\]$/, '').trim() 
                            : (order.notes || null);

                          const getPaymentMeta = (txt) => {
                            const lower = txt.toLowerCase();
                            if (txt.startsWith('[PAGO MÓVIL]') || txt.startsWith('[PAGO MOVIL]') || lower.includes('pago móvil') || lower.includes('pago movil')) {
                              return {
                                name: 'Pago Móvil',
                                color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                cleanText: txt.replace(/^\[PAGO M[ÓO]VIL\]\s*/i, '')
                              };
                            }
                            if (txt.startsWith('[BINANCE') || lower.includes('binance') || lower.includes('usdt')) {
                              return {
                                name: 'Binance Pay',
                                color: 'bg-amber-50 text-amber-700 border-amber-200',
                                cleanText: txt.replace(/^\[BINANCE PAY\]\s*/i, '').replace(/^\[BINANCE\]\s*/i, '')
                              };
                            }
                            if (txt.startsWith('[ZELLE]') || lower.includes('zelle')) {
                              return {
                                name: 'Zelle',
                                color: 'bg-purple-50 text-purple-700 border-purple-200',
                                cleanText: txt.replace(/^\[ZELLE\]\s*/i, '')
                              };
                            }
                            if (txt.startsWith('[EFECTIVO]') || lower.includes('efectivo') || lower.includes('cash')) {
                              return {
                                name: 'Efectivo',
                                color: 'bg-sky-50 text-sky-700 border-sky-200',
                                cleanText: txt.replace(/^\[EFECTIVO\]\s*/i, '')
                              };
                            }
                            return {
                              name: 'Pago Acordado',
                              color: 'bg-slate-100 text-slate-700 border-slate-200',
                              cleanText: txt
                            };
                          };

                          const meta = getPaymentMeta(mainText);

                          return (
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.color}`}>
                                <span>{meta.name}</span>
                              </span>
                              <div className="truncate font-mono text-[10px] text-slate-700 max-w-[170px]" title={mainText}>
                                {meta.cleanText || mainText}
                              </div>
                              {ajusteText && (
                                <button 
                                  type="button"
                                  onClick={() => setSelectedNoteModal({
                                    orderId,
                                    customerName: custName,
                                    customerPhone: order.customerPhone || order.customer_phone,
                                    paymentRef: mainText,
                                    note: ajusteText,
                                    total,
                                    coilName: partName,
                                    items: order.items,
                                    timestamp: order.timestamp
                                  })}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[10px] max-w-full font-sans cursor-pointer active:scale-95 transition text-left group shadow-xs mt-1"
                                  title="Haz clic para leer la nota de venta completa"
                                >
                                  <span>📝</span>
                                  <span className="truncate max-w-[130px] font-medium">{ajusteText}</span>
                                  <ArrowUpRight className="w-3 h-3 text-amber-600 opacity-70 group-hover:opacity-100 shrink-0" />
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isConfirmed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            CONFIRMADA
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            PENDIENTE
                          </span>
                        )}
                        {isReverted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            REVERTIDA
                          </span>
                        )}
                        {hasWarranty && (
                          <div className="mt-1">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 w-max">
                              <Shield className="w-2.5 h-2.5 text-purple-400" />
                              <span>{order.hasRefundApplied ? 'REEMBOLSADO' : 'GARANTÍA'}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Botones de Gestión (Editar, Garantía, Factura, Revertir, Confirmar, WhatsApp, Eliminar) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[200px]">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-nowrap">
                          
                          {/* Botón: Confirmar (solo si está pendiente) */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => setOrderToConfirm(order)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center gap-1 active:scale-95"
                                title="Confirmar pedido y descontar stock"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirmar</span>
                              </button>
                              <button
                                onClick={() => revertSale(orderId)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs transition cursor-pointer active:scale-95"
                                title="Rechazar pedido"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Botón: Garantía (solo confirmadas) */}
                          {isConfirmed && (
                            <button
                              onClick={() => setOrderForWarranty(order)}
                              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs transition cursor-pointer active:scale-95"
                              title="Tramitar garantía por defecto o devolución"
                            >
                              <Shield className="w-3.5 h-3.5 text-purple-500" />
                            </button>
                          )}

                          {/* Botón: Editar Orden (Habilitado para cualquier estado) */}
                          <button
                            onClick={() => setOrderToEdit(order)}
                            className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs transition cursor-pointer active:scale-95"
                            title="Editar datos de venta, estado o cambio de repuesto"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                          </button>

                          {/* Botón: Factura Formal */}
                          {isConfirmed && (
                            <button
                              onClick={() => setOrderForReceipt(order)}
                              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs transition cursor-pointer active:scale-95"
                              title="Generar e imprimir factura formal"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                          )}

                          {/* Botón: Revertir / Regresar */}
                          {isConfirmed && (
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Revertir la venta ${orderId} y regresar las piezas al inventario en Supabase?`)) {
                                  revertSale(orderId);
                                }
                              }}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs transition cursor-pointer active:scale-95"
                              title="Revertir venta y devolver piezas a bodega"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          )}

                          {/* Botón: Contacto WhatsApp */}
                          <a
                            href={`https://wa.me/${custPhone.startsWith('58') ? custPhone : '58' + custPhone.replace(/^0/, '')}?text=${waMessage}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition text-xs cursor-pointer active:scale-95"
                            title="Contactar al cliente por WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          </a>

                          {/* Botón: Eliminar Venta */}
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de eliminar permanentemente la orden #${orderId}? Se borrará del registro y de Supabase.`)) {
                                deleteSale(orderId);
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-xs transition cursor-pointer active:scale-95"
                            title="Eliminar venta definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modales del Sistema Conectados a la Tabla de Ventas */}
      <WarrantyModal
        isOpen={!!orderForWarranty}
        order={orderForWarranty}
        coils={coils}
        onClose={() => setOrderForWarranty(null)}
        onProcessReplacement={processWarrantyReplacement}
        onProcessRefund={processWarrantyRefund}
      />

      <EditSaleModal
        isOpen={!!orderToEdit}
        order={orderToEdit}
        coils={coils}
        onClose={() => setOrderToEdit(null)}
        onSave={updateSaleTransaction}
        onUpdateOrder={updateSaleTransaction}
        onDelete={deleteSale}
      />

      <ReceiptModal
        isOpen={!!orderForReceipt}
        order={orderForReceipt}
        onClose={() => setOrderForReceipt(null)}
      />

      <ConfirmSalePaymentModal
        isOpen={!!orderToConfirm}
        order={orderToConfirm}
        onClose={() => setOrderToConfirm(null)}
        onConfirm={confirmSale}
      />

      {/* Modal de Nota de Venta / Motivo del Cambio */}
      {selectedNoteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" 
          onClick={() => setSelectedNoteModal(null)}
        >
          <div 
            className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 animate-scaleIn text-slate-900"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <span>📝</span>
                <span className="text-slate-900 font-extrabold">Nota de Venta / Motivo del Cambio</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold">
                  #{selectedNoteModal.orderId}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedNoteModal(null)}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Texto Completo de la Nota */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-slate-800 text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider flex items-center gap-1.5">
                <span>“</span>
                <span>Observación Registrada por el Administrador:</span>
              </span>
              <p className="text-sm text-slate-900 font-medium whitespace-pre-wrap leading-relaxed italic">
                "{selectedNoteModal.note}"
              </p>
            </div>

            {/* Ficha Resumen de la Orden */}
            <div className="space-y-3 text-[11px] bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Cliente</span>
                  <span className="text-slate-900 font-bold truncate block">{selectedNoteModal.customerName}</span>
                  {selectedNoteModal.customerPhone && (
                    <span className="text-slate-500 text-[10px] font-mono block">{selectedNoteModal.customerPhone}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total de la Orden</span>
                  <span className="text-emerald-700 font-mono font-black text-sm block">
                    {formatUSD(selectedNoteModal.total)}
                  </span>
                </div>
              </div>

              {/* Repuesto Entregado */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                  Repuesto Entregado:
                </span>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold text-xs">
                  {selectedNoteModal.coilName}
                </div>
              </div>

              {/* Información Completa de Pago */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                  Detalle Completo del Pago & Referencia:
                </span>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed break-words whitespace-normal select-all">
                  {selectedNoteModal.paymentRef}
                </div>
              </div>
            </div>

            {/* Botón Cerrar */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedNoteModal(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition cursor-pointer active:scale-95 shadow-sm"
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
