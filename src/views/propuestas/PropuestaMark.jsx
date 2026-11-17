import React, { useState, useMemo } from 'react';
import { 
  Wrench, Activity, Zap, Cpu, Gauge, ShieldCheck, ShoppingCart, 
  Search, SlidersHorizontal, ArrowUpRight, DollarSign, Package, 
  TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, X, 
  Send, ExternalLink, RefreshCw, BarChart3, Database, FileText,
  Sliders, Eye, Layers, Terminal, Sparkles, Truck
} from 'lucide-react';

// ============================================================================
// DATOS REALES DE REPUESTOS Y TELEMETRÍA (JF AUTO PARTS)
// ============================================================================
const PRODUCTS_DATA = [
  {
    id: 'REP-BOB-01',
    name: 'Bobina de Encendido Nissan Tiida 1.8L',
    oem: '22448-ED000',
    brand: 'Nissan',
    compatibility: 'Tiida (2007-2018), Versa (2012-2019), Sentra B16 2.0L',
    motor: 'MR18DE / MR20DE',
    priceUSD: 25.00,
    costUSD: 14.00,
    stock: 12,
    minStock: 4,
    voltage: '32,000V Peak',
    pinCount: '3 Pines Reforzados',
    category: 'Bobinas',
    status: 'optimo',
    image: '/cars/tiida_2008_cutout.png',
  },
  {
    id: 'REP-BOB-02',
    name: 'Bobina de Encendido Nissan Sentra B15 1.8L',
    oem: '22448-8J115',
    brand: 'Nissan',
    compatibility: 'Sentra B15 (2001-2008), Almera N16 1.8L',
    motor: 'QG18DE 1.8L',
    priceUSD: 22.00,
    costUSD: 12.50,
    stock: 8,
    minStock: 3,
    voltage: '30,000V Peak',
    pinCount: '3 Pines OEM',
    category: 'Bobinas',
    status: 'optimo',
    image: '/cars/sentra_b15_2008_cutout.png',
  },
  {
    id: 'REP-BOB-03',
    name: 'Bobina de Encendido Nissan Almera 1.6L / 1.8L',
    oem: '22448-6N015',
    brand: 'Nissan',
    compatibility: 'Almera N16 (2001-2008), Primera P11',
    motor: 'QG16DE / QG18DE',
    priceUSD: 22.00,
    costUSD: 12.00,
    stock: 5,
    minStock: 4,
    voltage: '30,000V Peak',
    pinCount: '3 Pines Japonesa',
    category: 'Bobinas',
    status: 'alerta',
    image: '/cars/almera_2008_cutout.png',
  },
  {
    id: 'REP-THROT-01',
    name: 'Cuerpo de Aceleración Electrónico Sentra B16 Tiida',
    oem: '16119-ET000',
    brand: 'Nissan',
    compatibility: 'Sentra B16 (2.0L), Tiida (1.8L), Versa, X-Trail T31',
    motor: 'MR18DE / MR20DE',
    priceUSD: 80.00,
    costUSD: 48.00,
    stock: 4,
    minStock: 2,
    voltage: '12V Calibrado',
    pinCount: '6 Pines Eléctrico',
    category: 'Inyección',
    status: 'optimo',
    image: null,
  },
  {
    id: 'REP-SEN-01',
    name: 'Sensor Posición Cigüeñal y Árbol de Levas Sentra B15',
    oem: '23731-AL61A',
    brand: 'Nissan',
    compatibility: 'Sentra B15 1.8L, Almera N16, Armada 5.6L, Maxima 3.5L',
    motor: 'QG18DE / VQ35DE',
    priceUSD: 20.00,
    costUSD: 11.00,
    stock: 15,
    minStock: 5,
    voltage: 'Señal Digital Hall',
    pinCount: '3 Pines Sellados',
    category: 'Sensores',
    status: 'optimo',
    image: null,
  },
  {
    id: 'REP-CON-01',
    name: 'Conector de Bobina Nissan Reforzado (Arnés Térmico)',
    oem: 'CON-SEN15',
    brand: 'Nissan',
    compatibility: 'Sentra B15, Tiida, Almera, March, Versa',
    motor: 'Universal Nissan 3P',
    priceUSD: 5.00,
    costUSD: 1.80,
    stock: 24,
    minStock: 10,
    voltage: 'Tolerancia 200°C',
    pinCount: '3 Pines + Sellos',
    category: 'Conectores',
    status: 'optimo',
    image: null,
  }
];

