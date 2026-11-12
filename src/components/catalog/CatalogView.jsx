import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { CoilCard } from './CoilCard';
import { FigmaHeroBanner } from './FigmaHeroBanner';
import { FigmaCatalogSidebar } from './FigmaCatalogSidebar';
import { FigmaAdviceBanner } from './FigmaAdviceBanner';
import { FigmaPaymentMethods } from './FigmaPaymentMethods';
import { detectProductCategory } from '../../utils/formatters';

export function CatalogView({ onNavigateTab, onAskAIAboutCoil, onEditCoil }) {
  const { coils, isDbLoading, dbEngine, checkAndSyncDatabase, apiConnectionStatus } = useInventory();
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
    const counts = { ALL: coils.length, bobina: 0, inyector: 0, conector: 0, estopera: 0 };
    coils.forEach(item => {
      const cat = detectProductCategory(item);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [coils]);

  // Filter products
  const filteredCoils = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return coils.filter(item => {
      // Search text query
      const matchesQuery = !q ||
        item.name.toLowerCase().includes(q) ||
        item.carModel.toLowerCase().includes(q) ||
        item.engine.toLowerCase().includes(q) ||
        item.oem.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.type && item.type.toLowerCase().includes(q)) ||
        (item.connector && item.connector.toLowerCase().includes(q));

      // Brand filter
      const matchesBrand = (selectedBrand === 'ALL') || (item.brand.toLowerCase() === selectedBrand.toLowerCase());

      // Category filter
      let matchesCategory = true;
      if (selectedCategory !== 'ALL') {
        const itemCat = detectProductCategory(item);
        matchesCategory = itemCat === selectedCategory;
      }

      // Stock filter
      let matchesStock = true;
      if (stockFilter === 'IN_STOCK') {
        matchesStock = item.stock > 0;
      } else if (stockFilter === 'OUT_OF_STOCK') {
        matchesStock = item.stock <= 0;
      }

      // Price range filter
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
    <div className="space-y-8">
      {/* 1. Hero Banner Principal (Figma Design) */}
      <FigmaHeroBanner onScrollToCatalog={handleScrollToCatalog} />

      {/* 2. Anchor Ref para Navegación Directa al Catálogo */}
      <div ref={catalogTopRef} className="pt-2"></div>

      {/* 3. Layout Principal: Barra Lateral de Filtros (Sidebar) + Grilla de Productos */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Botón flotante/toggle para móvil */}
        <div className="lg:hidden w-full flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-md">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(prev => !prev)}
            className="flex items-center gap-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-3.5 py-2 rounded-lg transition"
          >
            <i className="fa-solid fa-sliders text-xs"></i>
            <span>{mobileFilterOpen ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-white"></span>
            )}
          </button>
          <span className="text-xs text-slate-400 font-mono">
            {filteredCoils.length} repuestos
          </span>
        </div>

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

        {/* Contenido Derecho: Buscador Superior + Grilla de 3 Columnas + Paginación */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Buscador Superior Ancho (Figma Style) */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar repuesto por nombre, modelo de auto o código OEM..."
                className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition shadow-inner"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
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
                  <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                    <span>{categoryCounts[selectedCategory] ? selectedCategory.toUpperCase() : 'Categoría'}</span>
                    <i className="fa-solid fa-xmark cursor-pointer" onClick={() => setSelectedCategory('ALL')}></i>
                  </span>
                )}
                {selectedBrand !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-lg text-[11px] font-bold">
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
                    type="button"
                    onClick={handleResetAllFilters}
                    className="text-[11px] text-red-400 hover:underline font-semibold ml-1 cursor-pointer"
                  >
                    Limpiar todos
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => checkAndSyncDatabase(dbEngine, null, true)}
                className="text-slate-400 hover:text-sky-400 text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Sincronizar inventario en tiempo real"
              >
                <i className={`fa-solid fa-arrows-rotate text-[11px] ${isDbLoading ? 'fa-spin text-red-500' : ''}`}></i>
                <span>Sincronizar</span>
              </button>
            </div>
          </div>

          {/* Grilla de Productos (3 columnas en desktop como en Figma) */}
          {isDbLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-80 flex flex-col justify-between">
                  <div className="h-4 w-20 bg-slate-800 rounded"></div>
                  <div className="h-40 bg-slate-800 rounded-xl"></div>
                  <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
                  <div className="h-8 w-full bg-slate-800 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : paginatedCoils.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
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
                <div className="flex items-center justify-center gap-2 pt-4 pb-2 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
                      handleScrollToCatalog();
                    }}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition cursor-pointer ${
                        currentPage === page
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
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
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <i className="fa-solid fa-box-open text-slate-600 text-4xl mb-2"></i>
              <h3 className="text-base font-bold text-white">No se encontraron repuestos</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No hay productos que coincidan con los filtros seleccionados. Intenta restablecer los filtros o buscar por otro código OEM.
              </p>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                Restablecer Filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Pre-Footer Banner de Asistencia / Consultas (Figma Design) */}
      <FigmaAdviceBanner />

      {/* 5. Sección de Métodos de Pago Instantáneos (Figma Design) */}
      <FigmaPaymentMethods />
    </div>
  );
}
