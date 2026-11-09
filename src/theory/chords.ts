import {
  degreeNote, degreePc, Interval, mod, Note, noteName, parseNote, pc, prettyAcc, simplify, transposeNote,
} from './notes';
import { SCALES } from './scales';

/** Familias de calidad. Cada símbolo de cifrado se normaliza a una de estas. */
export type Quality =
  | 'maj' | 'maj7' | '6' | 'maj7#11'
  | 'm' | 'm7' | 'm6' | 'mMaj7' | 'm7b5' | 'dim7'
  | '7' | '7alt' | '7b9' | '7b9b13' | '7#11' | '7b13' | '7sus' | '7#5';

export interface QualityDef {
  /** Notas del acorde (grados). */
  tones: string[];
  /** Guide tones: 3ª y 7ª (o 6ª). */
  guide: [string, string];
  /** Tensiones disponibles. */
  tensions: string[];
  /** Escala-acorde por defecto. */
  scale: string;
  /** Voicings rootless forma A y forma B (grados, de grave a agudo). */
  voicings: [string[], string[]];
  /** Familia para elegir patrones. */
  family: 'major' | 'minor' | 'dominant' | 'halfdim' | 'dim';
}

export const QUALITIES: Record<Quality, QualityDef> = {
  maj: { tones: ['1', '3', '5'], guide: ['3', '7'], tensions: ['9', '13'], scale: 'ionian', voicings: [['3', '5', '7', '9'], ['7', '9', '3', '5']], family: 'major' },
  maj7: { tones: ['1', '3', '5', '7'], guide: ['3', '7'], tensions: ['9', '13', '#11'], scale: 'ionian', voicings: [['3', '5', '7', '9'], ['7', '9', '3', '5']], family: 'major' },
  '6': { tones: ['1', '3', '5', '6'], guide: ['3', '6'], tensions: ['9'], scale: 'ionian', voicings: [['3', '5', '6', '9'], ['6', '9', '3', '5']], family: 'major' },
  'maj7#11': { tones: ['1', '3', '5', '7'], guide: ['3', '7'], tensions: ['9', '#11', '13'], scale: 'lydian', voicings: [['3', '#11', '7', '9'], ['7', '9', '3', '13']], family: 'major' },
  m: { tones: ['1', 'b3', '5'], guide: ['b3', 'b7'], tensions: ['9', '11'], scale: 'dorian', voicings: [['b3', '5', 'b7', '9'], ['b7', '9', 'b3', '5']], family: 'minor' },
  m7: { tones: ['1', 'b3', '5', 'b7'], guide: ['b3', 'b7'], tensions: ['9', '11', '13'], scale: 'dorian', voicings: [['b3', '5', 'b7', '9'], ['b7', '9', 'b3', '5']], family: 'minor' },
  m6: { tones: ['1', 'b3', '5', '6'], guide: ['b3', '6'], tensions: ['9', '11', '7'], scale: 'melodicMinor', voicings: [['b3', '5', '6', '9'], ['6', '9', 'b3', '5']], family: 'minor' },
  mMaj7: { tones: ['1', 'b3', '5', '7'], guide: ['b3', '7'], tensions: ['9', '11', '13'], scale: 'melodicMinor', voicings: [['b3', '5', '7', '9'], ['7', '9', 'b3', '5']], family: 'minor' },
  m7b5: { tones: ['1', 'b3', 'b5', 'b7'], guide: ['b3', 'b7'], tensions: ['9', '11', 'b13'], scale: 'locrian2', voicings: [['b3', 'b5', 'b7', '11'], ['b7', '1', 'b3', 'b5']], family: 'halfdim' },
  dim7: { tones: ['1', 'b3', 'b5', 'bb7'], guide: ['b3', 'bb7'], tensions: ['9', '11', 'b13', '7'], scale: 'wholeHalf', voicings: [['1', 'b3', 'b5', 'bb7'], ['b3', 'b5', 'bb7', '1']], family: 'dim' },
  '7': { tones: ['1', '3', '5', 'b7'], guide: ['3', 'b7'], tensions: ['9', '13'], scale: 'mixolydian', voicings: [['3', '13', 'b7', '9'], ['b7', '9', '3', '13']], family: 'dominant' },
  '7alt': { tones: ['1', '3', 'b7'], guide: ['3', 'b7'], tensions: ['b9', '#9', '#11', 'b13'], scale: 'altered', voicings: [['3', 'b13', 'b7', '#9'], ['b7', '#9', '3', 'b13']], family: 'dominant' },
  '7b9': { tones: ['1', '3', '5', 'b7'], guide: ['3', 'b7'], tensions: ['b9', '#9', '#11', '13'], scale: 'halfWhole', voicings: [['3', '13', 'b7', 'b9'], ['b7', 'b9', '3', '13']], family: 'dominant' },
  '7b9b13': { tones: ['1', '3', '5', 'b7'], guide: ['3', 'b7'], tensions: ['b9', 'b13'], scale: 'phrygianDominant', voicings: [['3', 'b13', 'b7', 'b9'], ['b7', 'b9', '3', 'b13']], family: 'dominant' },
  '7#11': { tones: ['1', '3', '5', 'b7'], guide: ['3', 'b7'], tensions: ['9', '#11', '13'], scale: 'lydianDominant', voicings: [['3', '#11', 'b7', '9'], ['b7', '9', '3', '13']], family: 'dominant' },
  '7b13': { tones: ['1', '3', 'b7'], guide: ['3', 'b7'], tensions: ['9', 'b13'], scale: 'mixolydianb6', voicings: [['3', 'b13', 'b7', '9'], ['b7', '9', '3', 'b13']], family: 'dominant' },
  '7sus': { tones: ['1', '4', '5', 'b7'], guide: ['4', 'b7'], tensions: ['9', '13'], scale: 'mixolydian', voicings: [['4', '5', 'b7', '9'], ['b7', '9', '4', '5']], family: 'dominant' },
  '7#5': { tones: ['1', '3', '#5', 'b7'], guide: ['3', 'b7'], tensions: ['9', '#11'], scale: 'wholeTone', voicings: [['3', '#5', 'b7', '9'], ['b7', '9', '3', '#5']], family: 'dominant' },
};

