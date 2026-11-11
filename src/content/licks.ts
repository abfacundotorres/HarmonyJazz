import { Chart, keyInterval, parseChart, transposeChart } from '../theory/chart';
import { midi, parsePitch, shiftOctave, simplifyPitch, transposePitch } from '../theory/notes';
import type { GenOptions, MelNote } from '../exercises/generators';

export type LickLevel = 'Esencial' | 'Intermedio' | 'Avanzado';

export interface Lick {
  id: string;
  name: string;
  /** Tonalidad de referencia (concierto) en la que está escrito. */
  key: string;
  /** Modo para la armadura (por defecto se deduce del cifrado). */
  mode?: 'major' | 'minor';
  level?: LickLevel;
  /** Tempo con el que se empieza; el estudio sube desde ahí. */
  tempo?: number;
  chart: string;
  /** Tokens: "D4" (corchea), "D4:2" (negra), "r:2" (silencio). "|" se ignora. */
  line: string;
  idea: string;
}

export function parseLine(line: string): MelNote[] {
  const out: MelNote[] = [];
  let t = 0;
  for (const tok of line.split(/\s+/).filter((x) => x && x !== '|')) {
    const [p, d] = tok.split(':');
    const dur = d ? Number(d) : 1;
    out.push({ start: t, dur, pitch: p === 'r' ? null : parsePitch(p) });
    t += dur;
  }
  return out;
}

export function lickInKey(l: Lick, key: string, opt: GenOptions): { chart: Chart; notes: MelNote[] } {
  const iv = keyInterval(l.key, key);
  const chart = transposeChart(parseChart(l.chart), iv);
  let notes = parseLine(l.line).map((n) => ({ ...n, pitch: n.pitch ? simplifyPitch(transposePitch(n.pitch, iv)) : null }));
  for (let i = 0; i < 3; i++) {
    const ms = notes.filter((n) => n.pitch).map((n) => midi(n.pitch!));
    const hi = Math.max(...ms);
    const lo = Math.min(...ms);
    const shift = hi > opt.high && lo - 12 >= opt.low - 3 ? -1 : lo < opt.low && hi + 12 <= opt.high + 3 ? 1 : 0;
    if (!shift) break;
    notes = notes.map((n) => ({ ...n, pitch: n.pitch ? shiftOctave(n.pitch, shift) : null }));
  }
  return { chart, notes };
}
