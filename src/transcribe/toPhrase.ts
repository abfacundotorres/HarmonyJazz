import { midiName } from '../theory/notes';
import type { DetectedNote } from './pitch';

export interface LineResult {
  /** Notas en el formato del Vocabulario ("D4", "D4:2", "r:2"), en concierto. */
  line: string;
  /** Corcheas totales. */
  eighths: number;
  bars: number;
}

/**
 * Pasa notas detectadas a la línea del Vocabulario, cuantizadas a corcheas con el tempo dado.
 * `t0` es el instante que cuenta como el comienzo (el principio de la selección).
 * Las notas que se superponen se recortan; las más cortas que una corchea se redondean a una.
 */
export function notesToLine(notes: DetectedNote[], bpm: number, t0: number): LineResult | null {
  if (!(bpm > 0) || notes.length === 0) return null;
  const eighth = 30 / bpm;
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  const tokens: string[] = [];
  const push = (name: string, n: number) => {
    while (n > 0) {
      const d = Math.min(32, n);
      tokens.push(name + (d > 1 ? ':' + d : ''));
      n -= d;
    }
  };
  let pos = 0;
  for (const n of sorted) {
    let s = Math.max(0, Math.round((n.start - t0) / eighth));
    const e = Math.max(s + 1, Math.round((n.end - t0) / eighth));
    if (s < pos) s = pos;
    if (e <= s) continue;
    if (s > pos) push('r', s - pos);
    push(midiName(n.midi), e - s);
    pos = e;
  }
  if (pos === 0) return null;
  return { line: tokens.join(' '), eighths: pos, bars: Math.ceil(pos / 8) };
}
