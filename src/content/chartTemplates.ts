import { parseChord, chordSymbol, transposeChord } from '../theory/chords';
import { CONCERT_KEYS, semitoneInterval } from '../theory/chart';
import { degreeNote, noteName, parseNote, pc, simplify } from '../theory/notes';
import type { DocBar } from './chartDoc';

/** Atajos del editor de grilla: acordes de una tonalidad y plantillas de progresiones frecuentes. */

const root = (key: string, deg: string) => noteName(simplify(degreeNote(parseNote(key), deg)));
/** Acorde: grado de la tonalidad + calidad ("" = mayor). */
const ch = (key: string, deg: string, q: string) => root(key, deg) + q;

export interface DiatonicChord {
  numeral: string;
  sym: string;
}

/** Los siete acordes de cuatro notas de la tonalidad (en menor, la menor natural con V7 dominante). */
export function diatonic(key: string, minor = false): DiatonicChord[] {
  const d: [string, string, string][] = minor
    ? [['i', '1', 'm7'], ['iiø', '2', 'm7b5'], ['♭III', 'b3', 'maj7'], ['iv', '4', 'm7'], ['V', '5', '7'], ['♭VI', 'b6', 'maj7'], ['♭VII', 'b7', '7']]
    : [['I', '1', 'maj7'], ['ii', '2', 'm7'], ['iii', '3', 'm7'], ['IV', '4', 'maj7'], ['V', '5', '7'], ['vi', '6', 'm7'], ['viiø', '7', 'm7b5']];
  return d.map(([numeral, deg, q]) => ({ numeral, sym: ch(key, deg, q) }));
}

export interface Template {
  id: string;
  name: string;
  /** Compases (cada uno con 1–4 acordes) para una tonalidad. */
  bars: (key: string) => string[][];
}

const c = ch;
export const TEMPLATES: Template[] = [
  { id: 'ii-v-i', name: 'ii–V–I', bars: (k) => [[c(k, '2', 'm7')], [c(k, '5', '7')], [c(k, '1', 'maj7')], [c(k, '1', 'maj7')]] },
  { id: 'ii-v-i-short', name: 'ii–V–I corto', bars: (k) => [[c(k, '2', 'm7'), c(k, '5', '7')], [c(k, '1', 'maj7')]] },
  { id: 'ii-v-i-minor', name: 'ii–V–i menor', bars: (k) => [[c(k, '2', 'm7b5')], [c(k, '5', '7alt')], [c(k, '1', 'm6')], [c(k, '1', 'm6')]] },
  { id: 'turnaround', name: 'Turnaround I–VI–ii–V', bars: (k) => [[c(k, '1', 'maj7'), c(k, '6', '7b9')], [c(k, '2', 'm7'), c(k, '5', '7')]] },
  { id: 'backdoor', name: 'Backdoor (iv–♭VII–I)', bars: (k) => [[c(k, '4', 'm7')], [c(k, 'b7', '7')], [c(k, '1', 'maj7')], [c(k, '1', 'maj7')]] },
  { id: 'tritone', name: 'Sustitución tritonal', bars: (k) => [[c(k, '2', 'm7')], [c(k, 'b2', '7#11')], [c(k, '1', 'maj7')], [c(k, '1', 'maj7')]] },
  {
    id: 'blues',
    name: 'Blues de jazz (12 compases)',
    bars: (k) => [
      [c(k, '1', '7')], [c(k, '4', '7')], [c(k, '1', '7')], [c(k, '5', 'm7'), c(k, '1', '7')],
      [c(k, '4', '7')], [c(k, '#4', 'dim7')], [c(k, '1', '7')], [c(k, '3', 'm7b5'), c(k, '6', '7b9')],
      [c(k, '2', 'm7')], [c(k, '5', '7')], [c(k, '1', '7'), c(k, '6', '7b9')], [c(k, '2', 'm7'), c(k, '5', '7')],
    ],
  },
  {
    id: 'rhythm-a',
    name: 'Rhythm changes: sección A',
    bars: (k) => [
      [c(k, '1', 'maj7'), c(k, '6', '7b9')], [c(k, '2', 'm7'), c(k, '5', '7')], [c(k, '3', 'm7'), c(k, '6', '7b9')], [c(k, '2', 'm7'), c(k, '5', '7')],
      [c(k, '5', 'm7'), c(k, '1', '7')], [c(k, '4', 'maj7'), c(k, 'b7', '7')], [c(k, '3', 'm7'), c(k, '6', '7b9')], [c(k, '2', 'm7'), c(k, '5', '7')],
    ],
  },
  { id: 'cycle', name: 'Cadena de ii–V por cuartas (4 tonalidades)', bars: (k) => [0, 5, 10, 3].map((st) => { const t = transposeKey(k, st); return [c(t, '2', 'm7'), c(t, '5', '7')]; }) },
];

/** Tonalidad `semis` semitonos arriba, con nombre de jazz. */
export function transposeKey(key: string, semis: number): string {
  const n = transposeChord(parseChord(key), semitoneInterval(semis));
  return noteName(n.root);
}

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id)!;

export function templateBars(id: string, key: string): DocBar[] {
  return templateById(id).bars(key).map((chords) => ({ chords }));
}

/** Sube o baja todos los acordes de una grilla (los "%" se conservan). */
export function transposeBars(bars: DocBar[], semis: number): DocBar[] {
  const iv = semitoneInterval(semis);
  return bars.map((b) => ({
    ...b,
    chords: b.chords.map((s) => {
      if (s === '%' || s === '') return s;
      try {
        const t = transposeChord(parseChord(s), iv);
        // ortografía de jazz: bemoles (B♭ y no A♯)
        const flat = (n: typeof t.root) => parseNote(CONCERT_KEYS[pc(n)]);
        return chordSymbol({ ...t, root: flat(t.root), bass: t.bass ? flat(t.bass) : undefined });
      } catch {
        return s; // un símbolo inválido se deja como está para que el usuario lo vea
      }
    }),
  }));
}
