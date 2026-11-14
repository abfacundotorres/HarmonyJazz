import { abcPitch, keySignature } from '../exercises/abc';
import { scaleNotes } from '../theory/scales';
import {
  BB_TRUMPET, degreeNote, midi, Note, noteName, parseNote, parsePitch, Pitch, placeNear, simplify, transposeNote,
} from '../theory/notes';

/** Pentagramas generados de los ejercicios de técnica, en la tonalidad del día y en altura escrita (trompeta en Si♭). */
export interface Item {
  p: Pitch | null;
  /** Duración en la unidad del ejercicio (corcheas, o semicorcheas en los ejercicios rítmicos). */
  dur: number;
  /** Notas con el mismo número van bajo una misma ligadura. */
  slur?: number;
  accent?: boolean;
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

const ALLOWED_BY_UNIT: Record<number, number[]> = { 8: [8, 6, 4, 3, 2, 1], 16: [16, 12, 8, 6, 4, 3, 2, 1] };
/** Cierra el ejercicio con la tónica hasta el final del compás (o un compás entero). */
function finish(raw: Item[], tonic: Pitch, unit = 8): Item[] {
  const ALLOWED = ALLOWED_BY_UNIT[unit];
  // si la línea ya termina en la tónica, no se repite la nota
  const last = raw[raw.length - 1];
  const items = last?.p && last.dur === 1 && midi(last.p) === midi(tonic) ? raw.slice(0, -1) : raw;
  const total = items.reduce((s, i) => s + i.dur, 0);
  const rem = total % unit === 0 ? unit : unit - (total % unit);
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


/** Unidad de cada ejercicio: 8 = corcheas (compás de 8), 16 = semicorcheas (compás de 16). */
export const UNIT: Record<string, number> = { rhythmDotted: 16, syncopation: 16, accentLong: 16, triplets: 12, chromLoop: 6, fourGroups: 16 };

/** Asigna duraciones cíclicas (un patrón) a una secuencia de notas. */
function patterned(notes: Pitch[], pattern: number[]): Item[] {
  return notes.map((p, i) => ({ p, dur: pattern[i % pattern.length] }));
}

/** Escala de una octava subiendo y bajando (sin repetir la nota más alta). */
function octaveUpDown(tonic: Note): Pitch[] {
  const s = ladder(tonic, 'ionian', 8);
  return [...s, ...s.slice(0, -1).reverse()];
}

const NEW_SHAPES: Record<string, (tonic: Note) => Item[]> = {
  /** Corchea con puntillo + semicorchea, y corchea + dos semicorcheas, alternando de compás en compás. */
  rhythmDotted(tonic) {
    const dotted = [3, 1, 3, 1, 3, 1, 3, 1];
    const eighthTwo16 = [2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1];
    const stream = [...octaveUpDown(tonic), ...octaveUpDown(tonic)];
    const items: Item[] = [];
    let i = 0;
    for (let bar = 0; i < stream.length - 1; bar++) {
      const pat = bar % 2 === 0 ? dotted : eighthTwo16;
      for (const d of pat) {
        if (i >= stream.length - 1) break;
        items.push({ p: stream[i++], dur: d });
      }
    }
    return finish(items, stream[0], 16);
  },
  /** Síncopa corchea-negra-corchea, con la negra sostenida. */
  syncopation(tonic) {
    const stream = octaveUpDown(tonic).slice(0, -1);
    return finish(patterned(stream, [2, 4, 2]), stream[0], 16);
  },
  /** Ataque con acento y notas largas (blancas) por la escala. */
  accentLong(tonic) {
    const s = octaveUpDown(tonic);
    const notes = s.slice(0, -1);
    return finish(patterned(notes, [8]).map((it) => ({ ...it, accent: true })), s[0], 16);
  },
  /** Ligaduras con pistones: de a cuatro notas por grado conjunto y después de a dos por terceras. */
  slurSteps(tonic) {
    const s = ladder(tonic, 'ionian', 15);
    const items: Item[] = [];
    let g = 0;
    // grado conjunto: 1-2-3-4, 2-3-4-5, … ligadas de a cuatro
    for (let i = 0; i + 3 < s.length && i < 8; i++, g++) for (let k = 0; k < 4; k++) items.push({ p: s[i + k], dur: 1, slur: g });
    // terceras: 1-3, 2-4, 3-5 … ligadas de a dos
    for (let i = 0; i + 2 < s.length && i < 8; i++, g++) {
      items.push({ p: s[i], dur: 1, slur: g }, { p: s[i + 2], dur: 1, slur: g });
    }
    return finish(items, s[0]);
  },
};

/** Cierres de frase: 5ª-7ª-2ª-7ª arpegiando el dominante y resolviendo; y 5-4-3-2-1 por grados conjuntos hasta la tónica. */
NEW_SHAPES.closings = (tonic) => {
  const s = ladder(tonic, 'ionian', 9);
  const q = (i: number): Item => ({ p: s[i], dur: 2 });
  return [q(4), q(6), q(8), q(6), q(4), q(6), { p: s[7], dur: 4 }, q(4), q(3), q(2), q(1), { p: s[0], dur: 8 }].map((it) => ({ ...it, p: it.p ?? null }));
};

/** Arpegio de 7ª disminuida sobre la sensible, que resuelve medio tono arriba a la tónica. */
NEW_SHAPES.dim7 = (tonic) => {
  const leading = degreeNote(tonic, '7');
  const tonicP = start(tonic);
  // la sensible por debajo de la tónica si el registro lo permite; si no, por encima
  const lowL = placeNear(leading, midi(tonicP), 'down');
  const L = midi(lowL) >= LOW ? lowL : placeNear(leading, midi(tonicP), 'up');
  const spell = (d: string, ref: Pitch) => placeNear(degreeNote(leading, d), midi(ref), 'up');
  const m3 = spell('b3', L);
  const d5 = spell('b5', m3);
  const d7 = spell('bb7', d5);
  const top = placeNear(leading, midi(d7), 'up');
  const seq = [L, m3, d5, d7, top, d7, d5, m3];
  const target = placeNear(tonic, midi(L), 'up');
  return [...eighths(seq), { p: L, dur: 4 }, { p: target, dur: 4 }];
};

/** Tresillos de corchea sobre grados conjuntos (1-2-3, 2-3-4…) subiendo y bajando; cada nota cuenta 1 y el compás tiene 12. */
NEW_SHAPES.triplets = (tonic) => {
  const s = ladder(tonic, 'ionian', 10);
  const items: Item[] = [];
  const up: number[][] = [];
  const down: number[][] = [];
  for (let i = 0; i + 2 < s.length && i < 8; i++) up.push([i, i + 1, i + 2]);
  for (let i = Math.min(7, s.length - 3); i >= 0; i--) down.push([i + 2, i + 1, i]);
  for (const g of [...up, ...down]) for (const i of g) items.push({ p: s[i], dur: 1 });
  // en registros altos puede faltar un tramo: se completa el último compás con silencios
  const rem = (12 - (items.length % 12)) % 12;
  for (let i = 0; i < rem; i++) items.push({ p: null, dur: 1 });
  return items;
};

/** Cromática ligada de seis notas (tónica, +1, +2, +3, +2, +1), para repetir muchas veces en un solo aire. */
NEW_SHAPES.chromLoop = (tonic) => {
  const m0 = midi(start(tonic));
  const ups = [0, 1, 2, 3].map((k) => fromMidi(m0 + k, false));
  const downs = [2, 1].map((k) => fromMidi(m0 + k, true));
  return eighths([...ups, ...downs]);
};

/** Grupos de cuatro semicorcheas por la escala: 1-2-3-4, 2-3-4-5… subiendo y después en sentido inverso, bajando. */
NEW_SHAPES.fourGroups = (tonic) => {
  const s = ladder(tonic, 'ionian', 12);
  const n = Math.min(s.length, 12);
  const items: Item[] = [];
  for (let i = 0; i + 3 < n && i < 5; i++) for (let k = 0; k < 4; k++) items.push({ p: s[i + k], dur: 1 });
  for (let i = Math.min(4, n - 4); i >= 0; i--) for (let k = 3; k >= 0; k--) items.push({ p: s[i + k], dur: 1 });
  return finish(items, s[0], 16);
};
Object.assign(SHAPES, NEW_SHAPES);

/** ABC con la armadura de la tonalidad escrita. `bpm` es la negra. */
export function techniqueAbc(id: string, concertKey: string, bpm: number): string {
  const tonic = writtenTonic(concertKey);
  const keyAcc = keySignature(tonic);
  const unit = UNIT[id] ?? 8;
  let acc = new Map<string, number>();
  const items = SHAPES[id](tonic);
  const head = (L: number, M = '4/4') => `X:1\nM:${M}\nL:1/${L}\nQ:1/4=${bpm}\nK:${noteName(tonic)}\n`;

  if (id === 'chromLoop') {
    const notes = items.map((it) => abcPitch(it.p!, acc, keyAcc)).join('');
    return `${head(8, '3/4')}"^repetir 8–16 veces" !pp!(${notes}) |]\n`;
  }

  if (id === 'triplets') {
    let body = '';
    let n = 0;
    items.forEach((it) => {
      if (n % 12 === 0) {
        if (n > 0) body += (n / 12) % 4 === 0 ? ' |\n' : ' | ';
        acc = new Map();
      }
      if (n % 3 === 0) body += (n % 12 === 0 ? '' : ' ') + '(3';
      body += it.p ? abcPitch(it.p, acc, keyAcc) : 'z';
      n++;
    });
    return `${head(8)}${body.trim()} |]\n`;
  }

  let body = '';
  let pos = 0;
  items.forEach((it, idx) => {
    if (pos % unit === 0) {
      if (pos > 0) body += (pos / unit) % 4 === 0 ? ' |\n' : ' | ';
      acc = new Map();
    } else if (pos % 4 === 0) body += ' ';
    const prev = items[idx - 1]?.slur;
    const next = items[idx + 1]?.slur;
    if (it.slur !== undefined && it.slur !== prev) body += '(';
    if (it.accent) body += '!accent!';
    body += (it.p ? abcPitch(it.p, acc, keyAcc) : 'z') + (it.dur === 1 ? '' : String(it.dur));
    if (it.slur !== undefined && it.slur !== next) body += ')';
    pos += it.dur;
  });
  return `${head(unit)}${body} |]\n`;
}
