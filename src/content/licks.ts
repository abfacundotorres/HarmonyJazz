import { Chart, keyInterval, parseChart, transposeChart } from '../theory/chart';
import { midi, parsePitch, shiftOctave, simplifyPitch, transposePitch } from '../theory/notes';
import type { GenOptions, MelNote } from '../exercises/generators';

export interface Lick {
  id: string;
  name: string;
  /** Tonalidad de referencia (concierto) en la que está escrito. */
  key: string;
  chart: string;
  /** Tokens: "D4" (corchea), "D4:2" (negra), "r:2" (silencio). "|" se ignora. */
  line: string;
  idea: string;
}

// Frases originales, escritas en concierto. Se transponen a cualquier tonalidad.
export const LICKS: Lick[] = [
  {
    id: 'bebop-251',
    name: 'ii–V–I bebop con ♭9 y ♭13',
    key: 'C',
    chart: 'Dm7 | G7b9b13 | Cmaj7 | Cmaj7',
    line: 'r D4 F4 A4 C5 E5 D5 C5 | B4 D5 F5 Ab5 G5 F5 Eb5 D5 | E5:3 D5 B4 G4 A4:2 | r:8',
    idea: 'Arpegio de Dm9 que desemboca en la 3ª de G7; luego un arpegio de G7♭9 y la ♭13 que cae por grado a la 9ª antes de resolver en la 3ª de C.',
  },
  {
    id: 'enclosure-251',
    name: 'ii–V corto con enclosure',
    key: 'C',
    chart: 'Dm7 G7 | Cmaj7',
    line: 'A4 C5 E5 D5 B4 G4 F4 D#4 | E4:2 G4 B4 D5 C5 A4:2',
    idea: 'F (arriba) y D♯ (abajo) encierran la 3ª de C. Fijate que el ii dura dos tiempos: la línea ya está en la 3ª de G7 al llegar.',
  },
  {
    id: 'minor-251',
    name: 'ii–V–i menor alterado',
    key: 'C',
    chart: 'Dm7b5 | G7alt | Cm6 | Cm6',
    line: 'r F4 Ab4 C5 E5 D5 C5 Ab4 | B4 Eb5 Db5 B4 Bb4 Ab4 G4 F4 | Eb4:2 G4 A4 C5 D5 B4 C5 | G4:4 r:4',
    idea: 'La 9ª natural sobre el semidisminuido (locria ♮2), la escala alterada en el V y la menor melódica en el i: toda la frase sale de dos escalas menores melódicas.',
  },
  {
    id: 'bebop-scale-251',
    name: 'Bebop descendente en el V',
    key: 'C',
    chart: 'Dm7 | G7 | Cmaj7 | Cmaj7',
    line: 'D5 C5 A4 F4 E4 F4 A4 C5 | B4 A4 Ab4 G4 F4 E4 D4 F4 | E4 G4 B4 D5 C5 B4 G4 E4 | D4:2 E4:6',
    idea: 'La nota de paso A♭ entre A y G pone G, F y D en tiempo fuerte. Terminar en la 9ª y resolver a la 3ª da un final menos obvio.',
  },
  {
    id: 'blues-blue-note',
    name: 'Blues: la blue note que resbala',
    key: 'F',
    chart: 'F7 | Bb7 | F7 | F7',
    line: 'r C5 Ab4 A4 C5 D5 C5 A4 | Ab4:2 F4 D4 F4 Ab4 G4 F4 | A4:3 G4 F4 Eb4 D4 C4 | F4:2 r:6',
    idea: 'La ♭3 (A♭) resbala a la 3ª (A) sobre F7 y se vuelve 7ª de B♭7 en el compás siguiente: una misma nota, dos funciones.',
  },
  {
    id: 'anticipation-251',
    name: 'Anticipación de la resolución',
    key: 'C',
    chart: 'Dm7 G7 | Cmaj7',
    line: 'r F4 A4 C5 B4:2 G4 E4:3 G4 B4 D5 C5:2 r',
    idea: 'La 3ª de C llega en el "y" del 4, una corchea antes del cambio. Articulala con acento y ligala: así suena el swing.',
  },
];

export const lickById = (id: string) => LICKS.find((l) => l.id === id)!;

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
