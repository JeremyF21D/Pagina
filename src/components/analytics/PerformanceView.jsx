import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { formatUSD, parseOrderDate } from '../../utils/formatters';
import defaultCoilImage from '../../assets/bobina_tiida_studio.jpg';
import jfEmblem from '../../assets/jf_emblem_clean.png';

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Paleta de colores distintivos para las curvas de la gráfica
const CURVE_COLORS = [
  "#de2420", // Rojo JF Racing
  "#10b981", // Esmeralda
  "#06b6d4", // Cyan
  "#f97316", // Naranja
  "#a855f7", // Púrpura
  "#eab308", // Ámbar
  "#3b82f6", // Azul
  "#ec4899"  // Rosa
];

export function PerformanceView({ onNavigateTab }) {
  const { coils, salesHistory } = useInventory();
  const { rates, formatVES } = useCurrency();

  // 1. Filtro de Fechas (Desde / Hasta) dinámico
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2); // Últimos meses por defecto
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Métrica activa en la gráfica: 'units' | 'profit'
  const [chartMetric, setChartMetric] = useState('units');

  // Estado del drawer de tabla detallada
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Costos personalizados guardados por el usuario en localStorage
  const [customCosts, setCustomCosts] = useState(() => {
    try {
      const saved = localStorage.getItem('jf_product_costs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Guardar costos personalizados
  const handleUpdateCost = (coilId, newCost) => {
    const val = parseFloat(newCost);
    if (isNaN(val) || val < 0) return;
    const updated = { ...customCosts, [coilId]: val };
    setCustomCosts(updated);
    try {
      localStorage.setItem('jf_product_costs', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving custom costs:', e);
    }
  };

  // 2. Costo del producto: POR DEFECTO TODOS LOS REPUESTOS REGISTRADOS COSTARON 0$
  const getProductCost = (coil) => {
    if (!coil) return 0;
    if (customCosts[coil.id] !== undefined) return Number(customCosts[coil.id]);
    if (coil.cost !== undefined && coil.cost !== null && !isNaN(Number(coil.cost))) {
      return Number(coil.cost);
    }
    // Todos los repuestos registrados costaron 0$ según requerimiento
    return 0;
  };

  // 3. Ventas confirmadas dentro del rango seleccionado (100% DINÁMICO)
  const confirmedPeriodSales = useMemo(() => {
    const dFrom = new Date(dateFrom + 'T00:00:00');
    const dTo = new Date(dateTo + 'T23:59:59');

    return (salesHistory || []).filter(sale => {
      // Filtrar órdenes confirmadas
      const status = (sale.status || sale.estado || sale.estado_orden || '').toUpperCase();
      if (status !== 'CONFIRMED') return false;

      // Parsear fecha real con parseOrderDate
      const rawDate = sale.timestamp || sale.fecha_hora || sale.created_at || sale.fecha;
      const parsedDate = parseOrderDate(rawDate);
      if (!parsedDate) return false;

      return parsedDate >= dFrom && parsedDate <= dTo;
    });
  }, [salesHistory, dateFrom, dateTo]);

  // 4. Meses activos que abarca el filtro
  const activeMonths = useMemo(() => {
    const dFrom = new Date(dateFrom + 'T00:00:00');
    const dTo = new Date(dateTo + 'T23:59:59');
    if (dTo < dFrom) return [dFrom.getMonth()];

    const mFrom = dFrom.getMonth();
    const mTo = dTo.getMonth();

    const list = [];
    if (dTo.getFullYear() === dFrom.getFullYear()) {
      for (let m = mFrom; m <= mTo; m++) list.push(m);
    } else {
      for (let m = 0; m < 12; m++) {
        if (m >= mFrom || m <= mTo) list.push(m);
      }
    }
    return list.length > 0 ? list : [new Date().getMonth()];
  }, [dateFrom, dateTo]);

  // Días seleccionados
  const diffDays = useMemo(() => {
    const dFrom = new Date(dateFrom);
    const dTo = new Date(dateTo);
    return Math.max(1, Math.round((dTo - dFrom) / (1000 * 60 * 60 * 24)) + 1);
  }, [dateFrom, dateTo]);

  // 5. CÁLCULO 100% DINÁMICO: Agrupación de Ventas Reales por Producto y por Mes
  const { aggregatedProducts, globalKpis } = useMemo(() => {
    const productStatsMap = {};
    let totalRevenue = 0;
    let totalCost = 0;

    // Procesar cada orden confirmada del periodo
    confirmedPeriodSales.forEach(order => {
      const rawDate = order.timestamp || order.fecha_hora || order.created_at || order.fecha;
      const parsedDate = parseOrderDate(rawDate) || new Date();
      const mIdx = parsedDate.getMonth();

      // Desglosar artículos de la orden
      const items = (order.items && Array.isArray(order.items) && order.items.length > 0)
        ? order.items
        : [{
            coilId: order.coilId || order.producto_id,
            name: order.coilName || order.producto_nombre,
            qty: order.qty || order.cantidad || 1,
            price: order.unitPrice || order.precio_unitario_usd || (order.totalPrice / (order.qty || 1)) || 0,
            oem: order.oem || order.codigo_oem
          }];

      items.forEach(it => {
        const cId = String(it.coilId || it.id || '').trim();
        const matchedCoil = (coils || []).find(c => String(c.id).trim().toLowerCase() === cId.toLowerCase()) || {};
        const key = cId || String(matchedCoil.id || it.name || 'desconocido').trim();

        const qty = Number(it.qty) || 1;
        const unitPrice = Number(it.price !== undefined ? it.price : (matchedCoil.price || 0));
        const unitCost = getProductCost(matchedCoil);

        const rev = qty * unitPrice;
        const cst = qty * unitCost; // Será 0 si el costo es 0$
        const profit = rev - cst;

        totalRevenue += rev;
        totalCost += cst;

        if (!productStatsMap[key]) {
          productStatsMap[key] = {
            units: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            monthlyUnits: Array(12).fill(0),
            monthlyProfit: Array(12).fill(0)
          };
        }

        productStatsMap[key].units += qty;
        productStatsMap[key].revenue += rev;
        productStatsMap[key].cost += cst;
        productStatsMap[key].profit += profit;
        productStatsMap[key].monthlyUnits[mIdx] += qty;
        productStatsMap[key].monthlyProfit[mIdx] += profit;
      });
    });

    const netProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 100;

    // Mapear el catálogo completo con sus ventas reales
    const productList = (coils || []).map((coil, idx) => {
      const cId = String(coil.id).trim();
      const stats = productStatsMap[cId] || {
        units: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        monthlyUnits: Array(12).fill(0),
        monthlyProfit: Array(12).fill(0)
      };

      const cost = getProductCost(coil); // 0$ por defecto
      const price = Number(coil.price) || 0;
      const unitProfit = price - cost;
      const marginPct = price > 0 ? Math.round(((price - cost) / price) * 100) : 100;

      return {
        ...coil,
        cost,
        price,
        unitProfit,
        marginPct,
        periodUnits: stats.units,
        periodRevenue: stats.revenue,
        periodCost: stats.cost,
        periodProfit: stats.profit,
        monthlyUnits: stats.monthlyUnits,
        monthlyProfit: stats.monthlyProfit,
        hasSales: stats.units > 0,
        color: CURVE_COLORS[idx % CURVE_COLORS.length]
      };
    });

    // Ordenar: primero los repuestos con ventas reales en el periodo, luego por mayor ganancia/precio
    productList.sort((a, b) => {
      if (b.periodUnits !== a.periodUnits) return b.periodUnits - a.periodUnits;
      if (b.periodProfit !== a.periodProfit) return b.periodProfit - a.periodProfit;
      return b.price - a.price;
    });

    return {
      aggregatedProducts: productList,
      globalKpis: {
        totalRevenue,
        totalCost,
        netProfit,
        avgMargin,
        totalUnitsSold: confirmedPeriodSales.reduce((acc, s) => acc + (s.qty || s.cantidad || 1), 0),
        totalOrdersCount: confirmedPeriodSales.length
      }
    };
  }, [coils, confirmedPeriodSales, customCosts]);

  // Selección de curvas para la gráfica
  const [activeCurveIds, setActiveCurveIds] = useState([]);

  useEffect(() => {
    if (aggregatedProducts.length > 0 && activeCurveIds.length === 0) {
      // Activar los primeros repuestos con ventas, o los primeros del catálogo
      const prodsWithSales = aggregatedProducts.filter(p => p.hasSales);
      const defaults = prodsWithSales.length > 0
        ? prodsWithSales.slice(0, 5).map(p => p.id)
        : aggregatedProducts.slice(0, 4).map(p => p.id);
      setActiveCurveIds(defaults);
    }
  }, [aggregatedProducts]);

  const toggleCurve = (id) => {
    setActiveCurveIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Top Repuestos Más Rentables (Columna Derecha)
  const topProducts = useMemo(() => {
    return aggregatedProducts.slice(0, 4);
  }, [aggregatedProducts]);

  // 6. Gráfica SVG Multi-línea 100% Dinámica
  const chartData = useMemo(() => {
    const activeProds = aggregatedProducts.filter(p => activeCurveIds.includes(p.id));
    let maxVal = 4; // Mínimo de escala para visualización limpia

    activeProds.forEach(p => {
      const series = activeMonths.map(m =>
        chartMetric === 'units' ? (p.monthlyUnits[m] || 0) : (p.monthlyProfit[m] || 0)
      );
      const localMax = Math.max(...series, 0);
      if (localMax > maxVal) maxVal = localMax;
    });

    maxVal = Math.ceil(maxVal * 1.2) || 4;

    const startX = 60;
    const endX = 780;
    const startY = 20;
    const zeroY = 200;
    const chartHeight = zeroY - startY;
    const stepX = activeMonths.length > 1 ? (endX - startX) / (activeMonths.length - 1) : 0;

    // Calcular curvas Bezier reales
    const curves = activeProds.map(p => {
      const points = activeMonths.map((m, idx) => {
        const val = chartMetric === 'units' ? (p.monthlyUnits[m] || 0) : (p.monthlyProfit[m] || 0);
        const x = activeMonths.length > 1 ? startX + (idx * stepX) : 420;
        const y = zeroY - ((val / maxVal) * chartHeight);
        return { x, y, val, m };
      });

      let path = "";
      if (points.length > 0) {
        path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];
          const cx = (p0.x + p1.x) / 2;
          path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
        }
      }

      let areaPath = "";
      if (points.length > 0) {
        areaPath = `${path} L ${points[points.length - 1].x} ${zeroY} L ${points[0].x} ${zeroY} Z`;
      }

      return { product: p, points, path, areaPath };
    });

    return { maxVal, startX, endX, startY, zeroY, chartHeight, stepX, curves };
  }, [aggregatedProducts, activeCurveIds, activeMonths, chartMetric]);

  const [hoveredMonth, setHoveredMonth] = useState(null);
  const binanceRate = Number(rates?.binance) || 1067;

  return (
    <div className="space-y-3 pb-8 animate-fade-in text-slate-100">
      
      {/* 1. BARRA SUPERIOR DE CONTROL EJECUTIVA (DESDE / HASTA SIN PRESETS) */}
      <div className="bg-[#1c1d22] border border-[#2d2f35] rounded-2xl p-3 sm:p-3.5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Título & Tasa Oficial */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-[#de2420]/15 text-[#de2420] border border-[#de2420]/30">
                Auditoría Financiera & Margen
              </span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                <i className="fa-solid fa-coins text-[10px]"></i>
                <span className="text-slate-400">Binance P2P:</span>
                <strong className="text-white">{binanceRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs/$</strong>
              </span>
            </div>

            <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-[#de2420]"></i>
              <span>Rendimiento Financiero & Estacionalidad</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Datos 100% dinámicos en vivo desde Supabase. Costo base aplicado: <strong>0$ USD</strong> por repuesto.
            </p>
          </div>

          {/* Selector de Rango Exclusivo: DESDE / HASTA */}
          <div className="flex flex-wrap items-center gap-2">
            
            <div className="flex items-center bg-[#141518] border border-[#2d2f35] rounded-xl p-1 shadow-inner text-xs">
              
              {/* Campo Desde */}
              <div className="flex items-center gap-1.5 px-2.5 py-1">
                <i className="fa-regular fa-calendar text-slate-500 text-[11px]"></i>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Desde:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-slate-100 font-mono text-xs focus:outline-none cursor-pointer"
                />
              </div>

              <span className="text-slate-600 font-mono text-xs px-1">➔</span>

              {/* Campo Hasta */}
              <div className="flex items-center gap-1.5 px-2.5 py-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Hasta:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-slate-100 font-mono text-xs focus:outline-none cursor-pointer"
                />
              </div>

            </div>

            {/* Selector de Métrica: Unidades vs Ganancia ($) */}
            <div className="flex items-center bg-[#141518] border border-[#2d2f35] rounded-xl p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMetric('units')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  chartMetric === 'units'
                    ? 'bg-[#25272e] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-boxes-stacked text-[10px] text-sky-400"></i>
                <span>Unidades</span>
              </button>

              <button
                type="button"
                onClick={() => setChartMetric('profit')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  chartMetric === 'profit'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-hand-holding-dollar text-[10px] text-emerald-300"></i>
                <span>Ganancia ($)</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* 2. LAS 4 TARJETAS KPI EJECUTIVAS DINÁMICAS (CON COSTO 0$) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* KPI 1: Facturación Real */}
        <div className="bg-[#1c1d22] border border-[#2d2f35] rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-base shrink-0">
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </div>
          <div className="overflow-hidden">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block truncate">Total Facturado</span>
            <div className="text-base sm:text-lg font-black text-white font-mono leading-tight mt-0.5">
              {formatUSD(globalKpis.totalRevenue)}
            </div>
            <span className="text-[10px] text-amber-300 font-mono truncate block">
              ≈ {formatVES(globalKpis.totalRevenue * binanceRate)}
            </span>
          </div>
        </div>

        {/* KPI 2: Costo de Bodega (0$ por defecto) */}
        <div className="bg-[#1c1d22] border border-[#2d2f35] rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-base shrink-0">
            <i className="fa-solid fa-boxes-packing"></i>
          </div>
          <div className="overflow-hidden">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block truncate">Costo de Bodega</span>
            <div className="text-base sm:text-lg font-black text-slate-300 font-mono leading-tight mt-0.5">
              {formatUSD(globalKpis.totalCost)}
            </div>
            <span className="text-[10px] text-emerald-400 font-mono truncate block">
              {globalKpis.totalCost === 0 ? 'Costo $0 (100% libre)' : 'Inversión en repuestos'}
            </span>
          </div>
        </div>

        {/* KPI 3: Ganancia Neta Limpia */}
        <div className="bg-gradient-to-br from-emerald-950/70 via-[#1c1d22] to-[#1c1d22] border border-emerald-500/50 rounded-2xl p-2.5 sm:p-3 shadow-xl flex items-center gap-3 relative overflow-hidden">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-base shrink-0 shadow-lg shadow-emerald-700/20">
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
          <div className="overflow-hidden">
            <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block truncate flex items-center gap-1">
              <span>Ganancia Neta</span>
              <i className="fa-solid fa-circle-check text-[9px]"></i>
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-300 font-mono leading-tight mt-0.5">
              +{formatUSD(globalKpis.netProfit)}
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold truncate block">
              ≈ {formatVES(globalKpis.netProfit * binanceRate)} libres
            </span>
          </div>
        </div>

        {/* KPI 4: Margen Global */}
        <div className="bg-[#1c1d22] border border-[#2d2f35] rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-base shrink-0">
            <i className="fa-solid fa-percent"></i>
          </div>
          <div className="overflow-hidden">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block truncate">Margen de Ganancia</span>
            <div className="text-base sm:text-lg font-black text-amber-300 font-mono leading-tight mt-0.5">
              {globalKpis.avgMargin}%
            </div>
            <span className="text-[10px] text-slate-400 font-mono truncate block">
              {globalKpis.totalOrdersCount} órdenes ({diffDays} días)
            </span>
          </div>
        </div>

      </div>

      {/* 3. WORKSPACE EN 2 COLUMNAS (ALTO COMPACTO Y ORDENADO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
        
        {/* COLUMNA IZQUIERDA (7 COLS): GRÁFICA MULTI-LÍNEA DINÁMICA */}
        <div className="lg:col-span-7 bg-[#1c1d22] border border-[#2d2f35] rounded-2xl p-3 sm:p-3.5 shadow-xl space-y-2">
          
          {/* Header de la Gráfica */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-[#2d2f35]">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-up text-[#de2420]"></i>
                <span>Curva de Demanda & Estacionalidad</span>
              </h2>
              <p className="text-[10px] text-slate-400">Rotación real mes a mes basada en tus ventas registradas</p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{chartMetric === 'units' ? 'Unidades vendidas' : 'Ganancia neta ($)'}</span>
            </div>
          </div>

          {/* Chips Dinámicos para Seleccionar Repuestos en la Gráfica */}
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Filtra repuestos en la gráfica (clic para activar/desactivar curva):
            </span>
            <div className="flex flex-wrap gap-1">
              {aggregatedProducts.slice(0, 6).map(prod => {
                const isActive = activeCurveIds.includes(prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => toggleCurve(prod.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                      isActive
                        ? 'bg-[#141518] text-white border-[#3a3c44] shadow-xs'
                        : 'bg-black/50 text-slate-500 border-[#2d2f35] opacity-50 hover:opacity-80'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: prod.color, opacity: isActive ? 1 : 0.3 }}
                    ></span>
                    <span className="truncate max-w-[130px]">{prod.name.split(' ')[0]} {prod.name.split(' ')[1] || ''}</span>
                    {prod.hasSales && (
                      <span className="text-[9px] text-emerald-400 font-mono">({prod.periodUnits}u)</span>
                    )}
                    <span className="text-[9px]">{isActive ? '●' : '○'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lienzo SVG Dinámico */}
          <div className="relative w-full h-56 sm:h-64 select-none pt-1" id="chart-wrapper">
            <svg viewBox="0 0 820 250" className="w-full h-full overflow-visible">
              <defs>
                {aggregatedProducts.slice(0, 7).map((p) => (
                  <linearGradient key={`grad-${p.id}`} id={`grad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={p.color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={p.color} stopOpacity="0.0" />
                  </linearGradient>
                ))}
              </defs>

              {/* Guías Horizontales */}
              <line x1="45" y1="20" x2="795" y2="20" stroke="#25272e" strokeDasharray="3,3" />
              <line x1="45" y1="65" x2="795" y2="65" stroke="#25272e" strokeDasharray="3,3" />
              <line x1="45" y1="110" x2="795" y2="110" stroke="#25272e" strokeDasharray="3,3" />
              <line x1="45" y1="155" x2="795" y2="155" stroke="#25272e" strokeDasharray="3,3" />
              <line x1="45" y1="200" x2="795" y2="200" stroke="#333640" strokeWidth="1.5" />

              {/* Eje Y */}
              <text x="38" y="24" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
                {chartMetric === 'units' ? `${Math.round(chartData.maxVal)} u` : `$${Math.round(chartData.maxVal)}`}
              </text>
              <text x="38" y="69" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
                {chartMetric === 'units' ? `${Math.round(chartData.maxVal * 0.75)} u` : `$${Math.round(chartData.maxVal * 0.75)}`}
              </text>
              <text x="38" y="114" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
                {chartMetric === 'units' ? `${Math.round(chartData.maxVal * 0.5)} u` : `$${Math.round(chartData.maxVal * 0.5)}`}
              </text>
              <text x="38" y="159" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
                {chartMetric === 'units' ? `${Math.round(chartData.maxVal * 0.25)} u` : `$${Math.round(chartData.maxVal * 0.25)}`}
              </text>
              <text x="38" y="204" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">0</text>

              {/* Áreas bajo la curva */}
              {chartData.curves.map(c => (
                <path
                  key={`area-${c.product.id}`}
                  d={c.areaPath}
                  fill={`url(#grad-${c.product.id})`}
                  opacity="0.5"
                />
              ))}

              {/* Curvas Bezier */}
              {chartData.curves.map(c => (
                <path
                  key={`line-${c.product.id}`}
                  d={c.path}
                  fill="none"
                  stroke={c.product.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                  opacity="0.95"
                />
              ))}

              {/* Puntos de cada mes */}
              {chartData.curves.map(c =>
                c.points.map((pt, pIdx) => (
                  <circle
                    key={`dot-${c.product.id}-${pIdx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    fill={c.product.color}
                    stroke="#141518"
                    strokeWidth="1.5"
                    className="pointer-events-none"
                  />
                ))
              )}

              {/* Etiquetas Eje X (Meses) */}
              {activeMonths.map((m, idx) => {
                const x = activeMonths.length > 1 ? chartData.startX + (idx * chartData.stepX) : 420;
                return (
                  <text
                    key={`x-tick-${m}`}
                    x={x}
                    y="222"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {MONTH_NAMES[m]}
                  </text>
                );
              })}

              {/* Guía Vertical Dinámica cuando se pasa el cursor */}
              {hoveredMonth !== null && (
                <line
                  x1={hoveredMonth.x}
                  y1="15"
                  x2={hoveredMonth.x}
                  y2="200"
                  stroke="#de2420"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
              )}

              {/* Zonas de detección hover invisibles por cada mes */}
              {activeMonths.map((m, idx) => {
                const x = activeMonths.length > 1 ? chartData.startX + (idx * chartData.stepX) : 420;
                const width = chartData.stepX || 80;
                return (
                  <rect
                    key={`hover-col-${m}`}
                    x={x - (width / 2)}
                    y={chartData.startY}
                    width={width}
                    height={chartData.chartHeight + 10}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredMonth({ mIdx: m, x })}
                    onMouseLeave={() => setHoveredMonth(null)}
                  />
                );
              })}
            </svg>

            {/* Tooltip Flotante */}
            {hoveredMonth && (
              <div
                className="absolute pointer-events-none bg-[#1c1d22]/95 border border-[#3a3c44] rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-xs min-w-[210px] -translate-x-1/2 -translate-y-full z-30 transition-all duration-100"
                style={{
                  left: `${(hoveredMonth.x / 820) * 100}%`,
                  top: '90px'
                }}
              >
                <div className="font-bold text-white border-b border-[#2d2f35] pb-1 mb-1.5 flex items-center justify-between">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <i className="fa-regular fa-calendar-check text-[11px]"></i>
                    <span>{MONTH_NAMES[hoveredMonth.mIdx]} 2026</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono uppercase">
                    {chartMetric === 'units' ? 'Unidades' : 'Ganancia $'}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px]">
                  {aggregatedProducts.filter(p => activeCurveIds.includes(p.id)).map(p => {
                    const val = chartMetric === 'units'
                      ? `${p.monthlyUnits[hoveredMonth.mIdx] || 0} uds`
                      : `+$${p.monthlyProfit[hoveredMonth.mIdx] || 0}.00`;
                    return (
                      <div key={`tip-${p.id}`} className="flex items-center justify-between gap-3 text-slate-200">
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                          <span className="truncate text-[10px]">{p.name}</span>
                        </div>
                        <strong className="font-bold text-white shrink-0">{val}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer de la gráfica */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#2d2f35]">
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-circle-info text-sky-400"></i>
              <span>Pasa el cursor por cada mes para auditar la rotación de repuestos.</span>
            </span>
            <span className="text-slate-500 font-mono">Actualizado con Supabase</span>
          </div>

        </div>

        {/* COLUMNA DERECHA (5 COLS): TOP REPUESTOS MÁS RENTABLES */}
        <div className="lg:col-span-5 bg-[#1c1d22] border border-[#2d2f35] rounded-2xl p-3 sm:p-3.5 shadow-xl space-y-2.5">
          
          {/* Header del Ranking */}
          <div className="flex items-center justify-between pb-2 border-b border-[#2d2f35]">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <i className="fa-solid fa-trophy text-amber-400"></i>
                <span>Top Repuestos Más Rentables</span>
              </h2>
              <p className="text-[11px] text-slate-400">Ordenados por dinero neto que dejan a tu negocio</p>
            </div>
            <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
              <i className="fa-solid fa-arrow-up-right-dots"></i>
              <span>Mayor Utilidad</span>
            </span>
          </div>

          {/* Lista de Repuestos Top */}
          <div className="space-y-2">
            {topProducts.map((p, idx) => {
              const maxGain = topProducts[0]?.periodProfit || topProducts[0]?.price || 1;
              const pctBar = p.periodProfit > 0
                ? Math.max(12, Math.round((p.periodProfit / maxGain) * 100))
                : 0;
              const posLabels = ["#1", "#2", "#3", "#4"];
              const posStyles = [
                "text-amber-400 bg-amber-500/10 border-amber-500/30",
                "text-slate-300 bg-slate-700/20 border-slate-600/30",
                "text-orange-400 bg-orange-500/10 border-orange-500/30",
                "text-slate-400 bg-slate-800/30 border-slate-800"
              ];

              return (
                <div key={p.id} className="p-2.5 rounded-xl bg-[#141518] border border-[#2d2f35] hover:border-[#3a3c44] transition space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    
                    {/* Foto Real + Posición + Datos */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] border ${posStyles[idx]} shrink-0`}>
                        {posLabels[idx]}
                      </span>

                      {/* Contenedor de Imagen de Repuesto */}
                      <div className="w-10 h-10 rounded-lg bg-white border border-[#2d2f35] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={p.image || defaultCoilImage}
                          alt={p.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { e.target.src = jfEmblem; }}
                        />
                      </div>

                      <div className="truncate">
                        <div className="font-bold text-white text-[11px] truncate" title={p.name}>
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {p.oem || p.id} • <strong className={p.hasSales ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{p.periodUnits} uds vendidas</strong>
                        </div>
                      </div>
                    </div>

                    {/* Ganancia Total */}
                    <div className="text-right shrink-0">
                      <div className="font-extrabold font-mono text-emerald-400 text-xs sm:text-sm">
                        +{formatUSD(p.periodProfit)}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono font-semibold">
                        {p.marginPct}% margen
                      </span>
                    </div>

                  </div>

                  {/* Barra de Retorno de Ganancia */}
                  <div className="w-full bg-[#1c1d22] h-1.5 rounded-full overflow-hidden flex border border-[#2d2f35]/50">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${pctBar}%` }}
                    ></div>
                  </div>

                  {/* Desglose Transparente (Costo 0$ por defecto) */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                    <span>Venta: ${p.price} | Costo: ${p.cost}</span>
                    <span className="text-emerald-400 font-bold">Ganas +${p.price - p.cost}.00/u (100% libre)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tarjeta de Recomendación de Inventario Inteligente */}
          {topProducts[0] && (
            <div className="p-2.5 rounded-xl bg-[#141518] border border-[#2d2f35] text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                <i className="fa-solid fa-lightbulb"></i>
                <span>Diagnóstico de Inventario:</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Al tener un costo de adquisición de <strong>$0 USD</strong>, cada venta se traduce en <strong>100% de utilidad líquida</strong>. El repuesto con mayor precio de lista es <strong className="text-white">{topProducts[0].name}</strong> (${topProducts[0].price} USD).
              </p>
            </div>
          )}

        </div>

      </div>

      {/* 4. MATRIZ DETALLADA DE RENTABILIDAD POR PRODUCTO (DESPLEGABLE / DRAWER) */}
      <div className="bg-[#1c1d22] border border-[#2d2f35] rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Botón para Abrir / Cerrar el Desglose */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(prev => !prev)}
          className="w-full px-4 py-3 bg-[#1c1d22] hover:bg-[#25272e] flex items-center justify-between text-left transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#de2420]/15 border border-[#de2420]/30 text-[#de2420] flex items-center justify-center text-xs">
              <i className="fa-solid fa-table-list"></i>
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span>Matriz Detallada de Rentabilidad por Producto</span>
                <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full border border-slate-700">
                  {aggregatedProducts.length} repuestos registrados
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Ver unidades despachadas, precio de venta, costo de bodega ($0 por defecto) y ganancia unitaria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              {isDrawerOpen ? 'Ocultar Tabla' : 'Desplegar Tabla'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#141518] border border-[#2d2f35] flex items-center justify-center text-slate-400">
              <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-300 ${isDrawerOpen ? 'rotate-180' : ''}`}></i>
            </div>
          </div>
        </button>

        {/* Contenido Desplegable */}
        {isDrawerOpen && (
          <div className="border-t border-[#2d2f35] p-3.5 bg-[#141518] animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#2d2f35] text-[10px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-3">Repuesto & Vehículo</th>
                    <th className="py-2.5 px-2 text-center">Código OEM</th>
                    <th className="py-2.5 px-2 text-center">Unidades Vendidas</th>
                    <th className="py-2.5 px-2 text-right">P. Venta</th>
                    <th className="py-2.5 px-2 text-right">Costo Bodega</th>
                    <th className="py-2.5 px-2 text-right">Ganas / Unidad</th>
                    <th className="py-2.5 px-3 text-right">Ganancia Total</th>
                    <th className="py-2.5 px-2 text-center">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d2f35]/60 text-slate-200">
                  {aggregatedProducts.map(p => (
                    <tr key={`table-row-${p.id}`} className="hover:bg-[#1c1d22] transition">
                      
                      {/* Repuesto */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-white border border-[#2d2f35] p-0.5 flex items-center justify-center shrink-0">
                            <img
                              src={p.image || defaultCoilImage}
                              alt={p.name}
                              className="w-full h-full object-contain"
                              onError={(e) => { e.target.src = jfEmblem; }}
                            />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{p.name}</div>
                            <div className="text-[10px] text-slate-400">{p.carModel || p.brand}</div>
                          </div>
                        </div>
                      </td>

                      {/* OEM */}
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-300">
                        {p.oem ? p.oem.split('/')[0] : p.id}
                      </td>

                      {/* Unidades Vendidas */}
                      <td className="py-2 px-2 text-center font-mono font-bold text-white">
                        <span className={p.hasSales ? 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400' : 'text-slate-500'}>
                          {p.periodUnits}
                        </span>
                      </td>

                      {/* Precio Venta */}
                      <td className="py-2 px-2 text-right font-mono text-slate-200">
                        ${p.price}.00
                      </td>

                      {/* Costo con editor interactivo (Costo 0$ por defecto) */}
                      <td className="py-2 px-2 text-right font-mono">
                        <div className="inline-flex items-center gap-1 bg-[#141518] px-1.5 py-0.5 rounded border border-[#2d2f35] hover:border-slate-500">
                          <span className="text-slate-500 text-[10px]">$</span>
                          <input
                            type="number"
                            value={p.cost}
                            onChange={(e) => handleUpdateCost(p.id, e.target.value)}
                            className="w-10 bg-transparent text-slate-300 text-right focus:outline-none focus:text-white"
                            title="Puedes editar el costo si algún lote tuvo costo de compra"
                          />
                        </div>
                      </td>

                      {/* Ganancia Unitaria */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-400">
                        +${p.price - p.cost}.00
                      </td>

                      {/* Ganancia Total en el Periodo */}
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-300">
                        +{formatUSD(p.periodProfit)}
                      </td>

                      {/* Margen % */}
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {p.marginPct}%
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
