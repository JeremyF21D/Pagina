import React, { useState, useRef, useEffect } from 'react';
import { 
  Store, BarChart3, Database, Receipt, Settings, 
  ShoppingBag, Shield, User, Lock, ArrowLeftRight,
  LogOut, Sparkles, ChevronDown, Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import logoImg from '../../assets/logo.png';
import logoCompleto from '../../assets/brand/logo_jf_completo.png';

export function SabrinaHeader({ 
  activeTab, 
  setActiveTab, 
  viewMode, 
  onToggleViewMode,
  onOpenRationale,
  searchQuery = '',
  setSearchQuery
}) {
  const { isAdmin, openAuthModal, logout } = useAuth();
  const { cartCount, toggleCart } = useCart();
  
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
    setAdminDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeTab !== 'catalog') {
      setActiveTab('catalog');
    }
    setTimeout(() => {
      const el = document.getElementById('catalogo-productos') || document.getElementById('catalogo');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Fila Principal del Header */}
        <div className="h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Logo Oficial JF Auto Parts (Identidad de Marca Oficial) */}
          <div 
            onClick={() => handleSelectTab('catalog')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group shrink-0"
            title="JF Auto Parts - Especialistas en Encendido"
          >
            {/* Versión Completa en Desktop / Tablet */}
            <img 
              src={logoCompleto} 
              alt="JF Auto Parts" 
              className="hidden sm:block h-10 sm:h-12 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-xs"
            />

            {/* Versión Compacta en Móvil: Isotipo Bujía JF + Texto Orbitron */}
            <div className="flex sm:hidden items-center gap-2">
              <img 
                src={logoImg} 
                alt="JF Auto Parts" 
                className="w-9 h-9 rounded-xl object-contain group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="font-orbitron font-black text-sm text-slate-900 tracking-tight block">
                  JF <span className="text-red-600">PARTS</span>
                </span>
                <span className="text-[9px] text-slate-400 font-medium block">Maracaibo</span>
              </div>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA CENTRAL (Estilo E-Commerce Supreparts) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-6">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <input
                type="text"
                placeholder="¿Qué repuesto estás buscando? Ej. Bobina Tiida, Sensor..."
                value={searchQuery}
                onChange={(e) => {
                  if (setSearchQuery) setSearchQuery(e.target.value);
                  if (activeTab !== 'catalog') setActiveTab('catalog');
                }}
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-red-600 rounded-2xl pl-4 pr-24 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery && setSearchQuery('')}
                  className="absolute right-24 text-slate-400 hover:text-slate-600 px-1 text-xs cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm shadow-red-600/30"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </button>
            </form>
          </div>

          {/* Acciones Derecha: Carrito + Iniciar Sesión / Panel Admin */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Carrito de Compras */}
            <button
              type="button"
              onClick={toggleCart}
              className="relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-red-600/25 cursor-pointer active:scale-95"
              title="Ver carrito de compras"
              id="sabrina-cart-btn"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Tu Carrito</span>
              <span className="px-2 py-0.5 rounded-full bg-white text-red-600 text-[11px] font-black">
                {cartCount}
              </span>
            </button>

            {/* Botón de Iniciar Sesión / Panel de Administrador */}
            <div className="relative" ref={dropdownRef}>
              {!isAdmin ? (
                /* Cliente o Administrador sin logear */
                <button
                  type="button"
                  onClick={() => openAuthModal()}
                  className="px-3 py-2 sm:py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
                  title="Acceso de Administrador"
                >
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Iniciar Sesión</span>
                </button>
              ) : (
                /* Administrador Logeado: Muestra Botón con Dropdown */
                <button
                  type="button"
                  onClick={() => setAdminDropdownOpen(prev => !prev)}
                  className="px-3 py-2 sm:py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
                  title="Menú de Administración"
                >
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Panel Admin</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-emerald-600 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              {/* DROPDOWN CON LAS OPCIONES DE ADMINISTRACIÓN */}
              {adminDropdownOpen && isAdmin && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl p-2.5 z-50 text-xs animate-scaleIn text-slate-800 space-y-1">
                  
                  {/* Cabecera de la sesión activa */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Sesión Activa
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        ADMIN
                      </span>
                    </div>
                    <p className="text-slate-900 font-black text-sm mt-0.5">Administrador JF</p>
                    <span className="text-[10px] text-slate-400 font-mono">Control de ventas, stock y finanzas</span>
                  </div>

                  {/* Opciones de Navegación para el Administrador */}
                  <div className="space-y-0.5">
                    {[
                      { id: 'catalog', label: '1. Catálogo / Tienda', desc: 'Ver tienda como comprador', icon: Store },
                      { id: 'analytics', label: '2. Rendimiento & Métricas', desc: 'Dashboard, rotación y gráficas', icon: BarChart3 },
                      { id: 'database', label: '3. Inventario & Stock', desc: 'Control de repuestos y bodega', icon: Database },
                      { id: 'sales', label: '4. Ventas & Despachos', desc: 'Historial de órdenes y notas', icon: Receipt },
                      { id: 'admin', label: '5. Ajustes del Sistema', desc: 'Configuración, tasas y BD', icon: Settings },
                    ].map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 transition cursor-pointer ${
                            isActive
                              ? 'bg-red-50 text-red-700 font-bold border border-red-200'
                              : 'hover:bg-slate-100/80 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <span className="font-bold text-slate-900 block truncate">{item.label}</span>
                              <span className="text-[10px] text-slate-400 block truncate">{item.desc}</span>
                            </div>
                          </div>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cerrar Sesión */}
                  <div className="pt-1.5 border-t border-slate-100 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setAdminDropdownOpen(false);
                        setActiveTab('catalog');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold flex items-center gap-2 cursor-pointer transition text-xs"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Cerrar Sesión de Administrador</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>

        {/* Barra de Búsqueda Móvil (visible en pantallas pequeñas debajo del logo) */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <input
              type="text"
              placeholder="¿Qué repuesto estás buscando?..."
              value={searchQuery}
              onChange={(e) => {
                if (setSearchQuery) setSearchQuery(e.target.value);
                if (activeTab !== 'catalog') setActiveTab('catalog');
              }}
              className="w-full bg-slate-50 border border-slate-300 focus:border-red-600 rounded-xl pl-3 pr-20 py-2 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery && setSearchQuery('')}
                className="absolute right-20 text-slate-400 px-1 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-3 bg-red-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <Search className="w-3 h-3" />
              <span>Buscar</span>
            </button>
          </form>
        </div>

      </div>
    </header>
  );
}
