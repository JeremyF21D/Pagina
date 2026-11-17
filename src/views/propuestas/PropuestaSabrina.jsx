import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Shield, CheckCircle, ShoppingBag, Search, Sparkles, ArrowRight,
  Phone, MessageSquare, TrendingUp, Package, Users, DollarSign,
  Clock, X, Check, Filter, Layers, LayoutDashboard, Store,
  ChevronDown, ExternalLink, HelpCircle, Truck, Heart, BadgeCheck,
  Wrench, BarChart3, Database, Receipt, Settings, Eye, PhoneCall,
  ChevronRight, ArrowUpRight
} from 'lucide-react';

// ============================================================================
// DATOS DEL CATÁLOGO & MODELOS DE VENTAS (SABRINA LIGHT & CONVERSIÓN)
// ============================================================================
const CATALOG_ITEMS = [
  {
    id: 'SAB-BOB-01',
    name: 'Bobina de Encendido Original Nissan Tiida 1.8L',
    oem: '22448-ED000',
    brand: 'Nissan',
    model: 'Tiida',
    years: '2007 - 2018',
    motor: '1.8L MR18DE',
    priceUSD: 25.00,
    costUSD: 14.00,
    stock: 12,
    guarantee: '30 días de garantía escrita',
    rating: 4.9,
    reviewsCount: 38,
    features: ['Garantía de reposición inmediata', 'Prueba en banco previa', '100% libre de fallas de chispa'],
    category: 'Bobinas',
    image: '/cars/tiida_2008_cutout.png',
    bestSeller: true,
    description: 'Bobina de encendido individual original para Nissan Tiida 1.8L. Garantiza combustión completa, eliminación de cascabeleo y respuesta inmediata del acelerador.'
  },
  {
    id: 'SAB-BOB-02',
    name: 'Bobina de Encendido Directa Sentra B15 1.8L',
    oem: '22448-8J115',
    brand: 'Nissan',
    model: 'Sentra B15',
    years: '2001 - 2008',
    motor: '1.8L QG18DE',
    priceUSD: 22.00,
    costUSD: 12.50,
    stock: 8,
    guarantee: '30 días de garantía escrita',
    rating: 4.8,
    reviewsCount: 45,
    features: ['Conector original de 3 pines', 'Resistencia térmica certificada', 'Stock en Maracaibo'],
    category: 'Bobinas',
    image: '/cars/sentra_b15_2008_cutout.png',
    bestSeller: true,
    description: 'Especialmente calibrada para el motor QG18DE de Sentra B15 y Almera. Diseñada para soportar el clima caluroso de Maracaibo sin perder aislamiento.'
  },
  {
    id: 'SAB-BOB-03',
    name: 'Bobina de Encendido Nissan Almera 1.6L / 1.8L',
    oem: '22448-6N015',
    brand: 'Nissan',
    model: 'Almera',
    years: '2001 - 2008',
    motor: '1.6L / 1.8L QG',
    priceUSD: 22.00,
    costUSD: 12.00,
    stock: 5,
    guarantee: '30 días de garantía escrita',
    rating: 4.9,
    reviewsCount: 29,
    features: ['Encendido uniforme sin tirones', 'Calce milimétrico OEM', 'Entrega el mismo día'],
    category: 'Bobinas',
    image: '/cars/almera_2008_cutout.png',
    bestSeller: false,
    description: 'Repuesto de alta fidelidad para modelos Almera N16. Testeado antes de entrega para asegurar que el motor encienda suave al primer llavazo.'
  },
  {
    id: 'SAB-THROT-01',
    name: 'Cuerpo de Aceleración Electrónico Nissan Sentra B16 Tiida',
    oem: '16119-ET000',
    brand: 'Nissan',
    model: 'Sentra B16 / Tiida',
    years: '2007 - 2014',
    motor: '2.0L MR20DE / 1.8L',
    priceUSD: 80.00,
    costUSD: 48.00,
    stock: 4,
    guarantee: '30 días de garantía escrita',
    rating: 5.0,
    reviewsCount: 16,
    features: ['Sensor TPS calibrado de fábrica', 'Respuesta suave del acelerador', 'Testeo electrónico'],
    category: 'Inyección',
    image: null,
    bestSeller: false,
    description: 'Cuerpo de aceleración con motor paso a paso de alta precisión. Corrige fallas de aceleración irregular y caídas de revoluciones con el aire acondicionado.'
  },
  {
    id: 'SAB-SEN-01',
    name: 'Sensor Posición Cigüeñal y Levas Sentra B15 Almera',
    oem: '23731-AL61A',
    brand: 'Nissan',
    model: 'Sentra B15 / Almera',
    years: '2001 - 2008',
    motor: '1.8L QG18DE',
    priceUSD: 20.00,
    costUSD: 11.00,
    stock: 15,
    guarantee: '30 días de garantía escrita',
    rating: 4.8,
    reviewsCount: 22,
    features: ['Lectura magnética sin retraso', 'Arnés sellado antihumedad', 'Instalación directa'],
    category: 'Sensores',
    image: null,
    bestSeller: true,
    description: 'Sensor de posición de árbol de levas y cigüeñal. Soluciona el clásico problema donde el vehículo se apaga al calentar o tarda en encender.'
  },
  {
    id: 'SAB-CON-01',
    name: 'Conector de Bobina Nissan Reforzado con Ramal Térmico',
    oem: 'CON-SEN15',
    brand: 'Nissan',
    model: 'Universal Nissan',
    years: 'Todos los años',
    motor: '3 Pines',
    priceUSD: 5.00,
    costUSD: 1.80,
    stock: 24,
    guarantee: 'Calidad OEM certificada',
    rating: 4.9,
    reviewsCount: 64,
    features: ['Pines con seguro antichoque', 'Cable automotriz alta temperatura', 'Elimina falso contacto'],
    category: 'Conectores',
    image: null,
    bestSeller: true,
    description: 'Arnés de 3 pines con cable automotriz resistente al calor del motor. Reemplaza conectores tostados que provocan fallas intermitentes de cilindro.'
  }
];

