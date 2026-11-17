import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Shield, CheckCircle, ShoppingBag, Search, Sparkles, 
  ArrowRight, Phone, MessageSquare, Clock, Check, 
  Filter, Eye, Wrench, ChevronLeft, ChevronRight, Edit3, Flame, Truck
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { CarBrandsLogoLoop } from '../catalog/CarBrandsLogoLoop';
import { normalizeWaPhone } from '../../utils/whatsapp';
import { detectProductCategory, normalizeSearchText, matchesSearchTerms, formatUSD } from '../../utils/formatters';
import defaultCoilImage from '../../assets/bobina_tiida_studio.jpg';
import studioPartImg from '../../assets/bobina_banner_transparent.png';

// Modelos canónicos por marca para evitar textos duplicados o cadenas largas en el selector
const CANONICAL_MODELS_BY_BRAND = {
  Nissan: [
    'Sentra (Todos)',
    'Sentra B13',
    'Sentra B14',
    'Sentra B15',
    'Sentra B16',
    'Sentra B17 / B18',
    'Tiida',
    'Versa',
    'March',
    'Altima',
    'Maxima',
    'Murano',
    'Pathfinder',
    'Frontier / NP300',
    'X-Trail',
    'Almera',
    'Rogue',
    'Kicks',
    'Qashqai',
    'Note',
    'NV200',
    'Cube',
    '350Z / 370Z',
    'Armada / Titan',
    'Quest'
  ],
  Ford: [
    'Explorer',
    'Edge',
    'F-150',
    'Mustang'
  ]
};

// Función auxiliar para comprobar coincidencia de modelo de manera inteligente
export const matchesModelFilter = (item, selectedModel) => {
  if (!selectedModel || selectedModel === 'Todos') return true;
  const target = `${item.carModel || ''} ${item.name || ''}`.toLowerCase();
  
  if (selectedModel === 'Sentra (Todos)') {
    return target.includes('sentra');
  }
  if (selectedModel === 'Sentra B13') {
    return target.includes('b13') || target.includes('tsuru');
  }
  if (selectedModel === 'Sentra B14') {
    return target.includes('b14');
  }
  if (selectedModel === 'Sentra B15') {
    return target.includes('b15');
  }
  if (selectedModel === 'Sentra B16') {
    return target.includes('b16');
  }
  if (selectedModel === 'Sentra B17 / B18') {
    return target.includes('b17') || target.includes('b18');
  }
  if (selectedModel === 'Frontier / NP300') {
    return target.includes('frontier') || target.includes('np300') || target.includes('navara');
  }
  if (selectedModel === '350Z / 370Z') {
    return target.includes('350z') || target.includes('370z');
  }
  if (selectedModel === 'Armada / Titan') {
    return target.includes('armada') || target.includes('titan');
  }
  if (selectedModel === 'Universal') {
    return target.includes('universal');
  }
  
  // Limpieza para modelos individuales (ej: "Tiida", "Versa", "Altima", "Explorer", etc.)
  const cleanModel = selectedModel.toLowerCase().split('/')[0].replace(/\(.*?\)/g, '').trim();
  return target.includes(cleanModel);
};

