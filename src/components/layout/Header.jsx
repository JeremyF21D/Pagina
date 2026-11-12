import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useInventory } from '../../context/InventoryContext';
import { normalizeWaPhone } from '../../utils/whatsapp';
import jfEmblem from '../../assets/jf_emblem_clean.png';

export function Header({ activeTab, setActiveTab }) {
  const { isAdmin, openAuthModal, logout } = useAuth();
  const { cartCount, toggleCart } = useCart();
  const { salesHistory, ownerSettings } = useInventory();
  
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

  const handleOpenDirectWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings.ownerPhone);
    const text = encodeURIComponent('¡Hola! Me comunico desde la plataforma de JF Auto Parts para consultar disponibilidad de repuestos.');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

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
      <header className="bg-black sticky top-0 z-40 border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          
          {/* Brand / Logo (Strictly faithful to Figma: Clean Transparent Emblem + Red JF + Bold White AUTO PARTS, NO BORDER) */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group"
            onClick={() => { setActiveTab('catalog'); setAdminDropdownOpen(false); }}
            title="JF Auto Parts - Inicio"
          >
            <img
              src={jfEmblem}
              alt="JF Auto Parts"
              className="h-8 w-auto sm:h-9 object-contain group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xl sm:text-2xl font-black text-red-600 tracking-wider">JF</span>
              <span className="text-xl sm:text-2xl font-black text-white tracking-widest">AUTO PARTS</span>
            </div>
          </div>

          {/* Center Area: Intentionally Clean & Empty (Figma Layout) */}
          <div className="flex-1"></div>

          {/* Right Actions: WhatsApp Pill + Cart Icon with Red Badge + User Avatar */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            
            {/* WhatsApp Contact Button */}
            <button
              onClick={handleOpenDirectWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Consultar por WhatsApp"
            >
              <i className="fa-brands fa-whatsapp text-sm sm:text-base"></i>
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Shopping Cart Button with Red Notification Badge (Figma Style) */}
            <button
              type="button"
              onClick={toggleCart}
              className="relative w-10 h-10 sm:w-11 sm:h-11 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl border border-white/10 hover:border-red-500/40 transition shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
              title="Ver mi carrito de compra"
              aria-label="Carrito de compra"
            >
              <i className="fa-solid fa-cart-shopping text-sm sm:text-base text-slate-200"></i>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-black shadow-lg animate-pulse font-mono">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Avatar Circle (Figma Style) with Admin Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={handleUserButtonClick}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border transition shadow-sm flex items-center justify-center cursor-pointer active:scale-95 relative ${
                  isAdmin
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 hover:border-emerald-400'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 text-slate-200 hover:text-white hover:border-red-500/40'
                }`}
                title={isAdmin ? 'Menú de Administrador' : 'Acceso de Administrador'}
                aria-label="Perfil de usuario"
              >
                {isAdmin ? (
                  <i className="fa-solid fa-user-shield text-sm"></i>
                ) : (
                  <i className="fa-regular fa-user text-sm"></i>
                )}

                {/* Status Dot */}
                {isAdmin && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black"></span>
                )}
              </button>

              {/* Admin Floating Dropdown Menu */}
              {isAdmin && adminDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-fade-in text-slate-100">
                  <div className="px-3 py-2.5 border-b border-slate-800 mb-1.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
                      <i className="fa-solid fa-shield-halved"></i>
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
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeTab === 'catalog'
                          ? 'bg-red-600 text-white font-bold'
                          : 'hover:bg-slate-800 text-slate-200 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <i className="fa-solid fa-shop text-sm"></i>
                        <span>Ver Catálogo (Tienda)</span>
                      </span>
                      {activeTab === 'catalog' && <i className="fa-solid fa-check text-xs"></i>}
                    </button>

                    <button
                      onClick={() => handleSelectAdminTab('sales')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeTab === 'sales'
                          ? 'bg-red-600 text-white font-bold'
                          : 'hover:bg-slate-800 text-slate-200 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <i className="fa-solid fa-cash-register text-rose-400 text-sm"></i>
                        <span>Auditoría de Ventas</span>
                      </span>
                      {salesHistory.length > 0 && (
                        <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                          {salesHistory.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleSelectAdminTab('database')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeTab === 'database'
                          ? 'bg-red-600 text-white font-bold'
                          : 'hover:bg-slate-800 text-slate-200 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <i className="fa-solid fa-database text-sky-400 text-sm"></i>
                        <span>Base de Datos & Repuestos</span>
                      </span>
                      {activeTab === 'database' && <i className="fa-solid fa-check text-xs"></i>}
                    </button>

                    <button
                      onClick={() => handleSelectAdminTab('admin')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeTab === 'admin'
                          ? 'bg-red-600 text-white font-bold'
                          : 'hover:bg-slate-800 text-slate-200 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <i className="fa-solid fa-sliders text-amber-400 text-sm"></i>
                        <span>Configuración IA & Tienda</span>
                      </span>
                      {activeTab === 'admin' && <i className="fa-solid fa-check text-xs"></i>}
                    </button>
                  </div>

                  <div className="pt-2 mt-1.5 border-t border-slate-800">
                    <button
                      onClick={() => { logout(); setAdminDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-2.5 text-xs font-bold cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-right-from-bracket"></i>
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
        <div className="bg-slate-900/90 border-b border-red-500/30 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-red-600/20 text-red-400 text-xs font-bold">
              <i className="fa-solid fa-shield-halved"></i>
            </span>
            <span className="text-slate-400 hidden sm:inline">Modo Administrador:</span>
            <span className="font-bold text-white uppercase tracking-wider">{getAdminTabTitle()}</span>
          </div>
          <button
            onClick={() => setActiveTab('catalog')}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
          >
            <i className="fa-solid fa-arrow-left text-[11px]"></i>
            <span>Volver a la Tienda</span>
          </button>
        </div>
      )}
    </>
  );
}
