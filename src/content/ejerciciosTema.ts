/**
 * Ejercicios generados sobre los acordes de un tema de Mi repertorio (propio o la forma del mes): los mismos generadores
 * de Lecciones, pero con el cifrado del standard que se está aprendiendo. Ayudan a los pasos «Guide tones» e «Improvisar con
 * una idea» de la escalera. Los generadores trabajan en 4/4; los temas en 3/4 o 6/8 no los ofrecen. Funciones puras.
 */
import type { Chart } from '../theory/chart';

export interface EjercicioTema {
  /** Identificador corto (letras y números): forma parte del id de `mastery`. */
  id: string;
  /** Generador de `exercises/generators.ts`. */
  generator: string;
  titulo: string;
}

export const EJERCICIOS_TEMA: EjercicioTema[] = [
  { id: 'guide', generator: 'guide', titulo: 'Guide tones del tema' },
  { id: 'guide2', generator: 'guide2', titulo: 'Guide tones en negras' },
  { id: 'arp', generator: 'arp', titulo: 'Arpegios acorde por acorde' },
  { id: 'arp3', generator: 'arp3', titulo: 'Arpegios desde la 3ª' },
  { id: 'enclosure', generator: 'enclosure', titulo: 'Aproximaciones al acorde que sigue' },
  { id: 'digital', generator: 'digital', titulo: 'Patrón 1-2-3-5 en cada acorde' },
];

export const ejercicioTemaById = (id: string) => EJERCICIOS_TEMA.find((e) => e.id === id);
/** Id de `mastery` de un ejercicio de un tema ("tema:<tema>:<ejercicio>"; el tema puede llevar ":"). */
export const idEjercicioTema = (temaId: string, ejId: string) => `tema:${temaId}:${ejId}`;

export function parseIdEjercicioTema(id: string): { tema: string; ex: string } | null {
  const m = /^tema:(.+):([a-z0-9]+)$/.exec(id);
  return m ? { tema: m[1], ex: m[2] } : null;
}

/** Los generadores son de 4/4: un tema en 3/4 o 6/8 no los ofrece. */
export const admiteEjercicios = (chart: Pick<Chart, 'meter'>) => !chart.meter;