export function SabrinaCatalogView({ 
  onNavigateTab, 
  onAskAIAboutCoil, 
  onEditCoil,
  onOpenProductDetail,
  externalSearchQuery,
  onSearchQueryChange
}) {
  const { coils, isDbLoading, ownerSettings } = useInventory();
  const { addToCart, setIsCartOpen } = useCart();
  const [justAddedId, setJustAddedId] = useState(null);
  const { binanceRate, bcvRate, rates } = useCurrency();
  const activeRate = Number(binanceRate || rates?.binance || 1076.87);
  const { isAdmin } = useAuth();

  // Filtros reactivos guiados (Sabrina CRO 3-Steps)
  const [cardDesignMode, setCardDesignMode] = useState('micro'); // 'micro' seleccionado por el usuario // 'minimal' (Opción 1) | 'micro' (Opción 2) | 'badge' (Opción 3) | 'classic'
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedModel, setSelectedModel] = useState('Todos');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = onSearchQueryChange || setInternalSearchQuery;
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const catalogTopRef = useRef(null);

  // Lista única de marcas extraídas de la base de datos real
  const brands = useMemo(() => {
    const set = new Set();
    coils.forEach(c => {
      if (c.brand) set.add(c.brand.trim());
    });
    return Array.from(set).sort();
  }, [coils]);

  // Lista de modelos disponibles limpios y no repetidos según la marca seleccionada
  const models = useMemo(() => {
    const list = new Set();
    
    // 1. Modelos canónicos según la marca seleccionada
    if (selectedBrand === 'Todas') {
      Object.keys(CANONICAL_MODELS_BY_BRAND).forEach(b => {
        CANONICAL_MODELS_BY_BRAND[b].forEach(m => {
          const exists = coils.some(c => matchesModelFilter(c, m));
          if (exists) list.add(m);
        });
      });
    } else if (CANONICAL_MODELS_BY_BRAND[selectedBrand]) {
      CANONICAL_MODELS_BY_BRAND[selectedBrand].forEach(m => {
        const exists = coils.some(c => (c.brand?.trim() === selectedBrand) && matchesModelFilter(c, m));
        if (exists) list.add(m);
      });
    }

    // 2. Extraer modelos adicionales para marcas no predefinidas o items universales
    coils.forEach(c => {
      if (selectedBrand !== 'Todas' && c.brand?.trim() !== selectedBrand) return;
      if (!c.carModel) return;
      
      const raw = c.carModel.trim();
      if (raw.toLowerCase().includes('universal')) {
        list.add('Universal');
        return;
      }
      
      // Si la marca no está en los canónicos predefinidos
      if (!CANONICAL_MODELS_BY_BRAND[c.brand?.trim()]) {
        const parts = raw.split(/[,;/]+/).map(p => p.trim()).filter(Boolean);
        parts.forEach(p => {
          const cleaned = p.replace(/\((19|20)\d\d.*?\)/g, '')
                           .replace(/\(\d\.\d[Ll].*?\)/g, '')
                           .replace(/(19|20)\d\d-(19|20)\d\d/g, '')
                           .replace(/\b\d\.\d[Ll]\b/g, '')
                           .trim();
          if (cleaned.length >= 2 && !/^\d+$/.test(cleaned)) {
            list.add(cleaned);
          }
        });
      }
    });

    return Array.from(list).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [coils, selectedBrand]);

  // Reset del modelo si cambia la marca
  useEffect(() => {
    setSelectedModel('Todos');
  }, [selectedBrand]);

  // Categorías con conteos dinámicos
  const categoryCounts = useMemo(() => {
    const counts = { ALL: coils.length, bobina: 0, inyector: 0, conector: 0, estopera: 0, sensor: 0 };
    coils.forEach(item => {
      const cat = detectProductCategory(item);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [coils]);

  const categories = [
    { id: 'ALL', name: 'Todas' },
    { id: 'bobina', name: 'Bobinas' },
    { id: 'inyector', name: 'Inyectores' },
    { id: 'conector', name: 'Conectores' },
    { id: 'estopera', name: 'Estoperas' },
    { id: 'sensor', name: 'Sensores' }
  ];

  // Filtrado inteligente sin sensibilidad a acentos/mayúsculas
  const filteredCoils = useMemo(() => {
    return coils.filter(item => {
      // 1. Marca
      const matchBrand = (selectedBrand === 'Todas') || 
        (normalizeSearchText(item.brand) === normalizeSearchText(selectedBrand));

      // 2. Modelo (filtrado inteligente sin duplicados)
      const matchModel = (selectedModel === 'Todos') || matchesModelFilter(item, selectedModel);

      // 3. Categoría
      let matchCategory = true;
      if (selectedCategory !== 'ALL') {
        matchCategory = detectProductCategory(item) === selectedCategory;
      }

      // 4. Stock
      let matchStock = true;
      if (stockFilter === 'IN_STOCK') {
        matchStock = item.stock > 0;
      } else if (stockFilter === 'OUT_OF_STOCK') {
        matchStock = item.stock <= 0;
      }

      // 5. Búsqueda por texto (nombre, OEM, motor, etc.)
      const matchSearch = matchesSearchTerms([
        item.name,
        item.carModel,
        item.engine,
        item.oem,
        item.brand,
        item.id,
        item.type,
        item.connector,
        item.badge
      ], searchQuery);

      return matchBrand && matchModel && matchCategory && matchStock && matchSearch;
    });
  }, [coils, selectedBrand, selectedModel, selectedCategory, stockFilter, searchQuery]);

  // Paginación (9 repuestos por página en rejilla de 3x3)
  const itemsPerPage = 9;
  const totalPages = Math.max(1, Math.ceil(filteredCoils.length / itemsPerPage));
  const paginatedCoils = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCoils.slice(start, start + itemsPerPage);
  }, [filteredCoils, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBrand, selectedModel, selectedCategory, stockFilter, searchQuery]);

  const handleScrollToCatalog = () => {
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDirectWhatsAppBuy = (coil) => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const priceUSD = Number(coil.price) || 0;
    const priceVES = priceUSD * activeRate;
    const msg = encodeURIComponent(
      `¡Hola JF Auto Parts! 🚗 Deseo comprar directamente este repuesto:\n\n` +
      `📦 *${coil.name}*\n` +
      `🏷️ Aplicación: ${coil.brand} ${coil.carModel || ''} (${coil.engine || ''})\n` +
      `⚙️ Código OEM: ${coil.oem || coil.id}\n` +
      `💵 Precio: $${priceUSD.toFixed(2)} USD (~Bs. ${priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})\n\n` +
      `¿Tienen entrega en Maracaibo o envío nacional hoy?`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* ==================================================================== */}
      {/* 1. HERO BANNER DE SABRINA (CONFIANZA & CRO AUTOMOTRIZ)              */}
      {/* ==================================================================== */}
      <div className="relative rounded-3xl bg-gradient-to-br from-white via-rose-50/50 to-slate-50 border border-slate-200 p-6 sm:p-10 shadow-sm overflow-hidden animate-fadeInUp">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-bold sabrina-hero-badge">
              <CheckCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Repuestos Probados en Banco • Cero Fallas de Chispa</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
              El repuesto exacto para tu auto, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-red-400">
                listo para despachar en Maracaibo.
              </span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              Compra con total seguridad. Compatibilidad 100% verificada por código OEM, repuestos probados en banco y asesoría técnica directa por WhatsApp en Maracaibo.
            </p>

            {/* 3 Promesas de Confianza Comercial */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-center">
                <Shield className="w-4 h-4 text-emerald-600 mb-1" />
                <strong className="text-slate-900 block font-bold">Repuestos Probados</strong>
                <span className="text-slate-500 text-[11px]">Testeo en banco de prueba</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-center">
                <Clock className="w-4 h-4 text-red-600 mb-1" />
                <strong className="text-slate-900 block font-bold">Entrega Inmediata</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <Check className="w-4 h-4 text-rose-400 mb-1" />
                <strong className="text-slate-900 block font-bold">Compatibilidad</strong>
                <span className="text-slate-500 text-[11px]">Verificada por código OEM</span>
              </div>
            </div>

            {/* Botones de llamada a la acción */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleScrollToCatalog}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <span>Explorar Catálogo ({coils.length} items)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Lado Derecho: Vitrina de Repuestos Automotrices Reales (Bobinas OEM) */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
            <div className="absolute w-72 h-72 rounded-full bg-red-500/20 blur-3xl pointer-events-none"></div>
            <div className="relative z-10 sabrina-hero-badge flex flex-col items-center">
              <img 
                src={studioPartImg} 
                alt="Bobina de Encendido Original JF Auto Parts" 
                className="w-full max-w-[340px] sm:max-w-[390px] object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.6)] select-none hover:scale-105 transition-transform duration-500"
              />

            </div>
          </div>

        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. CARRUSEL ANIMADO DE MARCAS (REACT BITS)                           */}
      {/* ==================================================================== */}
      <CarBrandsLogoLoop />

      {/* Anchor Ref para scroll suave */}
      <div ref={catalogTopRef} className="pt-1"></div>

      {/* ==================================================================== */}
      {/* 3. ASISTENTE GUIADO DE COMPATIBILIDAD VEHICULAR (3 PASOS CRO)        */}
      {/* ==================================================================== */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-red-400" />
              <span>Encuentra el repuesto para tu vehículo</span>
            </h3>
            <p className="text-xs text-slate-400">
              Filtra por marca y modelo para ver solo piezas 100% compatibles con tu motor
            </p>
          </div>

          <span className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-200 w-fit">
            {filteredCoils.length} repuestos disponibles
          </span>
        </div>

        {/* 3 Selectores Guiados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Paso 1: Marca */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Paso 1: Marca</label>
            <select 
              value={selectedBrand} 
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500 transition cursor-pointer"
            >
              <option value="Todas">Todas las marcas</option>
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Paso 2: Modelo */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Paso 2: Modelo</label>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500 transition cursor-pointer"
            >
              <option value="Todos">Todos los modelos</option>
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Paso 3: Búsqueda rápida */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Paso 3: Búsqueda rápida</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Código OEM, nombre o motor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500 transition placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Chips de Categorías Horizontales */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 scrollbar-none select-none border-t border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Categoría:</span>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition border cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-red-600 text-white border-red-500 shadow-sm'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span>{cat.name}</span>
              {categoryCounts[cat.id] !== undefined && (
                <span className="ml-1 opacity-75">({categoryCounts[cat.id]})</span>
              )}
            </button>
          ))}

          {/* Filtro de Stock */}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <button
              onClick={() => setStockFilter(stockFilter === 'IN_STOCK' ? 'ALL' : 'IN_STOCK')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                stockFilter === 'IN_STOCK'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              En Stock
            </button>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 4. PARRILLA DE PRODUCTOS DE SABRINA (CONEXIÓN BACKEND REAL)         */}
      {/* ==================================================================== */}
      {isDbLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-3xl bg-white border border-slate-200 text-slate-800 shadow-xs p-6 h-72 animate-pulse flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded-md w-1/3"></div>
                <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
                <div className="h-16 bg-slate-200 rounded-2xl"></div>
              </div>
              <div className="h-8 bg-slate-200 rounded-xl w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredCoils.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm">
          <Filter className="w-12 h-12 text-slate-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">No encontramos repuestos con los filtros aplicados</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Prueba seleccionando "Todas las marcas" o buscando directamente por número OEM.
          </p>
          <button
            onClick={() => {
              setSelectedBrand('Todas');
              setSelectedModel('Todos');
              setSelectedCategory('ALL');
              setStockFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500 transition cursor-pointer"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCoils.map((item, idx) => {
            const priceUSD = Number(item.price) || 0;
            const priceVES = priceUSD * activeRate;
            const isCriticalStock = item.stock > 0 && item.stock <= 2;
            const isOutOfStock = item.stock <= 0;
            const rawOldPrice = Number(item.oldPrice || item.old_price || 0);
            const effectiveOldPrice = rawOldPrice > priceUSD ? rawOldPrice : 0;
            const discountPct = effectiveOldPrice > priceUSD
              ? Math.round(((effectiveOldPrice - priceUSD) / effectiveOldPrice) * 100)
              : 0;

            return (
              <div
                key={item.id}
                className="sabrina-card rounded-3xl bg-white border border-slate-200 hover:border-red-500 shadow-sm hover:shadow-xl transition-all duration-300 p-5 flex flex-col justify-between shadow-md shadow-black/20 group cursor-default"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div>
                  
                  {/* Badges Superiores: Marca y Disponibilidad */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.brand || 'OEM'}
                    </span>

                    <span className="text-[11px] font-bold flex items-center gap-1.5">
                      {isOutOfStock ? (
                        <span className="text-rose-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>Agotado</span>
                        </span>
                      ) : isCriticalStock ? (
                        <span className="text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-600/40 flex items-center gap-1 animate-pulse">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>{item.stock === 1 ? 'Último disponible' : `${item.stock} disponibles`}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>En stock ({item.stock} disp.)</span>
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Extracción de OEM Principal y Adicionales */}
                  {(() => {
                    const rawOem = String(item.oem || item.id || '').trim();
                    const oemParts = rawOem.split(/[,;\/]/).map(s => s.trim()).filter(Boolean);
                    const primaryOem = oemParts[0] || rawOem || 'OEM';
                    const extraOemCount = Math.max(0, oemParts.length - 1);

                    return (
                      <>
                        {/* Foto del Repuesto en Vitrina de Estudio */}
                        <div 
                          onClick={() => onOpenProductDetail(item)}
                          className="rounded-2xl bg-white border border-slate-200 hover:border-red-500 relative overflow-hidden transition-all duration-300 flex items-center justify-center p-3 mb-3 select-none h-44 group-hover:scale-[1.02] cursor-pointer shadow-sm"
                          title={`Ver foto ampliada y ficha técnica de ${item.name}`}
                        >
                          <img 
                            src={item.image || defaultCoilImage} 
                            alt={item.name} 
                            className="h-full w-auto object-contain max-h-36 drop-shadow-sm select-none transition-transform duration-300 group-hover:scale-110 mix-blend-multiply"
                            onError={(e) => { e.target.onerror = null; e.target.src = defaultCoilImage; }}
                          />

                          {/* Opción 3: Badge OEM flotante en la esquina de la foto */}
                          {cardDesignMode === 'badge' && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 text-[10px] font-mono font-bold text-red-600 shadow-xs">
                              OEM: {primaryOem}
                            </div>
                          )}

                          <div className="absolute top-2 right-2 px-2 py-1 rounded-xl bg-slate-900/80 backdrop-blur-xs text-slate-300 hover:text-white group-hover:text-red-400 transition text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            <Eye className="w-3 h-3 text-red-400" />
                            <span>Ficha</span>
                          </div>
                        </div>

                        {/* Título del Repuesto */}
                        <h3 
                          onClick={() => onOpenProductDetail(item)}
                          className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight group-hover:text-red-600 transition leading-snug line-clamp-2 cursor-pointer"
                          title={item.name}
                        >
                          {item.name}
                        </h3>

                        {/* Compatibilidad Vehicular */}
                        <div className="mt-2 text-xs text-slate-700 font-medium truncate" title={item.carModel}>
                          <span className="text-slate-400">Aplica:</span>{' '}
                          <span className="text-slate-800 font-semibold truncate">{item.carModel || 'Universal'}</span>
                          {item.engine && <span className="text-slate-400 font-mono text-[11px]">• {item.engine}</span>}
                        </div>

                        {/* VARIANTES DE DISEÑO SEGÚN OPCIÓN */}
                        {cardDesignMode === 'minimal' && (
                          /* ⭐ OPCIÓN 1: MINIMALISTA & VALOR COMERCIAL */
                          <div className="mt-2.5 py-1.5 px-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Probado en banco</span>
                            </span>
                            <span className="text-slate-600 font-semibold flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-red-600" />
                              <span>Entrega Inmediata</span>
                            </span>
                          </div>
                        )}

                        {cardDesignMode === 'micro' && (
                          /* 🏷️ OPCIÓN 2: MICRO-OEM COMPACTO EN 1 LÍNEA */
                          <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 truncate">
                                OEM: {primaryOem}
                              </span>
                              {extraOemCount > 0 && (
                                <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0" title="Ver códigos adicionales en Ficha">
                                  +{extraOemCount} más
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Probado</span>
                            </span>
                          </div>
                        )}

                        {cardDesignMode === 'badge' && (
                          /* 📸 OPCIÓN 3: BADGE EN FOTO + GARANTÍA LIMPIA */
                          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Probado en banco de prueba</span>
                          </div>
                        )}

                        {cardDesignMode === 'classic' && (
                          /* 📋 OPCIÓN ACTUAL: OEM COMPLETO */
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200 shadow-xs line-clamp-2">
                              OEM: {rawOem}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Probado en banco</span>
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                </div>

                {/* Footer de Tarjeta: Precios & Botón de Añadir Directo */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 font-sans tracking-tight">
                        ${priceUSD.toFixed(2)}
                      </span>
                      {effectiveOldPrice > priceUSD && (
                        <span className="text-xs sm:text-sm text-slate-400 line-through font-mono font-semibold">
                          ${effectiveOldPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-400">USD</span>
                      {discountPct > 0 && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-red-600 font-bold font-mono">
                      Bs. {priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    
                    {/* Botón Admin: Editar Repuesto */}
                    {isAdmin && onEditCoil && (
                      <button
                        onClick={() => onEditCoil(item)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-amber-400 transition cursor-pointer"
                        title="Editar repuesto (Admin)"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Botón Añadir al Carrito (Verde Esmeralda CRO) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item.id, 1);
                        setJustAddedId(item.id);
                        setTimeout(() => setJustAddedId(null), 1200);
                        if (setIsCartOpen) setIsCartOpen(true);
                      }}
                      disabled={isOutOfStock}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all duration-300 shadow-md cursor-pointer disabled:opacity-40 active:scale-95 ${
                        justAddedId === item.id
                          ? 'bg-emerald-600 text-white scale-105 shadow-emerald-500/30'
                          : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                      }`}
                      title="Añadir repuesto al carrito"
                    >
                      {justAddedId === item.id ? (
                        <>
                          <Check className="w-4 h-4 text-white animate-bounce" />
                          <span>¡Añadido!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span>Añadir</span>
                        </>
                      )}
                    </button>

                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => {
              setCurrentPage(p => Math.max(1, p - 1));
              handleScrollToCatalog();
            }}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-30 border border-slate-200 text-slate-700 shadow-xs transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs font-bold text-slate-700 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => {
              setCurrentPage(p => Math.min(totalPages, p + 1));
              handleScrollToCatalog();
            }}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-30 border border-slate-200 text-slate-700 shadow-xs transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
