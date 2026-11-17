import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Package, 
  ShoppingBag, CheckCircle, ArrowRight, Sparkles, Filter, 
  Calendar, Layers, Flame, Award, Eye, Plus, ChevronDown, 
  Search, X, RotateCcw, AlertCircle, Check, CreditCard, Wallet, Coins
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { formatUSD, parseOrderDate } from '../../utils/formatters';
import { getCachedExchangeRates } from '../../services/exchangeRatesService';
import defaultCoilImage from '../../assets/bobina_tiida_studio.jpg';
import jfEmblem from '../../assets/jf_emblem_clean.png';

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Paleta de colores distintivos y contrastantes para las curvas de la gráfica
const CURVE_COLORS = [
  "#EF4444", // Rojo JF Racing
  "#10B981", // Esmeralda
  "#06B6D4", // Cyan
  "#F97316", // Naranja
  "#A855F7", // Púrpura
  "#EAB308", // Ámbar
  "#3B82F6", // Azul eléctrico
  "#EC4899", // Rosa vibrante
  "#14B8A6", // Teal
  "#8B5CF6"  // Violeta
];

// Componente para Animaciones Incrementales Suaves en Números y Porcentajes
function AnimatedCounter({ value, duration = 1200, suffix = '', prefix = '', isVisible = true }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setDisplayValue(0);
      return;
    }
    const target = Number(value) || 0;
    if (target === 0) {
      setDisplayValue(0);
      return;
    }
    let startTime = null;
    let animationFrameId;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setDisplayValue(Math.round(target * ease));
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(target);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, isVisible, duration]);

  return <span>{prefix}{displayValue.toLocaleString('es-VE')}{suffix}</span>;
}

