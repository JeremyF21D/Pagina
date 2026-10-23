import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { OFFICIAL_WA_RAW } from '../../utils/whatsapp';

export function AdminConfigView() {
  const { ownerSettings, updateOwnerSettings } = useInventory();
  const { updateAdminCredentials } = useAuth();

  const [form, setForm] = useState({
    ownerPhone: ownerSettings.ownerPhone || OFFICIAL_WA_RAW,
    ownerName: ownerSettings.ownerName || 'Administrador Principal',
    autoDeductStock: ownerSettings.autoDeductStock ?? true,
    soundAlert: ownerSettings.soundAlert ?? true,
    requireApproval: ownerSettings.requireApproval ?? false,
    systemPrompt: ownerSettings.systemPrompt || ''
  });

  // Estado para cambio seguro de contraseña
  const [securityForm, setSecurityForm] = useState({
    newUsername: 'admin',
    newPassword: '',
    confirmPassword: ''
  });
  const [securityMsg, setSecurityMsg] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateOwnerSettings(form);
  };

  const handleResetPrompt = () => {
    setForm(prev => ({
      ...prev,
      systemPrompt: `Eres el Asesor y Agente Oficial de IA de "JF Auto Parts" para WhatsApp (0412-6497478).
Tu misión es asistir a mecánicos y dueños de vehículos a encontrar la bobina de encendido exacta para su auto consultando la base de datos activa en tiempo real.

Directrices de conversación:
1. Responde de forma cálida, experta en mecánica automotriz, concisa y profesional.
2. Verifica siempre la disponibilidad y columna 'stock' del registro. Si stock > 0, confirma stock y precio. Si stock === 0, informa que está temporalmente agotada y ofrece encargarla bajo pedido.
3. Cuando el cliente confirme una compra o envíe su referencia de pago, descuenta el stock automáticamente y notifica al dueño al 0412-6497478.`
    }));
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    setSecurityMsg(null);

    if (!securityForm.newPassword) {
      setSecurityMsg({ type: 'error', text: 'Ingresa una nueva contraseña' });
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setSecurityMsg({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    if (securityForm.newPassword.length < 5) {
      setSecurityMsg({ type: 'error', text: 'La contraseña debe tener al menos 5 caracteres' });
      return;
    }

    const success = await updateAdminCredentials(securityForm.newUsername, securityForm.newPassword);
    if (success) {
      setSecurityMsg({ type: 'success', text: '¡Contraseña actualizada exitosamente con cifrado SHA-256!' });
      setSecurityForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          Configuración del Agente IA & Webhook WhatsApp Cloud API
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Ajusta las políticas transaccionales, números telefónicos para alertas de ventas y directrices del modelo de IA.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Telephone & Alert Settings Card */}
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <i className="fa-brands fa-whatsapp text-emerald-400 text-lg"></i>
            <h3 className="text-sm font-bold text-white">
              Canal Oficial de WhatsApp & Notificaciones al Dueño
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp Oficial del Dueño (Para Confirmaciones)
              </label>
              <div className="relative">
                <i className="fa-solid fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input 
                  type="text" 
                  value={form.ownerPhone}
                  onChange={(e) => setForm(prev => ({ ...prev, ownerPhone: e.target.value }))}
                  placeholder="04126497478" 
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                A este número se enviarán las alertas automáticas de cada venta concretada.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre del Administrador / Titular
              </label>
              <div className="relative">
                <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input 
                  type="text" 
                  value={form.ownerName}
                  onChange={(e) => setForm(prev => ({ ...prev, ownerName: e.target.value }))}
                  placeholder="Administrador Principal" 
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <label className="flex items-center justify-between p-3 bg-slate-850 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="text-xs font-bold text-white block">Descuento Automático de Stock en DB</span>
                <span className="text-[11px] text-slate-400">Resta unidades inmediatamente en la base de datos al confirmar compra en WhatsApp.</span>
              </div>
              <input 
                type="checkbox" 
                checked={form.autoDeductStock}
                onChange={(e) => setForm(prev => ({ ...prev, autoDeductStock: e.target.checked }))}
                className="h-4 w-4 rounded text-brand-500 focus:ring-brand-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-850 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="text-xs font-bold text-white block">Efectos Sonoros de Caja Registradora</span>
                <span className="text-[11px] text-slate-400">Emite un sonido de timbre al procesar cada venta en el navegador.</span>
              </div>
              <input 
                type="checkbox" 
                checked={form.soundAlert}
                onChange={(e) => setForm(prev => ({ ...prev, soundAlert: e.target.checked }))}
                className="h-4 w-4 rounded text-brand-500 focus:ring-brand-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-850 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-800 transition">
              <div>
                <span className="text-xs font-bold text-white block">Aprobación Manual de Ventas</span>
                <span className="text-[11px] text-slate-400">Si está activo, las ventas quedan en estado Pendiente hasta autorización manual del dueño.</span>
              </div>
              <input 
                type="checkbox" 
                checked={form.requireApproval}
                onChange={(e) => setForm(prev => ({ ...prev, requireApproval: e.target.checked }))}
                className="h-4 w-4 rounded text-brand-500 focus:ring-brand-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* System Prompt Editor */}
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-microchip text-brand-400 text-lg"></i>
              <h3 className="text-sm font-bold text-white">
                Prompt de Sistema del Agente IA (System Instructions)
              </h3>
            </div>
            <button 
              type="button"
              onClick={handleResetPrompt}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Restaurar por defecto
            </button>
          </div>

          <div>
            <textarea 
              rows={8}
              value={form.systemPrompt}
              onChange={(e) => setForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-brand-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {form.systemPrompt.length} caracteres configurados para el modelo de lenguaje.
            </p>
          </div>
        </div>

        {/* Meta Cloud API Webhook Reference */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs">
          <div className="font-bold text-slate-300 flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-sky-400"></i>
            <span>Datos para configurar el Webhook en Meta Developers (WhatsApp Cloud API):</span>
          </div>
          <p className="text-slate-400">
            <strong>Callback URL:</strong> <code className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400">https://tu-dominio.com/v1/webhook/whatsapp</code>
          </p>
          <p className="text-slate-400">
            <strong>Verify Token:</strong> <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-400">BOBINAS_AI_SECURE_TOKEN_2026</code>
          </p>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button 
            type="submit"
            className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition cursor-pointer"
          >
            Guardar Configuración
          </button>
        </div>
      </form>

      {/* Tarjeta de Seguridad y Cambio de Contraseña de Administrador (Cifrado SHA-256) */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-emerald-400 text-lg"></i>
            <div>
              <h3 className="text-sm font-bold text-white">
                Seguridad de Acceso • Contraseña del Dueño / Administrador
              </h3>
              <p className="text-[11px] text-slate-400">
                La contraseña se almacena codificada con hash criptográfico SHA-256 y protección con sal.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase">
            SHA-256 Activo
          </span>
        </div>

        {securityMsg && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            securityMsg.type === 'success' 
              ? 'bg-emerald-900/30 border border-emerald-500/50 text-emerald-300' 
              : 'bg-rose-900/30 border border-rose-500/50 text-rose-300'
          }`}>
            <i className={`fa-solid ${securityMsg.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-rose-400'}`}></i>
            <span>{securityMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdateSecurity} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Usuario Administrador
              </label>
              <input 
                type="text" 
                value={securityForm.newUsername}
                onChange={(e) => setSecurityForm(prev => ({ ...prev, newUsername: e.target.value }))}
                placeholder="admin"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nueva Contraseña
              </label>
              <input 
                type="password" 
                value={securityForm.newPassword}
                onChange={(e) => setSecurityForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Mínimo 5 caracteres"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirmar Contraseña
              </label>
              <input 
                type="password" 
                value={securityForm.confirmPassword}
                onChange={(e) => setSecurityForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Repite la contraseña"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <i className="fa-solid fa-lock text-slate-400"></i>
              Nunca compartas tu clave de acceso. Al guardarla, quedará encriptada.
            </span>
            <button 
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-key"></i> Actualizar Clave Segura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
