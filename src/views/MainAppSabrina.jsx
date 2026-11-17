import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

// Componentes con Diseño Adaptado de Sabrina (CRO & Identidad Visual)
import { SabrinaHeader } from '../components/sabrina/SabrinaHeader';
import { SabrinaCatalogView } from '../components/sabrina/SabrinaCatalogView';
import { SabrinaPerformanceView } from '../components/sabrina/SabrinaPerformanceView';
import { SabrinaSalesView } from '../components/sabrina/SabrinaSalesView';
import { SabrinaInventoryView } from '../components/sabrina/SabrinaInventoryView';
import { SabrinaAdminConfigView } from '../components/sabrina/SabrinaAdminConfigView';
import { SabrinaProductDetailModal } from '../components/sabrina/SabrinaProductDetailModal';
import { SabrinaCartDrawer } from '../components/sabrina/SabrinaCartDrawer';
import { SabrinaFooter } from '../components/sabrina/SabrinaFooter';
import { SabrinaRationaleModal } from '../components/sabrina/SabrinaRationaleModal';

// Modales del Sistema Original (Conectados a Supabase / Backend de Producción)
import { ProductModal } from '../components/modals/ProductModal';
import { BulkImportModal } from '../components/modals/BulkImportModal';
import { SchemaCodeModal } from '../components/modals/SchemaCodeModal';
import { ManualSaleModal } from '../components/modals/ManualSaleModal';
import { AuthModal } from '../components/modals/AuthModal';
import { OwnerNotificationBanner } from '../components/common/OwnerNotificationBanner';
import { FloatingAIChat } from '../components/simulator/FloatingAIChat';

export function MainAppSabrina({ viewMode, onToggleViewMode }) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de modales
  const [productModal, setProductModal] = useState({ open: false, product: null });
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [manualSaleModalOpen, setManualSaleModalOpen] = useState(false);
  const [rationaleOpen, setRationaleOpen] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, product: null });

  const { isAdmin, requireAdminAuth } = useAuth();
  const { bcvRate, binanceRate } = useCurrency();
  const { ownerSettings } = useInventory();
  const { addToCart } = useCart();

  // Protección: Si el usuario no es admin y está en una pestaña administrativa, regresarlo al catálogo
  React.useEffect(() => {
    if (!isAdmin && activeTab !== 'catalog') {
      setActiveTab('catalog');
    }
  }, [isAdmin, activeTab]);

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
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-red-600 selection:text-white relative">

      {/* Header Superior Adaptado */}
      <SabrinaHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewMode={viewMode}
        onToggleViewMode={onToggleViewMode}
        onOpenRationale={() => setRationaleOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Contenido Principal según la pestaña activa (Diseño Sabrina 100% + Backend de Producción) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-12">
        {activeTab === 'catalog' && (
          <SabrinaCatalogView
            onNavigateTab={setActiveTab}
            onAskAIAboutCoil={handleAskAIAboutCoil}
            onEditCoil={handleOpenEditProduct}
            onOpenProductDetail={(prod) => setDetailModal({ open: true, product: prod })}
            externalSearchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        )}

        {activeTab === 'sales' && (
          <SabrinaSalesView onOpenManualSaleModal={handleOpenManualSale} />
        )}

        {activeTab === 'analytics' && (
          <SabrinaPerformanceView onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'database' && (
          <SabrinaInventoryView
            onOpenCreateModal={handleOpenCreateProduct}
            onOpenEditModal={handleOpenEditProduct}
            onOpenBulkModal={handleOpenBulkModal}
            onOpenSchemaModal={() => setSchemaModalOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <SabrinaAdminConfigView />
        )}
      </main>

      {/* Footer de Sabrina */}
      <SabrinaFooter />

      {/* Modales y Drawers */}
      <SabrinaCartDrawer />
      <AuthModal />
      
      <SabrinaProductDetailModal
        isOpen={detailModal.open}
        product={detailModal.product}
        onClose={() => setDetailModal({ open: false, product: null })}
        onAddToCart={addToCart}
        binanceRate={binanceRate}
        bcvRate={bcvRate}
        ownerPhone={ownerSettings?.ownerPhone}
      />

      <SabrinaRationaleModal
        isOpen={rationaleOpen}
        onClose={() => setRationaleOpen(false)}
      />

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

      {/* Notificación flotante y Asistente IA */}
      <OwnerNotificationBanner />
      {activeTab === 'catalog' && (
        <FloatingAIChat onTriggerSaleModal={() => setManualSaleModalOpen(true)} />
      )}

    </div>
  );
}
