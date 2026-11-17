import React from 'react';
import { X, Sparkles, Shield, Palette, Layout, Smartphone } from 'lucide-react';

export function SabrinaRationaleModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleIn text-slate-900" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-red-400">
            <Sparkles className="w-5 h-5 text-red-400" />
            <h3 className="font-black text-lg text-slate-900 tracking-tight">
              Justificación de Diseño • Sabrina CRO & Red Tone
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-600">
          
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Palette className="w-4 h-4 text-red-400" />
              <span>1. Armonía Cromática (#2C2F38 + #EF4444 + #10B981)</span>
            </div>
            <p>
              Se sustituyó el negro absoluto (#000000) por una base <strong>Gris Neutro (#2C2F38)</strong> con tarjetas en <strong>#3B3F4A</strong> y acentos en <strong>#474C58</strong>. Esto reduce el deslumbramiento y la fatiga visual en talleres mecánicos y pantallas móviles con brillo alto. El <strong>Rojo Profesional (#EF4444)</strong> aporta energía automotriz sin saturar, mientras que el <strong>Verde Esmeralda (#10B981)</strong> se reservó estratégicamente para los botones de compra y WhatsApp (gatillo psicológico de acción y confianza comercial).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Layout className="w-4 h-4 text-emerald-400" />
              <span>2. Asistente de Compatibilidad en 3 Pasos (Cero Fricción)</span>
            </div>
            <p>
              El comprador de repuestos suele estar preocupado de que la pieza no le sirva a su auto. El selector de 3 pasos (Marca → Modelo → Búsqueda) filtra al instante sin recargar la página, mostrando en cada tarjeta el código OEM, compatibilidad exacta de motor y los días de garantía.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>3. Integración 100% con el Backend de Producción</span>
            </div>
            <p>
              A diferencia de una maqueta estática, esta adaptación conecta directamente con la base de datos Supabase (<code className="text-red-300">bobinas_inventario</code>), sincroniza stock en tiempo real, registra órdenes en <code className="text-red-300">ventas_ordenes</code> y calcula la conversión en Bolívares usando la tasa oficial BCV.
            </p>
          </div>

        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs cursor-pointer shadow-md"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
