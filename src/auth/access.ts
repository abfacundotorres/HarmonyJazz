/**
 * Contraseña de acceso. GitHub Pages sólo sirve archivos estáticos, así que esto es una traba en el
 * navegador, no seguridad real: el código de la app es público y quien lo lea puede saltearla. Sirve
 * para que alguien que encuentre el enlace no use la app. La contraseña no está en el código: sólo su
 * derivación PBKDF2 (lenta a propósito, para que adivinarla por fuerza bruta cueste).
 *
 * Para cambiarla: `node scripts/access-hash.mjs "nueva contraseña"` y pegar el resultado en ACCESS_HASH.
 * Con ACCESS_HASH vacío la app no pide contraseña.
 */
export const ACCESS_HASH = '';
export const ACCESS_SALT = 'harmonyjazz:acceso:v1';
export const ACCESS_ITERATIONS = 200_000;
const STORE_KEY = 'hj:acceso';

export async function deriveAccessHash(password: string, salt = ACCESS_SALT, iterations = ACCESS_ITERATIONS): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function checkPassword(password: string, expected = ACCESS_HASH): Promise<boolean> {
  return (await deriveAccessHash(password)) === expected;
}

/** ¿Este dispositivo ya ingresó la contraseña vigente? (si se cambia la contraseña, hay que volver a ingresarla) */
export function isUnlocked(expected = ACCESS_HASH): boolean {
  if (!expected) return true;
  try {
    return localStorage.getItem(STORE_KEY) === expected;
  } catch {
    return false;
  }
}

export function rememberUnlock(expected = ACCESS_HASH) {
  try {
    localStorage.setItem(STORE_KEY, expected);
  } catch {
    // sin almacenamiento (modo privado): se vuelve a pedir la próxima vez
  }
}
