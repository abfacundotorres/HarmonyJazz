import type { Style } from '../audio/engine';
import { CYCLE_OF_FOURTHS } from '../theory/chart';
import { degreeNote, noteName, parseNote, simplify } from '../theory/notes';

export interface Progression {
  id: string;
  name: string;
  category: 'Fundamentos' | 'Blues' | 'Formas' | 'Avanzado' | 'Mis temas';
  /** Tonalidad de referencia en concierto (para transponer). null = recorre varias tonalidades. */
  key: string | null;
  /** Modo de la tonalidad, para la armadura. */
  mode?: 'major' | 'minor';
  /** Cifrado en concierto. */
  chart: string;
  tempo: number;
  style?: Style;
  /** Para qué sirve esta progresión. */
  notes: string;
  /** Grabaciones de referencia para escuchar. */
  listen?: string[];
}

function iiVIcycle(minor = false): string {
  return CYCLE_OF_FOURTHS.map((k) => {
    const t = parseNote(k);
    const ii = noteName(simplify(degreeNote(t, '2')));
    const V = noteName(simplify(degreeNote(t, '5')));
    return minor ? `${ii}m7b5 | ${V}7alt | ${k}m6 | ${k}m6` : `${ii}m7 | ${V}7 | ${k}maj7 | ${k}maj7`;
  }).join(' | ');
}

