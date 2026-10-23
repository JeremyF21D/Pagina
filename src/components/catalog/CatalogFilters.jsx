import React from 'react';
import { PRODUCT_CATEGORIES } from '../../utils/formatters';

export function CatalogFilters({
  searchQuery,
  onSearchChange,
  selectedCategory = 'ALL',
  onCategoryChange,
  selectedBrand,
  onBrandChange,
  stockFilter,
  onStockFilterChange,
  brands = [],
  onQuickSearch
}) {
  // Etiquetas rápidas basadas exclusivamente en las marcas y modelos que sí vende la tienda
  const dynamicTags = React.useMemo(() => {
    const list = [];
    // 1. Agregar marcas activas del catálogo oficial (Nissan, Toyota, Ford, etc.)
    if (Array.isArray(brands) && brands.length > 0) {
      brands.forEach(b => {
        if (b && b !== 'ALL' && !list.includes(b)) list.push(b);
      });
    }
    // 2. Modelos más buscados y vendidos de JF Auto Parts
    const verifiedModels = [
      'Nissan Tiida',
      'Sentra B16',
      'Toyota Yaris',
      'Nissan Rogue',
      'Sentra B13',
      'Ford Explorer',
      'Toyota Corolla',
      'Nissan Almera',
      'Conectores'
    ];
    verifiedModels.forEach(m => {
      if (!list.includes(m)) list.push(m);
    });

    return list.slice(0, 8);
  }, [brands]);

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur space-y-4">
      {/* Category Pills Slider / Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => onCategoryChange && onCategoryChange('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
            selectedCategory === 'ALL'
              ? 'bg-brand-500 text-white border-brand-400 shadow-md shadow-brand-500/20'
              : 'bg-slate-900/80 hover:bg-slate-700 text-slate-300 border-slate-700/70'
          }`}
        >
          <i className="fa-solid fa-shapes text-[11px]"></i>
          <span>Todos los Repuestos</span>
        </button>

        {PRODUCT_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange && onCategoryChange(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-brand-500 text-white border-brand-400 shadow-md shadow-brand-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-700 text-slate-300 border-slate-700/70'
              }`}
            >
              <i className={`${cat.icon} text-[11px] ${isSelected ? 'text-white' : cat.color}`}></i>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Filter Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Search input */}
        <div className="relative md:col-span-2">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por repuesto, modelo (Aveo, Tiida, Optra), motor o código..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              <i className="fa-solid fa-circle-xmark"></i>
            </button>
          )}
        </div>

        {/* Dynamic Brand select */}
        <div>
          <select 
            value={selectedBrand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="ALL">Todas las marcas ({brands.length})</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Stock Availability */}
        <div>
          <select 
            value={stockFilter}
            onChange={(e) => onStockFilterChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="ALL">Cualquier disponibilidad</option>
            <option value="IN_STOCK">En Stock Inmediato</option>
            <option value="OUT_OF_STOCK">Agotados (0 unidades)</option>
            <option value="PROMO">Con Oferta Especial</option>
          </select>
        </div>
      </div>

      {/* Quick Search Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-700/60 text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <i className="fa-solid fa-bolt text-brand-400 text-[10px]"></i> Búsquedas frecuentes:
        </span>
        {dynamicTags.map(tag => (
          <button 
            key={tag}
            onClick={() => onQuickSearch(tag)}
            className="px-2.5 py-1 bg-slate-900/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition text-[11px] cursor-pointer"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
