import { Chord, chordSymbol, parseChord, transposeChord } from './chords';
import { INTERVAL, Interval, intervalBetween, mod, Note, parseNote } from './notes';

/** Un acorde ubicado en el tiempo (en corcheas, 8 por compás de 4/4). */
export interface ChartChord {
  chord: Chord;
  bar: number;
  /** Inicio absoluto en corcheas desde el comienzo del chorus. */
  start: number;
  /** Duración en corcheas. */
  dur: number;
}

export interface Chart {
  bars: number;
  chords: ChartChord[];
}

export const EIGHTHS_PER_BAR = 8;
export const MAX_BARS = 256;

/** Recorta la carta a los compases [from, to] (0-based, inclusive) y reubica los tiempos desde 0. */
export function sliceChart(c: Chart, from: number, to: number): Chart {
  const a = Math.max(0, Math.min(from, to));
  const b = Math.min(c.bars - 1, Math.max(from, to));
  return {
    bars: b - a + 1,
    chords: c.chords
      .filter((x) => x.bar >= a && x.bar <= b)
      .map((x) => ({ ...x, bar: x.bar - a, start: x.start - a * EIGHTHS_PER_BAR })),
  };
}

const SEMITONE_INTERVALS: Interval[] = [
  INTERVAL.P1, INTERVAL.m2, INTERVAL.M2, INTERVAL.m3, INTERVAL.M3, INTERVAL.P4,
  INTERVAL.d5, INTERVAL.P5, INTERVAL.m6, INTERVAL.M6, INTERVAL.m7, INTERVAL.M7,
];

/** Intervalo ascendente de n semitonos (módulo 12), con ortografía de jazz: el tritono es una 5ª disminuida (C → G♭). */
export function semitoneInterval(n: number): Interval {
  return SEMITONE_INTERVALS[mod(n, 12)];
}

/**
 * Formato: compases separados por "|", acordes dentro del compás separados por espacios.
 * Un compás con 1 acorde = 4 tiempos, 2 acordes = 2+2, 3 acordes = 2+1+1, 4 = 1+1+1+1.
 * "%" repite el compás anterior.
 */
export function parseChart(src: string): Chart {
  const bars = src
    .split('|')
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  if (bars.length === 0) throw new Error('La progresión está vacía');
  if (bars.length > MAX_BARS) throw new Error(`Demasiados compases (máximo ${MAX_BARS})`);
  const chords: ChartChord[] = [];
  let prev: string[] = [];
  bars.forEach((bar, i) => {
    const syms = bar === '%' ? prev : bar.split(/\s+/);
    prev = syms;
    const durs =
      syms.length === 1 ? [8] : syms.length === 2 ? [4, 4] : syms.length === 3 ? [4, 2, 2] : syms.length === 4 ? [2, 2, 2, 2] : null;
    if (!durs) throw new Error(`Demasiados acordes en el compás ${i + 1}: ${bar}`);
    let pos = i * EIGHTHS_PER_BAR;
    syms.forEach((s, k) => {
      chords.push({ chord: parseChord(s), bar: i, start: pos, dur: durs[k] });
      pos += durs[k];
    });
  });
  return { bars: bars.length, chords };
}

export function transposeChart(c: Chart, iv: Interval): Chart {
  if (iv.steps === 0 && iv.semis === 0) return c;
  return { ...c, chords: c.chords.map((cc) => ({ ...cc, chord: transposeChord(cc.chord, iv) })) };
}

export function chartToString(c: Chart): string {
  const out: string[] = [];
  for (let b = 0; b < c.bars; b++) {
    out.push(
      c.chords
        .filter((x) => x.bar === b)
        .map((x) => chordSymbol(x.chord))
        .join(' '),
    );
  }
  return '| ' + out.join(' | ') + ' |';
}

export function chordAt(c: Chart, eighth: number): ChartChord | undefined {
  const t = mod(eighth, c.bars * EIGHTHS_PER_BAR);
  return c.chords.find((x) => t >= x.start && t < x.start + x.dur);
}

/** Las 12 tonalidades (concierto) con la ortografía usual en jazz. */
export const CONCERT_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Ciclo de cuartas a partir de C. */
export const CYCLE_OF_FOURTHS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];

/** Intervalo ascendente que lleva de una tonalidad a otra (para transponer cartas). */
export function keyInterval(from: string, to: string): Interval {
  const iv = intervalBetween(parseNote(from), parseNote(to));
  // Bajar en lugar de subir más de un tritono no cambia las clases de altura,
  // pero sí conviene para la ortografía: dejamos el intervalo ascendente simple.
  return iv;
}

export function noteOf(key: string): Note {
  return parseNote(key);
}