export const PROGRESSIONS: Progression[] = [
  {
    id: 'ii-v-i',
    name: 'ii–V–I mayor',
    category: 'Fundamentos',
    key: 'C',
    mode: 'major',
    chart: 'Dm7 | G7 | Cmaj7 | Cmaj7',
    tempo: 120,
    notes: 'La célula básica del lenguaje bebop. Trabajala en las 12 tonalidades.',
  },
  {
    id: 'ii-v-i-short',
    name: 'ii–V–I corto (2 tiempos)',
    category: 'Fundamentos',
    key: 'C',
    mode: 'major',
    chart: 'Dm7 G7 | Cmaj7 | Dm7 G7 | Cmaj7',
    tempo: 120,
    notes: 'ii–V de dos tiempos: obliga a resolver rápido y a pensar el ii–V como una sola unidad.',
  },
  {
    id: 'ii-v-i-minor',
    name: 'ii–V–i menor',
    category: 'Fundamentos',
    key: 'C',
    mode: 'minor',
    chart: 'Dm7b5 | G7alt | Cm6 | Cm6',
    tempo: 120,
    notes: 'Locria ♮2 → alterada → menor melódica. Tres escalas, un solo sistema (melódica menor).',
  },
  {
    id: 'ii-v-i-12',
    name: 'ii–V–I por las 12 tonalidades',
    category: 'Fundamentos',
    key: null,
    chart: iiVIcycle(),
    tempo: 110,
    notes: 'Ciclo de cuartas: C, F, B♭, E♭… Cuatro compases por tonalidad.',
  },
  {
    id: 'ii-v-i-minor-12',
    name: 'ii–V–i menor por las 12',
    category: 'Fundamentos',
    key: null,
    chart: iiVIcycle(true),
    tempo: 110,
    notes: 'El mismo ciclo, en menor.',
  },
  {
    id: 'turnaround',
    name: 'Turnaround I–VI–ii–V',
    category: 'Fundamentos',
    key: 'C',
    mode: 'major',
    chart: 'Cmaj7 A7b9 | Dm7 G7 | Em7 A7b9 | Dm7 G7',
    tempo: 140,
    notes: 'Dominantes secundarias con ♭9. Ideal para enclosures y líneas de guide tones rápidas.',
  },
  {
    id: 'blues-f',
    name: 'Blues de jazz en F',
    category: 'Blues',
    key: 'F',
    mode: 'major',
    chart: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7b5 D7b9 | Gm7 | C7 | F7 D7b9 | Gm7 C7',
    tempo: 140,
    notes: 'El blues que más vas a tocar en jam sessions.',
    listen: ['Freddie Hubbard – "Birdlike"', 'Lee Morgan – "The Sidewinder" (forma de blues extendida)'],
  },
  {
    id: 'blues-bird',
    name: 'Bird blues en F',
    category: 'Blues',
    key: 'F',
    mode: 'major',
    chart: 'Fmaj7 | Em7b5 A7b9 | Dm7 G7 | Cm7 F7 | Bb7 | Bbm7 Eb7 | Am7 | Abm7 Db7 | Gm7 | C7 | F7 D7b9 | Gm7 C7',
    tempo: 160,
    notes: 'Blues con ii–V descendentes por semitono. Exige mucha precisión con los guide tones.',
    listen: ['Charlie Parker – "Blues for Alice"', 'Clifford Brown – grabaciones con Max Roach'],
  },
  {
    id: 'blues-minor',
    name: 'Blues menor en C',
    category: 'Blues',
    key: 'C',
    mode: 'minor',
    chart: 'Cm7 | Cm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7alt | Cm7 | G7alt',
    tempo: 150,
    notes: 'Espacio para la pentatónica menor, la dórica y la tensión del V alterado.',
  },
  {
    id: 'rhythm',
    name: 'Rhythm changes en B♭',
    category: 'Formas',
    key: 'Bb',
    mode: 'major',
    chart:
      'Bbmaj7 G7b9 | Cm7 F7 | Dm7 G7b9 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Dm7 G7b9 | Cm7 F7 | ' +
      'Bbmaj7 G7b9 | Cm7 F7 | Dm7 G7b9 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Cm7 F7 | Bb6 | ' +
      'D7 | D7 | G7 | G7 | C7 | C7 | F7 | F7 | ' +
      'Bbmaj7 G7b9 | Cm7 F7 | Dm7 G7b9 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Cm7 F7 | Bb6',
    tempo: 180,
    notes: 'AABA de 32 compases. El puente es un ciclo de dominantes: practicá guide tones 3→7.',
    listen: ['Sonny Stitt – "The Eternal Triangle"', 'Dizzy Gillespie / Sonny Stitt – "I Know That You Know"'],
  },
  {
    id: 'cadena-mayor-menor',
    name: 'Cadena de ii–V mayores y menores (32 compases)',
    category: 'Formas',
    key: 'C',
    mode: 'major',
    chart:
      'Dm7 | G7 | Cmaj7 | Cmaj7 | Bm7b5 | E7b9 | Am7 | Am7 | ' +
      'Dm7 | G7 | Cmaj7 | A7b9 | Dm7 | Dm7 | G7 | G7 | ' +
      'Em7b5 | A7b9 | Dm7 | Dm7 | Dm7b5 | G7b9 | Cmaj7 | Cmaj7 | ' +
      'Fmaj7 | Bb7 | Em7 | A7b9 | Dm7 | G7 | Cmaj7 | G7',
    tempo: 140,
    notes: 'Forma de ejercicio (no es un tema): ii–V–I mayores y menores que se alternan, con un ii–V a la subdominante. Sirve para aprender a cambiar de modo sin perder el hilo.',
  },
  {
    id: 'menor-modulante',
    name: 'Menor con ii–V a la relativa mayor (16 compases)',
    category: 'Formas',
    key: 'A',
    mode: 'minor',
    style: 'bossa',
    chart: 'Am7 | Am7 | Dm7 | Dm7 | Bm7b5 | E7b9 | Am7 | Am7 | Dm7 | G7 | Cmaj7 | Cmaj7 | Bm7b5 | E7b9 | Am7 | Bm7b5 E7b9',
    tempo: 140,
    notes: 'Forma de ejercicio (no es un tema): tónica menor, iv menor, ii–V–i y un paso breve por la relativa mayor. Corcheas rectas: el fraseo cambia por completo.',
  },
  {
    id: 'ballad',
    name: 'Balada en E♭ (forma de 8 compases)',
    category: 'Formas',
    key: 'Eb',
    mode: 'major',
    style: 'ballad',
    chart: 'Ebmaj7 Cm7 | Fm7 Bb7 | Gm7 C7b9 | Fm7 Bb7 | Abmaj7 | Abm7 Db7 | Gm7 C7b9 | Fm7 Bb7',
    tempo: 64,
    notes: 'Tempo lento: cada nota tiene que tener intención. Trabajá el sonido, el vibrato al final de las notas largas y el uso del espacio. Incluye un backdoor (A♭m7–D♭7).',
    listen: ['Clifford Brown – "Stardust" (with Strings)', 'Chet Baker – "My Funny Valentine"'],
  },
  {
    id: 'modal',
    name: 'Modal AABA (D dórico / E♭ dórico)',
    category: 'Formas',
    key: 'D',
    mode: 'minor',
    chart: 'Dm7 | % | % | % | % | % | % | % | Dm7 | % | % | % | % | % | % | % | Ebm7 | % | % | % | % | % | % | % | Dm7 | % | % | % | % | % | % | %',
    tempo: 180,
    notes: 'Forma de "So What" / "Impressions". Ideal para cuartas, pentatónicas y side-slipping.',
    listen: ['Miles Davis – "So What" (Kind of Blue)', 'Woody Shaw – "The Moontrane"'],
  },
  {
    id: 'tritone',
    name: 'Sustitución tritonal y backdoor',
    category: 'Avanzado',
    key: 'C',
    mode: 'major',
    chart: 'Dm7 | Db7#11 | Cmaj7 | Cmaj7 | Fm7 | Bb7 | Cmaj7 | Cmaj7',
    tempo: 120,
    notes: 'V7 → ♭II7 y el ii–V "backdoor" (iv–♭VII). Escuchá cómo resuelven por semitono y por tono.',
  },
  {
    id: 'coltrane',
    name: 'Cambios de Coltrane sobre ii–V–I',
    category: 'Avanzado',
    key: 'C',
    mode: 'major',
    chart: 'Dm7 Eb7 | Abmaj7 B7 | Emaj7 G7 | Cmaj7',
    tempo: 120,
    notes: 'Substitución por terceras mayores (Countdown / 26-2). Patrones 1-2-3-5 sobre cada acorde.',
  },
];

export const progressionById = (id: string) => PROGRESSIONS.find((p) => p.id === id)!;
