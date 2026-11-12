import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useInventory } from '../../context/InventoryContext';
import jfEmblem from '../../assets/jf_emblem_clean.png';

export function Header({ activeTab, setActiveTab }) {
  const { isAdmin, openAuthModal, logout } = useAuth();
  const { cartCount, toggleCart } = useCart();
  const { salesHistory } = useInventory();
  
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAdminTab = (tabKey) => {
    setActiveTab(tabKey);
    setAdminDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUserButtonClick = () => {
    if (!isAdmin) {
      openAuthModal();
    } else {
      setAdminDropdownOpen(prev => !prev);
    }
  };

  const getAdminTabTitle = () => {
    switch (activeTab) {
      case 'sales': return 'Auditoría de Ventas';
      case 'database': return 'Base de Datos & Repuestos';
      case 'admin': return 'Configuración IA & Tienda';
      default: return 'Panel Administrador';
    }
  };

  return (
    <>
      <header className="bg-black sticky top-0 z-40 border-b border-[#2d2f35]/60 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-14 flex items-center justify-between gap-3">
          
          {/* Brand / Logo (Strictly proportional to Figma: Clean Compact Emblem + Red JF + Bold White AUTO PARTS) */}
          <div
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group"
            onClick={() => { setActiveTab('catalog'); setAdminDropdownOpen(false); }}
            title="JF Auto Parts - Inicio"
          >
            <img
              src={jfEmblem}
              alt="JF Auto Parts"
              className="h-6 w-auto sm:h-7 object-contain group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1 leading-none">
              <span className="text-base sm:text-lg font-black text-[#de2420] tracking-wider font-sans">JF</span>
              <span className="text-base sm:text-lg font-black text-white tracking-widest font-sans">AUTO PARTS</span>
            </div>
          </div>

          {/* Center Area: Intentionally Clean & Empty (Faithful to Figma) */}
          <div className="flex-1"></div>

          {/* Right Actions: ONLY Shopping Cart + User Avatar (Exactly as in Figma) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Shopping Cart Button with Red Notification Badge */}
            <button
              type="button"
              onClick={toggleCart}
              className="relative w-8 h-8 sm:w-9 sm:h-9 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-lg border border-white/10 hover:border-[#de2420]/50 transition flex items-center justify-center cursor-pointer active:scale-95"
              title="Ver mi carrito de compra"
              aria-label="Carrito de compra"
            >
              <i className="fa-solid fa-cart-shopping text-xs sm:text-sm text-slate-200"></i>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#de2420] text-white font-black text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border border-black shadow-md font-mono">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Avatar Circle (Figma Style) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={handleUserButtonClick}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition flex items-center justify-center cursor-pointer active:scale-95 relative ${
                  isAdmin
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 hover:border-emerald-400'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 text-slate-200 hover:text-white hover:border-white/40'
                }`}
                title={isAdmin ? 'Menú de Administrador' : 'Acceso de Administrador'}
                aria-label="Perfil de usuario"
              >
                {isAdmin ? (
                  <i className="fa-solid fa-user-shield text-xs"></i>
                ) : (
                  <i className="fa-regular fa-user text-xs"></i>
                )}

                {/* Status Dot */}
                {isAdmin && (
                  <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-black"></span>
                )}
              </button>

              {/* Admin Floating Dropdown Menu */}
              {isAdmin && adminDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#1c1d22] border border-[#2d2f35] rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-fade-in text-slate-100">
                  <div className="px-3 py-2 border-b border-[#2d2f35] mb-1 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#de2420]/20 border border-[#de2420]/40 flex items-center justify-center text-[#de2420] font-bold text-xs shrink-0">
                      <i className="fa-solid fa-shield-halved text-[11px]"></i>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">Administrador</p>
                      <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                        Sesión Activa
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => handleSelectAdminTab('catalog')}
                      className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeTab === 'catalog'
                          ? 'bg-[#de2420] text-white font-bold'
                          : 'hover:bg-[#25272e] text-slate-200 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <i className="fa-solid fa-shop text-xs"></i>
                        <span>Ver Catálogo (Tienda)</span>
                      </span>
                      {activeTab === 'catalog' && <i className="fa-solid fa-check text-xs"></i>}
                    </button>

                    <button
                      onClick={() => handleSelectAdminTab('sales')}
                      className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeTab === 'sales'
                          ? 'bg-[#de2420] text-white font-bold'
                          : 'hover:bg-[#25272e] text-slate-200 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <i className="fa-solid fa-cash-register text-rose-400 text-xs"></i>
                        <span>Auditoría de Ventas</span>
                      </span>
                      {salesHistory.length > 0 && (
                        <span className="bg-[#de2420]/20 text-red-300 border border-[#de2420]/30 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                          {salesHistory.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleSelectAdminTab('database')}
                      className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeTab === 'database'
                          ? 'bg-[#de2420] text-white font-bold'
                          : 'hover:bg-[#25272e] text-slate-200 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <i className="fa-solid fa-database text-sky-400 text-xs"></i>
                        <span>Base de Datos & Repuestos</span>
                      </span>
                      {activeTab === 'database' && <i className="fa-solid fa-check text-xs"></i>}
                    </button>

                    <button
                      onClick={() => handleSelectAdminTab('admin')}
                      className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeTab === 'admin'
                          ? 'bg-[#de2420] text-white font-bold'
                          : 'hover:bg-[#25272e] text-slate-200 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <i className="fa-solid fa-sliders text-amber-400 text-xs"></i>
                        <span>Configuración IA & Tienda</span>
                      </span>
                      {activeTab === 'admin' && <i className="fa-solid fa-check text-xs"></i>}
                    </button>
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-[#2d2f35]">
                    <button
                      onClick={() => { logout(); setAdminDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-2 text-xs font-bold cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Admin Mode Sub-Header Bar (Only visible when logged in AND outside catalog) */}
      {isAdmin && activeTab !== 'catalog' && (
        <div className="bg-[#1c1d22] border-b border-[#de2420]/30 px-4 sm:px-8 py-2 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#de2420]/20 text-[#de2420] text-xs font-bold">
              <i className="fa-solid fa-shield-halved text-[11px]"></i>
            </span>
            <span className="text-slate-400 hidden sm:inline">Modo Administrador:</span>
            <span className="font-bold text-white uppercase tracking-wider">{getAdminTabTitle()}</span>
          </div>
          <button
            onClick={() => setActiveTab('catalog')}
            className="px-3 py-1 bg-[#de2420] hover:bg-[#c81e1a] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
          >
            <i className="fa-solid fa-arrow-left text-[11px]"></i>
            <span>Volver a la Tienda</span>
          </button>
        </div>
      )}
    </>
  );
}
