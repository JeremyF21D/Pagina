import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { hashPassword, verifyPassword } from '../utils/security';

const AuthContext = createContext(null);

const STORAGE_KEY_ADMIN_AUTH = 'AUTOIGNITION_ADMIN_SESSION_V2';
const STORAGE_KEY_DEVICE_CLIENT_ID = 'AUTOIGNITION_PRIVATE_CLIENT_ID_V2';
const STORAGE_KEY_CUSTOM_HASH = 'JF_ADMIN_SECURE_HASH_V3';
const STORAGE_KEY_CUSTOM_USER = 'JF_ADMIN_SECURE_USER_V3';

// Hashes criptográficos predeterminados (SHA-256 con Salt secreta)
// NUNCA se almacena la contraseña en texto plano en el código.
export const DEFAULT_ADMIN_PASSWORD_HASH = '67eea4f321f8874478e7b068af85c0d67346362124f2033ad838b6f96ca0ff1d';
export const DEFAULT_AUTHORIZED_USERS = ['admin', 'dueno', 'jfautoparts', 'jeremy', 'j05032001'];

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [deviceId, setDeviceId] = useState('CLI-LOCAL');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authLockReason, setAuthLockReason] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  // Control de fuerza bruta (Rate Limiting)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  useEffect(() => {
    // 1. Device ID
    let savedId = localStorage.getItem(STORAGE_KEY_DEVICE_CLIENT_ID);
    if (!savedId) {
      savedId = 'CLI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem(STORAGE_KEY_DEVICE_CLIENT_ID, savedId);
    }
    setDeviceId(savedId);

    // 2. Admin Auth
    const isAuthed = localStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true';
    setIsAdmin(isAuthed);
  }, []);

  const login = async (user, pass) => {
    const now = Date.now();
    if (lockoutUntil && now < lockoutUntil) {
      const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
      showToast(`⏳ Acceso bloqueado por seguridad. Espera ${remainingSec} segundos.`, 'error');
      return false;
    }

    const cleanUser = String(user || '').trim().toLowerCase();
    const cleanPass = String(pass || '').trim();

    if (!cleanUser || !cleanPass) {
      showToast('⚠️ Ingresa usuario y contraseña', 'error');
      return false;
    }

    // Obtener usuario autorizado
    const customUser = localStorage.getItem(STORAGE_KEY_CUSTOM_USER);
    const validUsers = customUser ? [customUser.toLowerCase(), ...DEFAULT_AUTHORIZED_USERS] : DEFAULT_AUTHORIZED_USERS;
    const isUserValid = validUsers.includes(cleanUser);

    // Obtener hash de contraseña autorizada
    const customHash = localStorage.getItem(STORAGE_KEY_CUSTOM_HASH);
    const targetHash = customHash || DEFAULT_ADMIN_PASSWORD_HASH;

    // Verificación criptográfica con SHA-256 + Salt
    const isPassValid = await verifyPassword(cleanPass, targetHash);

    if (isUserValid && isPassValid) {
      setIsAdmin(true);
      setFailedAttempts(0);
      setLockoutUntil(null);

      try {
        localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
      } catch (e) {}

      showToast('🔓 Sesión de Administrador iniciada: Módulos protegidos desbloqueados');
      setAuthModalOpen(false);

      if (typeof pendingAction === 'function') {
        const action = pendingAction;
        setPendingAction(null);
        action();
      }
      return true;
    } else {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      if (nextFailures >= 5) {
        const lockTime = Date.now() + 30000; // 30 segundos de penalización
        setLockoutUntil(lockTime);
        showToast('🛑 5 intentos fallidos. Bloqueado temporalmente por 30 segundos por seguridad.', 'error');
      } else {
        const remaining = 5 - nextFailures;
        showToast(`❌ Credenciales incorrectas. Te quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'}.`, 'error');
      }
      return false;
    }
  };

  const logout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    } catch (e) {}
    showToast('🔒 Sesión de Administrador cerrada. Módulos protegidos.');
  };

  const updateAdminCredentials = async (newUser, newPassword) => {
    if (!newPassword || newPassword.length < 4) {
      showToast('⚠️ La contraseña debe tener al menos 4 caracteres', 'error');
      return false;
    }

    const newHash = await hashPassword(newPassword);
    const cleanUser = String(newUser || 'admin').trim().toLowerCase();

    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_HASH, newHash);
      localStorage.setItem(STORAGE_KEY_CUSTOM_USER, cleanUser);
      showToast('🛡️ Nueva contraseña codificada y guardada con cifrado SHA-256.');
      return true;
    } catch (e) {
      showToast('❌ Error al guardar credenciales en el navegador', 'error');
      return false;
    }
  };

  const requireAdminAuth = (actionCallback, reason = 'Esta acción modifica datos críticos del sistema y requiere sesión de Administrador.') => {
    if (isAdmin) {
      actionCallback();
      return true;
    }
    setPendingAction(() => actionCallback);
    setAuthLockReason(reason);
    setAuthModalOpen(true);
    return false;
  };

  const openAuthModal = (reason = '') => {
    setAuthLockReason(reason);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setPendingAction(null);
    setAuthLockReason('');
  };

  return (
    <AuthContext.Provider value={{
      isAdmin,
      deviceId,
      login,
      logout,
      requireAdminAuth,
      updateAdminCredentials,
      failedAttempts,
      lockoutUntil,
      authModalOpen,
      authLockReason,
      openAuthModal,
      closeAuthModal
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
