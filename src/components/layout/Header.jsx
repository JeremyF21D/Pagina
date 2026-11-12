import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useInventory } from '../../context/InventoryContext';
import { normalizeWaPhone } from '../../utils/whatsapp';
import logoImg from '../../assets/logo.png';

export function Header({ activeTab, setActiveTab }) {
  const { isAdmin, openAuthModal, logout, requireAdminAuth } = useAuth();
  const { cartCount, toggleCart } = useCart();
  const { salesHistory, ownerSettings } = useInventory();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tabKey) => {
    if (['sales', 'database', 'admin'].includes(tabKey) && !isAdmin) {
      requireAdminAuth(() => setActiveTab(tabKey));
      setMobileMenuOpen(false);
      return;
    }
    setActiveTab(tabKey);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDirectWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings.ownerPhone);
    const text = encodeURIComponent('¡Hola! Me comunico desde la plataforma de JF Auto Parts para consultar disponibilidad de repuestos.');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const navTabs = [
    { key: 'catalog', label: 'Catálogo', icon: 'fa-car-battery', adminOnly: false },
    { key: 'sales', label: 'Ventas', icon: 'fa-cash-register', adminOnly: true, iconColor: 'text-rose-400', badge: salesHistory.length },
    { key: 'database', label: 'Base de Datos', icon: 'fa-database', adminOnly: true, iconColor: 'text-sky-400' },
    { key: 'admin', label: 'Config IA', icon: 'fa-sliders', adminOnly: true },
  ];

  const visibleTabs = navTabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <header className="bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo (Figma Red & White Style) */}
        <div
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer select-none group"
          onClick={() => { setActiveTab('catalog'); setMobileMenuOpen(false); }}
        >
          <img
            src={logoImg}
            alt="JF AUTO PARTS Logo"
            className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl object-cover border border-slate-800 shadow-lg shadow-black/50 shrink-0 group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
              <span className="text-red-500 font-black">JF</span>
              <span className="text-white tracking-wider font-extrabold">AUTO PARTS</span>
            </span>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-semibold -mt-0.5 sm:-mt-1 hidden xs:block font-mono">
              Repuestos & Encendido Automotriz
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto shadow-inner">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleNavClick(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <i className={`fa-solid ${tab.icon} ${tab.iconColor || ''}`}></i>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="bg-red-500/20 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Right side actions (Figma Header Icons: Cart with Badge + User Avatar) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* WhatsApp Direct Pill */}
          <button
            onClick={handleOpenDirectWhatsApp}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Abrir chat en WhatsApp"
          >
            <i className="fa-brands fa-whatsapp text-sm"></i>
            <span>WhatsApp</span>
          </button>

          {/* Cart Trigger with Circular Red Badge (Figma Style) */}
          <button
            type="button"
            onClick={toggleCart}
            className="relative w-9 h-9 sm:w-10 sm:h-10 bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-xl border border-slate-800 hover:border-red-500/50 transition shadow-md flex items-center justify-center cursor-pointer active:scale-95"
            title="Ver Mi Carrito de Compra"
          >
            <i className="fa-solid fa-cart-shopping text-sm text-slate-200"></i>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[10px] h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md animate-pulse font-mono">
                {cartCount}
              </span>
            )}
          </button>

          {/* User Avatar Circle (Figma Style) */}
          {isAdmin ? (
            <button
              type="button"
              onClick={logout}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 rounded-full transition shadow-md flex items-center justify-center cursor-pointer active:scale-95"
              title="Sesión de Administrador activa. Clic para salir."
            >
              <i className="fa-solid fa-user-check text-sm"></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full border border-slate-800 hover:border-red-500/50 transition shadow-md flex items-center justify-center cursor-pointer active:scale-95"
              title="Acceso de Administrador"
            >
              <i className="fa-regular fa-user text-sm"></i>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Abrir menú"
          >
            <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-base`}></i>
          </button>
        </div>
      </div>

      {/* Mobile drop menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 space-y-2 animate-fade-in shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            {visibleTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleNavClick(tab.key)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === tab.key
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-300 bg-slate-900 border border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <i className={`fa-solid ${tab.icon}`}></i>
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && (
                  <span className="bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={handleOpenDirectWhatsApp}
              className="text-emerald-400 font-bold flex items-center gap-1.5 py-1"
            >
              <i className="fa-brands fa-whatsapp text-sm"></i>
              <span>WhatsApp de Soporte</span>
            </button>
            {isAdmin ? (
              <button onClick={logout} className="text-rose-400 font-bold text-xs">
                Cerrar Sesión Admin
              </button>
            ) : (
              <button onClick={() => { openAuthModal(); setMobileMenuOpen(false); }} className="text-slate-400 hover:text-white font-medium text-xs">
                Acceso Admin
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
