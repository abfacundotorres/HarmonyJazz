/**
 * Pentagramas de ejemplo de los focos de tríadas, acordes de cuatro notas y células (`focusShapes.ts`). Todos se
 * generan en la tonalidad del día, en altura escrita para trompeta en Si♭, y se leen con la armadura de esa tonalidad.
 *
 * Cada ejemplo es una lista de compases de 8 corcheas (4/4); un compás puede llevar el símbolo de acorde (`chord`) o
 * una nota de texto (`text`). Las notas se ubican en el registro cómodo (de F♯3 a C6 escritos).
 */
import { abcPitch, keySignature } from '../exercises/abc';
import { degreeNote, midi, type Note, noteName, type Pitch, placeNear, simplify } from '../theory/notes';
import { HIGH, LOW, writtenTonic } from './techniqueAbc';

/** Una nota o silencio. `d` está en corcheas (1 = corchea, 2 = negra, 4 = blanca, 8 = redonda). */
export interface Cell {
  p: Pitch | null;
  d: number;
  accent?: boolean;
}
export interface Bar {
  /** Símbolo de acorde sobre el compás (como lo lee quien toca: en altura escrita). */
  chord?: string;
  /** Texto sobre el compás. */
  text?: string;
  cells: Cell[];
  /** Compás de tresillos de corchea: 12 notas de `d` = 1 agrupadas de a tres. */
  triplets?: boolean;
}

/** Fórmulas (grados sobre la raíz) de cada calidad. */
export const FORMULA = {
  M: ['1', '3', '5'],
  m: ['1', 'b3', '5'],
  maj7: ['1', '3', '5', '7'],
  m7: ['1', 'b3', '5', 'b7'],
  dom7: ['1', '3', '5', 'b7'],
  m7b5: ['1', 'b3', 'b5', 'b7'],
  celdaM: ['1', '2', '3', '5'],
  celdam: ['1', 'b3', '4', '5'],
} as const;
export type Shape = keyof typeof FORMULA;

/** Sufijo del símbolo de acorde de cada forma. */
const SUFFIX: Record<Shape, string> = { M: '', m: 'm', maj7: 'maj7', m7: 'm7', dom7: '7', m7b5: 'm7b5', celdaM: '', celdam: 'm7' };

/** Registro de partida: la raíz queda entre F♯3 y F4 escritos. */
const BASE = LOW;

const deg = (root: Note, d: string): Note => degreeNote(root, d);
export const chordName = (root: Note, shape: Shape) => noteName(root) + SUFFIX[shape];

/** Notas ascendentes de una forma sobre `root`, cada una por encima de la anterior. */
export function ascending(root: Note, shape: Shape, ref = BASE - 1): Pitch[] {
  const out: Pitch[] = [];
  let r = ref;
  for (const d of FORMULA[shape]) {
    const p = placeNear(deg(root, d), r, 'up');
    out.push(p);
    r = midi(p);
  }
  return out;
}

/** La forma y su repetición una octava más arriba (el doble de notas), para tomar inversiones y octavas. */
export function extended(root: Note, shape: Shape): Pitch[] {
  const a = ascending(root, shape);
  const out = [...a];
  for (const d of FORMULA[shape]) out.push(placeNear(deg(root, d), midi(out[out.length - 1]), 'up'));
  return out;
}

/** Una nota más arriba que la última (la octava de la fundamental, o la nota siguiente de la forma). */
const above = (root: Note, d: string, p: Pitch): Pitch => placeNear(deg(root, d), midi(p), 'up');

const eighths = (ps: (Pitch | null)[]): Cell[] => ps.map((p) => ({ p, d: 1 }));
const quarters = (ps: (Pitch | null)[]): Cell[] => ps.map((p) => ({ p, d: 2 }));

/** Completa el compás con silencios (uno solo cuando se puede, como una negra o una blanca). */
function padRest(cells: Cell[]): Cell[] {
  const used = cells.reduce((s, c) => s + c.d, 0);
  const r = 8 - used;
  if (r <= 0) return cells;
  if (r <= 4) return [...cells, { p: null, d: r }];
  return [...cells, { p: null, d: 4 }, { p: null, d: r - 4 }];
}

/** Si el compás se sale del registro, se baja o sube una octava entera. */
function fit(cells: Cell[]): Cell[] {
  const ms = cells.flatMap((c) => (c.p ? [midi(c.p)] : []));
  if (!ms.length) return cells;
  const shift = Math.max(...ms) > HIGH ? -12 : Math.min(...ms) < LOW ? 12 : 0;
  return shift === 0 ? cells : cells.map((c) => (c.p ? { ...c, p: { ...c.p, octave: c.p.octave + shift / 12 } } : c));
}

const bar = (cells: Cell[], more: Partial<Bar> = {}): Bar => ({ cells: fit(cells), ...more });

// ---------------------------------------------------------------------------------------------------------------
// Compases
// ---------------------------------------------------------------------------------------------------------------

/** Arpegio subiendo hasta la octava de la fundamental y bajando, en corcheas (siete notas y un silencio). */
export function arpUpDown(root: Note, shape: Shape, more: Partial<Bar> = {}): Bar {
  const a = ascending(root, shape);
  const top = above(root, '1', a[a.length - 1]);
  const seq = [...a, top, ...a.slice().reverse()].slice(0, 8);
  return bar(padRest(eighths(seq)), { chord: chordName(root, shape), ...more });
}

