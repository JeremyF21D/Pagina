import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { CoilCard } from './CoilCard';
import { FigmaHeroBanner } from './FigmaHeroBanner';
import { FigmaCatalogSidebar } from './FigmaCatalogSidebar';
import { FigmaAdviceBanner } from './FigmaAdviceBanner';
import { FigmaPaymentMethods } from './FigmaPaymentMethods';
import { detectProductCategory, normalizeSearchText, matchesSearchTerms } from '../../utils/formatters';

export function CatalogView({ onNavigateTab, onAskAIAboutCoil, onEditCoil }) {
  const { coils, isDbLoading } = useInventory();
  const { toggleCart } = useCart();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [priceRange, setPriceRange] = useState({ min: null, max: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const catalogTopRef = useRef(null);

  // Extract unique brands dynamically from active database
  const brands = useMemo(() => {
    const set = new Set();
    coils.forEach(c => {
      if (c.brand) set.add(c.brand.trim());
    });
    return Array.from(set).sort();
  }, [coils]);

  // Compute counts per category
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

  // Filter products
  const filteredCoils = useMemo(() => {
    return coils.filter(item => {
      // 1. Búsqueda inteligente por texto: insensible a mayúsculas, tildes (á/a) y diéresis (ü/u) o ñ/n
      const matchesQuery = matchesSearchTerms([
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

      // 2. Brand filter
      const matchesBrand = (selectedBrand === 'ALL') || 
        (normalizeSearchText(item.brand) === normalizeSearchText(selectedBrand));

      // 3. Category filter
      let matchesCategory = true;
      if (selectedCategory !== 'ALL') {
        const itemCat = detectProductCategory(item);
        matchesCategory = itemCat === selectedCategory;
      }

      // 4. Stock filter
      let matchesStock = true;
      if (stockFilter === 'IN_STOCK') {
        matchesStock = item.stock > 0;
      } else if (stockFilter === 'OUT_OF_STOCK') {
        matchesStock = item.stock <= 0;
      }

      // 5. Price range filter
      let matchesPrice = true;
      const price = Number(item.price) || 0;
      if (priceRange.min !== null && price < priceRange.min) matchesPrice = false;
      if (priceRange.max !== null && price > priceRange.max) matchesPrice = false;

      return matchesQuery && matchesBrand && matchesCategory && matchesStock && matchesPrice;
    });
  }, [coils, searchQuery, selectedCategory, selectedBrand, stockFilter, priceRange]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedBrand, stockFilter, priceRange]);

  // Pagination (9 items per page for 3x3 grid as in Figma)
  const itemsPerPage = 9;
  const totalPages = Math.max(1, Math.ceil(filteredCoils.length / itemsPerPage));
  const paginatedCoils = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCoils.slice(start, start + itemsPerPage);
  }, [filteredCoils, currentPage, itemsPerPage]);

  const handleScrollToCatalog = () => {
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedBrand('ALL');
    setStockFilter('ALL');
    setPriceRange({ min: null, max: null });
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedCategory !== 'ALL' ||
    selectedBrand !== 'ALL' ||
    stockFilter !== 'ALL' ||
    priceRange.min !== null ||
    priceRange.max !== null
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Hero Banner Principal (Figma Design) */}
      <FigmaHeroBanner onScrollToCatalog={handleScrollToCatalog} />

      {/* 2. Anchor Ref para Navegación Directa al Catálogo */}
      <div ref={catalogTopRef} className="pt-1"></div>

      {/* 3. Mobile Header: Buscador + Filtros lado a lado (Figma Mobile Layout) */}
      <div className="lg:hidden space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar repuesto o modelo..."
              className="w-full bg-[#1c1d22] border border-[#2d2f35] rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#de2420]"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(prev => !prev)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shrink-0 ${
              mobileFilterOpen
                ? 'bg-[#de2420] text-white border-[#de2420]'
                : 'bg-[#1c1d22] border-[#2d2f35] text-slate-200 hover:border-slate-600'
            }`}
          >
            <i className="fa-solid fa-sliders text-xs"></i>
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#de2420]"></span>
            )}
          </button>
        </div>

        {/* Chips de Categorías Horizontales para Móvil (Figma Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition border ${
                selectedCategory === cat.id
                  ? 'bg-[#de2420] text-white border-[#de2420] shadow-sm'
                  : 'bg-[#1c1d22] text-slate-300 border-[#2d2f35] hover:bg-[#25272e]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Layout Principal: Barra Lateral de Filtros (Sidebar) + Grilla de Productos */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* Sidebar Izquierda (Filtros Figma) */}
        <div className={`w-full lg:w-64 xl:w-72 shrink-0 ${mobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
          <FigmaCatalogSidebar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedBrand={selectedBrand}
            onBrandChange={setSelectedBrand}
            stockFilter={stockFilter}
            onStockFilterChange={setStockFilter}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            brands={brands}
            categoryCounts={categoryCounts}
            onResetFilters={handleResetAllFilters}
          />
        </div>

        {/* Contenido Derecho: Buscador Desktop + Grilla Responsive 2 Col (Móvil) / 3 Col (Desktop) + Paginación */}
        <div className="flex-1 min-w-0 space-y-4">
          
          {/* Buscador Desktop Ancho (Figma Style) */}
          <div className="hidden lg:block space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar repuesto por nombre, modelo de auto o código OEM..."
                className="w-full bg-[#1c1d22] border border-[#2d2f35] rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#de2420] focus:ring-1 focus:ring-[#de2420] transition shadow-inner"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#25272e] hover:bg-[#2e313a] text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* Pills de Filtros Activos & Contador */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 text-xs">
                  Mostrando <strong className="text-white">{filteredCoils.length}</strong> repuestos disponibles
                </span>
                {selectedCategory !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-[#de2420]/15 text-[#de2420] border border-[#de2420]/30 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                    <span>{categoryCounts[selectedCategory] ? selectedCategory.toUpperCase() : 'Categoría'}</span>
                    <i className="fa-solid fa-xmark cursor-pointer" onClick={() => setSelectedCategory('ALL')}></i>
                  </span>
                )}
                {selectedBrand !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-[#de2420]/15 text-[#de2420] border border-[#de2420]/30 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                    <span>{selectedBrand}</span>
                    <i className="fa-solid fa-xmark cursor-pointer" onClick={() => setSelectedBrand('ALL')}></i>
                  </span>
                )}
                {stockFilter === 'IN_STOCK' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                    <span>En Stock</span>
                    <i className="fa-solid fa-xmark cursor-pointer" onClick={() => setStockFilter('ALL')}></i>
                  </span>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetAllFilters}
                    className="text-[#de2420] hover:underline font-bold text-[11px] ml-1"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grilla Responsive de Productos: 2 columnas en Móvil, 3 en Desktop (Figma Responsive Design) */}
          {isDbLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4.5 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="bg-[#1c1d22] border border-[#2d2f35] rounded-2xl p-3 sm:p-4 h-64 sm:h-80 flex flex-col justify-between">
                  <div className="h-3 w-16 bg-[#25272e] rounded"></div>
                  <div className="h-28 sm:h-40 bg-[#25272e] rounded-xl"></div>
                  <div className="h-3 w-3/4 bg-[#25272e] rounded"></div>
                  <div className="h-7 w-full bg-[#25272e] rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : paginatedCoils.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4.5">
                {paginatedCoils.map(coil => (
                  <CoilCard
                    key={coil.id}
                    coil={coil}
                    onAskAI={() => onAskAIAboutCoil(coil)}
                    onEditProduct={onEditCoil}
                  />
                ))}
              </div>

              {/* Barra de Paginación (Figma Style) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-4 pb-2 border-t border-[#2d2f35] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
                      handleScrollToCatalog();
                    }}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1c1d22] border border-[#2d2f35] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-left text-[10px]"></i>
                  </button>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => {
                        setCurrentPage(page);
                        handleScrollToCatalog();
                      }}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-xs transition cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#de2420] text-white shadow-md shadow-[#de2420]/30'
                          : 'bg-[#1c1d22] border border-[#2d2f35] text-slate-300 hover:bg-[#25272e] hover:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(p => Math.min(totalPages, p + 1));
                      handleScrollToCatalog();
                    }}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1c1d22] border border-[#2d2f35] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#1c1d22] border border-[#2d2f35] rounded-2xl p-8 sm:p-12 text-center space-y-3">
              <i className="fa-solid fa-box-open text-4xl text-slate-600"></i>
              <h3 className="text-base font-bold text-white">No se encontraron repuestos con los filtros seleccionados</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Prueba buscando otro código OEM o restablece los filtros para ver todos los artículos disponibles.
              </p>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="px-4 py-2 bg-[#de2420] hover:bg-[#c81e1a] text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Ver Todo el Catálogo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Banner Inferior de Asesoría Técnica (Figma Style) */}
      <FigmaAdviceBanner />

      {/* 6. Tira de Métodos de Pago Aceptados (Figma Style) */}
      <FigmaPaymentMethods />
    </div>
  );
}
