/**
 * Entrenamiento del oído: intervalos, calidades de acorde y dictado de guide tones. Núcleo puro (sin audio ni React):
 * genera preguntas como listas de notas a tocar y opciones a elegir, y lleva la cuenta de aciertos para repetir más lo que se falla.
 * Todo está en alturas de concierto; la pantalla traduce los nombres de nota a la lectura elegida.
 */
import { chordTones, parseChord, type Chord } from '../theory/chords';
import { degreeNote, midi, parseNote, placeNear, type Note } from '../theory/notes';

export type Rng = () => number;
export type Voice = 'horn' | 'piano';
/** Nota a tocar: `start` y `dur` en segundos desde el comienzo de la pregunta. */
export interface EarEvent {
  midi: number;
  start: number;
  dur: number;
  voice: Voice;
}

// ---------- estadísticas ----------

/** Por ítem: respuestas, aciertos y último día que se contestó (número de día). */
export type EarStats = Record<string, { n: number; ok: number; d: number }>;

export function record(stats: EarStats, id: string, right: boolean, day: number): EarStats {
  const cur = stats[id] ?? { n: 0, ok: 0, d: day };
  return { ...stats, [id]: { n: cur.n + 1, ok: cur.ok + (right ? 1 : 0), d: day } };
}

/** Peso para elegir un ítem: lo que nunca se contestó y lo que se falla pesan más; con pocos datos se supone un 50 %. */
export function weight(s: EarStats[string] | undefined): number {
  const n = s?.n ?? 0;
  const ok = s?.ok ?? 0;
  const rate = (ok + 1) / (n + 2); // acierto suavizado
  return 0.4 + 3 * (1 - rate);
}