const ALIASES: [RegExp, Quality][] = [
  [/^(maj7#11|Δ7?#11|\^7?#11|maj9#11|M7#11|lyd)$/, 'maj7#11'],
  [/^(maj7|maj9|maj13|M7|M9|Δ|Δ7|Δ9|\^7?|\^9|ma7|ma9)$/, 'maj7'],
  [/^(6|69|6\/9|M6)$/, '6'],
  [/^(m|min|-)$/, 'm'],
  [/^(m7|m9|m11|m13|-7|-9|-11|min7|min9|mi7)$/, 'm7'],
  [/^(m6|-6|m69|-69|min6)$/, 'm6'],
  [/^(mMaj7|m\(maj7\)|mmaj7|m\^7|-\^7|mΔ|-Δ|mΔ7|-Δ7|mM7)$/, 'mMaj7'],
  [/^(m7b5|ø|ø7|-7b5|mi7b5|m9b5)$/, 'm7b5'],
  [/^(dim7|o7|°7|dim|o|°)$/, 'dim7'],
  [/^(7alt|alt|7#9b13|7b9#9|7#9|7#5#9|7b9#5|7#9#5|7b5#9)$/, '7alt'],
  [/^(7b9|13b9|7b9#11)$/, '7b9'],
  [/^(7b9b13|7b13b9)$/, '7b9b13'],
  [/^(7#11|9#11|13#11|7b5)$/, '7#11'],
  [/^(7b13|9b13)$/, '7b13'],
  [/^(7sus4?|sus4?|9sus4?|13sus4?|7sus)$/, '7sus'],
  [/^(7#5|\+7|7\+|aug7|9#5|9\+)$/, '7#5'],
  [/^(7|9|13|7\(13\)|7\(9\))$/, '7'],
  [/^(maj|M|)$/, 'maj'],
];

export interface Chord {
  root: Note;
  quality: Quality;
  /** El sufijo tal como se escribió (para mostrar). */
  suffix: string;
  bass?: Note;
}

export function parseChord(sym: string): Chord {
  const s = sym.trim();
  const m = /^([A-G](?:bb|b|##|#)?)([^/]*)(?:\/([A-G](?:b|#)?))?$/.exec(s);
  if (!m) throw new Error(`Cifrado inválido: ${sym}`);
  const suffix = m[2];
  const hit = ALIASES.find(([re]) => re.test(suffix));
  if (!hit) throw new Error(`Calidad desconocida: ${suffix} (en ${sym})`);
  return { root: parseNote(m[1]), quality: hit[1], suffix, bass: m[3] ? parseNote(m[3]) : undefined };
}

export function chordSymbol(c: Chord, pretty = false): string {
  const txt = noteName(c.root) + c.suffix + (c.bass ? '/' + noteName(c.bass) : '');
  return pretty ? prettyAcc(txt) : txt;
}

export function transposeChord(c: Chord, iv: Interval): Chord {
  return {
    ...c,
    root: simplify(transposeNote(c.root, iv)),
    bass: c.bass ? simplify(transposeNote(c.bass, iv)) : undefined,
  };
}

export const qdef = (c: Chord) => QUALITIES[c.quality];

export function chordTones(c: Chord): Note[] {
  return qdef(c).tones.map((d) => degreeNote(c.root, d));
}

export function chordDegreeNote(c: Chord, degree: string): Note {
  return degreeNote(c.root, degree);
}

export type NoteRole = 'chord' | 'tension' | 'scale' | 'chromatic';

export interface NoteAnalysis {
  role: NoteRole;
  /** Grado respecto de la raíz del acorde, p. ej. "3", "b9". */
  degree: string;
  guide: boolean;
}

/** Clasifica una clase de altura (concierto) respecto de un acorde. */
export function analyzePc(c: Chord, notePc: number): NoteAnalysis {
  const rel = mod(notePc - pc(c.root), 12);
  const d = qdef(c);
  const find = (list: string[]) => list.find((x) => degreePc(x) === rel);
  const guide = d.guide.some((g) => degreePc(g) === rel);
  const ct = find(d.tones);
  if (ct) return { role: 'chord', degree: ct, guide };
  const t = find(d.tensions);
  if (t) return { role: 'tension', degree: t, guide };
  const sc = find(SCALES[d.scale].degrees);
  if (sc) return { role: 'scale', degree: sc, guide };
  const CHROM = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
  return { role: 'chromatic', degree: CHROM[rel], guide };
}

/** Nombre del grado para lectura: b9, #11, b13 en lugar de b2, #4, b6. */
export function prettyDegree(d: string) {
  const map: Record<string, string> = { b2: 'b9', '2': '9', '#2': '#9', '4': '11', '#4': '#11', b6: 'b13', '6': '13' };
  return prettyAcc(map[d] ?? d);
}
