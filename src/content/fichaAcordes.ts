import type { Chart } from '../theory/chart';
import { chordSymbol, type Chord } from '../theory/chords';

/** Un acorde distinto del tema y los compases (1-based, como se leen en la grilla) donde aparece. */
export interface FichaAcorde {
  chord: Chord;
  compases: number[];
}

/**
 * Acordes distintos de la progresión, en orden de aparición, con sus compases. `orden` (de las repeticiones y finales)
 * traduce el compás que suena al compás escrito.
 */
export function fichaAcordes(chart: Chart, orden?: readonly number[]): FichaAcorde[] {
  const porSimbolo = new Map<string, FichaAcorde>();
  for (const c of chart.chords) {
    const clave = chordSymbol(c.chord, true);
    const escrito = (orden ? orden[c.bar] : c.bar) + 1;
    const f = porSimbolo.get(clave) ?? { chord: c.chord, compases: [] };
    if (!f.compases.includes(escrito)) f.compases.push(escrito);
    porSimbolo.set(clave, f);
  }
  return [...porSimbolo.values()].map((f) => ({ ...f, compases: f.compases.sort((a, b) => a - b) }));
}

/** «compás 3» / «compases 1, 4 y 7». */
export function textoCompases(c: number[]): string {
  if (c.length === 1) return `compás ${c[0]}`;
  return `compases ${c.slice(0, -1).join(', ')} y ${c[c.length - 1]}`;
}
