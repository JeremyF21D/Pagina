import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { formatUSD, detectProductCategory, getCategoryConfig, PRODUCT_CATEGORIES, matchesSearchTerms } from '../../utils/formatters';

export function InventoryTable({ onEditCoil, onDeleteCoil }) {
  const { coils, upsertCoil } = useInventory();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'EMPTY' | 'AVAILABLE'
  const [onlyNoPhoto, setOnlyNoPhoto] = useState(false);

  const brands = Array.from(new Set(coils.map(c => c.brand).filter(Boolean))).sort();

  const handleStockAdjust = (coil, delta) => {
    const current = Number(coil.stock || 0);
    const nextStock = Math.max(0, current + delta);
    if (nextStock !== current) {
      upsertCoil({
        ...coil,
        stock: nextStock
      });
    }
  };

  const filtered = coils.filter(b => {
    if (brandFilter !== 'ALL' && b.brand !== brandFilter) return false;
    if (categoryFilter !== 'ALL') {
      const cat = detectProductCategory(b);
      if (cat !== categoryFilter) return false;
    }
    if (onlyNoPhoto && b.image) return false;

    if (stockStatusFilter === 'CRITICAL' && (b.stock <= 0 || b.stock > 2)) return false;
    if (stockStatusFilter === 'EMPTY' && b.stock > 0) return false;
    if (stockStatusFilter === 'AVAILABLE' && b.stock <= 0) return false;

    if (search.trim()) {
      return matchesSearchTerms([
        b.id,
        b.name,
        b.carModel,
        b.oem,
        b.brand,
        b.type,
        b.connector
      ], search);
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl space-y-4">
      {/* Search & Filter Bar */}
      <div className="p-4 bg-slate-850 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-database text-sky-400"></i>
          <h3 className="text-sm font-bold text-white">Inventario de Repuestos en Base de Datos</h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
            {filtered.length} referencias
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Filtro "Sin Foto" */}
          <button
            type="button"
            onClick={() => setOnlyNoPhoto(!onlyNoPhoto)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              onlyNoPhoto 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Mostrar solo repuestos que no tienen foto asignada"
          >
            <i className="fa-solid fa-image"></i>
            <span>Sin Foto</span>
          </button>

          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por código, auto, OEM..." 
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />

          <select 
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="ALL">Todo el Stock</option>
            <option value="CRITICAL">⚠️ Stock Crítico (1-2 uds)</option>
            <option value="EMPTY">🔴 Agotados (0 uds)</option>
            <option value="AVAILABLE">🟢 En Stock</option>
          </select>

          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="ALL">Todas las categorías</option>
            {PRODUCT_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select 
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="ALL">Todas las marcas</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
            <tr>
              <th className="py-3 px-4">Código / ID</th>
              <th className="py-3 px-4">Marca & Repuesto</th>
              <th className="py-3 px-4">Vehículos Compatibles</th>
              <th className="py-3 px-4">Motor</th>
              <th className="py-3 px-4">Código OEM</th>
              <th className="py-3 px-4">Precio</th>
              <th className="py-3 px-4 text-center">Ajuste Rápido Stock</th>
              <th className="py-3 px-4">Garantía</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-500">
                  No se encontraron repuestos en el inventario con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filtered.map(coil => {
                const catCfg = getCategoryConfig(coil.category || detectProductCategory(coil));
                const isCritical = coil.stock > 0 && coil.stock <= 2;
                const isEmpty = coil.stock <= 0;

                return (
                  <tr 
                    key={coil.id} 
                    className={`transition hover:bg-slate-800/60 ${
                      isEmpty 
                        ? 'bg-rose-950/10' 
                        : isCritical 
                        ? 'bg-amber-950/10' 
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                      {coil.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {coil.image ? (
                            <img 
                              src={coil.image} 
                              alt={coil.name} 
                              className="w-full h-full object-cover" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center text-slate-500 text-xs ${coil.image ? 'hidden' : 'flex'}`}>
                            <i className={`${catCfg.icon} ${catCfg.color}`}></i>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-brand-400 block">{coil.brand}</span>
                          <span className="font-semibold text-white truncate block max-w-xs">{coil.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {coil.carModel}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {coil.engine}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                      {coil.oem}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-brand-400 whitespace-nowrap">
                      {formatUSD(coil.price)}
                    </td>

                    {/* Ajuste Rápido de Stock en Línea con Semáforo */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(coil, -1)}
                          disabled={coil.stock <= 0}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-xs flex items-center justify-center transition cursor-pointer"
                          title="Restar 1 unidad"
                        >
                          -
                        </button>

                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                          isEmpty 
                            ? 'text-rose-400' 
                            : isCritical 
                            ? 'text-amber-300' 
                            : 'text-emerald-400'
                        }`}>
                          {coil.stock} uds
                        </span>

                        <button
                          type="button"
                          onClick={() => handleStockAdjust(coil, 1)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center transition cursor-pointer"
                          title="Sumar 1 unidad"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {coil.warranty}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      <button 
                        onClick={() => onEditCoil(coil)}
                        className="p-1.5 bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 rounded-lg text-xs transition cursor-pointer"
                        title="Editar registro completo"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button 
                        onClick={() => onDeleteCoil(coil.id)}
                        className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-lg text-xs transition cursor-pointer"
                        title="Eliminar de Supabase"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
