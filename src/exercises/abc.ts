import { chordSymbol, transposeChord } from '../theory/chords';
import { Chart, EIGHTHS_PER_BAR } from '../theory/chart';
import {
  degreeNote, Interval, LETTERS, Note, noteName, parseNote, Pitch, simplify, simplifyPitch, transposeNote, transposePitch,
} from '../theory/notes';
import type { MelNote } from './generators';

export interface AbcOptions {
  /** Transposición de lectura (BB_TRUMPET o unísono). */
  transpose: Interval;
  /** Tonalidad (concierto) para la armadura; null = sin armadura. */
  key?: string | null;
  mode?: 'major' | 'minor';
  title?: string;
  barsPerLine?: number;
}

const ALLOWED = [8, 6, 4, 3, 2, 1];

function abcPitch(p: Pitch, accState: Map<string, number>, keyAcc: number[]): string {
  const k = `${p.letter}${p.octave}`;
  const current = accState.has(k) ? accState.get(k)! : keyAcc[p.letter];
  let acc = '';
  if (current !== p.acc) {
    acc = p.acc === 0 ? '=' : p.acc > 0 ? '^'.repeat(p.acc) : '_'.repeat(-p.acc);
    accState.set(k, p.acc);
  }
  const L = LETTERS[p.letter];
  const letter = p.octave >= 5 ? L.toLowerCase() + "'".repeat(p.octave - 5) : L + ','.repeat(Math.max(0, 4 - p.octave));
  return acc + letter;
}

const durStr = (d: number) => (d === 1 ? '' : String(d));

/** Armadura: alteración de cada letra en la tonalidad mayor dada. */
export function keySignature(tonic: Note): number[] {
  const acc = [0, 0, 0, 0, 0, 0, 0];
  for (const d of ['1', '2', '3', '4', '5', '6', '7']) {
    const n = degreeNote(tonic, d);
    acc[n.letter] = n.acc;
  }
  return acc;
}

/** Tonalidad mayor escrita (para la armadura) a partir de la tonalidad en concierto. */
export function writtenMajorKey(key: string, mode: 'major' | 'minor', iv: Interval): Note {
  let t = parseNote(key);
  if (mode === 'minor') t = transposeNote(t, { steps: 2, semis: 3 });
  return simplify(transposeNote(t, iv));
}

export function toAbc(chart: Chart, notes: MelNote[], opt: AbcOptions): string {
  const total = chart.bars * EIGHTHS_PER_BAR;
  const tonic = opt.key ? writtenMajorKey(opt.key, opt.mode ?? 'major', opt.transpose) : null;
  const keyAcc = tonic ? keySignature(tonic) : [0, 0, 0, 0, 0, 0, 0];
  const K = tonic ? noteName(tonic) : 'C';

  // completar silencios y ordenar
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  const filled: MelNote[] = [];
  let t = 0;
  for (const n of sorted) {
    if (n.start > t) filled.push({ start: t, dur: n.start - t, pitch: null });
    if (n.start < t) continue;
    filled.push(n);
    t = n.start + n.dur;
  }
  if (t < total) filled.push({ start: t, dur: total - t, pitch: null });

  const chordStarts = new Map<number, string>();
  for (const cc of chart.chords) {
    chordStarts.set(cc.start, chordSymbol(transposeChord(cc.chord, opt.transpose)));
  }
  const boundaries = new Set<number>([...chordStarts.keys()]);
  for (let b = 0; b <= chart.bars; b++) boundaries.add(b * EIGHTHS_PER_BAR);

  // trocear en límites de compás/acorde y en duraciones representables
  interface Piece { start: number; dur: number; pitch: Pitch | null; tie: boolean }
  const pieces: Piece[] = [];
  for (const n of filled) {
    const end = Math.min(n.start + n.dur, total);
    const cuts = [n.start, ...[...boundaries].filter((x) => x > n.start && x < end).sort((a, b) => a - b), end];
    const written = n.pitch ? simplifyPitch(transposePitch(n.pitch, opt.transpose)) : null;
    for (let i = 0; i < cuts.length - 1; i++) {
      let s = cuts[i];
      let remaining = cuts[i + 1] - s;
      while (remaining > 0) {
        // silencios/notas largas a mitad de compás: partir en el tiempo 3 si cruzan
        let d = ALLOWED.find((a) => a <= remaining)!;
        const pos = s % EIGHTHS_PER_BAR;
        if (pos < 4 && pos + d > 4 && pos % 2 === 1) d = 4 - pos;
        pieces.push({ start: s, dur: d, pitch: written, tie: false });
        s += d;
        remaining -= d;
        if (remaining > 0 || i < cuts.length - 2) pieces[pieces.length - 1].tie = !!written;
      }
    }
  }

  const barsPerLine = opt.barsPerLine ?? 4;
  let body = '';
  let accState = new Map<string, number>();
  pieces.forEach((p, idx) => {
    const pos = p.start % EIGHTHS_PER_BAR;
    if (pos === 0) {
      if (idx > 0) {
        const bar = p.start / EIGHTHS_PER_BAR;
        body += bar % barsPerLine === 0 ? ' |\n' : ' | ';
      }
      accState = new Map();
    } else if (pos % 4 === 0 || p.dur >= 2 || (idx > 0 && pieces[idx - 1].dur >= 2)) {
      body += ' ';
    }
    const ch = chordStarts.get(p.start);
    if (ch) body += `"${ch}"`;
    body += p.pitch ? abcPitch(p.pitch, accState, keyAcc) + durStr(p.dur) + (p.tie ? '-' : '') : 'z' + durStr(p.dur);
  });
  body += ' |]';

  return [
    'X:1',
    opt.title ? `T:${opt.title}` : '',
    'M:4/4',
    'L:1/8',
    `K:${K}`,
    body,
  ]
    .filter(Boolean)
    .join('\n');
}
