import React, { useState } from 'react';

export function FigmaCatalogSidebar({
  selectedCategory,
  onCategoryChange,
  selectedBrand,
  onBrandChange,
  stockFilter,
  onStockFilterChange,
  priceRange,
  onPriceRangeChange,
  brands = [],
  categoryCounts = {},
  onResetFilters
}) {
  const [minInput, setMinInput] = useState(priceRange?.min || '');
  const [maxInput, setMaxInput] = useState(priceRange?.max || '');

  const categories = [
    { id: 'ALL', name: 'Todas las Categorías', icon: 'fa-solid fa-list' },
    { id: 'bobina', name: 'Bobinas de Encendido', icon: 'fa-solid fa-bolt' },
    { id: 'inyector', name: 'Inyectores de Gasolina', icon: 'fa-solid fa-syringe' },
    { id: 'conector', name: 'Conectores / Ramales', icon: 'fa-solid fa-plug' },
    { id: 'estopera', name: 'Estoperas / Retenes', icon: 'fa-solid fa-circle-notch' }
  ];

  const handleApplyPrice = (e) => {
    e.preventDefault();
    onPriceRangeChange({
      min: minInput !== '' ? parseFloat(minInput) : null,
      max: maxInput !== '' ? parseFloat(maxInput) : null
    });
  };

  const handleClear = () => {
    setMinInput('');
    setMaxInput('');
    onResetFilters();
  };

  return (
    <aside className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-filter text-red-500 text-sm"></i>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Filtración
          </h3>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-[11px] text-slate-400 hover:text-red-400 font-semibold transition cursor-pointer"
        >
          Limpiar
        </button>
      </div>

      {/* 1. Categorías */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
          Categoría
        </label>
        <div className="space-y-1">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                  isSelected
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <i className={`${cat.icon} text-[11px] ${isSelected ? 'text-red-400' : 'text-slate-500'}`}></i>
                  <span className="truncate">{cat.name}</span>
                </span>
                {count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isSelected ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Marca del Vehículo */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
          Marca del Auto
        </label>
        <select
          value={selectedBrand}
          onChange={(e) => onBrandChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
        >
          <option value="ALL">Todas las Marcas</option>
          {brands.map(brand => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
      </div>

      {/* 3. Rango de Precio ($ USD) con botón Aplicar */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
          Rango de Precio ($)
        </label>
        <form onSubmit={handleApplyPrice} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5">Min ($)</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block mb-0.5">Max ($)</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="100"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded-lg transition shadow-md shadow-red-600/20 cursor-pointer"
          >
            Aplicar Filtro
          </button>
        </form>
      </div>

      {/* 4. Disponibilidad */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
          Disponibilidad
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
          <input
            type="checkbox"
            checked={stockFilter === 'IN_STOCK'}
            onChange={(e) => onStockFilterChange(e.target.checked ? 'IN_STOCK' : 'ALL')}
            className="rounded bg-slate-950 border-slate-700 text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
          />
          <span>Solo artículos en stock</span>
        </label>
      </div>

      {/* Botón Verde Inferior (Figma style) */}
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={handleClear}
          className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
        >
          <i className="fa-solid fa-rotate-left text-[11px]"></i>
          <span>Restablecer Filtros</span>
        </button>
      </div>
    </aside>
  );
}
