/**
 * Ideas de lenguaje: frases cortas de tres compases sobre un ii–V–I, armadas con el material de cada foco (tríadas,
 * acordes de cuatro notas, células). No son frases de nadie: se generan combinando contornos melódicos y ritmos
 * (corcheas, síncopa, silencios, tresillos) y cuidando la conducción de voces (cada compás arranca cerca de donde
 * terminó el anterior) y la resolución (la frase termina en una nota larga que es la 3ª o la 5ª del último acorde).
 *
 * Todo en la tonalidad del día, en altura escrita para trompeta en Si♭.
 */
import { degreeNote, midi, type Note, noteName, type Pitch, pitchFromNote, simplify } from '../theory/notes';
import { type Bar, type Cell, chordName, FORMULA, iiVI, type Shape } from './shapeAbc';
import { HIGH, LOW } from './techniqueAbc';

/** Un conjunto de notas entre las que se arma la frase, con su nombre (por ejemplo "D menor"). */
export interface PoolDef {
  name: string;
  notes: Note[];
}

/** Material para los tres acordes de un ii–V–I (cada uno con varias opciones) y sus símbolos. */
export interface IdeaSet {
  chords: [string, string, string];
  pools: [PoolDef[], PoolDef[], PoolDef[]];
  /** Notas en las que puede terminar la frase (3ª y 5ª del último acorde). */
  targets: Note[];
}

const d = (r: Note, g: string) => simplify(degreeNote(r, g));
const tones = (root: Note, shape: Shape): Note[] => FORMULA[shape].map((g) => degreeNote(root, g));
export const pool = (root: Note, shape: Shape, name?: string): PoolDef => ({
  name: name ?? `${noteName(root)} ${NAME[shape]}`,
  notes: tones(root, shape),
});
const NAME: Record<Shape, string> = { M: 'mayor', m: 'menor', maj7: 'maj7', m7: 'm7', dom7: '7', m7b5: 'm7♭5', celdaM: '1-2-3-5', celdam: '1-♭3-4-5' };

// ---------------------------------------------------------------------------------------------------------------
// Material de cada foco
// ---------------------------------------------------------------------------------------------------------------

type Set = (t: Note) => IdeaSet;
const base = (t: Note) => {
  const { ii, v, i } = iiVI(t);
  return { ii, v, i, chords: [chordName(ii, 'm7'), chordName(v, 'dom7'), chordName(i, 'maj7')] as [string, string, string], targets: [d(i, '3'), d(i, '5')] };
};

