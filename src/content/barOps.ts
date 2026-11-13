import { MAX_BARS } from '../theory/chart';
import type { DocBar } from './chartDoc';

const clone = (b: DocBar): DocBar => JSON.parse(JSON.stringify(b)) as DocBar;
const strip = (b: DocBar): DocBar => {
  const c = clone(b);
  delete c.section;
  delete c.repeatStart;
  delete c.repeatEnd;
  delete c.ending;
  return c;
};

/** Rango normalizado e inclusivo, acotado a la grilla. */
export function range(bars: DocBar[], a: number, b: number): [number, number] {
  const lo = Math.max(0, Math.min(a, b));
  const hi = Math.min(bars.length - 1, Math.max(a, b));
  return [lo, hi];
}

/** Copia de los compases [lo, hi]. Por defecto sin secciones, repeticiones ni finales (para no duplicar la estructura). */
export function copyRange(bars: DocBar[], lo: number, hi: number, keepMarks = false): DocBar[] {
  return bars.slice(lo, hi + 1).map((b) => (keepMarks ? clone(b) : strip(b)));
}

/** Inserta `clip` antes de la posición `at`. Devuelve la grilla nueva y cuántos compases entraron (el tope es MAX_BARS). */
export function pasteBars(bars: DocBar[], at: number, clip: DocBar[]): { bars: DocBar[]; added: number } {
  const room = Math.max(0, MAX_BARS - bars.length);
  const use = clip.slice(0, room).map(clone);
  const i = Math.max(0, Math.min(at, bars.length));
  return { bars: [...bars.slice(0, i), ...use, ...bars.slice(i)], added: use.length };
}

/** Quita los compases [lo, hi]; si no queda ninguno, deja uno vacío. */
export function removeRange(bars: DocBar[], lo: number, hi: number): DocBar[] {
  const rest = bars.filter((_, k) => k < lo || k > hi);
  return rest.length ? rest : [{ chords: [''] }];
}

/** Repite el rango `times` veces justo después de sí mismo (sin marcas de estructura). */
export function repeatRange(bars: DocBar[], lo: number, hi: number, times = 1): { bars: DocBar[]; added: number } {
  const clip = copyRange(bars, lo, hi);
  let out = bars;
  let added = 0;
  for (let t = 0; t < times; t++) {
    const r = pasteBars(out, hi + 1 + added, clip);
    out = r.bars;
    added += r.added;
  }
  return { bars: out, added };
}
