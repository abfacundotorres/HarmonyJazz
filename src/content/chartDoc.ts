import { parseChord } from '../theory/chords';
import { MAX_BARS, parseChart } from '../theory/chart';
import { normalizeChartText } from './library';

/**
 * Modelo del editor de grilla (al estilo iReal Pro): compases con 1–4 acordes, rótulos de sección,
 * repeticiones y primer/segundo final. El play-along toca el cifrado "desplegado" (sin repeticiones
 * escritas), que sale de `compileDoc`; el documento se guarda aparte para poder seguir editándolo.
 */
export interface DocBar {
  /** 1–4 acordes; "%" repite el compás anterior. */
  chords: string[];
  section?: string;
  repeatStart?: boolean;
  repeatEnd?: boolean;
  ending?: 1 | 2;
}

export interface ChartDoc {
  bars: DocBar[];
}

export const SECTIONS = ['Intro', 'A', 'B', 'C', 'D', 'Coda'] as const;
export const MAX_CHORD_CHARS = 24;

export const emptyBar = (): DocBar => ({ chords: [''] });

/** Documento plano (sin repeticiones) a partir de un cifrado de texto. */
export function docFromChart(text: string): ChartDoc {
  const bars = normalizeChartText(text)
    .split('|')
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b): DocBar => ({ chords: b.split(/\s+/) }));
  return { bars: bars.length ? bars : [emptyBar()] };
}

/** Valida la forma de un documento de origen desconocido. Devuelve el documento limpio o un mensaje. */
export function sanitizeDoc(raw: unknown): ChartDoc | string {
  const bars = (raw as { bars?: unknown } | null)?.bars;
  if (!Array.isArray(bars) || bars.length === 0) return 'El documento está vacío';
  if (bars.length > MAX_BARS) return `Demasiados compases (máximo ${MAX_BARS})`;
  const out: DocBar[] = [];
  for (const b of bars) {
    const r = b as Partial<DocBar> | null;
    if (!r || !Array.isArray(r.chords) || r.chords.length < 1 || r.chords.length > 4) return 'Compás inválido';
    const chords = r.chords.map((c) => (typeof c === 'string' ? c.trim().slice(0, MAX_CHORD_CHARS) : ''));
    const bar: DocBar = { chords };
    if (typeof r.section === 'string' && (SECTIONS as readonly string[]).includes(r.section)) bar.section = r.section;
    if (r.repeatStart === true) bar.repeatStart = true;
    if (r.repeatEnd === true) bar.repeatEnd = true;
    if (r.ending === 1 || r.ending === 2) bar.ending = r.ending;
    out.push(bar);
  }
  return { bars: out };
}

/** Reemplaza los "%" por los acordes del compás anterior (en el orden escrito) y valida cada símbolo. */
function resolve(bars: DocBar[]): DocBar[] {
  const out: DocBar[] = [];
  bars.forEach((b, i) => {
    let chords = b.chords.map((c) => c.trim());
    if (chords.length === 1 && chords[0] === '%') {
      if (i === 0) throw new Error('Compás 1: no puede repetir un compás anterior (%)');
      chords = out[i - 1].chords;
    }
    if (chords.length < 1 || chords.length > 4) throw new Error(`Compás ${i + 1}: debe tener entre 1 y 4 acordes`);
    chords.forEach((c) => {
      if (!c) throw new Error(`Compás ${i + 1}: hay un acorde vacío`);
      try {
        parseChord(c);
      } catch (e) {
        throw new Error(`Compás ${i + 1}: ${(e as Error).message}`);
      }
    });
    out.push({ ...b, chords });
  });
  return out;
}

/**
 * Despliega repeticiones y finales. Reglas:
 *  - `repeatStart` marca el inicio; sin él, la repetición vuelve al comienzo de la pieza o al compás
 *    siguiente a la última repetición/final 2.
 *  - `repeatEnd` marca el último compás de lo que se repite. Un grupo de compases con final 1 se cierra
 *    solo con repetición; en la segunda vuelta se lo salta y sigue en el final 2.
 */
export function unroll(bars: DocBar[]): DocBar[] {
  const n = bars.length;
  const out: DocBar[] = [];
  const done = new Set<number>();
  let i = 0;
  let s = 0;
  let pass = 1;
  for (let guard = 0; i < n; guard++) {
    if (guard > 10 * MAX_BARS) throw new Error('Repeticiones inválidas');
    const b = bars[i];
    if (b.repeatStart && pass === 1) s = i;
    if (b.ending === 1 && pass === 2) {
      while (i < n && bars[i].ending === 1) i++;
      pass = 1;
      continue;
    }
    out.push(b);
    const lastOfEnding1 = b.ending === 1 && bars[i + 1]?.ending !== 1;
    if ((b.repeatEnd || lastOfEnding1) && !done.has(i)) {
      done.add(i);
      pass = 2;
      i = s;
      continue;
    }
    if (b.repeatEnd && b.ending !== 1) {
      pass = 1;
      s = i + 1;
    } else if (b.ending === 2 && bars[i + 1]?.ending !== 2) {
      s = i + 1;
    }
    i++;
  }
  return out;
}

/** Cifrado plano ("|" y espacios) que toca el play-along. Lanza un Error con mensaje legible si algo no es válido. */
export function compileDoc(doc: ChartDoc): string {
  const resolved = resolve(doc.bars);
  resolved.forEach((b, i) => {
    if (b.ending === 2 && resolved[i - 1]?.ending !== 1 && resolved[i - 1]?.ending !== 2) {
      throw new Error(`Compás ${i + 1}: el final 2 necesita un final 1 antes`);
    }
  });
  const flat = unroll(resolved);
  const text = flat.map((b) => b.chords.join(' ')).join(' | ');
  parseChart(text); // límite de compases
  return text;
}

/** Cantidad de compases que tocará el play-along (o null si el documento no es válido). */
export function playedBars(doc: ChartDoc): number | null {
  try {
    return compileDoc(doc).split('|').length;
  } catch {
    return null;
  }
}

// ---------- Paleta de acordes ----------

export const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const QUALITY_BUTTONS: [label: string, suffix: string][] = [
  ['maj7', 'maj7'], ['m7', 'm7'], ['7', '7'], ['m7♭5', 'm7b5'], ['dim7', 'dim7'], ['6', '6'], ['m6', 'm6'], ['mMaj7', 'mMaj7'],
  ['7alt', '7alt'], ['7♭9', '7b9'], ['7♯11', '7#11'], ['7♯5', '7#5'], ['7sus', '7sus'], ['maj7♯11', 'maj7#11'], ['m', 'm'], ['△', ''],
];
