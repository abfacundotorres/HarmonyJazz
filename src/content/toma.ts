/**
 * La toma completa del tema (paso «Grabado completo» de Mi repertorio): la melodía, uno o más coros de solo y la melodía de
 * nuevo, grabado de principio a fin sobre el acompañamiento. Funciones puras; el dibujo está en `ui/components/TomaCompleta.tsx`.
 */
export const COROS_TOMA = [3, 4, 5, 6];
export const COROS_TOMA_INICIAL = 3;

export type ParteToma = 'melodia' | 'solo';

/** Qué se toca en cada coro: melodía al principio y al final, solos en el medio. Con menos de 3 coros no hay solo. */
export function guionToma(coros: number): ParteToma[] {
  const n = Math.max(1, Math.round(coros));
  return Array.from({ length: n }, (_, i) => (i === 0 || i === n - 1 ? 'melodia' : 'solo'));
}

export const PARTE_TEXTO: Record<ParteToma, string> = { melodia: 'Tocá la melodía', solo: 'Improvisá' };

/** Lo que hay que hacer ahora: «Coro 2 de 3: Improvisá», o la cuenta previa. `coro` es el coro que suena (0 = el primero; −1 = cuenta). */
export function consignaToma(coros: number, coro: number): string {
  if (coro < 0) return 'Cuenta previa… preparate: empezás con la melodía.';
  const g = guionToma(coros);
  const i = Math.min(coro, g.length - 1);
  return `Coro ${i + 1} de ${g.length}: ${PARTE_TEXTO[g[i]]}`;
}

/** Cuánto dura la toma (segundos) con la cuenta previa de un compás: sirve para avisar «unos 40 segundos». */
export function duracionToma(coros: number, compases: number, tempo: number, pulsosPorCompas = 4): number {
  return Math.round(((coros + 1) * compases * pulsosPorCompas * 60) / Math.max(1, tempo));
}