/** La forma subiendo y bajando sin pasar de su última nota, en corcheas (la forma, sus notas intermedias y un silencio). */
export function shapeUpDown(root: Note, shape: Shape, more: Partial<Bar> = {}): Bar {
  const a = ascending(root, shape);
  const seq = [...a, ...a.slice(0, -1).reverse()];
  return bar(padRest(eighths(seq)), { chord: chordName(root, shape), ...more });
}

/** La forma en negras: sube y vuelve a la nota de abajo (a, b, c, b) o (a, b, c, d) según tenga tres o cuatro notas. */
export function shapeQuarters(root: Note, shape: Shape, more: Partial<Bar> = {}): Bar {
  const a = ascending(root, shape);
  const seq = a.length === 3 ? [a[0], a[1], a[2], a[1]] : a;
  return bar(quarters(seq), { chord: chordName(root, shape), ...more });
}

/** La forma, de ida y de vuelta, en negras: dos compases (subiendo y bajando). */
export function shapeQuartersBoth(root: Note, shape: Shape, more: Partial<Bar> = {}): Bar[] {
  const a = ascending(root, shape);
  const up = a.length === 3 ? [...a, above(root, '1', a[2])] : a;
  const down = up.slice().reverse();
  return [bar(quarters(up), { chord: chordName(root, shape), ...more }), bar(quarters(down))];
}

/** Compás con la forma en un orden dado por posiciones (por ejemplo [0, 1, 2, 1] para 1-♭3-5-♭3), repetido dos veces. */
export function cellTwice(root: Note, shape: Shape, order: number[], more: Partial<Bar> = {}): Bar {
  const a = extended(root, shape);
  const first = order.map((i) => a[i]);
  // la segunda vez no se repite: el patrón dura cuatro notas y el compás ocho
  return bar(eighths([...first, ...first]), { chord: chordName(root, shape), ...more });
}

/** Tres ritmos distintos sobre la misma forma: corcheas, síncopa (corchea-negra-corchea) y tresillos. */
export function threeRhythms(root: Note, shape: Shape): Bar[] {
  const a = ascending(root, shape);
  const n = a.length;
  const at = (i: number) => a[i % n];
  const eighthBar = bar(eighths([0, 1, 2, n === 3 ? 1 : 3, 0, 1, 2, n === 3 ? 1 : 3].map((i) => at(i))), { chord: chordName(root, shape), text: 'corcheas' });
  const sync = bar(
    [
      { p: at(0), d: 1 }, { p: at(1), d: 2 }, { p: at(2), d: 1 },
      { p: at(n === 3 ? 1 : 3), d: 1 }, { p: at(0), d: 2 }, { p: at(1), d: 1 },
    ],
    { text: 'síncopa' },
  );
  const tri = bar(
    [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2].map((i) => ({ p: at(i), d: 1 })),
    { text: 'tresillos', triplets: true },
  );
  return [eighthBar, sync, tri];
}

// ---------------------------------------------------------------------------------------------------------------
// Armado del ABC
// ---------------------------------------------------------------------------------------------------------------

/** Las doce raíces en el ciclo de cuartas, empezando por la tónica del día (escrita). */
export function cycleRoots(tonic: Note): Note[] {
  const out: Note[] = [];
  let n = tonic;
  for (let i = 0; i < 12; i++) {
    out.push(n);
    n = simplify(degreeNote(n, '4'));
  }
  return out;
}

/** Raíces del ii–V–I de la tonalidad escrita. */
export const iiVI = (t: Note): { ii: Note; v: Note; i: Note } => ({ ii: simplify(deg(t, '2')), v: simplify(deg(t, '5')), i: t });

/** Texto ABC de una lista de compases (4 por renglón). `keyNote` da la armadura. */
export function abcFromBars(bars: Bar[], tonic: Note, bpm = 70): string {
  const keyAcc = keySignature(tonic);
  let body = '';
  bars.forEach((b, i) => {
    const acc = new Map<string, number>();
    let pos = 0;
    let s = '';
    let tri = 0;
    b.cells.forEach((c, k) => {
      if (k === 0) {
        if (b.chord) s += `"${b.chord}"`;
        if (b.text) s += `"^${b.text}"`;
      }
      if (b.triplets) {
        if (tri % 3 === 0) s += (tri === 0 ? '' : ' ') + '(3';
        s += c.p ? abcPitch(c.p, acc, keyAcc) : 'z';
        tri++;
        return;
      }
      if (pos > 0 && pos % 4 === 0) s += ' ';
      if (c.accent) s += '!accent!';
      s += (c.p ? abcPitch(c.p, acc, keyAcc) : 'z') + (c.d === 1 ? '' : String(c.d));
      pos += c.d;
    });
    body += s + (i === bars.length - 1 ? ' |]' : (i + 1) % 4 === 0 ? ' |\n' : ' | ');
  });
  return `X:1\nM:4/4\nL:1/8\nQ:1/4=${bpm}\nK:${noteName(tonic)}\n${body}\n`;
}

/** Suma de corcheas de un compás (siempre 8: lo comprueban los tests). */
export const barUnits = (b: Bar) => (b.triplets ? b.cells.length * (2 / 3) : b.cells.reduce((s, c) => s + c.d, 0));

export const tonicOf = writtenTonic;
