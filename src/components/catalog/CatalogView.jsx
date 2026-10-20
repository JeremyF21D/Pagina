import React, { useState, useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { CoilCard } from './CoilCard';
import { CatalogFilters } from './CatalogFilters';
import logoImg from '../../assets/logo.png';

export function CatalogView({ onNavigateTab, onAskAIAboutCoil, onEditCoil }) {
  const { coils, isDbLoading, dbEngine, dbCredentials, checkAndSyncDatabase, apiConnectionStatus } = useInventory();
  const { toggleCart } = useCart();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');

  // Extract unique brands dynamically from active database
  const brands = useMemo(() => {
    const set = new Set();
    coils.forEach(c => {
      if (c.brand) set.add(c.brand.trim());
    });
    return Array.from(set).sort();
  }, [coils]);

  // Filter coils
  const filteredCoils = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return coils.filter(item => {
      const matchesQuery = !q ||
        item.name.toLowerCase().includes(q) ||
        item.carModel.toLowerCase().includes(q) ||
        item.engine.toLowerCase().includes(q) ||
        item.oem.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);

      const matchesBrand = (selectedBrand === 'ALL') || (item.brand.toLowerCase() === selectedBrand.toLowerCase());

      let matchesStock = true;
      if (stockFilter === 'IN_STOCK') {
        matchesStock = item.stock > 0;
      } else if (stockFilter === 'OUT_OF_STOCK') {
        matchesStock = item.stock <= 0;
      } else if (stockFilter === 'PROMO') {
        matchesStock = item.badge === 'Oferta' || item.price < item.oldPrice;
      }

      return matchesQuery && matchesBrand && matchesStock;
    });
  }, [coils, searchQuery, selectedBrand, stockFilter]);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950/80 border border-slate-700/80 p-5 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-400 text-xs font-bold uppercase tracking-wider">
              <i className="fa-solid fa-circle-check"></i> Stock Conectado en Tiempo Real
            </div>

            {/* Only visible when Admin */}
            {isAdmin && (
              <button 
                onClick={() => onNavigateTab('database')} 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-semibold transition cursor-pointer"
              >
                <i className="fa-solid fa-server"></i>
                <span>Gestión de Base de Datos</span>
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Repuestos & Bobinas de Encendido <span className="text-brand-500">Originales & OEM</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Catálogo oficial <strong>JF AUTO PARTS</strong>. Bobinas tipo Lápiz, Riel múltiple y Módulo para Chevrolet, Ford, Toyota, Hyundai, Nissan, Renault y más. Consulta disponibilidad inmediata o escribe a nuestro <strong>Asesor por WhatsApp</strong>.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button 
              onClick={toggleCart} 
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-brand-500/20 transition cursor-pointer"
            >
              <i className="fa-solid fa-cart-shopping"></i> Ver Mi Carrito y Comprar
            </button>

            <div className="px-4 py-2 bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <i className="fa-brands fa-whatsapp text-base"></i>
              <span>¿Dudas? El asesor IA está en la esquina inferior derecha →</span>
            </div>

            {/* Admin Panel button - ONLY VISIBLE IF IS ADMIN */}
            {isAdmin && (
              <button 
                onClick={() => onNavigateTab('database')} 
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-300 font-semibold rounded-xl text-xs sm:text-sm border border-red-500/40 flex items-center gap-2 transition cursor-pointer"
              >
                <i className="fa-solid fa-sliders"></i> Panel Administrador (Stock / DB)
              </button>
            )}
          </div>
        </div>

        {/* Hero Logo Card */}
        <div className="relative shrink-0 hidden md:flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/60 border border-slate-700/60 shadow-2xl backdrop-blur-xs">
          <img 
            src={logoImg} 
            alt="JF AUTO PARTS Logo Oficial" 
            className="w-40 h-40 lg:w-48 lg:h-48 object-cover rounded-xl shadow-lg border border-slate-800" 
          />
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-2">
            Logo Oficial • JF Auto Parts
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <CatalogFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedBrand={selectedBrand}
        onBrandChange={setSelectedBrand}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        brands={brands}
        onQuickSearch={(tag) => setSearchQuery(tag)}
      />

      {/* Results Header Count & Active Table Pill */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-xs text-slate-300">
            Mostrando <strong className="text-white font-bold">{filteredCoils.length}</strong> de {coils.length} bobinas registradas
          </p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] text-slate-300 font-mono shadow-xs">
            <i className="fa-solid fa-table-cells text-brand-400"></i>
            <span>Tabla: <strong className="text-white">{dbCredentials?.[dbEngine]?.table || 'bobinas_inventario'}</strong></span>
            <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded uppercase font-sans font-semibold">
              {dbEngine}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => checkAndSyncDatabase(dbEngine, null, true)}
            disabled={isDbLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-400 hover:text-sky-300 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Refrescar catálogo y verificar productos en la base de datos"
          >
            <i className={`fa-solid fa-arrows-rotate text-[11px] ${isDbLoading ? 'fa-spin text-brand-400' : ''}`}></i>
            <span>{isDbLoading ? 'Sincronizando...' : 'Actualizar Catálogo'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Products or Empty/Loading State */}
      {isDbLoading ? (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3 animate-fade-in">
          <div className="h-10 w-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h3 className="text-sm font-bold text-white">Consultando tabla 'bobinas_inventario' ({dbEngine.toUpperCase()})...</h3>
          <p className="text-xs text-slate-400">Verificando elementos e inventario en tiempo real.</p>
        </div>
      ) : coils.length === 0 ? (
        apiConnectionStatus.status === 'error' ? (
          /* Error de Conexión con la Base de Datos */
          <div className="bg-slate-800/70 border border-rose-500/30 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-2xl backdrop-blur">
            <div className="h-16 w-16 bg-rose-500/15 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto text-rose-400 text-2xl shadow-inner">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              No hay productos disponibles, contacte con el administrador
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              No fue posible conectar con la base de datos de productos ({dbEngine.toUpperCase()}). Para consultar existencias inmediatas, cotizaciones o despachos, comunícate directamente con nosotros por WhatsApp.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-2">
              <a
                href="https://wa.me/584126497478?text=Hola,%20vi%20en%20la%20tienda%20web%20que%20no%20hay%20productos%20disponibles%20por%20error%20de%20conexión%20con%20la%20base%20de%20datos.%20Deseo%20consultar%20disponibilidad."
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <i className="fa-brands fa-whatsapp text-sm"></i> Contactar por WhatsApp (0412-6497478)
              </a>
              <button 
                onClick={() => checkAndSyncDatabase(dbEngine, null, true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
              >
                <i className="fa-solid fa-arrows-rotate text-sky-400"></i> Reintentar Conexión
              </button>
              {isAdmin && (
                <button 
                  onClick={() => onNavigateTab('database')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-amber-500/40 flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-database text-amber-400"></i> Configurar Base de Datos (Admin)
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Conectado con éxito, pero la base de datos está vacía */
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-xl">
            <div className="h-16 w-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto text-slate-400 text-2xl">
              <i className="fa-solid fa-box-open"></i>
            </div>
            <h3 className="text-lg font-bold text-white">No hay productos disponibles actualmente</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              La tabla <strong className="text-white font-mono">{dbCredentials?.[dbEngine]?.table || 'bobinas_inventario'}</strong> está conectada pero no tiene artículos registrados en este momento.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-2">
              <a
                href="https://wa.me/584126497478?text=Hola,%20deseo%20consultar%20disponibilidad%20de%20bobinas%20de%20encendido."
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <i className="fa-brands fa-whatsapp text-sm"></i> Contactar al Administrador
              </a>
              <button 
                onClick={() => checkAndSyncDatabase(dbEngine, null, true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
              >
                <i className="fa-solid fa-arrows-rotate text-sky-400"></i> Actualizar
              </button>
              {isAdmin && (
                <button 
                  onClick={() => onNavigateTab('database')}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-brand-500/20"
                >
                  <i className="fa-solid fa-plus"></i> Gestionar / Insertar Artículos
                </button>
              )}
            </div>
          </div>
        )
      ) : filteredCoils.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredCoils.map(coil => (
            <CoilCard
              key={coil.id}
              coil={coil}
              onAskAI={() => onAskAIAboutCoil(coil)}
              onEditProduct={onEditCoil}
            />
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="h-16 w-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto text-slate-400 text-2xl">
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <h3 className="text-lg font-bold text-white">No se encontraron bobinas</h3>
          <p className="text-xs text-slate-400">
            No hay productos que coincidan con los filtros aplicados. Intenta buscar por código OEM o marca.
          </p>
          <button 
            onClick={() => { setSearchQuery(''); setSelectedBrand('ALL'); setStockFilter('ALL'); }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Limpiar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
