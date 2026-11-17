import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { OwnerNotificationBanner } from './components/common/OwnerNotificationBanner';

import { CatalogView } from './components/catalog/CatalogView';
import { SalesView } from './components/sales/SalesView';
import { PerformanceView } from './components/analytics/PerformanceView';
import { DatabaseView } from './components/database/DatabaseView';
import { AdminConfigView } from './components/admin/AdminConfigView';

import { FloatingAIChat } from './components/simulator/FloatingAIChat';

import { CartDrawer } from './components/modals/CartDrawer';
import { AuthModal } from './components/modals/AuthModal';
import { ProductModal } from './components/modals/ProductModal';
import { BulkImportModal } from './components/modals/BulkImportModal';
import { SchemaCodeModal } from './components/modals/SchemaCodeModal';
import { ManualSaleModal } from './components/modals/ManualSaleModal';

import { PropuestaMark } from './views/propuestas/PropuestaMark';
import { PropuestaSabrina } from './views/propuestas/PropuestaSabrina';
import { MainAppSabrina } from './views/MainAppSabrina';

function MainApp({ viewMode, onToggleViewMode }) {
  const [activeTab, setActiveTab] = useState('catalog');
  
  // Modal states
  const [productModal, setProductModal] = useState({ open: false, product: null });
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [manualSaleModalOpen, setManualSaleModalOpen] = useState(false);

  const { requireAdminAuth } = useAuth();

  const handleOpenCreateProduct = () => {
    requireAdminAuth(
      () => setProductModal({ open: true, product: null }),
      'Insertar nuevas bobinas en la Base de Datos requiere sesión de Administrador.'
    );
  };

  const handleOpenEditProduct = (coil) => {
    requireAdminAuth(
      () => setProductModal({ open: true, product: coil }),
      'Editar bobinas en la Base de Datos requiere sesión de Administrador.'
    );
  };

  const handleOpenBulkModal = () => {
    requireAdminAuth(
      () => setBulkModalOpen(true),
      'La carga masiva por CSV/JSON requiere sesión de Administrador.'
    );
  };

  const handleOpenManualSale = () => {
    requireAdminAuth(
      () => setManualSaleModalOpen(true),
      'Registrar ventas manuales requiere autorización de Administrador.'
    );
  };

  const handleAskAIAboutCoil = (coil) => {
    if (!coil) return;
    window.dispatchEvent(new CustomEvent('ASK_AI_ABOUT_PRODUCT', {
      detail: {
        product: coil,
        query: `Hola, ¿tienen disponibilidad de ${coil.name}? (Código OEM: ${coil.oem || coil.id})`
      }
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-slate-100 font-sans selection:bg-red-600 selection:text-white">
      {/* Barra de Comparación de Diseño */}
      <div className="bg-[#1c1d22] border-b border-[#2d2f35] px-4 py-1.5 text-xs text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Modo Clásico Original de Producción</span>
        </span>
        <button
          onClick={onToggleViewMode}
          className="text-red-400 hover:text-red-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
        >
          <span>✨ Ver Diseño Sabrina Adaptado</span>
        </button>
      </div>

      {/* Main App Header (Faithful to Figma: slim, direct, no bulky ribbon above) */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Body View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-8 sm:pt-4 sm:pb-12">
        {activeTab === 'catalog' && (
          <CatalogView
            onNavigateTab={setActiveTab}
            onAskAIAboutCoil={handleAskAIAboutCoil}
            onEditCoil={handleOpenEditProduct}
          />
        )}

        {activeTab === 'sales' && (
          <SalesView
            onOpenManualSaleModal={handleOpenManualSale}
          />
        )}

        {activeTab === 'analytics' && (
          <PerformanceView
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseView
            onOpenCreateModal={handleOpenCreateProduct}
            onOpenEditModal={handleOpenEditProduct}
            onOpenBulkModal={handleOpenBulkModal}
            onOpenSchemaModal={() => setSchemaModalOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminConfigView />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Slide-overs */}
      <CartDrawer />
      <AuthModal />
      <ProductModal
        isOpen={productModal.open}
        onClose={() => setProductModal({ open: false, product: null })}
        initialProduct={productModal.product}
      />
      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
      />
      <SchemaCodeModal
        isOpen={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
      />
      <ManualSaleModal
        isOpen={manualSaleModalOpen}
        onClose={() => setManualSaleModalOpen(false)}
      />


      {/* Floating Transaction Notification Alert */}
      <OwnerNotificationBanner />

      {/* Floating AI Chat Bubble — bottom-right corner */}
      {activeTab === 'catalog' && (
        <FloatingAIChat onTriggerSaleModal={() => setManualSaleModalOpen(true)} />
      )}
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [viewMode, setViewMode] = useState('sabrina'); // 'sabrina' por defecto para ver la adaptación de Sabrina

  useEffect(() => {
    const handlePop = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  if (currentPath === '/propuesta-mark') {
    return (
      <PropuestaMark 
        onNavigateHome={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }} 
      />
    );
  }

  if (currentPath === '/propuesta-sabrina') {
    return (
      <PropuestaSabrina 
        onNavigateHome={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }} 
      />
    );
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <InventoryProvider>
          <CartProvider>
            <CurrencyProvider>
              {viewMode === 'sabrina' ? (
                <MainAppSabrina 
                  viewMode={viewMode}
                  onToggleViewMode={() => setViewMode(v => v === 'sabrina' ? 'classic' : 'sabrina')}
                />
              ) : (
                <MainApp 
                  viewMode={viewMode}
                  onToggleViewMode={() => setViewMode(v => v === 'sabrina' ? 'classic' : 'sabrina')}
                />
              )}
            </CurrencyProvider>
          </CartProvider>
        </InventoryProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
