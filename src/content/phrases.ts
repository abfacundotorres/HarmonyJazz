import { chartToString, CONCERT_KEYS, parseChart, transposeChart } from '../theory/chart';
import { BB_TRUMPET, INTERVAL, Interval, invert, pitchName, simplifyPitch, transposePitch } from '../theory/notes';
import { Lick, LickLevel, parseLine } from './licks';

/** Frases que carga el usuario (se guardan sólo en su dispositivo). Cada una es un `Lick` en concierto. */
export interface PhraseLibrary {
  phrases: Lick[];
}

export const MAX_PHRASES = 300;
export const MAX_LINE_CHARS = 4000;
export type Reading = 'Bb' | 'C';

export interface PhraseInput {
  name: string;
  /** Tonalidad en que está escrito el cifrado (en la lectura elegida). */
  key: string;
  mode: 'major' | 'minor';
  level: LickLevel;
  tempo: number;
  /** Cifrado: compases separados por "|". */
  chart: string;
  /** Notas: "D4" (corchea), "D4:2" (negra), "r:2" (silencio). */
  line: string;
  idea: string;
  /** En qué lectura se escribieron notas, cifrado y tonalidad. */
  reading: Reading;
}

export const newPhraseId = () => 'p:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const readingInterval = (r: Reading): Interval => (r === 'Bb' ? invert(BB_TRUMPET) : INTERVAL.P1);

/** Valida lo escrito a mano y lo pasa a concierto. Devuelve la frase lista o un mensaje de error. */
export function buildPhrase(input: PhraseInput, id: string): Lick | string {
  const name = input.name.trim();
  if (!name) return 'Falta el nombre';
  if (name.length > 80) return 'El nombre es demasiado largo (máximo 80 caracteres)';
  if (!CONCERT_KEYS.includes(input.key)) return 'Elegí la tonalidad';
  if (!(input.tempo >= 40 && input.tempo <= 300)) return 'El tempo debe estar entre 40 y 300';
  if (input.line.length > MAX_LINE_CHARS || input.chart.length > MAX_LINE_CHARS) return 'El texto es demasiado largo';
  const iv = readingInterval(input.reading);
  let chartText: string;
  let bars: number;
  try {
    const c = parseChart(input.chart.replace(/[\r\n]+/g, ' | '));
    bars = c.bars;
    chartText = chartToString(transposeChart(c, iv)).replace(/^\| | \|$/g, '');
  } catch (e) {
    return `Cifrado: ${(e as Error).message}`;
  }
  let notes;
  try {
    notes = parseLine(input.line.replace(/[\r\n]+/g, ' '));
  } catch (e) {
    return `Notas: ${(e as Error).message}`;
  }
  if (!notes.some((n) => n.pitch)) return 'Escribí al menos una nota';
  for (const n of notes) if (!Number.isInteger(n.dur) || n.dur < 1 || n.dur > 32) return 'Las duraciones van de 1 a 32 corcheas (ej.: D4:2)';
  const total = notes.reduce((s, n) => s + n.dur, 0);
  const cap = bars * 8;
  if (total > cap) return `Las notas ocupan ${total / 8} compases y el cifrado tiene ${bars}: agregá compases al cifrado o acortá las notas`;
  // completa con silencio hasta el final del último compás
  const tokens = notes.map((n) => (n.pitch ? pitchName(simplifyPitch(transposePitch(n.pitch, iv))) : 'r') + (n.dur > 1 ? ':' + n.dur : ''));
  if (total < cap) tokens.push('r' + (cap - total > 1 ? ':' + (cap - total) : ''));
  // la tonalidad se traduce con el mismo intervalo (C → B♭ al pasar de escrito a concierto)
  const key = keyOf(input.key, iv);
  return {
    id,
    name,
    key,
    mode: input.mode,
    level: input.level,
    tempo: Math.round(input.tempo),
    chart: chartText,
    line: tokens.join(' '),
    idea: input.idea.trim().slice(0, 600),
  };
}

function keyOf(key: string, iv: Interval): string {
  // en la lectura de trompeta, "C" escrito suena B♭: se pasa por la clase de altura
  const semis = CONCERT_KEYS.indexOf(key) + iv.semis;
  return CONCERT_KEYS[((semis % 12) + 12) % 12];
}

/** Valida una frase guardada (por si el almacenamiento tiene datos dañados). */
export function validatePhrase(raw: unknown): Lick | string {
  const t = raw as Partial<Lick> | null;
  if (!t || typeof t !== 'object' || typeof t.id !== 'string' || typeof t.name !== 'string') return 'Formato inválido';
  const r = buildPhrase(
    {
      name: t.name,
      key: String(t.key),
      mode: t.mode === 'minor' ? 'minor' : 'major',
      level: (['Esencial', 'Intermedio', 'Avanzado'] as const).find((l) => l === t.level) ?? 'Intermedio',
      tempo: Number(t.tempo) || 120,
      chart: String(t.chart),
      line: String(t.line),
      idea: typeof t.idea === 'string' ? t.idea : '',
      reading: 'C',
    },
    t.id,
  );
  return r;
}
