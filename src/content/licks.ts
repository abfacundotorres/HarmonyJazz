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

// Frases originales, escritas en concierto. Se transponen a cualquier tonalidad.
export const LICKS: Lick[] = [
  {
    id: 'bebop-251',
    name: 'ii–V–I bebop con ♭9 y ♭13',
    key: 'C',
    level: 'Intermedio',
    tempo: 140,
    chart: 'Dm7 | G7b9b13 | Cmaj7 | Cmaj7',
    line: 'r D4 F4 A4 C5 E5 D5 C5 | B4 D5 F5 Ab5 G5 F5 Eb5 D5 | E5:3 D5 B4 G4 A4:2 | r:8',
    idea: 'Arpegio de Dm9 que desemboca en la 3ª de G7; luego un arpegio de G7♭9 y la ♭13 que cae por grado a la 9ª antes de resolver en la 3ª de C.',
  },
  {
    id: 'enclosure-251',
    name: 'ii–V corto con enclosure',
    key: 'C',
    level: 'Intermedio',
    tempo: 140,
    chart: 'Dm7 G7 | Cmaj7',
    line: 'A4 C5 E5 D5 B4 G4 F4 D#4 | E4:2 G4 B4 D5 C5 A4:2',
    idea: 'F (arriba) y D♯ (abajo) encierran la 3ª de C. Fijate que el ii dura dos tiempos: la línea ya está en la 3ª de G7 al llegar.',
  },
  {
    id: 'minor-251',
    name: 'ii–V–i menor alterado',
    key: 'C',
    level: 'Avanzado',
    tempo: 130,
    chart: 'Dm7b5 | G7alt | Cm6 | Cm6',
    line: 'r F4 Ab4 C5 E5 D5 C5 Ab4 | B4 Eb5 Db5 B4 Bb4 Ab4 G4 F4 | Eb4:2 G4 A4 C5 D5 B4 C5 | G4:4 r:4',
    idea: 'La 9ª natural sobre el semidisminuido (locria ♮2), la escala alterada en el V y la menor melódica en el i: toda la frase sale de dos escalas menores melódicas.',
  },
  {
    id: 'bebop-scale-251',
    name: 'Escala bebop descendente en el V',
    key: 'C',
    level: 'Intermedio',
    tempo: 140,
    chart: 'Dm7 | G7 | Cmaj7 | Cmaj7',
    line: 'D5 C5 A4 F4 E4 F4 A4 C5 | D5 C5 B4 A4 G4 F#4 F4 E4:3 | G4 B4 D5 C5 B4 G4 | E4:4 r:4',
    idea: 'La escala bebop dominante (G A B C D E F F♯) agrega una nota de paso, la 7ª mayor (F♯), entre G y F. Así, bajando desde la 5ª, la 5ª, la 3ª, la fundamental y la ♭7 caen en los cuatro tiempos del compás.',
  },
  {
    id: 'blues-blue-note',
    name: 'Blues: la blue note que resbala',
    key: 'F',
    level: 'Esencial',
    tempo: 130,
    chart: 'F7 | Bb7 | F7 | F7',
    line: 'r C5 Ab4 A4 C5 D5 C5 A4 | Ab4:2 F4 D4 F4 Ab4 G4 F4 | A4:3 G4 F4 Eb4 D4 C4 | F4:2 r:6',
    idea: 'La ♭3 (A♭) resbala a la 3ª (A) sobre F7 y se vuelve 7ª de B♭7 en el compás siguiente: una misma nota, dos funciones.',
  },
  {
    id: 'anticipation-251',
    name: 'Anticipación de la resolución',
    key: 'C',
    level: 'Intermedio',
    tempo: 150,
    chart: 'Dm7 G7 | Cmaj7',
    line: 'r F4 A4 C5 B4:2 G4 E4:3 G4 B4 D5 C5:2 r',
    idea: 'La 3ª de C llega en el "y" del 4, una corchea antes del cambio. Articulala con acento y ligala: así suena el swing.',
  },
  {
    id: 'arp-3579',
    name: 'Arpegios 3-5-7-9 sobre ii–V–I',
    key: 'C',
    level: 'Esencial',
    tempo: 120,
    chart: 'Dm7 | G7 | Cmaj7 | Cmaj7',
    line: 'r F4 A4 C5 E5 D5 C5:2 | B4 D5 F5 D5 B4 G4 F4:2 | E4 G4 B4 D5 B4 G4 E4:2 | r:8',
    idea: 'Cada acorde se toca desde su 3ª: F-A-C-E sobre Dm7, B-D-F sobre G7 y E-G-B-D sobre Cmaj7. La 7ª de cada acorde baja por semitono a la 3ª del siguiente.',
  },
  {
    id: 'penta-alt',
    name: 'Pentatónica sobre el V alterado',
    key: 'C',
    mode: 'minor',
    level: 'Avanzado',
    tempo: 120,
    chart: 'Dm7b5 | G7alt | Cm6 | Cm6',
    line: 'F4 Ab4 C5 D5 C5 Ab4 F4 D4 | Bb4 Db5 Eb5 F5 Eb5 Db5 Bb4 B4 | C5 Eb5 D5 C5 A4 G4 Eb4:2 | C4:4 r:4',
    idea: 'Sobre G7alt se toca la pentatónica mayor de D♭ (D♭ E♭ F A♭ B♭): todas sus notas son tensiones del acorde. Se termina en B, la 3ª, que sube a C.',
  },
  {
    id: 'backdoor',
    name: 'Backdoor ii–V (iv menor – ♭VII7 – I)',
    key: 'C',
    level: 'Intermedio',
    tempo: 130,
    chart: 'Fm7 | Bb7#11 | Cmaj7 | Cmaj7',
    line: 'r Ab4 C5 Eb5 F5 Eb5 C5 Ab4 | F4 D4 F4 Ab4 Bb4 Ab4 G4 E4 | E4:2 G4 B4 D5 C5 B4 G4 | E4:4 r:4',
    idea: 'El ii–V "por la puerta de atrás" resuelve a C desde B♭7. La nota E es la ♯11 de B♭7 y se convierte en la 3ª de Cmaj7 sin moverse.',
  },
  {
    id: 'tritone-chrom',
    name: 'Sustitución tritonal (ii – ♭II7 – I)',
    key: 'C',
    level: 'Avanzado',
    tempo: 130,
    chart: 'Dm7 | Db7 | Cmaj7 | Cmaj7',
    line: 'r F4 A4 C5 D5 C5 A4 F4 | F4 Ab4 B4 Db5 B4 Ab4 F4 Eb4 | E4 G4 B4 D5 C5 B4 A4 G4 | E4:4 r:4',
    idea: 'D♭7 reemplaza a G7: comparte la 3ª y la 7ª (F y B/C♭). La F es ♭3 de Dm7 y 3ª de D♭7, no se mueve; la E♭ (9ª de D♭7) sube por semitono a la E, 3ª de Cmaj7.',
  },
  {
    id: 'minor-blues-4',
    name: 'Blues menor: escala de blues descendente',
    key: 'C',
    mode: 'minor',
    level: 'Esencial',
    tempo: 110,
    chart: 'Cm7 | Cm7 | Cm7 | Cm7',
    line: 'r C5 Bb4 G4 Gb4 F4 Eb4 C4 | r:2 Eb4 G4 Bb4 C5:2 r | Eb5 C5 Bb4 C5 Eb5 C5 Bb4 G4 | Gb4:2 F4:2 Eb4:2 C4:2',
    idea: 'La escala de blues de C (C E♭ F G♭ G B♭) bajando entera: la G♭ es la nota "azul" (♭5) y se usa de paso, nunca para quedarse. Después de la frase, una respuesta corta con el arpegio de Cm.',
  },
  {
    id: 'fourths-dorian',
    name: 'Cuartas sobre un acorde modal',
    key: 'D',
    mode: 'minor',
    level: 'Avanzado',
    tempo: 150,
    chart: 'Dm7 | Dm7 | Dm7 | Dm7',
    line: 'D4 G4 C5 F5 E5 D5 C5 A4 | G4:2 A4 C5 D5 C5 A4 G4 | E4 A4 D5 G5 F5 D5 A4 E4 | D4:4 r:4',
    idea: 'Sobre un solo acorde (Dm7) se apilan cuartas justas (D-G-C-F y E-A-D-G) en lugar de arpegiar. El sonido es abierto y moderno, y evita las notas de paso obvias.',
  },
  {
    id: 'turnaround-bb',
    name: 'Turnaround I–VI–ii–V (rhythm changes)',
    key: 'Bb',
    level: 'Intermedio',
    tempo: 150,
    chart: 'Bbmaj7 G7b9 | Cm7 F7 | Bbmaj7 | Bbmaj7',
    line: 'F4 A4 Bb4 D5 F5 D5 B4 Ab4 | G4 Bb4 C5 Eb5 C5 A4 F4 Eb4 | D4 F4 A4 C5 D5 C5 A4 F4 | D4:4 r:4',
    idea: 'Los cuatro acordes del turnaround de los rhythm changes en dos compases: arpegio ascendente sobre B♭maj7, descenso por G7♭9, y cada nota final baja por semitono a la 3ª o la 5ª del acorde que sigue.',
  },
  {
    id: 'digital-1235',
    name: 'Patrón 1-2-3-5 sobre ii–V–I',
    key: 'C',
    level: 'Esencial',
    tempo: 120,
    chart: 'Dm7 | G7 | Cmaj7 | Cmaj7',
    line: 'D4 E4 F4 A4 C5 A4 F4 E4 | G4 A4 B4 D5 F5 D5 B4 A4 | C5 D5 E5 G5 E5 D5 C5 G4 | E4:4 r:4',
    idea: 'La misma célula en cada acorde: sube 1-2-3-5 desde la fundamental, llega a la 7ª y baja 5-3-2. Es el "patrón digital" más usado para aprender a ubicar cada acorde en el instrumento.',
  },
  {
    id: 'guide-tone-cycle',
    name: 'Línea de guide tones por el ciclo de quintas',
    key: 'A',
    mode: 'minor',
    level: 'Esencial',
    tempo: 110,
    chart: 'Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7b9 | Am7',
    line: 'C5:3 B4 A4:2 G4:2 | F4:3 G4 A4:2 C5:2 | B4:3 A4 G4:2 F4:2 | E4:3 G4 B4:4 | A4:3 G4 F4:2 E4:2 | D4:3 F4 A4:4 | G#4:3 F4 E4:2 D4:2 | C4:4 r:4',
    idea: 'Cada compás empieza en la 3ª del acorde y termina en una nota que está a un paso de la 3ª del siguiente: la armonía se oye aunque no suene nada más.',
  },
  {
    id: 'dim-b9',
    name: 'Disminuida sobre el V7♭9',
    key: 'C',
    level: 'Intermedio',
    tempo: 130,
    chart: 'Dm7 | G7b9 | Cmaj7 | Cmaj7',
    line: 'r A4 F4 D4 E4 F4 A4 C5 | B4 D5 F5 Ab5 G5 E5 C#5 Bb4 | A4 G4 E4 D4 E4 G4 B4 D5 | E5:4 r:4',
    idea: 'Sobre G7♭9 se tocan los dos acordes disminuidos que caben en la escala semitono-tono: B D F A♭ y G E C♯ B♭. Ocho notas, todas del acorde o tensiones.',
  },
  {
    id: 'upper-triads',
    name: 'Tríadas superiores sobre el V alterado',
    key: 'C',
    level: 'Avanzado',
    tempo: 130,
    chart: 'Dm7 | G7alt | Cmaj7 | Cmaj7',
    line: 'A4 C5 E5 F5 E5 D5 C5 A4 | Ab4 Db5 F5 Ab5 G5 Eb5 Bb4 Eb5 | E5:2 D5 B4 G4 A4 B4 D5 | E5:4 r:4',
    idea: 'Dos tríadas mayores comunes, D♭ y E♭, suenan por encima de G7 como sus tensiones alteradas (♭9, ♯11, ♯9, ♭13). Es la escala alterada pensada en formas que ya conocés.',
  },
  {
    id: 'chromatic-approach',
    name: 'Notas de aproximación cromática',
    key: 'Bb',
    level: 'Intermedio',
    tempo: 140,
    chart: 'Cm7 | F7 | Bbmaj7 | Bbmaj7',
    line: 'r B4 C5 Eb5 D5 Db5 C5 Bb4 | A4 Bb4 C5 Eb5 F5 E5 Eb5 C#5 | D5:3 C5 Bb4 F4 A4 G#4 | A4:4 r:4',
    idea: 'Notas del acorde a las que se llega desde un semitono abajo (B → C sobre Cm7, C♯ → D y G♯ → A sobre B♭maj7) y notas de paso cromáticas (D♭, E). Las cromáticas caen en el "y" de cada tiempo; las del acorde, en el tiempo.',
  },
  {
    id: 'side-slip',
    name: 'Side-slipping: salir medio tono y volver',
    key: 'D',
    mode: 'minor',
    level: 'Avanzado',
    tempo: 150,
    chart: 'Dm7 | Dm7 | Dm7 | Dm7',
    line: 'r A4 C5 D5 C5 A4 G4 F4 | Gb4 Ab4 Bb4 Db5 Eb5 Db5 Bb4 Ab4 | A4 C5 D5 F5 E5 D5 C5 A4 | G4 F4 E4 D4:5',
    idea: 'Pentatónica de D menor, la misma forma medio tono arriba (E♭ menor: "afuera") y regreso por semitono. La tensión vale porque vuelve.',
  },
  {
    id: 'coltrane-cells',
    name: 'Células 1-2-3-5 sobre los cambios de Coltrane',
    key: 'C',
    level: 'Avanzado',
    tempo: 120,
    chart: 'Dm7 Eb7 | Abmaj7 B7 | Emaj7 G7 | Cmaj7',
    line: 'D4 E4 F4 A4 Bb4 G4 F4 Eb4 | Ab4 Bb4 C5 Eb5 F#5 D#5 C#5 B4 | E4 F#4 G#4 B4 D5 B4 A4 G4 | C5 D5 E5 G5 E5:4',
    idea: 'Un acorde cada dos tiempos y tres tonalidades separadas por terceras mayores (A♭, E, C). La célula 1-2-3-5 (o 5-3-2-1) dibuja cada acorde en cuatro notas.',
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
