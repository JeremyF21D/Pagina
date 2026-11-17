import React, { useState } from 'react';
import { Settings, DollarSign, PhoneCall, Shield, Save, CheckCircle, Database } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { useInventory } from '../../context/InventoryContext';
import { SUPABASE_CONFIG } from '../../config/supabaseConfig';

export function SabrinaAdminConfigView() {
  const { binanceRate, bcvRate, setCustomRate } = useCurrency();
  const { ownerSettings, updateOwnerSettings } = useInventory();

  const [rateInput, setRateInput] = useState(binanceRate || 1076.87);
  const [phoneInput, setPhoneInput] = useState(ownerSettings?.ownerPhone || '04126497478');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (setCustomRate) {
      setCustomRate(parseFloat(rateInput));
    }
    if (updateOwnerSettings) {
      updateOwnerSettings({
        ...ownerSettings,
        ownerPhone: phoneInput
      });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs text-red-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
          <Settings className="w-4 h-4 text-red-400" />
          Configuración del Negocio & Facturación
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
          Ajustes de Tienda
        </h2>
        <p className="text-xs text-slate-500">
          Control de tasa de cambio oficial, línea oficial de WhatsApp y parámetros de Supabase
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tasa BCV */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Tasa de Cambio en Vivo (Binance P2P)
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Esta tasa de Binance P2P se utiliza para calcular dinámicamente los precios en Bolívares en todo el catálogo y carrito. Puedes actualizarla manualmente o dejar que se sincronice en vivo desde la API:
          </p>
          <div className="flex items-center gap-3">
            <input 
              type="number"
              step="0.05"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold text-sm w-40 focus:outline-none focus:border-red-500 font-mono"
            />
            <span className="text-xs text-slate-400">Bs. por cada $1.00 USD</span>
          </div>
        </div>

        {/* WhatsApp & Despachos */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <PhoneCall className="w-5 h-5 text-red-400" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Línea Oficial de WhatsApp Maracaibo
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Número telefónico a donde se envían las confirmaciones de pedido del carrito y asesorías técnicas:
          </p>
          <input 
            type="text"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-red-500 font-mono"
            placeholder="04126497478"
          />
        </div>

        {/* Estado de Supabase */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Conexión de Base de Datos en Producción</span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              En Línea
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Endpoint Supabase REST:</span>
              <span className="font-mono text-slate-800 text-[11px] break-all">{SUPABASE_CONFIG.url}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Tabla Principal de Catálogo:</span>
              <span className="font-mono text-red-600 font-bold text-xs">{SUPABASE_CONFIG.table}</span>
            </div>
          </div>
        </div>

        {/* Guardar */}
        <div className="md:col-span-2 flex items-center justify-between pt-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle className="w-4 h-4" />
              <span>¡Parámetros actualizados correctamente!</span>
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-2 transition cursor-pointer shadow-md shadow-red-600/30"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  );
}
