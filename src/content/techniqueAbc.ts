import { abcPitch, keySignature } from '../exercises/abc';
import { scaleNotes } from '../theory/scales';
import {
  BB_TRUMPET, midi, Note, noteName, parseNote, parsePitch, Pitch, placeNear, simplify, transposeNote,
} from '../theory/notes';

/** Pentagramas generados de los ejercicios de técnica, en la tonalidad del día y en altura escrita (trompeta en Si♭). */
export interface Item {
  p: Pitch | null;
  /** Duración en corcheas. */
  dur: number;
}

/** Rango escrito razonable: de F♯3 a C6. */
export const LOW = 54;
export const HIGH = 84;

/** Tonalidad escrita (para la armadura) a partir de la tonalidad en concierto. */
export const writtenTonic = (concertKey: string): Note => simplify(transposeNote(parseNote(concertKey), BB_TRUMPET));

/** La tónica en el registro más grave posible (desde F♯3). */
const start = (tonic: Note): Pitch => placeNear(tonic, LOW - 1, 'up');

/** Notas de una escala hacia arriba, desde la tónica, hasta `count` notas o el límite del registro. */
export function ladder(tonic: Note, scaleId: string, count: number): Pitch[] {
  const notes = scaleNotes(tonic, scaleId);
  const out: Pitch[] = [start(tonic)];
  for (let i = 1; i < count; i++) {
    const p = placeNear(notes[i % notes.length], midi(out[i - 1]), 'up');
    if (midi(p) > HIGH) break;
    out.push(p);
  }
  return out;
}

const eighths = (ps: Pitch[]): Item[] => ps.map((p) => ({ p, dur: 1 }));
const quarters = (ps: Pitch[]): Item[] => ps.map((p) => ({ p, dur: 2 }));

const ALLOWED = [8, 6, 4, 3, 2, 1];
/** Cierra el ejercicio con la tónica hasta el final del compás (o un compás entero). */
function finish(raw: Item[], tonic: Pitch): Item[] {
  // si la línea ya termina en la tónica, no se repite la nota
  const last = raw[raw.length - 1];
  const items = last?.p && last.dur === 1 && midi(last.p) === midi(tonic) ? raw.slice(0, -1) : raw;
  const total = items.reduce((s, i) => s + i.dur, 0);
  const rem = total % 8 === 0 ? 8 : 8 - (total % 8);
  const out = [...items];
  if (ALLOWED.includes(rem)) out.push({ p: tonic, dur: rem });
  else {
    const first = ALLOWED.find((a) => a < rem && ALLOWED.includes(rem - a)) ?? 4;
    out.push({ p: tonic, dur: first }, { p: null, dur: rem - first });
  }
  return out;
}

/** Los grupos que caben enteros en el registro: [índices en la escala] → notas. */
function groups(s: Pitch[], patterns: number[][]): Pitch[][] {
  return patterns.filter((g) => g.every((i) => i >= 0 && i < s.length)).map((g) => g.map((i) => s[i]));
}

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const fromMidi = (m: number, flats: boolean): Pitch => parsePitch(`${(flats ? FLAT : SHARP)[m % 12]}${Math.floor(m / 12) - 1}`);