const RECENT_ORDERS = [
  { id: 'ORD-7742', customer: 'Andrés Villalobos', car: 'Nissan Tiida 2008', item: '2x Bobina 1.8L', totalUSD: 50.00, status: 'Listo para despacho', phone: '+584146123456' },
  { id: 'ORD-7741', customer: 'Taller San Francisco', car: 'Sentra B15 2006', item: '4x Bobina + Sensores', totalUSD: 108.00, status: 'Pagado vía Pago Móvil', phone: '+584246987123' },
  { id: 'ORD-7740', customer: 'Mariana Colmenares', car: 'Nissan Almera 2007', item: '1x Bobina Almera', totalUSD: 22.00, status: 'Entregado en tienda', phone: '+584125559812' },
  { id: 'ORD-7739', customer: 'Roberto Rincón', car: 'Sentra B16 2.0L', item: '1x Cuerpo Aceleración', totalUSD: 80.00, status: 'Enviado por MRW', phone: '+584163334411' },
];

export function PropuestaSabrina({ onNavigateHome }) {
  // Navegación Completa entre los 5 Módulos Reales de la Aplicación:
  // 'catalogo' | 'rendimiento' | 'inventario' | 'ventas' | 'configuracion'
  const [activeView, setActiveView] = useState('catalogo');
  
  // Selector guiado de vehículo (CRO: elimina la duda de si la pieza sirve)
  const [selectedBrand, setSelectedBrand] = useState('Nissan');
  const [selectedModel, setSelectedModel] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Carrito de compras
  const [cart, setCart] = useState([
    { ...CATALOG_ITEMS[0], qty: 1 }
  ]);
  const [cartOpen, setCartOpen] = useState(false);
  
  // Modal de Detalle Técnico
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  // Modal de Justificación de Diseño
  const [rationaleOpen, setRationaleOpen] = useState(false);

  // Tasa de cambio oficial BCV
  const [bcvRate, setBcvRate] = useState(48.50);

  // Filtrado reactivo de productos
  const filteredItems = useMemo(() => {
    return CATALOG_ITEMS.filter(item => {
      const matchBrand = selectedBrand === 'Todas' || item.brand === selectedBrand;
      const matchModel = selectedModel === 'Todos' || item.model.includes(selectedModel);
      const matchSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.oem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.motor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBrand && matchModel && matchSearch;
    });
  }, [selectedBrand, selectedModel, searchQuery]);

  const cartTotalUSD = cart.reduce((acc, item) => acc + (item.priceUSD * item.qty), 0);
  const cartTotalVES = cartTotalUSD * bcvRate;

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setCartOpen(true);
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const sendWhatsAppCheckout = () => {
    const list = cart.map(i => `✅ ${i.qty}x ${i.name} [OEM: ${i.oem}] - $${(i.priceUSD * i.qty).toFixed(2)}`);
    const message = encodeURIComponent(
      `👋 *¡HOLA JF AUTO PARTS! QUIERO CONCRETAR MI COMPRA*\n\n` +
      `He seleccionado los siguientes repuestos verificados:\n${list.join('\n')}\n\n` +
      `💵 *Total a Cancelar:* $${cartTotalUSD.toFixed(2)} USD (~Bs. ${cartTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})\n` +
      `📍 *Entrega:* Maracaibo (o envíos nacionales)\n` +
      `📊 *Tasa BCV:* Bs. ${bcvRate.toFixed(2)}\n\n` +
      `¿Tienen punto de entrega disponible hoy? ¡Muchas gracias!`
    );
    window.open(`https://wa.me/584126497478?text=${message}`, '_blank');
  };

  // ============================================================================
  // ANIMACIONES: Key para forzar re-mount al cambiar de módulo
  // ============================================================================
  const [moduleKey, setModuleKey] = useState(0);
  const prevView = useRef(activeView);
  useEffect(() => {
    if (prevView.current !== activeView) {
      setModuleKey(k => k + 1);
      prevView.current = activeView;
    }
  }, [activeView]);

  // Hook de conteo animado para KPIs del dashboard
  const useCountUp = (target, duration = 1200, active = true) => {
    const [value, setValue] = useState(0);
    useEffect(() => {
      if (!active) return;
      setValue(0);
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased * 100) / 100);
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, [target, duration, active]);
    return value;
  };

  // Animated KPI values
  const isRendimiento = activeView === 'rendimiento';
  const animVentasHoy = useCountUp(265, 1200, isRendimiento);
  const animConversion = useCountUp(8.4, 1000, isRendimiento);
  const animPedidos = useCountUp(5, 800, isRendimiento);
  const animBcvAnim = useCountUp(bcvRate, 900, isRendimiento);

  // Bar chart animation state
  const [barsVisible, setBarsVisible] = useState(false);
  useEffect(() => {
    if (isRendimiento) {
      setBarsVisible(false);
      const t = setTimeout(() => setBarsVisible(true), 200);
      return () => clearTimeout(t);
    }
  }, [isRendimiento, moduleKey]);

  return (
    // TEMA CLARO & LUMINOSO: Fondo #2C2F38 con blanco puro #ECEEF2 y acentos en Rojo Profesional (#EF4444) y Verde Esmeralda (#10B981) — Paleta Gris Oscuro + Rojo Profesional
    <div className="min-h-screen bg-[#2C2F38] text-[#E2E8F0] font-sans selection:bg-red-600 selection:text-slate-100 relative overflow-x-hidden">

      {/* GLOBAL ANIMATION STYLES */}
      <style>{`
        @keyframes sabrinaFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sabrinaFadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sabrinaFadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sabrinaSlideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes sabrinaScaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes sabrinaPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes sabrinaShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes sabrinaFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-fadeIn {
          animation: sabrinaFadeIn 0.5s ease-out both;
        }
        .animate-fadeInUp {
          animation: sabrinaFadeInUp 0.6s ease-out both;
        }
        .animate-fadeInDown {
          animation: sabrinaFadeInDown 0.5s ease-out both;
        }
        .animate-slideInRight {
          animation: sabrinaSlideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-scaleIn {
          animation: sabrinaScaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .sabrina-card {
          animation: sabrinaFadeInUp 0.5s ease-out both;
        }
        .sabrina-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 12px 32px rgba(239,68,68,0.15), 0 4px 12px rgba(0,0,0,0.3);
        }
        .sabrina-kpi {
          animation: sabrinaFadeInUp 0.5s ease-out both;
        }
        .sabrina-kpi:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(239,68,68,0.15);
        }
        .sabrina-btn-bounce:active {
          animation: sabrinaPulse 0.3s ease-out;
        }
        .sabrina-hero-badge {
          animation: sabrinaFloat 3s ease-in-out infinite;
        }
        .sabrina-bar-track {
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sabrina-module-enter {
          animation: sabrinaFadeInUp 0.5s ease-out both;
        }
      `}</style>
      
      {/* ==================================================================== */}
      {/* 1. TOP NOTICE BAR LUMINOSA & CONFIANZA COMERCIAL                    */}
      {/* ==================================================================== */}
      <div className="bg-[#3B3F4A] border-b border-[#525868] px-4 py-2 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 shadow-md shadow-black/20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
            <span>30 Días de Garantía Total en Todos los Repuestos</span>
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="hidden sm:inline flex items-center gap-1 text-slate-300 font-medium">
            <Truck className="w-3.5 h-3.5 text-red-500" />
            <span>Despacho Inmediato en Maracaibo</span>
          </span>
          <span className="text-slate-300 hidden md:inline">•</span>
          <span className="hidden md:inline text-slate-300">
            Tasa Oficial BCV: <strong className="text-red-400 font-bold">Bs. {bcvRate.toFixed(2)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <button 
            onClick={() => setRationaleOpen(true)}
            className="text-red-500 hover:text-red-400 font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>Justificación de Sabrina</span>
          </button>
          <span className="text-slate-300">|</span>
          <button 
            onClick={onNavigateHome}
            className="text-slate-500 hover:text-slate-100 flex items-center gap-1 transition cursor-pointer"
          >
            <span>Salir a Producción</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. NAVEGACIÓN SUPERIOR COMPLETA (LOS 5 MÓDULOS DE LA WEB)           */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-[#323540]/95 backdrop-blur-md border-b border-[#525868] shadow-md shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo y Nombre Limpio */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
              JF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-slate-100 tracking-tight">JF Auto Parts</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-900/30 text-red-400 border border-red-700/50">
                  SABRINA LIGHT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                Especialistas en Encendido Automotriz • Maracaibo
              </p>
            </div>
          </div>

          {/* Navegación Modular (5 Pestañas Reales) */}
          <nav className="hidden lg:flex items-center bg-[#F1F5F9] p-1.5 rounded-2xl border border-[#525868] text-xs font-semibold">
            <button
              onClick={() => setActiveView('catalogo')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeView === 'catalogo'
                  ? 'bg-[#3B3F4A] text-red-500 font-bold shadow-md shadow-black/20'
                  : 'text-slate-500 hover:text-slate-100'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>1. Catálogo</span>
            </button>

            <button
              onClick={() => setActiveView('rendimiento')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeView === 'rendimiento'
                  ? 'bg-[#3B3F4A] text-red-500 font-bold shadow-md shadow-black/20'
                  : 'text-slate-500 hover:text-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>2. Rendimiento</span>
            </button>

            <button
              onClick={() => setActiveView('inventario')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeView === 'inventario'
                  ? 'bg-[#3B3F4A] text-red-500 font-bold shadow-md shadow-black/20'
                  : 'text-slate-500 hover:text-slate-100'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>3. Inventario</span>
            </button>

            <button
              onClick={() => setActiveView('ventas')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeView === 'ventas'
                  ? 'bg-[#3B3F4A] text-red-500 font-bold shadow-md shadow-black/20'
                  : 'text-slate-500 hover:text-slate-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>4. Ventas</span>
            </button>

            <button
              onClick={() => setActiveView('configuracion')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeView === 'configuracion'
                  ? 'bg-[#3B3F4A] text-red-500 font-bold shadow-md shadow-black/20'
                  : 'text-slate-500 hover:text-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>5. Ajustes</span>
            </button>
          </nav>

          {/* Carrito de Compras Ergonómico */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="relative px-4 py-2.5 rounded-2xl bg-emerald-900/30 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 font-bold text-xs flex items-center gap-2 transition shadow-md shadow-black/20 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Tu Carrito</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black">
                {cart.reduce((a, b) => a + b.qty, 0)}
              </span>
            </button>
          </div>

        </div>

        {/* Navegación Móvil */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-[#474C58] border-t border-[#525868] overflow-x-auto text-xs">
          {[
            { id: 'catalogo', label: 'Catálogo', icon: Store },
            { id: 'rendimiento', label: 'Métricas', icon: BarChart3 },
            { id: 'inventario', label: 'Inventario', icon: Database },
            { id: 'ventas', label: 'Ventas', icon: Receipt },
            { id: 'configuracion', label: 'Ajustes', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-3 py-1.5 rounded-xl shrink-0 font-bold flex items-center gap-1.5 ${
                activeView === tab.id ? 'bg-red-600 text-white' : 'text-slate-500'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 3. MÓDULO 1: CATÁLOGO LUMINOSO ORIENTADO A CONVERSIÓN               */}
      {/* ==================================================================== */}
      {activeView === 'catalogo' && (
        <main key={`cat-${moduleKey}`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 sabrina-module-enter">
          
          {/* HERO ORIENTADO A LA CONFIANZA */}
          <div className="relative rounded-3xl bg-gradient-to-br from-[#3B3F4A] via-[#474C58] to-[#333848] border border-[#525868] p-6 sm:p-10 shadow-md overflow-hidden animate-fadeInUp">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-700/50 text-xs font-bold sabrina-hero-badge">
                  <CheckCircle className="w-3.5 h-3.5 text-red-500" />
                  <span>Repuestos Probados en Banco • Cero Fallas de Chispa</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-slate-100 tracking-tight leading-[1.1]">
                  El repuesto exacto para tu auto, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-600">
                    listo para despachar en Maracaibo.
                  </span>
                </h1>

                <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                  Compra con total seguridad. Compatibilidad 100% verificada por código OEM, garantía escrita de 30 días y asesoría directa por WhatsApp con técnicos en Maracaibo.
                </p>

                {/* 3 Promesas de Confianza */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20">
                    <Shield className="w-4 h-4 text-emerald-600 mb-1" />
                    <strong className="text-slate-100 block font-bold">Garantía Escrita</strong>
                    <span className="text-slate-500 text-[11px]">30 días en todas las bobinas</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20">
                    <Clock className="w-4 h-4 text-red-500 mb-1" />
                    <strong className="text-slate-100 block font-bold">Entrega Inmediata</strong>
                    <span className="text-slate-500 text-[11px]">En Maracaibo en 2 horas</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20">
                    <Check className="w-4 h-4 text-rose-400 mb-1" />
                    <strong className="text-slate-100 block font-bold">Compatibilidad</strong>
                    <span className="text-slate-500 text-[11px]">Garantizada por código OEM</span>
                  </div>
                </div>

              </div>

              {/* Lado Derecho: Imagen del Auto en Primer Plano */}
              <div className="lg:col-span-5 relative flex items-center justify-center">
                <div className="absolute w-72 h-72 rounded-full bg-blue-100 blur-3xl pointer-events-none"></div>
                <img 
                  src="/cars/tiida_2008_cutout.png" 
                  alt="Nissan Tiida 2008" 
                  className="relative z-10 w-full max-w-[420px] object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.15)] select-none"
                />
              </div>

            </div>
          </div>

          {/* ASISTENTE GUIADO DE COMPATIBILIDAD VEHICULAR (3 PASOS) */}
          <div className="p-6 rounded-3xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-red-500" />
                  <span>Encuentra el repuesto para tu vehículo</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Filtra por modelo para ver solo piezas compatibles con tu motor
                </p>
              </div>

              <span className="text-xs text-red-400 font-bold bg-red-900/30 px-3 py-1 rounded-full border border-red-700/50 w-fit">
                {filteredItems.length} repuestos disponibles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Paso 1: Marca</label>
                <select 
                  value={selectedBrand} 
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full bg-[#474C58] border border-[#5E6578] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 transition cursor-pointer"
                >
                  <option value="Todas">Todas las marcas</option>
                  <option value="Nissan">Nissan (Especialidad)</option>
                  <option value="Ford">Ford</option>
                  <option value="Chevrolet">Chevrolet</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Paso 2: Modelo</label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#474C58] border border-[#5E6578] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 transition cursor-pointer"
                >
                  <option value="Todos">Todos los modelos</option>
                  <option value="Tiida">Tiida 1.8L</option>
                  <option value="Sentra B15">Sentra B15 1.8L</option>
                  <option value="Almera">Almera 1.6L / 1.8L</option>
                  <option value="Sentra B16">Sentra B16 2.0L</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">Paso 3: Búsqueda rápida</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Código OEM o nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#474C58] border border-[#5E6578] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PARRILLA DE PRODUCTOS BLANCA Y PULCRA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, idx) => (
              <div
                key={item.id}
                className="sabrina-card rounded-3xl bg-[#3B3F4A] border border-[#525868] hover:border-red-500/60 transition-all duration-300 p-6 flex flex-col justify-between shadow-md shadow-black/20 group cursor-default"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {item.bestSeller ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-900/30 text-amber-400 border border-amber-700/50 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Más Vendido</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#525868] text-slate-300">
                        {item.category}
                      </span>
                    )}

                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-900/300"></span>
                      <span>En stock ({item.stock} disp.)</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-100 tracking-tight group-hover:text-red-500 transition leading-snug">
                    {item.name}
                  </h3>

                  <div className="my-3 p-3 rounded-2xl bg-[#474C58] border border-[#525868] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Código OEM:</span>
                      <strong className="text-slate-100 font-mono font-bold">{item.oem}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Aplica para:</span>
                      <span className="text-slate-300 font-semibold">{item.model} ({item.years})</span>
                    </div>
                  </div>

                  <ul className="space-y-1 text-xs text-slate-500 py-1">
                    {item.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#525868] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-2xl font-black text-slate-100">
                      ${item.priceUSD.toFixed(2)} <span className="text-xs font-semibold text-slate-500">USD</span>
                    </div>
                    <div className="text-xs text-red-400 font-semibold">
                      Bs. {(item.priceUSD * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProductDetail(item)}
                      className="p-2.5 rounded-xl bg-[#E0E3E8] hover:bg-[#525868] border border-[#525868] text-slate-500 hover:text-slate-100 transition cursor-pointer"
                      title="Ver Ficha Técnica"
                    >
                      <Eye className="w-4 h-4 text-red-500" />
                    </button>

                    <button
                      onClick={() => addToCart(item)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-900/300 active:scale-90 text-white font-bold text-xs flex items-center gap-1.5 transition-all duration-200 shadow-md shadow-black/20 hover:shadow-md hover:shadow-emerald-500/30 cursor-pointer sabrina-btn-bounce"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </main>
      )}

      {/* ==================================================================== */}
      {/* 4. MÓDULO 2: RENDIMIENTO Y MÉTRICAS (LIGHT DASHBOARD)                */}
      {/* ==================================================================== */}
      {activeView === 'rendimiento' && (
        <main key={`rend-${moduleKey}`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 sabrina-module-enter">
          <div className="border-b border-[#525868] pb-4 animate-fadeInDown">
            <span className="text-xs text-red-500 font-bold flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              PANEL DE RENDIMIENTO COMERCIAL
            </span>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Métricas de Conversión y Ventas
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sabrina-kpi p-5 rounded-2xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20 space-y-1 transition-all duration-300" style={{ animationDelay: '0s' }}>
              <span className="text-xs text-slate-500 font-semibold">VENTAS HOY</span>
              <div className="text-3xl font-black text-slate-100">${animVentasHoy.toFixed(2)}</div>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +22.4% vs promedio
              </span>
            </div>

            <div className="sabrina-kpi p-5 rounded-2xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20 space-y-1 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
              <span className="text-xs text-slate-500 font-semibold">TASA DE CONVERSIÓN</span>
              <div className="text-3xl font-black text-red-500">{animConversion.toFixed(1)}%</div>
              <span className="text-xs text-slate-500">De visita a WhatsApp</span>
            </div>

            <div className="sabrina-kpi p-5 rounded-2xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20 space-y-1 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <span className="text-xs text-slate-500 font-semibold">PEDIDOS COMPLETADOS</span>
              <div className="text-3xl font-black text-slate-100">{Math.round(animPedidos)} Órdenes</div>
              <span className="text-xs text-emerald-600 font-bold">100% satisfechos</span>
            </div>

            <div className="sabrina-kpi p-5 rounded-2xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20 space-y-1 transition-all duration-300" style={{ animationDelay: '0.3s' }}>
              <span className="text-xs text-slate-500 font-semibold">TASA OFICIAL BCV</span>
              <div className="text-3xl font-black text-rose-400">Bs. {animBcvAnim.toFixed(2)}</div>
              <span className="text-xs text-slate-500">Calculada en tiempo real</span>
            </div>
          </div>

          {/* Gráfica de Progreso de Ventas - ANIMADA */}
          <div className="p-6 rounded-3xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20 space-y-4 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">VENTAS POR MODELO DE VEHÍCULO</h3>
                <p className="text-xs text-slate-500">Demanda acumulada en el catálogo público</p>
              </div>
              <span className="text-xs text-red-500 font-bold bg-red-900/30 px-3 py-1 rounded-full border border-red-700/50">
                Semana Actual
              </span>
            </div>

            <div className="space-y-3 pt-3">
              {[
                { label: 'Nissan Tiida 1.8L (MR18DE)', pct: 45, units: 22, color: '#EF4444' },
                { label: 'Nissan Sentra B15 1.8L (QG18DE)', pct: 30, units: 14, color: '#10B981' },
                { label: 'Nissan Almera N16 (QG18DE)', pct: 15, units: 6, color: '#F59E0B' },
                { label: 'Cuerpos de Aceleración Electrónicos', pct: 10, units: 4, color: '#F43F5E' },
              ].map((bar, idx) => (
                <div key={bar.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">{bar.label}</span>
                    <strong className="text-slate-100">{bar.units} unid. ({bar.pct}%)</strong>
                  </div>
                  <div className="w-full h-3 bg-[#525868] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full sabrina-bar-track"
                      style={{ 
                        width: barsVisible ? `${bar.pct * 2}%` : '0%', 
                        backgroundColor: bar.color,
                        transitionDelay: `${idx * 0.15}s`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* 5. MÓDULO 3: GESTIÓN DE INVENTARIO Y STOCK                           */}
      {/* ==================================================================== */}
      {activeView === 'inventario' && (
        <main key={`inv-${moduleKey}`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 sabrina-module-enter">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#525868] pb-4">
            <div>
              <span className="text-xs text-red-500 font-bold flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                CONTROL DE EXISTENCIAS
              </span>
              <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                Inventario de Repuestos en Bodega
              </h2>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Almacén: <strong className="text-slate-200">Maracaibo Principal</strong>
            </div>
          </div>

          <div className="rounded-3xl bg-[#3B3F4A] border border-[#525868] p-6 shadow-md shadow-black/20 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#525868] text-slate-500 text-[11px]">
                  <th className="pb-3 font-bold">REPUESTO</th>
                  <th className="pb-3 font-bold">CÓDIGO OEM</th>
                  <th className="pb-3 font-bold">STOCK</th>
                  <th className="pb-3 font-bold">PRECIO VENTA</th>
                  <th className="pb-3 font-bold">COSTO</th>
                  <th className="pb-3 font-bold">MARGEN</th>
                  <th className="pb-3 font-bold text-right">DISPONIBILIDAD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {CATALOG_ITEMS.map(item => {
                  const margin = item.priceUSD - item.costUSD;
                  const marginPct = Math.round((margin / item.priceUSD) * 100);
                  return (
                    <tr key={item.id} className="hover:bg-[#474C58] transition">
                      <td className="py-3.5 font-bold text-slate-100">{item.name}</td>
                      <td className="py-3.5 font-mono text-red-400 font-semibold">{item.oem}</td>
                      <td className="py-3.5 font-bold text-slate-200">{item.stock} unid.</td>
                      <td className="py-3.5 font-bold text-slate-100">${item.priceUSD.toFixed(2)}</td>
                      <td className="py-3.5 text-slate-500">${item.costUSD.toFixed(2)}</td>
                      <td className="py-3.5 font-bold text-emerald-600">
                        +${margin.toFixed(2)} ({marginPct}%)
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-700/50">
                          {item.stock > 5 ? 'Óptimo' : 'Bajo Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* 6. MÓDULO 4: REGISTRO DE VENTAS & CONTACTO WHATSAPP                  */}
      {/* ==================================================================== */}
      {activeView === 'ventas' && (
        <main key={`ven-${moduleKey}`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 sabrina-module-enter">
          <div className="border-b border-[#525868] pb-4">
            <span className="text-xs text-red-500 font-bold flex items-center gap-1.5">
              <Receipt className="w-4 h-4" />
              HISTORIAL DE PEDIDOS
            </span>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Órdenes Registradas y Despachos
            </h2>
          </div>

          <div className="rounded-3xl bg-[#3B3F4A] border border-[#525868] p-6 shadow-md shadow-black/20 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#525868] text-slate-500 text-[11px]">
                  <th className="pb-3 font-bold">ORDEN</th>
                  <th className="pb-3 font-bold">CLIENTE</th>
                  <th className="pb-3 font-bold">VEHÍCULO</th>
                  <th className="pb-3 font-bold">REPUESTOS</th>
                  <th className="pb-3 font-bold">TOTAL</th>
                  <th className="pb-3 font-bold">ESTADO</th>
                  <th className="pb-3 font-bold text-right">ACCIÓN DIRECTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {RECENT_ORDERS.map(order => (
                  <tr key={order.id} className="hover:bg-[#474C58] transition">
                    <td className="py-3.5 font-mono font-bold text-red-500">{order.id}</td>
                    <td className="py-3.5 font-bold text-slate-100">{order.customer}</td>
                    <td className="py-3.5 text-slate-500">{order.car}</td>
                    <td className="py-3.5 text-slate-500">{order.item}</td>
                    <td className="py-3.5 font-black text-slate-100">${order.totalUSD.toFixed(2)}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-700/50">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <a
                        href={`https://wa.me/${order.phone.replace('+', '')}?text=Hola%20${encodeURIComponent(order.customer)},%20te%20escribo%20de%20JF%20Auto%20Parts%20respecto%20a%20tu%20orden%20${order.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-900/30 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 font-bold transition text-[11px]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Contactar</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* 7. MÓDULO 5: CONFIGURACIÓN Y TASA OFICIAL BCV                        */}
      {/* ==================================================================== */}
      {activeView === 'configuracion' && (
        <main key={`conf-${moduleKey}`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 sabrina-module-enter">
          <div className="border-b border-[#525868] pb-4">
            <span className="text-xs text-red-500 font-bold flex items-center gap-1.5">
              <Settings className="w-4 h-4" />
              PARÁMETROS DE FACTURACIÓN
            </span>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Ajustes de Tienda y Contacto
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20 space-y-4">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Tasa Oficial de Cambio (BCV)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Se utiliza para convertir automáticamente los precios de catálogo y carrito a Bolívares (VES):
              </p>
              <div className="flex items-center gap-3">
                <input 
                  type="number"
                  step="0.05"
                  value={bcvRate}
                  onChange={(e) => setBcvRate(parseFloat(e.target.value) || 0)}
                  className="bg-[#474C58] border border-[#5E6578] rounded-xl px-4 py-2.5 text-slate-100 font-bold text-sm w-36 focus:outline-none focus:border-red-500"
                />
                <span className="text-xs text-slate-500">Bs. por cada $1.00 USD</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#3B3F4A] border border-[#525868] shadow-md shadow-black/20 space-y-4">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-red-500" />
                <span>Atención y Despacho en Maracaibo</span>
              </h3>
              <p className="text-xs text-slate-500">
                Línea oficial configurada para recibir pedidos y enviar cotizaciones:
              </p>
              <div className="p-3.5 rounded-2xl bg-[#474C58] border border-[#525868] text-xs">
                <strong className="text-slate-100 block text-sm font-bold">+58 412-6497478</strong>
                <span className="text-slate-500 font-medium">JF Auto Parts • Especialistas de Encendido en Maracaibo</span>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* 8. MODAL DE FICHA TÉCNICA DE REPUESTO (DETALLE COMPLETO)             */}
      {/* ==================================================================== */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setSelectedProductDetail(null)}>
          <div className="w-full max-w-xl bg-[#3B3F4A] border border-[#525868] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl shadow-black/40 animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#525868] pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-100">
                  Ficha de Compatibilidad Verificada
                </h3>
              </div>
              <button 
                onClick={() => setSelectedProductDetail(null)} 
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="text-lg font-bold text-slate-100">{selectedProductDetail.name}</h4>
              <p className="text-slate-500 leading-relaxed">{selectedProductDetail.description}</p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-[#474C58] border border-[#525868]">
                  <span className="text-[10px] text-slate-500 block font-semibold">CÓDIGO OEM</span>
                  <strong className="text-red-400 font-mono text-sm">{selectedProductDetail.oem}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#474C58] border border-[#525868]">
                  <span className="text-[10px] text-slate-500 block font-semibold">VEHÍCULO</span>
                  <strong className="text-slate-200 text-sm">{selectedProductDetail.model} ({selectedProductDetail.years})</strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#474C58] border border-[#525868]">
                  <span className="text-[10px] text-slate-500 block font-semibold">MOTORIZACIÓN</span>
                  <strong className="text-slate-200 text-sm">{selectedProductDetail.motor}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#474C58] border border-[#525868]">
                  <span className="text-[10px] text-slate-500 block font-semibold">GARANTÍA VERIFICADA</span>
                  <strong className="text-emerald-600 text-sm">{selectedProductDetail.guarantee}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#525868] flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-slate-100">${selectedProductDetail.priceUSD.toFixed(2)}</div>
                <span className="text-xs text-red-400 font-semibold">Bs. {(selectedProductDetail.priceUSD * bcvRate).toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    addToCart(selectedProductDetail);
                    setSelectedProductDetail(null);
                  }}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-900/300 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-black/20"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Añadir al Carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. DRAWER DE CARRITO & CHECKOUT ERGONÓMICO                          */}
      {/* ==================================================================== */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setCartOpen(false)}>
          <div className="w-full max-w-md bg-[#3B3F4A] border-l border-[#525868] h-full flex flex-col justify-between p-6 shadow-2xl shadow-black/40 animate-slideInRight" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#525868]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-lg text-slate-100">
                    Resumen de tu Pedido
                  </h3>
                </div>
                <button 
                  onClick={() => setCartOpen(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3 overflow-y-auto max-h-[50vh]">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No has agregado repuestos todavía.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-[#474C58] border border-[#525868] flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{item.name}</h4>
                        <span className="text-[11px] text-red-400 font-mono font-medium">OEM: {item.oem}</span>
                        <div className="text-xs text-emerald-600 font-black mt-1">
                          ${(item.priceUSD * item.qty).toFixed(2)} USD
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-[#3B3F4A] border border-[#5E6578] text-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-slate-100 px-1">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-[#3B3F4A] border border-[#5E6578] text-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-500 hover:text-red-500 p-1 ml-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#525868] space-y-4">
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Subtotal en Dólares:</span>
                  <strong className="text-slate-100 text-lg font-black">${cartTotalUSD.toFixed(2)}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Total en Bolívares (BCV):</span>
                  <strong className="text-red-400 font-bold text-sm">
                    Bs. {cartTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-900/30 border border-emerald-700/50 text-xs text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Compra 100% Protegida</span>
                </div>
                <p className="text-[11px] text-emerald-400">
                  Recibes en Maracaibo o pagas al momento de confirmar el despacho.
                </p>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={sendWhatsAppCheckout}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-900/300 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/30 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Confirmar Orden por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 10. MODAL DE JUSTIFICACIÓN DE DISEÑO DE SABRINA                      */}
      {/* ==================================================================== */}
      {rationaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setRationaleOpen(false)}>
          <div className="w-full max-w-2xl bg-[#3B3F4A] border border-[#525868] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto animate-scaleIn" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between border-b border-[#525868] pb-4">
              <div className="flex items-center gap-2 text-red-500">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black text-lg text-slate-100 tracking-tight">
                  Justificación de Diseño • Sabrina Dark Red & CRO
                </h3>
              </div>
              <button onClick={() => setRationaleOpen(false)} className="text-slate-500 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-500">
              <div className="p-4 rounded-2xl bg-[#474C58] border border-[#525868] space-y-1.5">
                <strong className="text-slate-100 block text-sm font-bold">1. Paleta Gris Oscuro + Rojo Profesional</strong>
                <p>
                  Se reemplazó el blanco puro por una paleta de grises suaves pensada para sesiones prolongadas de uso. Fondo principal <strong>Gris Neutro (#2C2F38)</strong>, superficies en <strong>Gris Claro (#ECEEF2)</strong>, acentos en <strong>Rojo Profesional (#EF4444)</strong> para profesionalismo y <strong>Verde Esmeralda (#10B981)</strong> para acciones de conversión. Esta combinación reduce la luminosidad agresiva y protege la vista en sesiones prolongadas de trabajo.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#474C58] border border-[#525868] space-y-1.5">
                <strong className="text-slate-100 block text-sm font-bold">2. Cobertura Total de los 5 Módulos de la Aplicación</strong>
                <p>
                  Se integraron los 5 módulos funcionales: Catálogo con selector de 3 pasos, Rendimiento con métricas de ventas, Inventario con márgenes y alertas, Historial de Ventas con enlaces directos a WhatsApp para cada cliente, y Panel de Configuración de la tasa BCV.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#474C58] border border-[#525868] space-y-1.5">
                <strong className="text-slate-100 block text-sm font-bold">3. Modal de Ficha Técnica Detallada</strong>
                <p>
                  Cada tarjeta incluye un botón para ver la ficha técnica con fotos, compatibilidad de motor, años de aplicación y garantía de 30 días, despejando cualquier duda antes de comprar.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setRationaleOpen(false)}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-900/300 text-white font-extrabold text-xs cursor-pointer shadow-md shadow-black/20"
              >
                Cerrar y Continuar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
