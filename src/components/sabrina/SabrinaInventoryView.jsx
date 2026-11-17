import React, { useState, useMemo } from 'react';
import { 
  Database, Plus, Upload, Download, Code, Trash2, 
  Search, Filter, Edit3, Shield, CheckCircle, AlertTriangle, 
  Flame, Eye, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { formatUSD, detectProductCategory, getCategoryConfig } from '../../utils/formatters';
import { exportToCSV, exportToSQL, downloadFile } from '../../utils/csvParser';
import defaultCoilImage from '../../assets/bobina_tiida_studio.jpg';

export function SabrinaInventoryView({
  onOpenCreateModal,
  onOpenEditModal,
  onOpenBulkModal,
  onOpenSchemaModal
}) {
  const { coils, deleteCoil, upsertCoil } = useInventory();
  const { binanceRate, bcvRate } = useCurrency();
  const { requireAdminAuth } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortField, setSortField] = useState('name'); // 'name' | 'oem' | 'carModel' | 'stock' | 'price' | 'cost' | 'margin'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [exportOpen, setExportOpen] = useState(false);

  // Marcas únicas
  const brands = useMemo(() => {
    const set = new Set();
    coils.forEach(c => {
      if (c.brand) set.add(c.brand.trim());
    });
    return Array.from(set).sort();
  }, [coils]);

  // Conteo de categorías para las pestañas dinámicas
  const categoryCounts = useMemo(() => {
    const counts = { ALL: coils.length, bobina: 0, inyector: 0, sensor: 0, conector: 0, estopera: 0, otro: 0 };
    coils.forEach(c => {
      const cat = detectProductCategory(c) || 'otro';
      if (counts[cat] !== undefined) counts[cat]++;
      else counts.otro++;
    });
    return counts;
  }, [coils]);

  // Manejo de ordenamiento por columna
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Ajuste rápido de stock (+ / -) directo en la tabla
  const handleQuickStock = async (item, delta) => {
    const currentStock = Number(item.stock) || 0;
    const newStock = Math.max(0, currentStock + delta);
    if (newStock === currentStock) return;
    await upsertCoil({ ...item, stock: newStock }, item.id);
  };

  // Filtrado de la tabla de inventario
  const filteredCoils = useMemo(() => {
    return coils.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.oem && item.oem.toLowerCase().includes(q)) ||
        (item.carModel && item.carModel.toLowerCase().includes(q)) ||
        (item.engine && item.engine.toLowerCase().includes(q));

      const matchBrand = (selectedBrand === 'ALL') || (item.brand === selectedBrand);

      let matchStock = true;
      if (stockFilter === 'IN_STOCK') matchStock = item.stock > 2;
      else if (stockFilter === 'LOW_STOCK') matchStock = item.stock > 0 && item.stock <= 2;
      else if (stockFilter === 'OUT_OF_STOCK') matchStock = item.stock <= 0;

      let matchCategory = true;
      if (selectedCategory !== 'ALL') {
        const itemCat = detectProductCategory(item);
        matchCategory = (itemCat === selectedCategory);
      }

      return matchSearch && matchBrand && matchStock && matchCategory;
    });
  }, [coils, searchQuery, selectedBrand, stockFilter, selectedCategory]);

  // Ordenamiento interactivo
  const sortedCoils = useMemo(() => {
    const list = [...filteredCoils];
    list.sort((a, b) => {
      let valA, valB;
      const priceA = Number(a.price) || 0;
      const costA = Number(a.costUSD) || Number(a.cost) || Math.round(priceA * 0.55);
      const marginA = priceA - costA;

      const priceB = Number(b.price) || 0;
      const costB = Number(b.costUSD) || Number(b.cost) || Math.round(priceB * 0.55);
      const marginB = priceB - costB;

      switch (sortField) {
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'oem':
          valA = (a.oem || a.id || '').toLowerCase();
          valB = (b.oem || b.id || '').toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'carModel':
          valA = (a.carModel || '').toLowerCase();
          valB = (b.carModel || '').toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'stock':
          valA = Number(a.stock) || 0;
          valB = Number(b.stock) || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        case 'price':
          valA = priceA;
          valB = priceB;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        case 'cost':
          valA = costA;
          valB = costB;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        case 'margin':
          valA = marginA;
          valB = marginB;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        default:
          return 0;
      }
    });
    return list;
  }, [filteredCoils, sortField, sortDirection]);

  // Paginación dinámica
  const totalPages = Math.max(1, Math.ceil(sortedCoils.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCoils = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return sortedCoils.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCoils, safeCurrentPage, itemsPerPage]);

  const handleExport = (format) => {
    setExportOpen(false);
    const timestamp = Date.now();
    if (format === 'csv') {
      const csv = exportToCSV(coils);
      downloadFile(csv, `inventario_sabrina_${timestamp}.csv`, 'text/csv;charset=utf-8;');
    } else if (format === 'json') {
      const json = JSON.stringify(coils, null, 2);
      downloadFile(json, `inventario_sabrina_${timestamp}.json`, 'application/json;charset=utf-8;');
    } else if (format === 'sql') {
      const sql = exportToSQL(coils);
      downloadFile(sql, `inventario_sabrina_${timestamp}.sql`, 'application/sql;charset=utf-8;');
    }
  };

  const handleDeleteCoil = (id, name) => {
    requireAdminAuth(
      () => {
        if (window.confirm(`¿Estás seguro de eliminar el repuesto "${name}" de la base de datos de producción?`)) {
          deleteCoil(id);
        }
      },
      'Eliminar repuestos de la base de datos requiere autorización de Administrador.'
    );
  };

  // Indicador visual de ordenamiento
  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-red-600 font-bold" />
      : <ArrowDown className="w-3.5 h-3.5 text-red-600 font-bold" />;
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      
      {/* Encabezado y Toolbar de Acciones */}
      <div className="border-b border-slate-200 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-red-600 font-bold flex items-center gap-1.5 uppercase tracking-wider">
            <Database className="w-4 h-4 text-red-500" />
            Control de Existencias & Bodega
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Inventario de Repuestos
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Supabase Conectado ({coils.length} repuestos activos)</span>
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-red-600/25 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Insertar Repuesto</span>
          </button>

          <button
            onClick={onOpenBulkModal}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Carga Masiva</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setExportOpen(p => !p)}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Exportar</span>
            </button>
            
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-30 text-xs text-slate-800 animate-fadeIn">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 transition"
                >
                  Exportar a CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 transition"
                >
                  Exportar a JSON
                </button>
                <button
                  onClick={() => handleExport('sql')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-800 transition"
                >
                  Exportar a SQL DDL
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onOpenSchemaModal}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Ver Esquemas SQL de PostgreSQL"
          >
            <Code className="w-4 h-4 text-red-600" />
            <span className="hidden sm:inline">Esquema SQL</span>
          </button>

        </div>
      </div>

      {/* Pestañas de Categorías Dinámicas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', label: 'Todas', count: categoryCounts.ALL },
          { id: 'bobina', label: 'Bobinas', count: categoryCounts.bobina },
          { id: 'inyector', label: 'Inyectores', count: categoryCounts.inyector },
          { id: 'sensor', label: 'Sensores', count: categoryCounts.sensor },
          { id: 'conector', label: 'Conectores', count: categoryCounts.conector },
          { id: 'estopera', label: 'Estoperas', count: categoryCounts.estopera },
        ].map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, código OEM o vehículo..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition"
          />
        </div>

        <select
          value={selectedBrand}
          onChange={(e) => {
            setSelectedBrand(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 cursor-pointer"
        >
          <option value="ALL">Todas las marcas ({brands.length})</option>
          {brands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={stockFilter}
          onChange={(e) => {
            setStockFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500 cursor-pointer"
        >
          <option value="ALL">Todo el stock</option>
          <option value="IN_STOCK">Stock Óptimo (más de 2)</option>
          <option value="LOW_STOCK">Bajo Stock (1-2)</option>
          <option value="OUT_OF_STOCK">Agotado (0)</option>
        </select>
      </div>

      {/* Tabla de Inventario de Sabrina con Encabezados Ordenables */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px]">
                
                {/* Columna Foto & Repuesto */}
                <th 
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-red-600 transition select-none"
                  title="Ordenar por nombre de repuesto"
                >
                  <div className="flex items-center gap-1.5">
                    <span>FOTO & REPUESTO</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>

                {/* Columna Código OEM */}
                <th 
                  onClick={() => handleSort('oem')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-red-600 transition select-none"
                  title="Ordenar por código OEM"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CÓDIGO OEM</span>
                    {renderSortIndicator('oem')}
                  </div>
                </th>

                {/* Columna Aplicación Vehicular */}
                <th 
                  onClick={() => handleSort('carModel')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-red-600 transition select-none"
                  title="Ordenar por compatibilidad vehicular"
                >
                  <div className="flex items-center gap-1.5">
                    <span>APLICACIÓN VEHICULAR</span>
                    {renderSortIndicator('carModel')}
                  </div>
                </th>

                {/* Columna Existencia */}
                <th 
                  onClick={() => handleSort('stock')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-red-600 transition select-none"
                  title="Ordenar por unidades en existencia"
                >
                  <div className="flex items-center gap-1.5">
                    <span>EXISTENCIA</span>
                    {renderSortIndicator('stock')}
                  </div>
                </th>

                {/* Columna Precio */}
                <th 
                  onClick={() => handleSort('price')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-red-600 transition select-none"
                  title="Ordenar por precio de venta"
                >
                  <div className="flex items-center gap-1.5">
                    <span>PRECIO (USD)</span>
                    {renderSortIndicator('price')}
                  </div>
                </th>

                {/* Columna Costo */}
                <th 
                  onClick={() => handleSort('cost')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-red-600 transition select-none"
                  title="Ordenar por costo"
                >
                  <div className="flex items-center gap-1.5">
                    <span>COSTO</span>
                    {renderSortIndicator('cost')}
                  </div>
                </th>

                {/* Columna Margen */}
                <th 
                  onClick={() => handleSort('margin')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-red-600 transition select-none"
                  title="Ordenar por margen de ganancia"
                >
                  <div className="flex items-center gap-1.5">
                    <span>MARGEN</span>
                    {renderSortIndicator('margin')}
                  </div>
                </th>

                <th className="py-3.5 px-4 text-right font-bold">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCoils.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No se encontraron repuestos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedCoils.map(item => {
                  const price = Number(item.price) || 0;
                  const cost = Number(item.costUSD) || Number(item.cost) || Math.round(price * 0.55);
                  const margin = price - cost;
                  const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;
                  const isOutOfStock = item.stock <= 0;
                  const isLow = item.stock > 0 && item.stock <= 2;

                  return (
                    <tr key={item.id} className="hover:bg-rose-50/20 transition group">
                      
                      {/* Foto y Nombre */}
                      <td className="py-3 px-4 font-bold">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-red-300 transition">
                            <img 
                              src={item.image || defaultCoilImage} 
                              alt={item.name} 
                              className="max-h-8 w-auto object-contain mix-blend-multiply"
                              onError={(e) => { e.target.onerror = null; e.target.src = defaultCoilImage; }}
                            />
                          </div>
                          <div>
                            <span className="block text-slate-900 font-bold leading-tight group-hover:text-red-600 transition">{item.name}</span>
                            <span className="text-[10px] text-slate-400">{item.brand || 'OEM'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Código OEM */}
                      <td className="py-3 px-4 font-mono font-bold text-red-600">
                        {item.oem || item.id}
                      </td>

                      {/* Vehículo y Motor */}
                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-medium">{item.carModel || 'Universal'}</div>
                        {item.engine && (
                          <div className="text-[10px] text-slate-500 font-mono">{item.engine}</div>
                        )}
                      </td>

                      {/* Stock con Ajuste Rápido (+ / -) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStock(item, -1)}
                            disabled={item.stock <= 0}
                            title="Disminuir 1 unidad de stock"
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-xs transition cursor-pointer"
                          >
                            -
                          </button>
                          
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isOutOfStock 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : isLow 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}></span>
                            <span>{item.stock} unid.</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickStock(item, 1)}
                            title="Aumentar 1 unidad de stock"
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center font-bold text-xs transition cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Precio USD & VES */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 font-mono">${price.toFixed(2)}</div>
                        <div className="text-[10px] text-red-600 font-mono font-bold">
                          Bs. {(price * (Number(binanceRate) || 1076.87)).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                        </div>
                      </td>

                      {/* Costo */}
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        ${cost.toFixed(2)}
                      </td>

                      {/* Margen */}
                      <td className="py-3 px-4 font-bold text-emerald-700 font-mono">
                        +${margin.toFixed(2)} <span className="text-[10px]">({marginPct}%)</span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenEditModal(item)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                            title="Editar repuesto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteCoil(item.id, item.name)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
                            title="Eliminar repuesto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación Dinámica y Contador */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span>Mostrando</span>
            <strong className="text-slate-900 font-bold">
              {sortedCoils.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1} - {Math.min(safeCurrentPage * itemsPerPage, sortedCoils.length)}
            </strong>
            <span>de</span>
            <strong className="text-slate-900 font-bold">{sortedCoils.length}</strong>
            <span>repuestos</span>
            {sortedCoils.length !== coils.length && (
              <span className="text-slate-400 text-[11px]">({coils.length} totales en catálogo)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <span className="text-slate-500 text-[11px]">Por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs transition cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-xl text-xs font-bold transition cursor-pointer ${
                    safeCurrentPage === page
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs transition cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}