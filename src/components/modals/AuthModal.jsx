import React, { useState, useEffect } from 'react';
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

  // Limpieza estricta de memoria: cada vez que el modal se abre, se cierra o cambia la sesión
  useEffect(() => {
    setPass('');
    setShowPassword(false);
  }, [authModalOpen, isAdmin]);

  if (!authModalOpen) return null;

  const handleClose = () => {
    setPass('');
    setShowPassword(false);
    closeAuthModal();
  };

  const handleLogout = () => {
    setPass('');
    setShowPassword(false);
    logout();
    closeAuthModal();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    const passToVerify = pass;
    
    // Inmediatamente borramos el texto del input por seguridad
    setPass('');
    setShowPassword(false);

    try {
      await login(user, passToVerify);
    } finally {
      setIsVerifying(false);
      setPass('');
      setShowPassword(false);
    }
  };

  const isLocked = lockoutUntil && Date.now() < lockoutUntil;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Dialog Card con Paleta Oficial de la Web */}
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl relative text-slate-900 animate-scaleIn">
        
        {/* Botón Cerrar */}
        <button 
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          aria-label="Cerrar modal"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        {/* Brand Logo Oficial & Encabezado */}
        <div className="text-center mb-5">
          <div className="relative inline-block mb-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-2.5 mx-auto flex items-center justify-center shadow-xs">
              <img 
                src={logoImg} 
                alt="JF Auto Parts" 
                className="h-full w-full object-contain" 
              />
            </div>
            <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-lg ${isAdmin ? 'bg-emerald-600' : 'bg-red-600'} text-white flex items-center justify-center text-xs shadow-md border-2 border-white`}>
              <i className={`fa-solid ${isAdmin ? 'fa-unlock-keyhole' : 'fa-lock'}`}></i>
            </div>
          </div>
          <h3 className="text-base font-orbitron font-extrabold text-slate-900 tracking-wide">
            {isAdmin ? 'Sesión de Administrador Activa' : 'JF AUTO PARTS • Acceso Seguro'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin ? 'Tienes acceso ilimitado a modificación de stock y ventas.' : 'Ingresa tus credenciales autorizadas con verificación criptográfica.'}
          </p>
        </div>

        {/* Lock reason banner */}
        {typeof authLockReason === 'string' && authLockReason.trim() !== '' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
            <i className="fa-solid fa-shield-halved text-sm shrink-0 mt-0.5 text-red-600"></i>
            <span className="leading-relaxed">{authLockReason}</span>
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5 border border-emerald-200 font-medium">
              <i className="fa-solid fa-circle-check text-emerald-600 text-base shrink-0"></i>
              <span>Sesión activa como Dueño / Administrador</span>
            </div>
            <button 
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
            >
              Cerrar Sesión de Administrador
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Usuario Autorizado
              </label>
              <input 
                type="text" 
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Ingresa tu usuario" 
                autoComplete="off"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition"
                required
                disabled={isLocked || isVerifying}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Contraseña
                </label>
                {failedAttempts > 0 && !isLocked && (
                  <span className="text-[10px] text-amber-600 font-semibold">
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
                  autoComplete="new-password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition font-mono"
                  required
                  autoFocus
                  disabled={isLocked || isVerifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
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
                className={`w-full py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                  isLocked 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/25 active:scale-95'
                }`}
              >
                {isVerifying ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    <span>Verificando...</span>
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
              <i className="fa-solid fa-shield-halved text-emerald-600 text-xs"></i>
              <span>Protegido con SHA-256 & Anti Fuerza Bruta</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
