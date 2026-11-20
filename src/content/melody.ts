/**
 * La melodía de un tema propio: notas en el formato del Vocabulario (`D4`, `D4:2`, `r:2`), en concierto, que empiezan en
 * el primer tiempo del primer compás del cifrado (un anacrusa se escribe con silencios). La app no trae melodías de
 * terceros: las escribe quien las usa. Funciones puras; el editor está en `ui/components/MelodyPanel.tsx`.
 */
import type { MelNote } from '../exercises/generators';
import { barLen, type Chart, parseChart } from '../theory/chart';
import { BB_TRUMPET, INTERVAL, type Interval, invert, pitchName, simplifyPitch, transposePitch } from '../theory/notes';
import { parseLine } from './licks';

export const MAX_MELODY_CHARS = 4000;
export type Reading = 'Bb' | 'C';

/**
 * Valida lo escrito y lo pasa a concierto. Devuelve la melodía lista (texto normalizado) o un mensaje de error.
 * `reading` dice si las notas se escribieron para trompeta en Si♭ (se bajan un tono para pasar a concierto) o en concierto.
 */
export function buildMelody(chart: Chart | string, line: string, reading: Reading = 'C'): { line: string; bars: number } | string {
  let c: Chart;
  try {
    c = typeof chart === 'string' ? parseChart(chart) : chart;
  } catch (e) {
    return `Cifrado: ${(e as Error).message}`;
  }
  if (line.length > MAX_MELODY_CHARS) return 'El texto es demasiado largo';
  let notes: MelNote[];
  try {
    notes = parseLine(line.replace(/[\r\n]+/g, ' '));
  } catch (e) {
    return `Notas: ${(e as Error).message}`;
  }
  if (!notes.some((n) => n.pitch)) return 'Escribí al menos una nota';
  for (const n of notes) if (!Number.isInteger(n.dur) || n.dur < 1 || n.dur > 32) return 'Las duraciones van de 1 a 32 corcheas (ej.: D4:2)';
  const total = notes.reduce((s, n) => s + n.dur, 0);
  const bl = barLen(c);
  if (total > c.bars * bl) return `La melodía ocupa ${Math.ceil(total / bl)} compases y el tema tiene ${c.bars}: revisá las duraciones`;
  const iv: Interval = reading === 'Bb' ? invert(BB_TRUMPET) : INTERVAL.P1;
  const tokens = notes.map((n) => (n.pitch ? pitchName(simplifyPitch(transposePitch(n.pitch, iv))) : 'r') + (n.dur > 1 ? ':' + n.dur : ''));
  return { line: tokens.join(' '), bars: Math.ceil(total / bl) };
}

/** Las notas de una melodía guardada, transpuestas con el mismo intervalo que se le aplica al cifrado. */
export function melodyNotes(line: string, iv: Interval = INTERVAL.P1): MelNote[] {
  try {
    return parseLine(line).map((n) => (n.pitch ? { ...n, pitch: simplifyPitch(transposePitch(n.pitch, iv)) } : n));
  } catch {
    return [];
  }
}

/** Las notas de un tramo de compases (de `from` a `to`, ambos incluidos), con el tiempo contado desde el comienzo del tramo. */
export function sliceMelody(notes: MelNote[], from: number, to: number, bl: number): MelNote[] {
  const a = from * bl;
  const b = (to + 1) * bl;
  return notes.flatMap((n) => {
    if (n.start + n.dur <= a || n.start >= b) return [];
    const start = Math.max(n.start, a);
    const end = Math.min(n.start + n.dur, b);
    return [{ ...n, start: start - a, dur: end - start }];
  });
}
