// Núcleo de notas con ortografía correcta (letra + alteración), no sólo clases de altura.
// Esto permite escribir C7alt como C Db D# E F# Ab Bb y no como números sueltos.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
/** Semitonos de cada letra natural desde C. */
export const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
/** Semitonos de los grados de la escala mayor (1..7). */
export const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];

export interface Note {
  /** 0..6 → C..B */
  letter: number;
  /** -2..2 (bb, b, natural, #, ##) */
  acc: number;
}

export interface Pitch extends Note {
  /** Octava científica: C4 = do central (MIDI 60). */
  octave: number;
}

export interface Interval {
  /** Distancia en letras (0 = unísono, 1 = segunda, ...). Puede ser > 6. */
  steps: number;
  /** Distancia en semitonos. */
  semis: number;
}

export const mod = (n: number, m: number) => ((n % m) + m) % m;

export function pc(n: Note): number {
  return mod(NATURAL_PC[n.letter] + n.acc, 12);
}

export function midi(p: Pitch): number {
  return (p.octave + 1) * 12 + NATURAL_PC[p.letter] + p.acc;
}

export function parseNote(s: string): Note {
  const m = /^([A-Ga-g])(bb|b|##|#|x|♭♭|♭|♯|𝄫|𝄪)?$/.exec(s.trim());
  if (!m) throw new Error(`Nota inválida: ${s}`);
  const letter = LETTERS.indexOf(m[1].toUpperCase() as (typeof LETTERS)[number]);
  const a = m[2] ?? '';
  const acc =
    a === 'bb' || a === '♭♭' || a === '𝄫' ? -2 :
    a === 'b' || a === '♭' ? -1 :
    a === '#' || a === '♯' ? 1 :
    a === '##' || a === 'x' || a === '𝄪' ? 2 : 0;
  return { letter, acc };
}

/** "Bb4", "F#3", "C5" */
export function parsePitch(s: string): Pitch {
  const m = /^([A-Ga-g](?:bb|b|##|#)?)(-?\d)$/.exec(s.trim());
  if (!m) throw new Error(`Altura inválida: ${s}`);
  return { ...parseNote(m[1]), octave: Number(m[2]) };
}

export function accString(acc: number, pretty = false): string {
  if (pretty) return ['𝄫', '♭', '', '♯', '𝄪'][acc + 2];
  return acc < 0 ? 'b'.repeat(-acc) : '#'.repeat(acc);
}

export function noteName(n: Note, pretty = false): string {
  return LETTERS[n.letter] + accString(n.acc, pretty);
}

export function pitchName(p: Pitch, pretty = false): string {
  return noteName(p, pretty) + p.octave;
}

export function sameNote(a: Note, b: Note) {
  return a.letter === b.letter && a.acc === b.acc;
}

/** Transpone una nota (sin octava) conservando la ortografía interválica. */
export function transposeNote(n: Note, iv: Interval): Note {
  const letter = mod(n.letter + iv.steps, 7);
  const target = pc(n) + iv.semis;
  let acc = mod(target - NATURAL_PC[letter], 12);
  if (acc > 6) acc -= 12;
  return { letter, acc };
}

export function transposePitch(p: Pitch, iv: Interval): Pitch {
  const abs = p.letter + 7 * p.octave + iv.steps;
  const letter = mod(abs, 7);
  const octave = Math.floor(abs / 7);
  const nat = (octave + 1) * 12 + NATURAL_PC[letter];
  return { letter, octave, acc: midi(p) + iv.semis - nat };
}

/** Intervalo (ascendente, dentro de la octava) de a hacia b. */
export function intervalBetween(a: Note, b: Note): Interval {
  const steps = mod(b.letter - a.letter, 7);
  const semis = mod(pc(b) - pc(a), 12);
  return { steps, semis };
}

export const INTERVAL = {
  P1: { steps: 0, semis: 0 },
  m2: { steps: 1, semis: 1 },
  M2: { steps: 1, semis: 2 },
  m3: { steps: 2, semis: 3 },
  M3: { steps: 2, semis: 4 },
  P4: { steps: 3, semis: 5 },
  A4: { steps: 3, semis: 6 },
  d5: { steps: 4, semis: 6 },
  P5: { steps: 4, semis: 7 },
  m6: { steps: 5, semis: 8 },
  M6: { steps: 5, semis: 9 },
  m7: { steps: 6, semis: 10 },
  M7: { steps: 6, semis: 11 },
} satisfies Record<string, Interval>;

/** Trompeta en Si♭: se escribe una 2ª mayor por encima de lo que suena. */
export const BB_TRUMPET: Interval = INTERVAL.M2;
export const invert = (iv: Interval): Interval => ({ steps: -iv.steps, semis: -iv.semis });

/**
 * Re-escribe ortografías incómodas (dobles alteraciones, Cb, Fb, E#, B#)
 * a su enarmónico más simple. Se usa para raíces de acordes y para la lectura.
 */
export function simplify(n: Note): Note {
  const odd =
    Math.abs(n.acc) > 1 ||
    (n.acc === -1 && (n.letter === 0 || n.letter === 3)) ||
    (n.acc === 1 && (n.letter === 2 || n.letter === 6));
  if (!odd) return n;
  const p = pc(n);
  const dir = n.acc > 0 ? 1 : -1;
  // probar natural, luego la alteración del mismo signo
  for (const acc of [0, dir]) {
    for (let letter = 0; letter < 7; letter++) {
      if (mod(NATURAL_PC[letter] + acc, 12) === p) return { letter, acc };
    }
  }
  return n;
}

export function simplifyPitch(p: Pitch): Pitch {
  const n = simplify(p);
  if (sameNote(n, p)) return p;
  const m = midi(p);
  const octave = Math.floor((m - NATURAL_PC[n.letter] - n.acc) / 12) - 1;
  return { ...n, octave };
}

// ---------- Grados ("b9", "#11", "13") ----------

export interface Degree {
  /** 1..13 */
  num: number;
  acc: number;
}

export function parseDegree(s: string): Degree {
  const m = /^(bb|b|##|#)?(\d{1,2})$/.exec(s);
  if (!m) throw new Error(`Grado inválido: ${s}`);
  const a = m[1] ?? '';
  const acc = a === 'bb' ? -2 : a === 'b' ? -1 : a === '#' ? 1 : a === '##' ? 2 : 0;
  return { num: Number(m[2]), acc };
}

export function degreeInterval(d: Degree | string): Interval {
  const dg = typeof d === 'string' ? parseDegree(d) : d;
  const idx = dg.num - 1;
  const oct = Math.floor(idx / 7);
  return { steps: idx, semis: MAJOR_SEMIS[idx % 7] + 12 * oct + dg.acc };
}

/** Nota (sin octava) que corresponde a un grado sobre una raíz. */
export function degreeNote(root: Note, d: Degree | string): Note {
  const iv = degreeInterval(d);
  return transposeNote(root, { steps: iv.steps % 7, semis: mod(iv.semis, 12) });
}

/** Clase de altura relativa (0..11) de un grado. */
export function degreePc(d: string): number {
  return mod(degreeInterval(d).semis, 12);
}

// ---------- Colocación en el registro ----------

export function pitchFromNote(n: Note, octave: number): Pitch {
  return { ...n, octave };
}

/** La aparición de la nota más cercana a `ref` (en la dirección pedida, si la hay). */
export function placeNear(n: Note, ref: number, dir: 'up' | 'down' | 'near' = 'near'): Pitch {
  const base = NATURAL_PC[n.letter] + n.acc; // puede ser -1..13
  // midi = (oct+1)*12 + base
  let best: Pitch | null = null;
  let bestDist = Infinity;
  for (let oct = Math.floor((ref - base) / 12) - 2; oct <= Math.floor((ref - base) / 12) + 1; oct++) {
    const m = (oct + 1) * 12 + base;
    if (dir === 'up' && m <= ref) continue;
    if (dir === 'down' && m >= ref) continue;
    const d = Math.abs(m - ref);
    if (d < bestDist) {
      bestDist = d;
      best = { ...n, octave: oct };
    }
  }
  return best!;
}

export function shiftOctave(p: Pitch, octaves: number): Pitch {
  return { ...p, octave: p.octave + octaves };
}

export function midiToFreq(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function freqToMidi(f: number) {
  return 69 + 12 * Math.log2(f / 440);
}

/** Nombre por defecto para un número MIDI (bemoles, estilo jazz). */
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export function midiName(m: number, withOctave = true): string {
  const r = Math.round(m);
  return FLAT_NAMES[mod(r, 12)] + (withOctave ? Math.floor(r / 12) - 1 : '');
}

export function prettyAcc(s: string) {
  return s.replace(/bb/g, '𝄫').replace(/b/g, '♭').replace(/##/g, '𝄪').replace(/#/g, '♯');
}