const SALES_HISTORY_DATA = [
  { id: 'ORD-8941', date: 'Hoy 14:22', customer: 'Taller Mecánico El Pinar', items: '2x Bobina Tiida 1.8L', totalUSD: 50.00, payment: 'Pago Móvil', status: 'Despachado' },
  { id: 'ORD-8940', date: 'Hoy 11:05', customer: 'Carlos Mendoza', items: '1x Bobina Sentra B15 + Conector', totalUSD: 27.00, payment: 'Efectivo USD', status: 'Despachado' },
  { id: 'ORD-8939', date: 'Ayer 18:40', customer: 'Inversiones AutoMaracaibo', items: '4x Bobina Almera 1.8L', totalUSD: 88.00, payment: 'Zelle', status: 'Entregado' },
  { id: 'ORD-8938', date: 'Ayer 15:15', customer: 'José Luis Parra', items: '1x Cuerpo Aceleración Sentra B16', totalUSD: 80.00, payment: 'Binance USDT', status: 'Entregado' },
];

export function PropuestaMark({ onNavigateHome }) {
  // Estado de Navegación Principal de Mark: 'catalogo' o 'dashboard'
  const [currentModule, setCurrentModule] = useState('catalogo');
  
  // Filtros de Catálogo
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Carrito de Despacho
  const [cart, setCart] = useState([
    { ...PRODUCTS_DATA[0], qty: 1 }
  ]);
  const [cartOpen, setCartOpen] = useState(false);
  const [rationaleOpen, setRationaleOpen] = useState(false);

  // Selector de auto en Hero
  const [heroCarIndex, setHeroCarIndex] = useState(0);
  const HERO_CARS = [
    { name: 'Nissan Tiida 2008 (1.8L)', oem: '22448-ED000', engine: 'MR18DE', kw: '93 kW / 125 HP', coilType: 'Inductiva 3-Pin', img: '/cars/tiida_2008_cutout.png' },
    { name: 'Nissan Sentra B15 (1.8L)', oem: '22448-8J115', engine: 'QG18DE', kw: '94 kW / 126 HP', coilType: 'Direct Ignition 3-Pin', img: '/cars/sentra_b15_2008_cutout.png' },
    { name: 'Nissan Almera N16 (1.8L)', oem: '22448-6N015', engine: 'QG18DE', kw: '84 kW / 114 HP', coilType: 'Micro-Pack 3-Pin', img: '/cars/almera_2008_cutout.png' },
  ];

  const BCV_RATE = 48.50; // Bs por USD

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return PRODUCTS_DATA.filter(prod => {
      const matchBrand = selectedBrand === 'Todas' || prod.brand === selectedBrand;
      const matchCat = selectedCategory === 'Todas' || prod.category === selectedCategory;
      const matchSearch = searchQuery === '' || 
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.oem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.motor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBrand && matchCat && matchSearch;
    });
  }, [selectedBrand, selectedCategory, searchQuery]);

  // Totales de Carrito
  const cartTotalUSD = cart.reduce((acc, item) => acc + (item.priceUSD * item.qty), 0);
  const cartTotalVES = cartTotalUSD * BCV_RATE;

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

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const sendWhatsAppOrder = () => {
    const lines = cart.map(i => `• ${i.qty}x ${i.name} (OEM: ${i.oem}) - $${(i.priceUSD * i.qty).toFixed(2)}`);
    const text = encodeURIComponent(
      `⚡ *ORDEN TÉCNICA - JF AUTO PARTS (MARACAIBO)*\n\n` +
      `*Repuestos Solicitados:*\n${lines.join('\n')}\n\n` +
      `*Total a Cancelar:* $${cartTotalUSD.toFixed(2)} USD (~Bs. ${cartTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})\n` +
      `*Tasa Ref:* ${BCV_RATE} Bs/$\n\n` +
      `Por favor confirmar disponibilidad y punto de despacho en Maracaibo.`
    );
    window.open(`https://wa.me/584126497478?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-[#E2E8F0] font-sans selection:bg-[#E5383B] selection:text-white relative overflow-x-hidden">
      
      {/* ==================================================================== */}
      {/* 1. TOP TELEMETRY BAR & BRAND CONTROL (MARK TECHNICAL HEADER)          */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-[#0B0F17]/95 backdrop-blur-md border-b border-[#1E2638]">
        {/* Ticker de Estado Técnico */}
        <div className="bg-[#0D121D] px-4 py-1 text-[11px] font-mono border-b border-[#161D2B] flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SISTEMA OPERATIVO: TELEMETRÍA JF-V2
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline">ALMACÉN: <strong className="text-slate-200">MARACAIBO, ZULIA</strong></span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden md:inline">TASA BCV: <strong className="text-[#F59E0B]">Bs. {BCV_RATE.toFixed(2)}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setRationaleOpen(true)}
              className="text-[#E5383B] hover:text-white font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#E5383B]" />
              <span>Ver Justificación de Mark</span>
            </button>
            <span className="text-slate-600">|</span>
            <button 
              onClick={onNavigateHome}
              className="hover:text-white flex items-center gap-1 transition text-slate-400 cursor-pointer"
              title="Volver a la versión original de producción"
            >
              <span>Salir a Producción</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Barra de Navegación Principal */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Identidad de Marca Mark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5383B] to-[#991B1E] flex items-center justify-center text-white font-black text-lg shadow-[0_0_20px_rgba(229,56,59,0.4)] border border-[#FF4D4F]/40 tracking-wider">
              JF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-wider text-white">JF AUTO PARTS</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E5383B]/15 text-[#E5383B] border border-[#E5383B]/30">
                  PROPOSAL MARK
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
                ALTO VOLTAJE & INGENIERÍA DE ENCENDIDO OEM
              </p>
            </div>
          </div>

          {/* Switcher de Módulos (Catálogo vs Dashboard) */}
          <div className="flex items-center bg-[#131A29] p-1 rounded-xl border border-[#232D42]">
            <button
              onClick={() => setCurrentModule('catalogo')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-2 cursor-pointer ${
                currentModule === 'catalogo'
                  ? 'bg-[#E5383B] text-white shadow-[0_0_15px_rgba(229,56,59,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Catálogo Público</span>
            </button>

            <button
              onClick={() => setCurrentModule('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-2 cursor-pointer ${
                currentModule === 'dashboard'
                  ? 'bg-[#E5383B] text-white shadow-[0_0_15px_rgba(229,56,59,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Dashboard Telemetría</span>
            </button>
          </div>

          {/* Botón Carrito Despacho Rápido */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCartOpen(true)}
              className="relative px-3.5 py-2 rounded-xl bg-[#131A29] hover:bg-[#1A2338] border border-[#232D42] text-white font-mono text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-[#E5383B]" />
              <span className="hidden sm:inline">Despacho</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#E5383B] text-white text-[10px] font-black">
                {cart.reduce((a, b) => a + b.qty, 0)}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. VISTA 1: CATÁLOGO TÉCNICO DE ALTO RENDIMIENTO (PROPUESTA MARK)     */}
      {/* ==================================================================== */}
      {currentModule === 'catalogo' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeIn">
          
          {/* HERO BANNER TÉCNICO CON FÍSICA Y AUTO SIN FONDO */}
          <div className="relative rounded-2xl bg-gradient-to-r from-[#0E1422] via-[#121929] to-[#0A0E18] border border-[#222C42] overflow-hidden p-6 sm:p-10 shadow-2xl">
            {/* Rejilla de Fondo Técnica */}
            <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none"></div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Lado Izquierdo: Specs y Título Impactante */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5383B]/10 border border-[#E5383B]/30 text-[#E5383B] text-xs font-mono font-bold tracking-wider uppercase">
                  <Zap className="w-3.5 h-3.5 text-[#E5383B] animate-pulse" />
                  <span>ENCENDIDO DE ALTO VOLTAJE • CERTIFICADO OEM</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase leading-[1.05] text-white font-sans">
                  POTENCIA DE CHISPA <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5383B] via-red-400 to-[#F59E0B]">
                    SIN PÉRDIDA DE COMPRESIÓN
                  </span>
                </h1>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                  Repuestos de ignición e inyección calibrados bajo especificaciones de fábrica. Elimina fallas de ralentí, cascabeleo y códigos <span className="font-mono text-[#F59E0B] font-bold">P0300</span> en motores Nissan, Ford y Chevrolet.
                </p>

                {/* Especificaciones del Auto Seleccionado */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-[#090D15] border border-[#1C2538]">
                    <span className="text-slate-500 text-[10px] block">CÓDIGO OEM VERIFICADO</span>
                    <strong className="text-white text-xs">{HERO_CARS[heroCarIndex].oem}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090D15] border border-[#1C2538]">
                    <span className="text-slate-500 text-[10px] block">MOTOR / CILINDRADA</span>
                    <strong className="text-[#F59E0B] text-xs">{HERO_CARS[heroCarIndex].engine}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090D15] border border-[#1C2538] col-span-2 sm:col-span-1">
                    <span className="text-slate-500 text-[10px] block">POTENCIA NOMINAL</span>
                    <strong className="text-emerald-400 text-xs">{HERO_CARS[heroCarIndex].kw}</strong>
                  </div>
                </div>

                {/* Selector rápido de vehículos de prueba */}
                <div className="flex items-center gap-2 pt-2 text-xs font-mono">
                  <span className="text-slate-400 font-bold">Auto en Escena:</span>
                  {HERO_CARS.map((car, idx) => (
                    <button
                      key={car.name}
                      onClick={() => setHeroCarIndex(idx)}
                      className={`px-3 py-1 rounded-lg transition font-bold cursor-pointer ${
                        heroCarIndex === idx
                          ? 'bg-[#E5383B] text-white shadow-[0_0_12px_rgba(229,56,59,0.5)]'
                          : 'bg-[#131A29] text-slate-400 hover:text-white border border-[#232D42]'
                      }`}
                    >
                      {car.name.split(' ')[1]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lado Derecho: Auto Sin Fondo entrando con Foco de Telemetría */}
              <div className="lg:col-span-5 relative flex items-center justify-center min-h-[220px]">
                {/* Resplandor de Ignición */}
                <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-[#E5383B]/20 to-[#F59E0B]/10 blur-3xl pointer-events-none"></div>

                {/* Sombra de Piso */}
                <div className="absolute bottom-2 left-8 right-8 h-6 bg-black/70 blur-md rounded-full pointer-events-none"></div>

                <img 
                  key={HERO_CARS[heroCarIndex].img}
                  src={HERO_CARS[heroCarIndex].img} 
                  alt={HERO_CARS[heroCarIndex].name}
                  className="relative z-10 w-full max-w-[420px] object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.6)] select-none transition-all duration-500 transform hover:scale-105"
                />

                <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-slate-700/60 font-mono text-[10px] text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{HERO_CARS[heroCarIndex].coilType}</span>
                </div>
              </div>

            </div>
          </div>

          {/* BARRA DE FILTROS Y BÚSQUEDA DE PRECISIÓN TÉCNICA */}
          <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            {/* Buscador Rápido OEM / Nombre */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código OEM, nombre o motor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#131A29] text-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-[#232D42] focus:outline-none focus:border-[#E5383B] placeholder-slate-500 transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categorías y Marcas */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
              <span className="text-slate-500 font-bold hidden lg:inline">Categoría:</span>
              {['Todas', 'Bobinas', 'Inyección', 'Sensores', 'Conectores'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#E5383B] text-white font-bold shadow-[0_0_10px_rgba(229,56,59,0.3)]'
                      : 'bg-[#131A29] text-slate-400 hover:text-white border border-[#232D42]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* PARRILLA DE PRODUCTOS ESTILO FICHA TÉCNICA AUTOMOTRIZ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map(prod => (
              <div 
                key={prod.id}
                className="group relative rounded-2xl bg-[#0B0F17] hover:bg-[#0E1420] border border-[#1E2638] hover:border-[#E5383B]/50 transition-all duration-300 p-5 flex flex-col justify-between shadow-lg overflow-hidden"
              >
                {/* Acento lateral rojo al hover */}
                <div className="absolute top-0 left-0 w-1 h-full bg-[#E5383B] opacity-0 group-hover:opacity-100 transition"></div>

                <div>
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-2 mb-3 font-mono">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#131A29] text-slate-300 border border-[#222C42]">
                      {prod.category}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {prod.stock} en Bodega
                    </span>
                  </div>

                  {/* Nombre y Código OEM */}
                  <h3 className="font-black text-base text-white tracking-tight group-hover:text-[#E5383B] transition leading-snug">
                    {prod.name}
                  </h3>

                  <div className="my-2.5 p-2 rounded-lg bg-[#070A10] border border-[#171E2E] font-mono text-xs flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">OEM:</span>
                    <span className="font-bold text-slate-200 tracking-wider">{prod.oem}</span>
                  </div>

                  {/* Especificaciones Técnicas */}
                  <div className="space-y-1.5 text-xs text-slate-400 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Motor:</span>
                      <strong className="text-slate-300 font-mono">{prod.motor}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Terminal:</span>
                      <strong className="text-slate-300 font-mono">{prod.pinCount}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Rendimiento:</span>
                      <strong className="text-amber-400 font-mono">{prod.voltage}</strong>
                    </div>
                  </div>
                </div>

                {/* Precios y Botón de Acción */}
                <div className="mt-5 pt-4 border-t border-[#1C2538] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xl font-black text-white font-mono">
                      ${prod.priceUSD.toFixed(2)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Bs. {(prod.priceUSD * BCV_RATE).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <button
                    onClick={() => addToCart(prod)}
                    className="px-4 py-2.5 rounded-xl bg-[#E5383B] hover:bg-[#c81e1a] active:scale-95 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(229,56,59,0.35)] cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </main>
      )}

      {/* ==================================================================== */}
      {/* 3. VISTA 2: DASHBOARD DE TELEMETRÍA Y GESTIÓN (PROPUESTA MARK)        */}
      {/* ==================================================================== */}
      {currentModule === 'dashboard' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
          
          {/* Header del Dashboard */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E2638] pb-5">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#E5383B] font-bold">
                <Gauge className="w-4 h-4" />
                <span>PANEL DE CONTROL ADMINISTRATIVO • JF TELEMETRY</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                Métricas, Inventario y Despachos
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-[#131A29] border border-[#232D42] text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Inventario Sincronizado
              </span>
            </div>
          </div>

          {/* TARJETAS KPI DE TELEMETRÍA FINANCIERA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            
            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>VENTAS DEL DÍA</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">$245.00</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+18.2% vs ayer (4 órdenes)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>MARGEN BRUTO PROMEDIO</span>
                <Activity className="w-4 h-4 text-[#E5383B]" />
              </div>
              <div className="text-2xl font-black text-white">43.8%</div>
              <div className="text-[11px] text-slate-400">
                Ganancia estimada: <strong className="text-slate-200">+$107.50</strong>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>STOCK TOTAL EN BODEGA</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white">68 Repuestos</div>
              <div className="text-[11px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>1 modelo en stock crítico</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>VALOR DE INVENTARIO</span>
                <Database className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white">$1,684.00</div>
              <div className="text-[11px] text-slate-400">
                Costo reposición: <strong className="text-slate-200">$946.00</strong>
              </div>
            </div>

          </div>

          {/* SECCIÓN DOBLE: GESTIÓN DE INVENTARIO + HISTÓRICO DE VENTAS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Tabla de Inventario de Alta Precisión */}
            <div className="lg:col-span-8 rounded-2xl bg-[#0B0F17] border border-[#1E2638] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-white tracking-tight uppercase">
                    Control de Existencias & Margen Unitario
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Monitoreo en tiempo real de repuestos testeados en Maracaibo
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#1A2234] text-slate-500 text-[11px]">
                      <th className="pb-3 font-bold">REPUESTO / OEM</th>
                      <th className="pb-3 font-bold">STOCK</th>
                      <th className="pb-3 font-bold">P. VENTA</th>
                      <th className="pb-3 font-bold">COSTO BODEGA</th>
                      <th className="pb-3 font-bold">MARGEN</th>
                      <th className="pb-3 font-bold text-right">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151D2D]">
                    {PRODUCTS_DATA.map(item => {
                      const marginUSD = item.priceUSD - item.costUSD;
                      const marginPct = Math.round((marginUSD / item.priceUSD) * 100);
                      return (
                        <tr key={item.id} className="hover:bg-[#111724] transition">
                          <td className="py-3">
                            <div className="font-bold text-white text-xs">{item.name}</div>
                            <span className="text-[10px] text-slate-500">OEM: {item.oem}</span>
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-white">{item.stock}</span> unid.
                          </td>
                          <td className="py-3 font-bold text-slate-200">
                            ${item.priceUSD.toFixed(2)}
                          </td>
                          <td className="py-3 text-slate-400">
                            ${item.costUSD.toFixed(2)}
                          </td>
                          <td className="py-3 text-emerald-400 font-bold">
                            +${marginUSD.toFixed(2)} ({marginPct}%)
                          </td>
                          <td className="py-3 text-right">
                            {item.status === 'optimo' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ÓPTIMO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                CRÍTICO
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Órdenes Recientes & Despacho Inmediato */}
            <div className="lg:col-span-4 rounded-2xl bg-[#0B0F17] border border-[#1E2638] p-5 space-y-4">
              <div>
                <h3 className="font-black text-lg text-white tracking-tight uppercase">
                  Últimos Pedidos
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Transacciones generadas vía WhatsApp & Carrito
                </p>
              </div>

              <div className="space-y-3 font-mono">
                {SALES_HISTORY_DATA.map(sale => (
                  <div key={sale.id} className="p-3 rounded-xl bg-[#070A10] border border-[#1A2234] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-[#E5383B]">{sale.id}</strong>
                      <span className="text-[10px] text-slate-500">{sale.date}</span>
                    </div>
                    <div className="text-xs font-bold text-white">{sale.customer}</div>
                    <div className="text-[11px] text-slate-400">{sale.items}</div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#141B2A]">
                      <span className="text-slate-500">{sale.payment}</span>
                      <strong className="text-emerald-400">${sale.totalUSD.toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </main>
      )}

      {/* ==================================================================== */}
      {/* 4. SLIDE-OVER DE CARRITO & CHECKOUT (DESPACHO TÉCNICO A WHATSAPP)    */}
      {/* ==================================================================== */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0B0F17] border-l border-[#1E2638] h-full flex flex-col justify-between p-6 shadow-2xl font-mono">
            
            {/* Header del Carrito */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1E2638]">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#E5383B]" />
                  <h3 className="font-black text-lg text-white tracking-tight uppercase">
                    Despacho de Repuestos
                  </h3>
                </div>
                <button 
                  onClick={() => setCartOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#131A29] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de Repuestos */}
              <div className="py-4 space-y-3 overflow-y-auto max-h-[50vh]">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    El despacho está vacío. Selecciona repuestos del catálogo.
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="p-3 rounded-xl bg-[#070A10] border border-[#1B2336] flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-white line-clamp-1">{item.name}</h4>
                        <span className="text-[10px] text-slate-500">OEM: {item.oem}</span>
                        <div className="text-xs text-[#E5383B] font-bold mt-1">
                          ${(item.priceUSD * item.qty).toFixed(2)} USD
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white px-2 py-1 bg-[#131A29] rounded">
                          x{item.qty}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer de Totales & WhatsApp */}
            <div className="pt-4 border-t border-[#1E2638] space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Subtotal en Dólares:</span>
                  <strong className="text-white text-base">${cartTotalUSD.toFixed(2)}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total en Bolívares (BCV):</span>
                  <strong className="text-emerald-400 text-sm">
                    Bs. {cartTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Entrega inmediata en Maracaibo / Envíos nacionales</span>
                </div>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={sendWhatsAppOrder}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Orden por WhatsApp</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. MODAL DE JUSTIFICACIÓN DE DISEÑO DE MARK                          */}
      {/* ==================================================================== */}
      {rationaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn font-mono">
          <div className="w-full max-w-2xl bg-[#0B0F17] border border-[#232D42] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#1E2638] pb-4">
              <div className="flex items-center gap-2 text-[#E5383B]">
                <Terminal className="w-5 h-5" />
                <h3 className="font-black text-lg text-white tracking-tight uppercase">
                  Justificación de Diseño • Mark
                </h3>
              </div>
              <button onClick={() => setRationaleOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 rounded-xl bg-[#070A10] border border-[#1A2234] space-y-1.5">
                <strong className="text-white block text-sm">1. Paleta de Colores (Ingeniería & Alto Contraste)</strong>
                <p className="text-slate-400">
                  Se descartó cualquier color genérico de plantilla IA. Se implementó una base <strong>Carbón Mecánico (#07090E / #0B0F17)</strong> con acentos <strong>Cyber Crimson (#E5383B)</strong> que evoca la temperatura del arco eléctrico de bujías y bobinas, contrastado con <strong>Titanio (#E2E8F0)</strong> y <strong>Ámbar de Calibración (#F59E0B)</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070A10] border border-[#1A2234] space-y-1.5">
                <strong className="text-white block text-sm">2. Tipografía Técnica</strong>
                <p className="text-slate-400">
                  Combinación de <strong>Plus Jakarta Sans</strong> en titulares pesados de alto impacto con <strong>fuente Monoespaciada (JetBrains/Fira code style)</strong> para códigos OEM, tasas BCV y especificaciones de pines, transmitiendo la precisión de un escáner automotriz.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070A10] border border-[#1A2234] space-y-1.5">
                <strong className="text-white block text-sm">3. Estructura y Distribución (Layout)</strong>
                <p className="text-slate-400">
                  Diseño de 2 modos integrados en una barra superior unificada: Catálogo con selector de auto de entrada en tiempo real y Dashboard Administrativo con KPIs de margen bruto, stock crítico y registro de ventas.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#070A10] border border-[#1A2234] space-y-1.5">
                <strong className="text-white block text-sm">4. Micro-animaciones</strong>
                <p className="text-slate-400">
                  Resplandores de ignición en el hero, transiciones de borde reactivas en tarjetas de repuestos y feedback háptico visual al añadir productos al carrito.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setRationaleOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#E5383B] hover:bg-[#c81e1a] text-white font-bold text-xs"
              >
                Cerrar y Continuar Explorando
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
