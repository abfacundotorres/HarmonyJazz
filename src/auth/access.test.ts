import { describe, expect, it } from 'vitest';
import { ACCESS_HASH, checkPassword, deriveAccessHash, isUnlocked } from './access';

describe('contraseña de acceso', () => {
  it('la derivación del navegador coincide con la del script', async () => {
    // valor impreso por `node scripts/access-hash.mjs "trompeta en Si♭"`
    expect(await deriveAccessHash('trompeta en Si♭')).toBe('1bebc03c4549ddaf9d014f2afcc97e5e9ccde1d77b5a4c982edb7fbd4c888607');
  });

  it('acepta sólo la contraseña correcta', async () => {
    const h = await deriveAccessHash('secreta');
    expect(await checkPassword('secreta', h)).toBe(true);
    expect(await checkPassword('Secreta', h)).toBe(false);
    expect(await checkPassword('', h)).toBe(false);
  });

  it('hay una contraseña configurada (la clave no está en el repositorio, sólo su derivación)', () => {
    expect(ACCESS_HASH).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sin almacenamiento disponible sigue pidiendo la contraseña (no lanza)', () => {
    expect(isUnlocked(ACCESS_HASH)).toBe(false);
  });
});