export const SHAPES: Record<string, (tonic: Note) => Item[]> = {
  /** Escala mayor en terceras: 1-3, 2-4, 3-5… subiendo y bajando. */
  thirds(tonic) {
    const s = ladder(tonic, 'ionian', 15);
    const up: Pitch[] = [];
    for (let i = 0; i + 2 < s.length; i++) up.push(s[i], s[i + 2]);
    const down: Pitch[] = [];
    for (let i = s.length - 1; i >= 2; i--) down.push(s[i], s[i - 2]);
    return finish(eighths([...up, ...down]), s[0]);
  },
  /** Menor melódica con el patrón 1-2-3-5. */
  melodicMinor1235(tonic) {
    const s = ladder(tonic, 'melodicMinor', 15);
    const up: number[][] = [];
    for (let i = 0; i + 4 < s.length; i++) up.push([i, i + 1, i + 2, i + 4]);
    const down: number[][] = [];
    for (let i = s.length - 1; i >= 4; i--) down.push([i, i - 1, i - 2, i - 4]);
    return finish(eighths(groups(s, [...up, ...down]).flat()), s[0]);
  },
  /** Arpegios de 7ª sobre cada grado de la escala mayor. */
  sevenths(tonic) {
    const s = ladder(tonic, 'ionian', 15);
    const pats = [0, 1, 2, 3, 4, 5, 6].map((i) => [i, i + 2, i + 4, i + 6, i + 4, i + 2, i]);
    const items: Item[] = [];
    for (const g of groups(s, pats)) items.push(...eighths(g), { p: null, dur: 1 });
    return finish(items, s[0]);
  },
  /** Cromática de dos octavas, subiendo con sostenidos y bajando con bemoles. */
  chromatic(tonic) {
    const m0 = midi(start(tonic));
    const top = Math.min(m0 + 24, HIGH);
    const up: Pitch[] = [];
    for (let m = m0; m < top; m++) up.push(fromMidi(m, false));
    const down: Pitch[] = [];
    for (let m = top; m > m0; m--) down.push(fromMidi(m, true));
    return finish(eighths([...up, ...down]), start(tonic));
  },
  /** Intervalos crecientes desde la tónica (2ª, 3ª… octava), en negras. */
  intervals(tonic) {
    const s = ladder(tonic, 'ionian', 8);
    const items: Item[] = [];
    for (let k = 1; k < s.length; k++) items.push(...quarters([s[0], s[k], s[0], s[k]]));
    return finish(items, s[0]);
  },
  /** Escala de blues subiendo y bajando. */
  blues(tonic) {
    const s = ladder(tonic, 'blues', 13);
    const down = s.slice(1, -1).reverse();
    return finish(eighths([...s, ...down]), s[0]);
  },
  /** Tríada de la tónica en posición fundamental y en sus dos inversiones. */
  triads(tonic) {
    const s = ladder(tonic, 'ionian', 15);
    const pats = [
      [0, 2, 4, 7, 9, 7, 4, 2],
      [2, 4, 7, 9, 11, 9, 7, 4],
      [4, 7, 9, 11, 14, 11, 9, 7],
    ];
    return finish(eighths(groups(s, pats).flat()), s[0]);
  },
  /** Escala bebop dominante descendente: los tiempos fuertes caen en las notas del acorde de dominante. */
  bebopDown(tonic) {
    const s = ladder(tonic, 'bebopDominant', 17);
    let top = s.length - 1;
    while (top > 0 && top % 8 !== 0) top--;
    const down: Pitch[] = [];
    for (let i = top; i > 0; i--) down.push(s[i]);
    return finish(eighths(down), s[0]);
  },
};

/** ABC con la armadura de la tonalidad escrita. `bpm` es la negra. */
export function techniqueAbc(id: string, concertKey: string, bpm: number): string {
  const tonic = writtenTonic(concertKey);
  const keyAcc = keySignature(tonic);
  let acc = new Map<string, number>();
  let body = '';
  let pos = 0;
  for (const it of SHAPES[id](tonic)) {
    if (pos % 8 === 0) {
      if (pos > 0) body += (pos / 8) % 4 === 0 ? ' |\n' : ' | ';
      acc = new Map();
    } else if (pos % 4 === 0) body += ' ';
    body += (it.p ? abcPitch(it.p, acc, keyAcc) : 'z') + (it.dur === 1 ? '' : String(it.dur));
    pos += it.dur;
  }
  return `X:1\nM:4/4\nL:1/8\nQ:1/4=${bpm}\nK:${noteName(tonic)}\n${body} |]\n`;
}
