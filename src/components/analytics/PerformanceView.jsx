import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { formatUSD, parseOrderDate } from '../../utils/formatters';
import defaultCoilImage from '../../assets/bobina_tiida_studio.jpg';
import jfEmblem from '../../assets/jf_emblem_clean.png';

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Paleta de colores distintivos y contrastantes para las curvas de la gráfica
const CURVE_COLORS = [
  "#EF4444", // Rojo JF Racing
  "#10b981", // Esmeralda
  "#06b6d4", // Cyan
  "#f97316", // Naranja
  "#a855f7", // Púrpura
  "#eab308", // Ámbar
  "#3b82f6", // Azul eléctrico
  "#ec4899", // Rosa vibrante
  "#14b8a6", // Teal
  "#8b5cf6"  // Violeta
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

  // Estado del buscador flotante para agregar cualquier repuesto a la gráfica
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // 2. Costo del producto: Viene del registro del artículo en base de datos (0$ por defecto)
  const getProductCost = (coil) => {
    if (!coil) return 0;
    if (coil.cost !== undefined && coil.cost !== null && !isNaN(Number(coil.cost))) {
      return Number(coil.cost);
    }
    if (customCosts[coil.id] !== undefined) return Number(customCosts[coil.id]);
    return 0; // 0$ por defecto
  };

  // 3. Ventas confirmadas dentro del rango seleccionado (100% DINÁMICO)
  const confirmedPeriodSales = useMemo(() => {
    const dFrom = new Date(dateFrom + 'T00:00:00');
    const dTo = new Date(dateTo + 'T23:59:59');

    return (salesHistory || []).filter(sale => {
      const status = (sale.status || sale.estado || sale.estado_orden || '').toUpperCase();
      if (status !== 'CONFIRMED') return false;

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

    confirmedPeriodSales.forEach(order => {
      const rawDate = order.timestamp || order.fecha_hora || order.created_at || order.fecha;
      const parsedDate = parseOrderDate(rawDate) || new Date();
      const mIdx = parsedDate.getMonth();

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
        const cst = qty * unitCost; // 0$ si costo es 0
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

      const cost = getProductCost(coil);
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

  // 6. SELECCIÓN DE PRODUCTOS EN LA GRÁFICA (AUTOMÁTICO TOP VENDIDOS + SELECCIÓN MANUAL DEL USUARIO)
  const [activeCurveIds, setActiveCurveIds] = useState([]);

  // Función para seleccionar automáticamente los que más se han vendido
  const selectTopSellingCurves = () => {
    const prodsWithSales = aggregatedProducts.filter(p => p.hasSales);
    if (prodsWithSales.length > 0) {
      // Coloca automáticamente los que más se han vendido en el periodo
      setActiveCurveIds(prodsWithSales.slice(0, 5).map(p => p.id));
    } else {
      // Si aún no hay ventas en este rango de fecha, coloca los primeros repuestos del catálogo
      setActiveCurveIds(aggregatedProducts.slice(0, 3).map(p => p.id));
    }
  };

  // Inicializar o auto-colocar los más vendidos cuando cargan los datos
  useEffect(() => {
    if (aggregatedProducts.length > 0 && activeCurveIds.length === 0) {
      selectTopSellingCurves();
    }
  }, [aggregatedProducts]);

  // Alternar o quitar un repuesto de la gráfica
  const toggleCurve = (id) => {
    setActiveCurveIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Agregar un repuesto específico a la gráfica
  const addCurveToChart = (id) => {
    if (!activeCurveIds.includes(id)) {
      setActiveCurveIds(prev => [...prev, id]);
    }
    setSearchDropdownOpen(false);
    setSearchQuery('');
  };

  // Quitar un repuesto
  const removeCurveFromChart = (id, e) => {
    e.stopPropagation();
    setActiveCurveIds(prev => prev.filter(x => x !== id));
  };

  // Lista filtrada para el buscador de repuestos
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return aggregatedProducts.slice(0, 20);
    return aggregatedProducts.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.oem && p.oem.toLowerCase().includes(q)) ||
      (p.carModel && p.carModel.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [aggregatedProducts, searchQuery]);

  // Top Repuestos Más Rentables (Columna Derecha)
  const topProducts = useMemo(() => {
    return aggregatedProducts.slice(0, 4);
  }, [aggregatedProducts]);

  // 7. Gráfica SVG Multi-línea Dinámica
  const chartData = useMemo(() => {
    // Mapear cada repuesto activo con un color único garantizado
    const activeProds = activeCurveIds
      .map((id, idx) => {
        const p = aggregatedProducts.find(item => item.id === id);
        if (!p) return null;
        return {
          ...p,
          curveColor: CURVE_COLORS[idx % CURVE_COLORS.length]
        };
      })
      .filter(Boolean);

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

    return { maxVal, startX, endX, startY, zeroY, chartHeight, stepX, curves, activeProds };
  }, [aggregatedProducts, activeCurveIds, activeMonths, chartMetric]);

  const [hoveredMonth, setHoveredMonth] = useState(null);
  const binanceRate = Number(rates?.binance) || 1067;

  return (
    <div className="space-y-3 pb-8 animate-fade-in text-slate-100">
      
      {/* 1. BARRA SUPERIOR DE CONTROL EJECUTIVA (DESDE / HASTA SIN PRESETS) */}
      <div className="bg-[#3B3F4A] border border-[#525868] rounded-2xl p-3 sm:p-3.5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Título & Tasa Oficial */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
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
              <i className="fa-solid fa-chart-line text-[#EF4444]"></i>
              <span>Rendimiento Financiero & Estacionalidad</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Datos dinámicos en vivo. Costo base de adquisición: <strong>0$ USD</strong> por repuesto.
            </p>
          </div>

          {/* Selector de Rango Exclusivo: DESDE / HASTA */}
          <div className="flex flex-wrap items-center gap-2">
            
            <div className="flex items-center bg-[#474C58] border border-[#525868] rounded-xl p-1 shadow-inner text-xs">
              
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
            <div className="flex items-center bg-[#474C58] border border-[#525868] rounded-xl p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartMetric('units')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  chartMetric === 'units'
                    ? 'bg-[#525868] text-white shadow-xs'
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
        <div className="bg-[#3B3F4A] border border-[#525868] rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-3">
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
        <div className="bg-[#3B3F4A] border border-[#525868] rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-3">
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
        <div className="bg-gradient-to-br from-emerald-950/70 via-[#3B3F4A] to-[#3B3F4A] border border-emerald-500/50 rounded-2xl p-2.5 sm:p-3 shadow-xl flex items-center gap-3 relative overflow-hidden">
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
        <div className="bg-[#3B3F4A] border border-[#525868] rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-3">
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
        <div className="lg:col-span-7 bg-[#3B3F4A] border border-[#525868] rounded-2xl p-3 sm:p-3.5 shadow-xl space-y-2.5">
          
          {/* Header de la Gráfica */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-[#525868]">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-up text-[#EF4444]"></i>
                <span>Curva de Demanda & Estacionalidad</span>
              </h2>
              <p className="text-[10px] text-slate-400">Rotación real mes a mes basada en tus ventas registradas</p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{chartMetric === 'units' ? 'Unidades vendidas' : 'Ganancia neta ($)'}</span>
            </div>
          </div>

          {/* BARRA DE CONTROL DE REPUESTOS EN LA GRÁFICA */}
          <div className="space-y-2">
            
            {/* Fila de Acciones: Botón Auto Más Vendidos + Botón Agregar Repuesto + Limpiar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                Repuestos en la gráfica ({chartData.activeProds.length}):
              </span>

              <div className="flex items-center gap-1.5 relative" ref={dropdownRef}>
                
                {/* Botón: Auto Colocar los Más Vendidos */}
                <button
                  type="button"
                  onClick={selectTopSellingCurves}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                  title="Colocar automáticamente los repuestos que más se han vendido en este periodo"
                >
                  <i className="fa-solid fa-bolt text-amber-400 text-[10px]"></i>
                  <span>Top Más Vendidos</span>
                </button>

                {/* Botón: Agregar Repuesto a la Gráfica */}
                <button
                  type="button"
                  onClick={() => setSearchDropdownOpen(prev => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                  <span>Agregar Repuesto</span>
                  <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${searchDropdownOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {/* Botón Limpiar */}
                {activeCurveIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCurveIds([])}
                    className="px-2 py-1 rounded-lg bg-[#474C58] hover:bg-slate-800 border border-[#525868] text-slate-400 hover:text-white text-[10px] font-semibold transition cursor-pointer"
                    title="Quitar todos los repuestos de la gráfica"
                  >
                    Limpiar
                  </button>
                )}

                {/* BUSCADOR FLOTANTE PARA AGREGAR CUALQUIER REPUESTO DEL CATÁLOGO */}
                {searchDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-[#3B3F4A] border border-[#5E6578] rounded-2xl shadow-2xl p-2.5 z-50 backdrop-blur-xl animate-fade-in text-slate-100">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#525868]">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        <i className="fa-solid fa-magnifying-glass text-[#EF4444]"></i>
                        <span>Elige un repuesto para graficar:</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">{aggregatedProducts.length} disponibles</span>
                    </div>

                    {/* Input de Búsqueda */}
                    <div className="relative mb-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Buscar por nombre, modelo o OEM..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#474C58] border border-[#525868] focus:border-[#EF4444] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Lista Scrolleable de Repuestos */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {searchResults.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500">
                          No se encontraron repuestos con "{searchQuery}"
                        </div>
                      ) : (
                        searchResults.map(prod => {
                          const isAlreadyIn = activeCurveIds.includes(prod.id);
                          return (
                            <div
                              key={`search-item-${prod.id}`}
                              onClick={() => {
                                if (isAlreadyIn) {
                                  toggleCurve(prod.id);
                                } else {
                                  addCurveToChart(prod.id);
                                }
                              }}
                              className={`p-1.5 rounded-xl flex items-center justify-between gap-2 transition cursor-pointer text-xs ${
                                isAlreadyIn
                                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-white'
                                  : 'hover:bg-[#525868] text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-white border border-[#525868] p-0.5 flex items-center justify-center shrink-0">
                                  <img
                                    src={prod.image || defaultCoilImage}
                                    alt={prod.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => { e.target.src = jfEmblem; }}
                                  />
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-white text-[11px] truncate">
                                    {prod.name}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono truncate">
                                    {prod.oem || prod.id} • ${prod.price}
                                    {prod.hasSales && (
                                      <span className="text-emerald-400 font-bold ml-1">({prod.periodUnits}u vendidas)</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                isAlreadyIn
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-300 hover:bg-[#EF4444] hover:text-white'
                              }`}>
                                {isAlreadyIn ? '✓ Activo' : '+ Graficar'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Chips de Repuestos Activos en la Gráfica con Nombre Legible y Botón de Quitar */}
            <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center">
              {chartData.activeProds.length === 0 ? (
                <div className="text-xs text-slate-500 flex items-center gap-2 py-1">
                  <span>Sin repuestos en la gráfica.</span>
                  <button
                    type="button"
                    onClick={selectTopSellingCurves}
                    className="text-[#EF4444] hover:underline font-bold"
                  >
                    Mostrar los más vendidos
                  </button>
                  <span>o</span>
                  <button
                    type="button"
                    onClick={() => setSearchDropdownOpen(true)}
                    className="text-emerald-400 hover:underline font-bold"
                  >
                    buscar repuesto
                  </button>
                </div>
              ) : (
                chartData.activeProds.map(prod => (
                  <div
                    key={`chip-active-${prod.id}`}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-2 transition bg-[#474C58] text-white border border-[#5E6578] shadow-xs group"
                  >
                    {/* Punto de Color de la Curva */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: prod.curveColor }}
                    ></span>

                    {/* Nombre Completo y Legible */}
                    <span
                      className="truncate max-w-[160px] sm:max-w-[220px]"
                      title={`${prod.name} (${prod.oem || prod.id})`}
                    >
                      {prod.name}
                    </span>

                    {/* Unidades vendidas */}
                    {prod.hasSales && (
                      <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-500/15 px-1 rounded border border-emerald-500/30">
                        {prod.periodUnits}u
                      </span>
                    )}

                    {/* Botón de Quitar de la Gráfica */}
                    <button
                      type="button"
                      onClick={(e) => removeCurveFromChart(prod.id, e)}
                      className="text-slate-500 hover:text-rose-400 transition ml-0.5 text-xs font-bold leading-none"
                      title="Quitar esta curva de la gráfica"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Lienzo SVG de la Gráfica */}
          <div className="relative w-full h-56 sm:h-64 select-none pt-1" id="chart-wrapper">
            <svg viewBox="0 0 820 250" className="w-full h-full overflow-visible">
              <defs>
                {chartData.activeProds.map((p) => (
                  <linearGradient key={`grad-${p.id}`} id={`grad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={p.curveColor} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={p.curveColor} stopOpacity="0.0" />
                  </linearGradient>
                ))}
              </defs>

              {/* Guías Horizontales */}
              <line x1="45" y1="20" x2="795" y2="20" stroke="#525868" strokeDasharray="3,3" />
              <line x1="45" y1="65" x2="795" y2="65" stroke="#525868" strokeDasharray="3,3" />
              <line x1="45" y1="110" x2="795" y2="110" stroke="#525868" strokeDasharray="3,3" />
              <line x1="45" y1="155" x2="795" y2="155" stroke="#525868" strokeDasharray="3,3" />
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
                  stroke={c.product.curveColor}
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
                    fill={c.product.curveColor}
                    stroke="#474C58"
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
                  stroke="#EF4444"
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
                className="absolute pointer-events-none bg-[#3B3F4A]/95 border border-[#5E6578] rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-xs min-w-[210px] -translate-x-1/2 -translate-y-full z-30 transition-all duration-100"
                style={{
                  left: `${(hoveredMonth.x / 820) * 100}%`,
                  top: '90px'
                }}
              >
                <div className="font-bold text-white border-b border-[#525868] pb-1 mb-1.5 flex items-center justify-between">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <i className="fa-regular fa-calendar-check text-[11px]"></i>
                    <span>{MONTH_NAMES[hoveredMonth.mIdx]} 2026</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono uppercase">
                    {chartMetric === 'units' ? 'Unidades' : 'Ganancia $'}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px]">
                  {chartData.activeProds.map(p => {
                    const val = chartMetric === 'units'
                      ? `${p.monthlyUnits[hoveredMonth.mIdx] || 0} uds`
                      : `+$${p.monthlyProfit[hoveredMonth.mIdx] || 0}.00`;
                    return (
                      <div key={`tip-${p.id}`} className="flex items-center justify-between gap-3 text-slate-200">
                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.curveColor }}></span>
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
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#525868]">
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-circle-info text-sky-400"></i>
              <span>Pasa el cursor por cada mes para auditar la rotación de repuestos.</span>
            </span>
            <span className="text-slate-500 font-mono">Sincronizado con Supabase</span>
          </div>

        </div>

        {/* COLUMNA DERECHA (5 COLS): TOP REPUESTOS MÁS RENTABLES */}
        <div className="lg:col-span-5 bg-[#3B3F4A] border border-[#525868] rounded-2xl p-3 sm:p-3.5 shadow-xl space-y-2.5">
          
          {/* Header del Ranking */}
          <div className="flex items-center justify-between pb-2 border-b border-[#525868]">
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
                <div key={p.id} className="p-2.5 rounded-xl bg-[#474C58] border border-[#525868] hover:border-[#5E6578] transition space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    
                    {/* Foto Real + Posición + Datos */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] border ${posStyles[idx]} shrink-0`}>
                        {posLabels[idx]}
                      </span>

                      {/* Contenedor de Imagen de Repuesto */}
                      <div className="w-10 h-10 rounded-lg bg-white border border-[#525868] p-1 flex items-center justify-center shrink-0 overflow-hidden">
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
                  <div className="w-full bg-[#3B3F4A] h-1.5 rounded-full overflow-hidden flex border border-[#525868]/50">
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
            <div className="p-2.5 rounded-xl bg-[#474C58] border border-[#525868] text-xs space-y-1">
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
      <div className="bg-[#3B3F4A] border border-[#525868] rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Botón para Abrir / Cerrar el Desglose */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(prev => !prev)}
          className="w-full px-4 py-3 bg-[#3B3F4A] hover:bg-[#525868] flex items-center justify-between text-left transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center text-xs">
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
                Unidades despachadas, precio de venta, costo registrado en el artículo y ganancia neta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              {isDrawerOpen ? 'Ocultar Tabla' : 'Desplegar Tabla'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#474C58] border border-[#525868] flex items-center justify-center text-slate-400">
              <i className={`fa-solid fa-chevron-down text-xs transition-transform duration-300 ${isDrawerOpen ? 'rotate-180' : ''}`}></i>
            </div>
          </div>
        </button>

        {/* Contenido Desplegable */}
        {isDrawerOpen && (
          <div className="border-t border-[#525868] p-3.5 bg-[#474C58] animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#525868] text-[10px] font-mono uppercase text-slate-400">
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
                <tbody className="divide-y divide-[#525868]/60 text-slate-200">
                  {aggregatedProducts.map(p => (
                    <tr key={`table-row-${p.id}`} className="hover:bg-[#3B3F4A] transition">
                      
                      {/* Repuesto */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-white border border-[#525868] p-0.5 flex items-center justify-center shrink-0">
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

                      {/* Costo de Bodega Registrado */}
                      <td className="py-2 px-2 text-right font-mono text-slate-300">
                        ${Number(p.cost || 0).toFixed(2)}
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