export function SabrinaPerformanceView({ onNavigateTab }) {
  const { coils, salesHistory } = useInventory();
  const { bcvRate } = useCurrency();

  // 1. FILTRO DINÁMICO DE FECHAS (DESDE / HASTA)
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

  // Métrica activa en estadística de métodos de pago: 'volume' ($ USD) | 'orders' (cantidades)
  const [paymentMetric, setPaymentMetric] = useState('volume');

  // Control de animación reactiva para la gráfica SVG y barras del dashboard
  const [chartAnimationKey, setChartAnimationKey] = useState(0);
  const [isBarsVisible, setIsBarsVisible] = useState(false);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const bottomSectionRef = useRef(null);
  const chartSectionRef = useRef(null);

  // Observer para activar la animación de la gráfica SVG cuando el usuario baja con el scroll hasta ella
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setIsChartVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (chartSectionRef.current) {
      observer.observe(chartSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Observer para activar animación incremental cuando el usuario baja con el scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setIsBarsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (bottomSectionRef.current) {
      observer.observe(bottomSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Función para re-disparar animación de barras
  const handleReplayBars = () => {
    setIsBarsVisible(false);
    setTimeout(() => setIsBarsVisible(true), 50);
  };

  // Función para re-disparar animación completa de la gráfica lineal
  const handleReplayChart = () => {
    setIsChartVisible(false);
    setTimeout(() => {
      setChartAnimationKey(k => k + 1);
      setIsChartVisible(true);
    }, 50);
  };

  // Presets rápidos de fechas
  const setDatePreset = (preset) => {
    const now = new Date();
    const dTo = now.toISOString().split('T')[0];
    let dFrom = dTo;

    if (preset === 'TODAY') {
      dFrom = dTo;
    } else if (preset === '7D') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      dFrom = d.toISOString().split('T')[0];
    } else if (preset === 'MONTH') {
      const d = new Date();
      d.setDate(1);
      dFrom = d.toISOString().split('T')[0];
    } else if (preset === 'YEAR') {
      const d = new Date(now.getFullYear(), 0, 1);
      dFrom = d.toISOString().split('T')[0];
    }

    setDateFrom(dFrom);
    setDateTo(dTo);
    setChartAnimationKey(k => k + 1);
    setIsBarsVisible(false);
    setTimeout(() => setIsBarsVisible(true), 60);
  };

  // Estado del buscador flotante para agregar repuestos a la gráfica
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

  // Tasas en vivo (Binance P2P & BCV)
  const cachedRates = getCachedExchangeRates();
  const binanceRate = cachedRates?.binance || 1068.50;

  // 2. VENTAS CONFIRMADAS DENTRO DEL RANGO SELECCIONADO (100% DINÁMICO)
  const confirmedPeriodSales = useMemo(() => {
    const dFrom = new Date(dateFrom + 'T00:00:00');
    const dTo = new Date(dateTo + 'T23:59:59');

    return (salesHistory || []).filter(sale => {
      const status = (sale.status || sale.estado || sale.estado_orden || '').toUpperCase();
      if (status !== 'CONFIRMED' && status !== '') return false;

      const rawDate = sale.timestamp || sale.fecha_hora || sale.created_at || sale.fecha;
      const parsedDate = parseOrderDate(rawDate);
      if (!parsedDate) return false;

      return parsedDate >= dFrom && parsedDate <= dTo;
    });
  }, [salesHistory, dateFrom, dateTo]);

  // 3. Meses activos que abarca el filtro
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

  // 4. Agrupación de Ventas Reales por Producto y por Mes
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
        const matchedCoil = (coils || []).find(c => {
          if (cId && String(c.id).trim().toLowerCase() === cId.toLowerCase()) return true;
          if (it.oem && c.oem && (String(c.oem).toLowerCase().includes(String(it.oem).toLowerCase()) || String(it.oem).toLowerCase().includes(String(c.oem).toLowerCase()))) return true;
          if (it.name && c.name && (String(c.name).toLowerCase() === String(it.name).toLowerCase() || String(c.name).toLowerCase().includes(String(it.name).toLowerCase()) || String(it.name).toLowerCase().includes(String(c.name).toLowerCase()))) return true;
          return false;
        }) || {};
        const key = String(matchedCoil.id || cId || it.name || 'desconocido').trim();

        const qty = Number(it.qty) || 1;
        const unitPrice = Number(it.price !== undefined ? it.price : (matchedCoil.price || 0));
        const unitCost = Number(matchedCoil.cost || 0);

        const rev = qty * unitPrice;
        const cst = qty * unitCost;
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

      const cost = Number(coil.cost || 0);
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
  }, [coils, confirmedPeriodSales]);

  // 5. SELECCIÓN DE PRODUCTOS EN LA GRÁFICA (MULTI-CURVA DINÁMICA)
  const [activeCurveIds, setActiveCurveIds] = useState([]);

  // Auto-seleccionar los más vendidos
  const selectTopSellingCurves = () => {
    const prodsWithSales = aggregatedProducts.filter(p => p.hasSales);
    if (prodsWithSales.length > 0) {
      setActiveCurveIds(prodsWithSales.slice(0, 5).map(p => p.id));
    } else {
      setActiveCurveIds(aggregatedProducts.slice(0, 4).map(p => p.id));
    }
  };

  useEffect(() => {
    if (aggregatedProducts.length > 0 && activeCurveIds.length === 0) {
      selectTopSellingCurves();
    }
  }, [aggregatedProducts]);

  const toggleCurve = (id) => {
    setActiveCurveIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const addCurveToChart = (id) => {
    if (!activeCurveIds.includes(id)) {
      setActiveCurveIds(prev => [...prev, id]);
      setChartAnimationKey(k => k + 1);
    }
  };

  const removeCurveFromChart = (id, e) => {
    e.stopPropagation();
    setActiveCurveIds(prev => prev.filter(x => x !== id));
  };

  // Buscador de repuestos para graficar
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

  // Top 4 Repuestos Más Vendidos & Rentables Dinámicos
  const topProducts = useMemo(() => {
    const withSales = aggregatedProducts.filter(p => p.hasSales || p.periodUnits > 0);
    if (withSales.length >= 4) {
      return withSales.slice(0, 4);
    }
    const remaining = aggregatedProducts.filter(p => !withSales.some(w => w.id === p.id));
    return [...withSales, ...remaining].slice(0, 4);
  }, [aggregatedProducts]);

  // 6. CÁLCULO DE CURVAS SVG MULTI-PUNTO BÉZIER
  const chartData = useMemo(() => {
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

    let maxVal = 4;
    activeProds.forEach(p => {
      const series = activeMonths.map(m =>
        chartMetric === 'units' ? (p.monthlyUnits[m] || 0) : (p.monthlyProfit[m] || 0)
      );
      const localMax = Math.max(...series, 0);
      if (localMax > maxVal) maxVal = localMax;
    });

    maxVal = Math.ceil(maxVal * 1.25) || 4;

    const startX = 55;
    const endX = 720;
    const startY = 20;
    const zeroY = 190;
    const chartHeight = zeroY - startY;
    const stepX = activeMonths.length > 1 ? (endX - startX) / (activeMonths.length - 1) : 0;

    const curves = activeProds.map(p => {
      const points = activeMonths.map((m, idx) => {
        const val = chartMetric === 'units' ? (p.monthlyUnits[m] || 0) : (p.monthlyProfit[m] || 0);
        const x = activeMonths.length > 1 ? startX + (idx * stepX) : 380;
        const y = zeroY - ((val / maxVal) * chartHeight);
        return { x, y, val, m, monthName: MONTH_NAMES[m] };
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

  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Demanda acumulada por marca de vehículo (100% Dinámica basada en ventas y parque automotor)
  const brandDemand = useMemo(() => {
    const counts = {};
    
    // Prioridad 1: Ventas reales confirmadas en el período
    confirmedPeriodSales.forEach(order => {
      const items = (order.items && Array.isArray(order.items) && order.items.length > 0)
        ? order.items
        : [{ coilId: order.coilId, name: order.coilName, qty: order.qty || 1 }];

      items.forEach(it => {
        const matched = (coils || []).find(c => {
          if (it.coilId && String(c.id).toLowerCase() === String(it.coilId).toLowerCase()) return true;
          if (it.name && c.name && c.name.toLowerCase().includes(it.name.toLowerCase())) return true;
          return false;
        });
        const brand = matched?.brand || (it.name && it.name.toLowerCase().includes('ford') ? 'Ford' : (it.name && it.name.toLowerCase().includes('toyota') ? 'Toyota' : (it.name && it.name.toLowerCase().includes('chevrolet') ? 'Chevrolet' : 'Nissan')));
        const qty = Number(it.qty) || 1;
        counts[brand] = (counts[brand] || 0) + qty;
      });
    });

    // Si no hay suficientes ventas en el rango, complementar con catálogo de inventario activo
    if (Object.keys(counts).length === 0) {
      coils.forEach(c => {
        const b = c.brand || 'Nissan';
        counts[b] = (counts[b] || 0) + (Number(c.stock) || 1);
      });
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts).map(([brand, count]) => ({
      brand,
      count,
      pct: Math.max(1, Math.round((count / total) * 100))
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [confirmedPeriodSales, coils]);

  // 5. ESTADÍSTICA DE MÉTODOS DE PAGO RECIBIDOS (PAGO MÓVIL, BINANCE, ZELLE, EFECTIVO)
  const paymentMethodStats = useMemo(() => {
    const methods = {
      pago_movil: {
        id: 'pago_movil',
        name: 'Pago Móvil',
        currencyLabel: 'Bs.',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barColor: '#10B981',
        icon: '📱',
        count: 0,
        volumeUSD: 0
      },
      binance: {
        id: 'binance',
        name: 'Binance Pay',
        currencyLabel: 'USDT',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        barColor: '#F59E0B',
        icon: '🟡',
        count: 0,
        volumeUSD: 0
      },
      zelle: {
        id: 'zelle',
        name: 'Zelle',
        currencyLabel: 'USD',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        barColor: '#8B5CF6',
        icon: '🟣',
        count: 0,
        volumeUSD: 0
      },
      efectivo: {
        id: 'efectivo',
        name: 'Efectivo USD',
        currencyLabel: 'Cash',
        badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
        barColor: '#0EA5E9',
        icon: '💵',
        count: 0,
        volumeUSD: 0
      },
      otro: {
        id: 'otro',
        name: 'Otros / Acordado',
        currencyLabel: 'USD',
        badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
        barColor: '#64748B',
        icon: '🤝',
        count: 0,
        volumeUSD: 0
      }
    };

    let totalVolume = 0;
    let totalCount = 0;

    confirmedPeriodSales.forEach(order => {
      const methodKey = (order.paymentMethod || order.metodo_pago || '').toUpperCase();
      const rawText = String(order.paymentRef || order.referencia_pago || order.notes || '').toLowerCase();
      const amount = Number(order.totalPrice || order.monto_total || 0);

      let targetId = 'otro';
      if (methodKey === 'PAGO_MOVIL' || rawText.includes('pago móvil') || rawText.includes('pago movil') || rawText.startsWith('[pago')) {
        targetId = 'pago_movil';
      } else if (methodKey === 'BINANCE' || rawText.includes('binance') || rawText.includes('usdt') || rawText.startsWith('[binance')) {
        targetId = 'binance';
      } else if (methodKey === 'ZELLE' || rawText.includes('zelle') || rawText.startsWith('[zelle')) {
        targetId = 'zelle';
      } else if (methodKey === 'EFECTIVO' || rawText.includes('efectivo') || rawText.includes('cash') || rawText.includes('dólares') || rawText.includes('dolares') || rawText.startsWith('[efectivo')) {
        targetId = 'efectivo';
      }

      methods[targetId].count += 1;
      methods[targetId].volumeUSD += amount;
      totalCount += 1;
      totalVolume += amount;
    });

    const list = Object.values(methods)
      .filter(m => m.count > 0 || ['pago_movil', 'binance', 'zelle', 'efectivo'].includes(m.id))
      .map(m => {
        const pctVolume = totalVolume > 0 ? Math.round((m.volumeUSD / totalVolume) * 100) : 0;
        const pctCount = totalCount > 0 ? Math.round((m.count / totalCount) * 100) : 0;
        return {
          ...m,
          pctVolume,
          pctCount
        };
      })
      .sort((a, b) => b.volumeUSD - a.volumeUSD || b.count - a.count);

    return {
      items: list,
      totalVolume,
      totalCount
    };
  }, [confirmedPeriodSales]);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      
      {/* 1. Encabezado y Control de Rango de Fechas (Desde / Hasta) */}
      <div className="border-b border-slate-200 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4 text-red-400" />
            Panel Ejecutivo de Rendimiento & Ventas
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Métricas de Conversión & Finanzas
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">
              Sincronizado con Supabase • Binance P2P: <strong className="text-amber-400 font-mono font-bold">Bs. {binanceRate.toFixed(2)}</strong> • BCV Oficial: <strong className="text-red-400 font-mono font-bold">Bs. {bcvRate?.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Selector de Rango de Fechas Dinámico: Presets + DESDE / HASTA */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Presets Rápidos de Fecha */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
            {[
              { id: 'TODAY', label: 'Hoy' },
              { id: '7D', label: '7 días' },
              { id: 'MONTH', label: 'Este Mes' },
              { id: 'YEAR', label: 'Año' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className="px-2.5 py-1 rounded-xl font-bold transition text-slate-600 hover:text-slate-900 hover:bg-white cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs text-xs">
            
            {/* Campo Desde */}
            <div className="flex items-center gap-1.5 px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-red-400" />
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Desde:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-slate-900 font-mono text-xs focus:outline-none cursor-pointer"
              />
            </div>

            <span className="text-slate-400 font-mono text-xs px-1">➔</span>

            {/* Campo Hasta */}
            <div className="flex items-center gap-1.5 px-2.5 py-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Hasta:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-slate-900 font-mono text-xs focus:outline-none cursor-pointer"
              />
            </div>

          </div>

          {/* Selector de Métrica: Unidades vs Ganancias */}
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 text-xs shadow-xs">
            <button
              onClick={() => {
                if (chartMetric !== 'units') {
                  setIsChartVisible(false);
                  setChartMetric('units');
                  setTimeout(() => {
                    setChartAnimationKey(k => k + 1);
                    setIsChartVisible(true);
                  }, 50);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                chartMetric === 'units'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unidades
            </button>
            <button
              onClick={() => {
                if (chartMetric !== 'profit') {
                  setIsChartVisible(false);
                  setChartMetric('profit');
                  setTimeout(() => {
                    setChartAnimationKey(k => k + 1);
                    setIsChartVisible(true);
                  }, 50);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                chartMetric === 'profit'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ganancia ($)
            </button>
          </div>

        </div>
      </div>

      {/* 2. Tarjetas KPI de Rendimiento Adaptadas a Sabrina */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="sabrina-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Facturado
          </span>
          <div className="text-lg sm:text-3xl font-black text-slate-900 font-mono">
            {formatUSD(globalKpis.totalRevenue)}
          </div>
          <span className="text-[10px] sm:text-xs text-amber-600 font-semibold font-mono truncate block">
            ≈ Bs. {(globalKpis.totalRevenue * binanceRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="sabrina-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1" style={{ animationDelay: '0.08s' }}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Unidades Vendidas
          </span>
          <div className="text-lg sm:text-3xl font-black text-red-600 font-mono">
            {globalKpis.totalUnitsSold} <span className="text-[10px] sm:text-xs text-slate-400">uds</span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold truncate block">
            {globalKpis.totalOrdersCount} órdenes
          </span>
        </div>

        <div className="sabrina-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-emerald-50/40 border border-emerald-200 shadow-sm space-y-1" style={{ animationDelay: '0.16s' }}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Ganancia Neta
          </span>
          <div className="text-lg sm:text-3xl font-black text-emerald-600 font-mono">
            +{formatUSD(globalKpis.netProfit)}
          </div>
          <span className="text-[10px] sm:text-xs text-emerald-700 font-semibold font-mono truncate block">
            Margen: {globalKpis.avgMargin}%
          </span>
        </div>

        <div className="sabrina-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1" style={{ animationDelay: '0.24s' }}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tasa P2P / BCV
          </span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 font-mono truncate">
            Bs. {binanceRate.toFixed(2)}
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-mono truncate block">
            BCV: Bs. {bcvRate?.toFixed(2)}
          </span>
        </div>

      </div>

      {/* 3. GRÁFICA LINEAL CON SELECTOR DE REPUESTOS ("LOS REPUESTOS QUE QUIERO QUE SE GRAFIQUEN") */}
      <div ref={chartSectionRef} className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 animate-fadeInUp overflow-hidden">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <span>Curva de Demanda & Rotación de Repuestos</span>
              </h3>
              <button
                type="button"
                onClick={handleReplayChart}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-xs"
                title="Re-animar trazo dinámico de la gráfica"
              >
                <RotateCcw className="w-3 h-3 text-red-500" />
                <span>Animar</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Rotación mes a mes basada en las ventas confirmadas en el período seleccionado
            </p>
          </div>

          <div className="flex items-center gap-2 relative" ref={dropdownRef}>
            
            {/* Botón: Top Más Vendidos */}
            <button
              onClick={selectTopSellingCurves}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
              title="Colocar automáticamente los repuestos más vendidos"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Más Vendidos</span>
            </button>

            {/* Botón: + Agregar Repuesto a la Gráfica */}
            <button
              onClick={() => setSearchDropdownOpen(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm shadow-red-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Repuesto</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${searchDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Botón Limpiar */}
            {activeCurveIds.length > 0 && (
              <button
                onClick={() => setActiveCurveIds([])}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition cursor-pointer"
                title="Quitar todos los repuestos de la gráfica"
              >
                Limpiar
              </button>
            )}

            {/* DROPDOWN BUSCADOR FLOTANTE PARA AGREGAR CUALQUIER REPUESTO */}
            {searchDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn text-slate-900">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-red-400" />
                    <span>Selecciona repuestos para graficar:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{aggregatedProducts.length} items</span>
                </div>

                <div className="relative mb-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar por nombre o OEM..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-500 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {searchResults.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
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
                          className={`p-2 rounded-xl flex items-center justify-between gap-2 transition cursor-pointer text-xs ${
                            isAlreadyIn
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="truncate">
                            <div className="font-bold text-slate-900 text-[11px] truncate">
                              {prod.name}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono truncate">
                              {prod.oem || prod.id} • ${prod.price}
                              {prod.hasSales && (
                                <span className="text-emerald-400 font-bold ml-1">({prod.periodUnits}u vendidas)</span>
                              )}
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isAlreadyIn
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-red-600 hover:text-white'
                          }`}>
                            {isAlreadyIn ? '✓ Graficado' : '+ Graficar'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSearchDropdownOpen(false)}
                  className="w-full mt-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Listo (Ver {activeCurveIds.length} en Gráfica)</span>
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Chips de Repuestos Activos en la Gráfica con Botón de Eliminar Curva */}
        <div className="flex flex-wrap gap-2 items-center min-h-[32px]">
          {chartData.activeProds.length === 0 ? (
            <div className="text-xs text-slate-400 flex items-center gap-2 py-1">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Sin repuestos en la gráfica.</span>
              <button
                onClick={selectTopSellingCurves}
                className="text-red-400 hover:underline font-bold"
              >
                Graficar más vendidos
              </button>
            </div>
          ) : (
            chartData.activeProds.map(prod => (
              <div
                key={`chip-active-${prod.id}`}
                className="px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-2 transition bg-slate-100 text-slate-800 border border-slate-200 shadow-xs group"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: prod.curveColor }}
                ></span>

                <span className="truncate max-w-[170px] sm:max-w-[240px]" title={prod.name}>
                  {prod.name}
                </span>

                {prod.hasSales && (
                  <span className="text-[9px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1 rounded border border-emerald-200">
                    {prod.periodUnits}u
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => removeCurveFromChart(prod.id, e)}
                  className="text-slate-400 hover:text-rose-400 transition text-xs font-bold leading-none cursor-pointer"
                  title="Quitar esta curva de la gráfica"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Lienzo SVG Dinámico de la Gráfica Multi-Línea con Animación Fluida y Barrido en Scroll */}
        <div className="relative pt-2">
          <svg viewBox="0 0 760 220" className="w-full h-52 sm:h-64 overflow-visible select-none">
            <defs>
              {/* Clip-Path de barrido progresivo de izquierda a derecha (0px a 700px) */}
              <clipPath id={`sabrinaChartReveal-${chartAnimationKey}`}>
                <rect
                  x="45"
                  y="0"
                  height="220"
                  style={{
                    width: isChartVisible ? '700px' : '0px',
                    transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
              </clipPath>

              {chartData.activeProds.map((p) => (
                <linearGradient key={`grad-${p.id}`} id={`sabrinaGrad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={p.curveColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={p.curveColor} stopOpacity="0.0" />
                </linearGradient>
              ))}
            </defs>

            {/* Líneas horizontales de referencia */}
            {[0.25, 0.5, 0.75, 1].map((lvl, idx) => (
              <line
                key={idx}
                x1="45"
                y1={chartData.zeroY - (lvl * chartData.chartHeight)}
                x2="735"
                y2={chartData.zeroY - (lvl * chartData.chartHeight)}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.35"
              />
            ))}

            <line x1="45" y1={chartData.zeroY} x2="735" y2={chartData.zeroY} stroke="#E2E8F0" strokeWidth="1.5" />

            {/* Etiquetas del Eje Y */}
            <text x="40" y="24" fill="#64748B" fontSize="10" fontFamily="monospace" textAnchor="end">
              {chartMetric === 'units' ? `${chartData.maxVal}u` : `$${chartData.maxVal}`}
            </text>
            <text x="40" y="105" fill="#64748B" fontSize="10" fontFamily="monospace" textAnchor="end">
              {chartMetric === 'units' ? `${Math.round(chartData.maxVal * 0.5)}u` : `$${Math.round(chartData.maxVal * 0.5)}`}
            </text>
            <text x="40" y={chartData.zeroY} fill="#64748B" fontSize="10" fontFamily="monospace" textAnchor="end">
              0
            </text>

            {/* Grupo de Curvas y Áreas con Barrido Progresivo de Izquierda a Derecha */}
            <g clipPath={`url(#sabrinaChartReveal-${chartAnimationKey})`}>
              {/* Áreas bajo la curva */}
              {chartData.curves.map((c, cIdx) => (
                c.areaPath ? (
                  <path 
                    key={`area-${c.product.id}-${chartAnimationKey}`} 
                    d={c.areaPath} 
                    fill={`url(#sabrinaGrad-${c.product.id})`} 
                    style={{
                      opacity: isChartVisible ? 1 : 0,
                      transition: `opacity 0.8s ease-out ${cIdx * 0.15 + 0.3}s`
                    }}
                  />
                ) : null
              ))}

              {/* Curvas Bézier con Trazo Progresivo Normalizado (pathLength=1) */}
              {chartData.curves.map((c, cIdx) => (
                c.path ? (
                  <path
                    key={`line-${c.product.id}-${chartAnimationKey}`}
                    d={c.path}
                    fill="none"
                    stroke={c.product.curveColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    pathLength="1"
                    strokeDasharray="1"
                    className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
                    style={{
                      strokeDashoffset: isChartVisible ? 0 : 1,
                      transition: `stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1) ${cIdx * 0.15}s`
                    }}
                  />
                ) : null
              ))}
            </g>

            {/* Puntos y Nodos con Pop-in Escalonado al llegar la curva */}
            {chartData.curves.map((c, cIdx) => (
              c.points.map((pt, pIdx) => (
                <g key={`pt-${c.product.id}-${pIdx}-${chartAnimationKey}`}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.id === `${c.product.id}-${pIdx}` ? "6" : "4"}
                    fill={c.product.curveColor}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      transformOrigin: `${pt.x}px ${pt.y}px`,
                      transform: isChartVisible ? 'scale(1)' : 'scale(0)',
                      opacity: isChartVisible ? 1 : 0,
                      transition: `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.35 + pIdx * 0.18}s, opacity 0.3s ease-out ${0.35 + pIdx * 0.18}s`
                    }}
                    onMouseEnter={() => setHoveredPoint({ id: `${c.product.id}-${pIdx}`, ...pt, product: c.product })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))
            ))}

            {/* Etiquetas del Eje X (Meses) */}
            {activeMonths.map((m, idx) => {
              const x = activeMonths.length > 1 
                ? chartData.startX + (idx * chartData.stepX) 
                : 380;
              return (
                <text
                  key={`label-${m}`}
                  x={x}
                  y={chartData.zeroY + 18}
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {MONTH_NAMES[m]}
                </text>
              );
            })}
          </svg>

          {/* Tooltip flotante interactivo */}
          {hoveredPoint && (
            <div 
              className="absolute pointer-events-none p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xl text-xs z-30 transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(hoveredPoint.x / 760) * 100}%`,
                top: `${(hoveredPoint.y / 220) * 100}%`,
                marginTop: '-12px'
              }}
            >
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredPoint.product.curveColor }}></span>
                <span>{hoveredPoint.product.name}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {hoveredPoint.monthName}: <strong className="text-slate-900 font-mono">{hoveredPoint.val} {chartMetric === 'units' ? 'unidades' : 'USD'}</strong>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 4. WORKSPACE INFERIOR: TOP REPUESTOS MÁS VENDIDOS & DEMANDA POR MARCA */}
      <div ref={bottomSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* TOP REPUESTOS MÁS VENDIDOS & RENTABLES */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Repuestos Más Vendidos & Rentables</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Top rotación en Maracaibo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topProducts.map((prod, idx) => (
              <div
                key={prod.id}
                className="sabrina-card p-4 rounded-3xl bg-white border border-slate-200 hover:border-red-500 transition-all duration-300 space-y-3 shadow-sm"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[#525868]/70 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    <img 
                      src={prod.image || defaultCoilImage} 
                      alt={prod.name} 
                      className="w-full h-full object-contain mix-blend-multiply"
                      onError={(e) => { e.target.src = defaultCoilImage; }}
                    />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-red-500 font-mono">
                        OEM: {prod.oem?.split('/')[0] || prod.id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <AnimatedCounter value={prod.periodUnits || (prod.hasSales ? 1 : 0)} isVisible={isBarsVisible} suffix=" vendidos" />
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-900 truncate mt-0.5" title={prod.name}>
                      {prod.name}
                    </h4>

                    <span className="text-[11px] text-slate-400">
                      Aplica: {prod.carModel || 'Universal'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Precio de Venta</span>
                    <strong className="text-slate-900 font-mono">${prod.price} USD</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Margen Neto</span>
                    <strong className="text-emerald-600 font-mono">
                      +{prod.marginPct > 0 && prod.marginPct < 100 ? prod.marginPct : (prod.cost > 0 ? Math.round(((prod.price - prod.cost) / prod.price) * 100) : 48)}% utilidad
                    </strong>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: DEMANDA POR MARCA & MÉTODOS DE PAGO */}
        <div className="lg:col-span-5 space-y-6">

          {/* DEMANDA ACUMULADA POR MARCA DE VEHÍCULO CON ANIMACIÓN INCREMENTAL */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-500" />
                <span>Demanda por Marca de Auto</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReplayBars}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                  title="Re-animar llenado incremental de barras"
                >
                  <RotateCcw className="w-3 h-3 text-red-500" />
                  <span>Animar</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">Parque automotor</span>
              </div>
            </div>

            <div className="space-y-3.5">
              {brandDemand.map((item, idx) => {
                const colors = ['#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];
                const c = colors[idx % colors.length];

                return (
                  <div key={item.brand} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{item.brand}</span>
                      <span className="font-mono text-slate-600 font-medium">
                        <AnimatedCounter value={item.count} isVisible={isBarsVisible} suffix=" piezas " />
                        (<AnimatedCounter value={item.pct} isVisible={isBarsVisible} suffix="%" />)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden p-0.5 shadow-inner border border-slate-200/50">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-xs" 
                        style={{ 
                          width: isBarsVisible ? `${item.pct}%` : '0%', 
                          backgroundColor: c,
                          transitionDelay: `${idx * 140}ms`
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
              💡 <strong>Especialidad en Nissan:</strong> Mayor rotación en Maracaibo en modelos Tiida 1.8L, Sentra B15 y Almera con entrega inmediata.
            </div>

          </div>

          {/* ESTADÍSTICA DE MÉTODOS DE PAGO RECIBIDOS (ZELLE, BINANCE, PAGO MÓVIL, EFECTIVO) */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Métodos de Pago Recibidos</span>
                </h3>
                <span className="text-[11px] text-slate-400">Zelle, Binance, Pago Móvil o Efectivo</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Selector: Por Monto vs Por Órdenes */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPaymentMetric('volume')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                      paymentMetric === 'volume' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    $ USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMetric('orders')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                      paymentMetric === 'orders' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Órdenes
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleReplayBars}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                  title="Re-animar llenado incremental de barras"
                >
                  <RotateCcw className="w-3 h-3 text-red-500" />
                  <span>Animar</span>
                </button>
              </div>
            </div>

            {/* Total recaudado en el período */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Recaudado</span>
                <strong className="text-base font-black text-slate-900 font-mono">
                  ${paymentMethodStats.totalVolume.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </strong>
                <span className="text-[11px] text-amber-600 font-mono block">
                  ≈ Bs. {(paymentMethodStats.totalVolume * binanceRate).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Transacciones</span>
                <span className="text-sm font-bold text-slate-700 font-mono">
                  {paymentMethodStats.totalCount} {paymentMethodStats.totalCount === 1 ? 'orden' : 'órdenes'}
                </span>
              </div>
            </div>

            {/* Lista de Métodos de Pago con Barras de Progreso Animadas */}
            <div className="space-y-3.5">
              {paymentMethodStats.items.map((m, idx) => {
                const pct = paymentMetric === 'volume' ? m.pctVolume : m.pctCount;
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{m.icon}</span>
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${m.badgeColor}`}>
                          {m.currencyLabel}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <strong className="text-slate-900">${m.volumeUSD.toFixed(2)}</strong>
                        <span className="text-slate-500 text-[11px] ml-1">
                          ({m.count} {m.count === 1 ? 'ord.' : 'ords.'} • <AnimatedCounter value={pct} isVisible={isBarsVisible} suffix="%" />)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden p-0.5 shadow-inner border border-slate-200/50">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out shadow-xs" 
                        style={{ 
                          width: isBarsVisible ? `${pct}%` : '0%', 
                          backgroundColor: m.barColor,
                          transitionDelay: `${idx * 120}ms`
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              💡 <strong>Cobros Multimoneda:</strong> Monitoreo en tiempo real de transacciones en Bolívares (Pago Móvil), USDT (Binance), y Dólares (Zelle / Efectivo).
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
