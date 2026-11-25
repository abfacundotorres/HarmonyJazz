import type { Chart } from '../theory/chart';
import { qdef } from '../theory/chords';
import { mod, pc } from '../theory/notes';

/**
 * Temas con armonía parecida. Cada progresión se reduce a una «huella» que no depende de la tonalidad: la secuencia de cambios de
 * acorde, cada uno como (cuántos semitonos sube la fundamental, qué tipo de acorde era y cuál es). Un ii–V–I en C y uno en F♯
 * tienen la misma huella. Dos huellas se comparan con la subsecuencia común más larga (misma armonía en el mismo orden) y con los
 * tramos de tres acordes que comparten (la misma «frase» armónica, aunque esté en otro lugar de la forma).
 */
const CLASE: Record<string, number> = { major: 0, minor: 1, halfdim: 2, dim: 3, dominant: 4 };

/**
 * Huella armónica de una progresión: una marca por cada cambio de acorde (los repetidos seguidos cuentan una vez), con cuántos
 * semitonos sube la fundamental y qué tipo de acorde era y cuál es. Cada marca se entiende sola, así que una frase armónica se
 * reconoce aunque esté en medio de un tema más largo. Una progresión de un solo acorde queda en una marca propia de su tipo.
 */
export function huella(chart: Chart): number[] {
  const acordes: { r: number; cl: number }[] = [];
  for (const { chord } of chart.chords) {
    const r = pc(chord.root);
    const cl = CLASE[qdef(chord).family] ?? 0;
    const u = acordes[acordes.length - 1];
    if (u && u.r === r && u.cl === cl) continue; // el mismo acorde dos veces seguidas no es un cambio
    acordes.push({ r, cl });
  }
  if (acordes.length === 1) return [-1 - acordes[0].cl];
  const out: number[] = [];
  for (let i = 1; i < acordes.length; i++) out.push(mod(acordes[i].r - acordes[i - 1].r, 12) * 25 + acordes[i - 1].cl * 5 + acordes[i].cl);
  return out;
}

/** Largo de la subsecuencia común más larga. */
function lcs(a: number[], b: number[]): number {
  let prev = new Uint16Array(b.length + 1);
  let cur = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

const trigramas = (h: number[]): Map<number, number> => {
  const m = new Map<number, number>();
  for (let i = 0; i + 2 < h.length; i++) {
    const k = (h[i] * 307 + h[i + 1]) * 307 + h[i + 2];
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};

/** Parecido entre dos huellas, de 0 a 1 (1 = misma armonía, en el mismo orden, aunque en otra tonalidad). */
export function parecido(a: number[], b: number[], ta = trigramas(a), tb = trigramas(b)): number {
  if (!a.length || !b.length) return 0;
  const orden = (2 * lcs(a, b)) / (a.length + b.length);
  const na = Math.max(0, a.length - 2);
  const nb = Math.max(0, b.length - 2);
  if (na === 0 || nb === 0) return orden;
  let comunes = 0;
  for (const [k, n] of ta) comunes += Math.min(n, tb.get(k) ?? 0);
  const frases = (2 * comunes) / (na + nb);
  return 0.6 * orden + 0.4 * frases;
}

export interface Candidato {
  /** Posición del tema en la colección. */
  idx: number;
  h: number[];
}

/** Parecido mínimo para mostrar un tema: por debajo de esto no hay armonía en común que valga la pena. */
export const PARECIDO_MINIMO = 0.2;

/** Los hasta `n` temas más parecidos a la huella de referencia, del más parecido al menos (con su parecido de 0 a 1), sin los que casi no se parecen. */
export function masParecidos(ref: number[], candidatos: Candidato[], n = 10, minimo = PARECIDO_MINIMO): { idx: number; puntaje: number }[] {
  const tr = trigramas(ref);
  return candidatos
    .map((c) => ({ idx: c.idx, puntaje: parecido(ref, c.h, tr) }))
    .filter((m) => m.puntaje >= minimo)
    .sort((a, b) => b.puntaje - a.puntaje || a.idx - b.idx)
    .slice(0, n);
}

/** Palabra para el parecido: «casi igual», «muy parecida»… */
export function etiqueta(p: number): string {
  if (p >= 0.9) return 'casi igual';
  if (p >= 0.7) return 'muy parecida';
  if (p >= 0.5) return 'parecida';
  return 'algo en común';
}
