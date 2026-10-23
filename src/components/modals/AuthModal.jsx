import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/logo.png';

export function AuthModal() {
  const { 
    authModalOpen, 
    closeAuthModal, 
    login, 
    authLockReason, 
    isAdmin, 
    logout,
    failedAttempts,
    lockoutUntil 
  } = useAuth();
  
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      await login(user, pass);
    } finally {
      setIsVerifying(false);
    }
  };

  const isLocked = lockoutUntil && Date.now() < lockoutUntil;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <button 
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Brand Logo & Title */}
        <div className="text-center mb-5">
          <div className="relative inline-block mb-3">
            <img 
              src={logoImg} 
              alt="JF Auto Parts Logo" 
              className="h-16 w-16 rounded-2xl object-cover mx-auto border-2 border-slate-700 shadow-xl shadow-black/50" 
            />
            <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-lg ${isAdmin ? 'bg-emerald-500' : 'bg-brand-500'} text-white flex items-center justify-center text-xs shadow-md border-2 border-slate-900`}>
              <i className={`fa-solid ${isAdmin ? 'fa-unlock-keyhole' : 'fa-lock'}`}></i>
            </div>
          </div>
          <h3 className="text-base font-bold text-white">
            {isAdmin ? 'Sesión de Administrador Activa' : 'JF AUTO PARTS • Acceso Seguro'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Tienes acceso ilimitado a modificación de stock y ventas.' : 'Ingresa tus credenciales autorizadas con verificación criptográfica.'}
          </p>
        </div>

        {/* Lock reason banner */}
        {authLockReason && (
          <div className="mb-4 p-3 bg-brand-500/15 border border-brand-500/30 rounded-xl text-brand-300 text-xs flex items-start gap-2">
            <i className="fa-solid fa-shield-halved text-sm shrink-0 mt-0.5"></i>
            <span>{authLockReason}</span>
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-800 rounded-xl text-xs text-emerald-400 flex items-center gap-2 border border-emerald-500/30">
              <i className="fa-solid fa-circle-check"></i>
              <span>Sesión activa como Dueño / Administrador</span>
            </div>
            <button 
              onClick={() => { logout(); closeAuthModal(); }}
              className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cerrar Sesión de Administrador
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Usuario Autorizado
              </label>
              <input 
                type="text" 
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Ingresa tu usuario" 
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                required
                disabled={isLocked || isVerifying}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-400">
                  Contraseña
                </label>
                {failedAttempts > 0 && !isLocked && (
                  <span className="text-[10px] text-amber-400 font-medium">
                    {5 - failedAttempts} {5 - failedAttempts === 1 ? 'intento restante' : 'intentos restantes'}
                  </span>
                )}
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-3 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                  required
                  autoFocus
                  disabled={isLocked || isVerifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  tabIndex="-1"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isLocked || isVerifying}
                className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  isLocked 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                    : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25 active:scale-95'
                }`}
              >
                {isVerifying ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    <span>Verificando Hash SHA-256...</span>
                  </>
                ) : isLocked ? (
                  <>
                    <i className="fa-solid fa-lock"></i>
                    <span>Bloqueado temporalmente</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-key"></i>
                    <span>Iniciar Sesión Segura</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-1">
              <i className="fa-solid fa-shield-halved text-emerald-400 text-xs"></i>
              <span>Protegido con SHA-256 & Anti Fuerza Bruta</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