/** Elige un ítem según el peso; no repite el anterior si hay alternativa. */
export function pickItem(ids: readonly string[], stats: EarStats, rng: Rng, last?: string): string {
  const pool = ids.length > 1 ? ids.filter((i) => i !== last) : ids;
  const w = pool.map((i) => weight(stats[i]));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export const rate = (s: EarStats[string] | undefined) => (s && s.n > 0 ? s.ok / s.n : null);

// ---------- intervalos ----------

export const INTERVAL_NAMES: Record<number, string> = {
  1: '2ª menor', 2: '2ª mayor', 3: '3ª menor', 4: '3ª mayor', 5: '4ª justa', 6: 'Tritono',
  7: '5ª justa', 8: '6ª menor', 9: '6ª mayor', 10: '7ª menor', 11: '7ª mayor', 12: '8ª justa',
};
export const INTERVAL_SEMIS = Object.keys(INTERVAL_NAMES).map(Number);
export type IntervalMode = 'asc' | 'desc' | 'harm';
export const MODE_LABEL: Record<IntervalMode, string> = { asc: 'Ascendente', desc: 'Descendente', harm: 'Armónico' };
export const intervalId = (mode: IntervalMode, semis: number) => `i:${mode}:${semis}`;

export interface Question {
  /** Ítem que se contabiliza (el de la respuesta correcta). */
  id: string;
  prompt: string;
  events: EarEvent[];
  options: { id: string; label: string }[];
  answer: string;
  /** Cómo sonaría cada opción con la misma nota de partida, para comparar la respuesta con la correcta. */
  optionEvents: Record<string, EarEvent[]>;
}

const between = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

const intervalEvents = (mode: IntervalMode, a: number, semis: number): EarEvent[] => {
  const b = mode === 'desc' ? a - semis : a + semis;
  return mode === 'harm'
    ? [{ midi: a, start: 0, dur: 2, voice: 'piano' }, { midi: b, start: 0, dur: 2, voice: 'piano' }]
    : [{ midi: a, start: 0, dur: 0.9, voice: 'horn' }, { midi: b, start: 1, dur: 1.2, voice: 'horn' }];
};

/** Pregunta de intervalo. La nota de base queda entre Sol3 y Sol4 (concierto) y la otra dentro del registro de la trompeta. */
export function intervalQuestion(mode: IntervalMode, semis: number, rng: Rng): Question {
  const low = 55;
  const high = 79;
  let a = between(rng, 55, 67);
  if (mode === 'desc') a = Math.max(a, low + semis);
  if (mode !== 'desc') a = Math.min(a, high - semis);
  return {
    id: intervalId(mode, semis),
    prompt: '¿Qué intervalo es?',
    events: intervalEvents(mode, a, semis),
    options: INTERVAL_SEMIS.map((x) => ({ id: String(x), label: INTERVAL_NAMES[x] })),
    answer: String(semis),
    optionEvents: Object.fromEntries(INTERVAL_SEMIS.map((x) => [String(x), intervalEvents(mode, a, x)])),
  };
}

// ---------- calidades de acorde ----------

export interface QualityDef {
  label: string;
  /** Semitonos sobre la fundamental. */
  tones: number[];
  seventh: boolean;
}
export const QUALITY_DEFS: Record<string, QualityDef> = {
  maj: { label: 'Mayor', tones: [0, 4, 7], seventh: false },
  min: { label: 'Menor', tones: [0, 3, 7], seventh: false },
  dim: { label: 'Disminuido', tones: [0, 3, 6], seventh: false },
  aug: { label: 'Aumentado', tones: [0, 4, 8], seventh: false },
  maj7: { label: 'maj7', tones: [0, 4, 7, 11], seventh: true },
  m7: { label: 'm7', tones: [0, 3, 7, 10], seventh: true },
  dom7: { label: '7 (dominante)', tones: [0, 4, 7, 10], seventh: true },
  m7b5: { label: 'm7♭5', tones: [0, 3, 6, 10], seventh: true },
};
export type ChordSet = 'triads' | 'sevenths';
export const CHORD_SETS: Record<ChordSet, string[]> = {
  triads: ['maj', 'min', 'dim', 'aug'],
  sevenths: ['maj7', 'm7', 'dom7', 'm7b5'],
};
export type ChordMode = 'arp' | 'block';
export const CHORD_MODE_LABEL: Record<ChordMode, string> = { arp: 'Arpegiado', block: 'En bloque' };
export const chordId = (mode: ChordMode, q: string) => `c:${mode}:${q}`;

const chordEvents = (mode: ChordMode, root: number, q: string): EarEvent[] => {
  const notes = QUALITY_DEFS[q].tones.map((t) => root + t);
  return mode === 'arp'
    ? notes.map((m, i) => ({ midi: m, start: i * 0.55, dur: 0.7, voice: 'horn' as Voice }))
    : notes.map((m) => ({ midi: m, start: 0, dur: 2.2, voice: 'piano' as Voice }));
};

export function chordQuestion(set: ChordSet, mode: ChordMode, q: string, rng: Rng): Question {
  const root = between(rng, 48, 58);
  return {
    id: chordId(mode, q),
    prompt: '¿Qué calidad de acorde es?',
    events: chordEvents(mode, root, q),
    options: CHORD_SETS[set].map((k) => ({ id: k, label: QUALITY_DEFS[k].label })),
    answer: q,
    optionEvents: Object.fromEntries(CHORD_SETS[set].map((k) => [k, chordEvents(mode, root, k)])),
  };
}

// ---------- dictado de guide tones ----------

export type GtDegree = '1' | '3' | '5' | '7';
export interface GtSlot {
  chord: string; // cifrado en concierto
  /** Nombre de cada nota del acorde (concierto, ortografía correcta), por grado. */
  names: Record<GtDegree, Note>;
  /** Grado que toca la trompeta (3ª o 7ª). */
  played: '3' | '7';
}
export interface GtQuestion {
  key: string;
  slots: GtSlot[];
  events: EarEvent[];
}

const II_V_I = [
  { deg: '2', suffix: 'm7' },
  { deg: '5', suffix: '7' },
  { deg: '1', suffix: 'maj7' },
] as const;

/** ii–V–I mayor: el piano toca fundamental y quinta (sin 3ª ni 7ª) y la trompeta una línea de guide tones con la conducción más cercana. */
export function guideToneQuestion(key: string, rng: Rng, stats: EarStats = {}): GtQuestion {
  // la 3ª y la 7ª salen según lo que se falla de cada una
  const w3 = weight(stats[gtId('3')]);
  const w7 = weight(stats[gtId('7')]);
  const tonic = parseNote(key);
  let prev = 64;
  const slots: GtSlot[] = [];
  const events: EarEvent[] = [];
  II_V_I.forEach((c, i) => {
    const root = degreeNote(tonic, c.deg);
    const chord: Chord = parseChord(`${spell(root)}${c.suffix}`);
    const t = chordTones(chord); // 1, 3, 5, 7
    const names: Record<GtDegree, Note> = { '1': t[0], '3': t[1], '5': t[2], '7': t[3] };
    // cada acorde toca la 3ª o la 7ª, con más chance la que peor sale
    const played: '3' | '7' = rng() < w3 / (w3 + w7) ? '3' : '7';
    // la aparición más cercana a la nota anterior dentro del registro de la trompeta
    const pcN = midi(placeNear(names[played], 60, 'near')) % 12;
    let m = -1;
    for (let c = 55; c <= 76; c++) if (c % 12 === pcN && (m < 0 || Math.abs(c - prev) < Math.abs(m - prev))) m = c;
    prev = m;
    const start = i * 2.2;
    const r = midi(placeNear(chord.root, 45, 'near'));
    const f = midi(placeNear(names['5'], r + 5, 'up'));
    events.push({ midi: r, start, dur: 2, voice: 'piano' }, { midi: f, start, dur: 2, voice: 'piano' });
    events.push({ midi: m, start: start + 0.05, dur: 1.9, voice: 'horn' });
    slots.push({ chord: spell(root) + c.suffix, names, played });
  });
  return { key, slots, events };
}

const spell = (n: Note) => {
  const acc = n.acc < 0 ? 'b'.repeat(-n.acc) : '#'.repeat(n.acc);
  return 'CDEFGAB'[n.letter] + acc;
};

export const GT_DEGREES: GtDegree[] = ['1', '3', '5', '7'];
export const GT_DEGREE_LABEL: Record<GtDegree, string> = { '1': 'Fundamental', '3': '3ª', '5': '5ª', '7': '7ª' };
export const gtId = (d: '3' | '7') => `g:${d}`;
export const GT_IDS = [gtId('3'), gtId('7')];

/** Ítems con su rótulo, para el resumen de aciertos. */
export const ALL_ITEMS: { id: string; group: string; label: string }[] = [
  ...(['asc', 'desc', 'harm'] as const).flatMap((m) => INTERVAL_SEMIS.map((s) => ({ id: intervalId(m, s), group: `Intervalos · ${MODE_LABEL[m]}`, label: INTERVAL_NAMES[s] }))),
  ...(['arp', 'block'] as const).flatMap((m) => Object.keys(QUALITY_DEFS).map((q) => ({ id: chordId(m, q), group: `Acordes · ${CHORD_MODE_LABEL[m]}`, label: QUALITY_DEFS[q].label }))),
  { id: gtId('3'), group: 'Guide tones', label: 'Reconocer la 3ª' },
  { id: gtId('7'), group: 'Guide tones', label: 'Reconocer la 7ª' },
];
