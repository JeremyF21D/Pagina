import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
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
  brands = []
}) {
  const { coils } = useInventory();
  const [vehicleFinderOpen, setVehicleFinderOpen] = useState(false);
  const [selectedFinderBrand, setSelectedFinderBrand] = useState('');
  const [selectedFinderModel, setSelectedFinderModel] = useState('');

  // 1. Marcas 100% dinámicas extraídas del inventario activo
  const dynamicBrands = useMemo(() => {
    const set = new Set();
    coils.forEach(c => {
      if (c.brand && c.brand.trim()) {
        set.add(c.brand.trim());
      }
    });
    return Array.from(set).sort();
  }, [coils]);

  // 2. Modelos 100% dinámicos basados en los repuestos registrados para la marca seleccionada
  const availableModels = useMemo(() => {
    if (!selectedFinderBrand) return [];
    const modelSet = new Set();

    coils.forEach(c => {
      if (c.brand && c.brand.toLowerCase() === selectedFinderBrand.toLowerCase() && c.carModel) {
        // En carModel vienen cadenas como: "Tiida, Sentra B16, Versa", "Sentra B15", "Explorer 4.0", etc.
        const modelTokens = c.carModel.split(/[,/]+/).map(s => s.trim()).filter(Boolean);
        modelTokens.forEach(token => {
          // Extraer el nombre base del modelo (ej: "Tiida 1.8" -> "Tiida", "Sentra B16" -> "Sentra")
          const baseName = token.split(/\s+/)[0];
          if (baseName && baseName.length >= 3 && !/^\d/.test(baseName)) {
            // Capitalizar primera letra
            const formatted = baseName.charAt(0).toUpperCase() + baseName.slice(1);
            modelSet.add(formatted);
          }
        });
      }
    });

    return Array.from(modelSet).sort();
  }, [coils, selectedFinderBrand]);

  const handleApplyVehicleSearch = () => {
    if (selectedFinderBrand) {
      onBrandChange(selectedFinderBrand);
    }
    if (selectedFinderModel) {
      onSearchChange(selectedFinderModel);
    }
    setVehicleFinderOpen(false);
  };

  const handleClearVehicleSearch = () => {
    setSelectedFinderBrand('');
    setSelectedFinderModel('');
    onSearchChange('');
    onBrandChange('ALL');
  };

  return (
    <div className="bg-slate-850/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur space-y-4">
      
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
            <option value="ALL">Todas las marcas ({dynamicBrands.length})</option>
            {dynamicBrands.map(b => (
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

      {/* Buscador Asistido de Vehículo ("¿Qué carro tienes?") Dinámico */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setVehicleFinderOpen(!vehicleFinderOpen)}>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-brand-500/20 text-brand-400 text-xs">
              <i className="fa-solid fa-car-side"></i>
            </span>
            <span className="text-xs font-bold text-white">
              Buscador por Vehículo: <span className="text-slate-400 font-normal">Filtra por marca y modelo de tu carro</span>
            </span>
          </div>
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <span>{vehicleFinderOpen ? 'Ocultar' : 'Filtrar por Carro'}</span>
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${vehicleFinderOpen ? 'rotate-180' : ''}`}></i>
          </button>
        </div>

        {vehicleFinderOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fade-in">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">1. Marca del Auto</label>
              <select
                value={selectedFinderBrand}
                onChange={(e) => {
                  setSelectedFinderBrand(e.target.value);
                  setSelectedFinderModel('');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="">Selecciona marca...</option>
                {dynamicBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">2. Modelo</label>
              <select
                value={selectedFinderModel}
                onChange={(e) => setSelectedFinderModel(e.target.value)}
                disabled={!selectedFinderBrand}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white disabled:opacity-40"
              >
                <option value="">
                  {selectedFinderBrand ? (availableModels.length > 0 ? 'Selecciona modelo...' : 'No hay modelos registrados') : 'Primero elige la marca'}
                </option>
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleApplyVehicleSearch}
                disabled={!selectedFinderBrand}
                className="flex-1 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow transition"
              >
                <i className="fa-solid fa-filter"></i>
                <span>Ver Repuestos</span>
              </button>
              <button
                type="button"
                onClick={handleClearVehicleSearch}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
                title="Limpiar filtro de vehículo"
              >
                <i className="fa-solid fa-rotate-left"></i>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
