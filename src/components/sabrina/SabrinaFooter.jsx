import React from 'react';
import { Shield, Truck, Phone, MessageSquare, CheckCircle, ChevronRight } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { normalizeWaPhone } from '../../utils/whatsapp';
import logoImg from '../../assets/logo.png';
import logoCompleto from '../../assets/brand/logo_jf_completo.png';

export function SabrinaFooter() {
  const { ownerSettings } = useInventory();

  const handleOpenWhatsApp = () => {
    const phone = normalizeWaPhone(ownerSettings?.ownerPhone || '04126497478');
    const text = encodeURIComponent('¡Hola JF Auto Parts! Me comunico desde la plataforma web para consultar repuestos y pedidos.');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-xs mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Columna 1: Brand & Bio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img 
                src={logoCompleto} 
                alt="JF Auto Parts" 
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Distribución y venta directa de bobinas de encendido, inyectores, conectores y repuestos automotrices probados en banco desde Maracaibo con despachos a toda Venezuela.
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              &copy; {new Date().getFullYear()} JF Auto Parts. Todos los derechos reservados. Maracaibo, Venezuela.
            </p>
          </div>

          {/* Columna 2: Categorías Principales */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Repuestos & Categorías
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-red-600 transition cursor-pointer flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-red-500" />
                <span>Bobinas de Encendido Secas & Lápiz</span>
              </li>
              <li className="hover:text-red-600 transition cursor-pointer flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-red-500" />
                <span>Inyectores de Gasolina Multipunto</span>
              </li>
              <li className="hover:text-red-600 transition cursor-pointer flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-red-500" />
                <span>Conectores Eléctricos Reforzados</span>
              </li>
              <li className="hover:text-red-600 transition cursor-pointer flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-red-500" />
                <span>Sensores de Cigüeñal y Levas (CKP/CMP)</span>
              </li>
            </ul>
          </div>

          {/* Columna 3: Confianza & Despachos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Calidad & Entregas
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-emerald-700 font-medium">
                <Shield className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Repuestos Probados en Banco</span>
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <Truck className="w-4 h-4 text-red-600 shrink-0" />
                <span>Entrega Inmediata</span>
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Envíos por MRW, Zoom y Tealca</span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Contacto Directo */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Atención Técnica en Maracaibo
            </h4>
            <p className="text-xs text-slate-600">
              Línea directa para asesoría de compatibilidad OEM y confirmación de pagos:
            </p>
            <button
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold transition text-xs cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>+58 412-6497478 (WhatsApp)</span>
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
}