export const SETS: Record<string, Set> = {
  /** Tríadas menores: Dm y Am sobre el m7, Dm y Gm sobre el dominante, Em y Am sobre el maj7. */
  menores: (t) => {
    const { ii, v, chords, targets } = base(t);
    return {
      chords,
      targets,
      pools: [
        [pool(ii, 'm'), pool(d(t, '6'), 'm')],
        [pool(d(t, '2'), 'm'), pool(v, 'm')],
        [pool(d(t, '3'), 'm'), pool(d(t, '6'), 'm')],
      ],
    };
  },
  /** Tríadas mayores y menores: las cuatro de cada acorde. */
  mayoresMenores: (t) => {
    const { chords, targets } = base(t);
    return {
      chords,
      targets,
      pools: [
        [pool(d(t, '4'), 'M'), pool(d(t, '1'), 'M'), pool(d(t, '2'), 'm'), pool(d(t, '6'), 'm')],
        [pool(d(t, '5'), 'M'), pool(d(t, '4'), 'M'), pool(d(t, '2'), 'm'), pool(d(t, '5'), 'm')],
        [pool(d(t, '1'), 'M'), pool(d(t, '5'), 'M'), pool(d(t, '3'), 'm'), pool(d(t, '6'), 'm')],
      ],
    };
  },
  /** Acordes de cuatro notas: el arpegio del acorde y el de la 3ª (3-5-7-9). */
  cuatroNotas: (t) => {
    const { ii, v, i, chords, targets } = base(t);
    return {
      chords,
      targets,
      pools: [
        [pool(ii, 'm7'), pool(d(t, '4'), 'maj7', `${noteName(d(t, '4'))}maj7 (3-5-7-9)`)],
        [pool(v, 'dom7'), pool(d(t, '7'), 'm7b5', `${noteName(d(t, '7'))}m7♭5 (3-5-7-9)`)],
        [pool(i, 'maj7'), pool(d(t, '3'), 'm7', `${noteName(d(t, '3'))}m7 (3-5-7-9)`)],
      ],
    };
  },
  /** ii–V–i menor: m7♭5, dominante y menor. */
  menorCuatroNotas: (t) => {
    const { ii, v, i, chords } = base(t);
    return {
      chords: [chordName(ii, 'm7b5'), chords[1], chordName(i, 'm7')],
      targets: [d(i, 'b3'), d(i, '5')],
      pools: [
        [pool(ii, 'm7b5'), pool(d(t, 'b3'), 'm7', `${noteName(d(t, 'b3'))}m7 (3-5-7-9)`)],
        [pool(v, 'dom7'), pool(d(t, '7'), 'm7b5', `${noteName(d(t, '7'))}m7♭5 (3-5-7-9)`)],
        [pool(i, 'm7'), pool(d(t, 'b3'), 'maj7', `${noteName(d(t, 'b3'))}maj7 (3-5-7-9)`)],
      ],
    };
  },
  /** Células: 1-♭3-4-5 sobre el m7; 1-2-3-5 sobre el dominante y el maj7 (y variantes que caben en el acorde). */
  celulas: (t) => {
    const { ii, v, i, chords, targets } = base(t);
    return {
      chords,
      targets,
      pools: [
        [pool(ii, 'celdam'), pool(d(t, '4'), 'celdaM', `${noteName(d(t, '4'))} 1-2-3-5`)],
        [pool(v, 'celdaM'), pool(d(t, '4'), 'celdaM', `${noteName(d(t, '4'))} 1-2-3-5`)],
        [pool(i, 'celdaM'), pool(v, 'celdaM')],
      ],
    };
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Ritmos y contornos
// ---------------------------------------------------------------------------------------------------------------

/** Un ritmo de compás: duraciones en corcheas; un número negativo es un silencio. */
interface Rhythm {
  name: string;
  items: number[];
  triplets?: boolean;
}
const MID: Rhythm[] = [
  { name: 'corcheas', items: [1, 1, 1, 1, 1, 1, 1, 1] },
  { name: 'entra en contratiempo', items: [-1, 1, 1, 1, 1, 1, 1, 1] },
  { name: 'síncopa', items: [1, 2, 1, 1, 2, 1] },
  { name: 'corcheas y negras', items: [1, 1, 1, 1, 2, 2] },
  { name: 'respira al final', items: [1, 1, 1, 1, 1, 1, -2] },
  { name: 'empieza con silencio', items: [-2, 1, 1, 1, 1, 2] },
  { name: 'termina larga', items: [1, 1, 1, 1, 1, 1, 2] },
  { name: 'tresillos', items: [], triplets: true },
];
/** Cierres: terminan en una nota larga. */
const END: Rhythm[] = [
  { name: 'cierra en blanca', items: [1, 1, 1, 1, 4] },
  { name: 'cierra tras una síncopa', items: [1, 2, 1, 4] },
  { name: 'cierra en negra y blanca', items: [2, 1, 1, 4] },
  { name: 'cierra en redonda', items: [1, 1, 2, 4] },
];

/** Pasos entre las notas del conjunto (en lugares del conjunto, no en semitonos). */
const CONTOURS: { name: string; steps: number[] }[] = [
  { name: 'sube', steps: [1] },
  { name: 'baja', steps: [-1] },
  { name: 'arco', steps: [1, 1, -1, -1] },
  { name: 'valle', steps: [-1, -1, 1, 1] },
  { name: 'salta y vuelve', steps: [2, -1] },
  { name: 'baja saltando', steps: [-2, 1] },
];

// ---------------------------------------------------------------------------------------------------------------
// Armado
// ---------------------------------------------------------------------------------------------------------------

/** Todas las alturas de las notas del conjunto en el registro cómodo, de grave a agudo. */
export function poolPitches(notes: Note[], lo = LOW + 1, hi = HIGH - 5): Pitch[] {
  const out: Pitch[] = [];
  for (const n of notes) for (let o = 2; o <= 7; o++) {
    const p = pitchFromNote(n, o);
    if (midi(p) >= lo && midi(p) <= hi) out.push(p);
  }
  return out.sort((a, b) => midi(a) - midi(b));
}

const nearest = (ps: Pitch[], ref: number) => ps.reduce((best, p, i) => (Math.abs(midi(p) - ref) < Math.abs(midi(ps[best]) - ref) ? i : best), 0);
const reflect = (i: number, n: number) => {
  let x = i;
  while (x < 0 || x > n - 1) x = x < 0 ? -x : 2 * (n - 1) - x;
  return x;
};

/** Camino por el conjunto: `count` índices, desde `start`, siguiendo el contorno. */
function walk(n: number, start: number, steps: number[], count: number): number[] {
  const out: number[] = [];
  let i = start;
  for (let k = 0; k < count; k++) {
    out.push(reflect(i, n));
    i += steps[k % steps.length];
  }
  return out;
}

/** El compás: el contorno y el ritmo dados, empezando en la nota del conjunto más cercana a `prev`. */
function buildBar(ps: Pitch[], contour: (typeof CONTOURS)[number], rhythm: Rhythm, prev: number, chord: string, endTarget?: Pitch): Bar {
  const slots = rhythm.triplets ? 12 : rhythm.items.filter((x) => x > 0).length;
  const notesCount = endTarget ? slots - 1 : slots;
  const start = nearest(ps, prev);
  // el primer paso se da después de la primera nota: la primera es la más cercana a la anterior
  const idx = walk(ps.length, start, contour.steps, notesCount);
  const pitches = idx.map((i) => ps[i]);
  if (endTarget) pitches.push(endTarget);
  const cells: Cell[] = [];
  if (rhythm.triplets) return { chord, triplets: true, cells: pitches.map((p) => ({ p, d: 1 })) };
  let k = 0;
  for (const it of rhythm.items) cells.push(it < 0 ? { p: null, d: -it } : { p: pitches[k++], d: it });
  return { chord, cells };
}

/** `n` ideas de tres compases cada una sobre el ii–V–I del conjunto. `seed` cambia las combinaciones. */
export function ideaBars(set: IdeaSet, n: number, seed = 0): Bar[] {
  const out: Bar[] = [];
  const targetPs = poolPitches(set.targets);
  let prev = 67;
  for (let j = 0; j < n; j++) {
    const alt = (k: number) => set.pools[k][(j + seed + k) % set.pools[k].length];
    const pools = [alt(0), alt(1), alt(2)];
    const c1 = CONTOURS[(j + seed) % CONTOURS.length];
    const c2 = CONTOURS[(j * 5 + seed + 2) % CONTOURS.length];
    const c3 = CONTOURS[(j + seed + 3) % CONTOURS.length];
    const r1 = MID[(j + seed) % MID.length];
    const r2 = MID[(j * 3 + seed + 1) % MID.length];
    const r3 = END[(j + seed) % END.length];
    const ps1 = poolPitches(pools[0].notes);
    const b1 = buildBar(ps1, c1, r1, prev, set.chords[0]);
    const last = (b: Bar) => [...b.cells].reverse().find((c) => c.p)!.p!;
    const b2 = buildBar(poolPitches(pools[1].notes), c2, r2, midi(last(b1)), set.chords[1]);
    // el compás final termina en la 3ª o la 5ª del acorde, la más cercana
    const endP = targetPs[nearest(targetPs, midi(last(b2)))];
    const b3 = buildBar(poolPitches(pools[2].notes), c3, r3, midi(last(b2)), set.chords[2], endP);
    b1.text = `Idea ${j + 1} · ${pools[0].name}`;
    b2.text = `${pools[1].name} · ${r2.name}`;
    b3.text = `${pools[2].name} · ${r3.name}`;
    out.push(b1, b2, b3);
    prev = midi(endP);
    // la idea siguiente arranca cerca del final de ésta, pero no igual: se baja o sube un poco para variar el registro
    prev += j % 2 === 0 ? -3 : 3;
  }
  return out;
}
