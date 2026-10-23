/**
 * Módulo de Criptografía y Seguridad para JF Auto Parts
 * Implementa hashing SHA-256 con salt criptográfico para proteger credenciales de administrador.
 */

// Sal criptográfico único para evitar ataques de tablas arcoíris (Rainbow Tables)
const SECURITY_SALT = 'JF_AUTOPARTS_V2_SALT_984712_SECURE';

/**
 * Genera el hash SHA-256 hexadecimal de una contraseña con sal
 * @param {string} password 
 * @returns {Promise<string>} hash hexadecimal de 64 caracteres
 */
export async function hashPassword(password) {
  const clean = String(password || '').trim();
  if (!clean) return '';

  const salted = `${clean}::${SECURITY_SALT}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(salted);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple para entornos sin crypto.subtle (muy raro en navegadores modernos)
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Verifica si una contraseña coincide con el hash esperado
 * @param {string} inputPassword 
 * @param {string} expectedHash 
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(inputPassword, expectedHash) {
  if (!inputPassword || !expectedHash) return false;
  const inputHash = await hashPassword(inputPassword);
  return inputHash.toLowerCase() === String(expectedHash).toLowerCase().trim();
}
