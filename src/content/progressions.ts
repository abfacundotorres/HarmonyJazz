import { CYCLE_OF_FOURTHS } from '../theory/chart';
import { degreeNote, noteName, parseNote, simplify } from '../theory/notes';

export interface Progression {
  id: string;
  name: string;
  category: 'Fundamentos' | 'Blues' | 'Standards' | 'Avanzado';
  /** Tonalidad de referencia en concierto (para transponer). null = recorre varias tonalidades. */
  key: string | null;
  /** Modo de la tonalidad, para la armadura. */
  mode?: 'major' | 'minor';
  /** Cifrado en concierto. */
  chart: string;
  tempo: number;
  feel?: 'walking' | 'two';
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
    category: 'Standards',
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
    id: 'autumn',
    name: 'Autumn Leaves (cambios)',
    category: 'Standards',
    key: 'G',
    mode: 'minor',
    chart:
      'Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm6 | Gm6 | ' +
      'Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm6 | Gm6 | ' +
      'Am7b5 | D7b9 | Gm6 | Gm6 | Cm7 | F7 | Bbmaj7 | Ebmaj7 | ' +
      'Am7b5 | D7b9 | Gm7 C7 | Fm7 Bb7 | Am7b5 | D7b9 | Gm6 | Gm6',
    tempo: 140,
    notes: 'ii–V–I mayor y menor relativos en la misma forma. El clásico para aprender a cambiar de modo.',
    listen: ['Cannonball Adderley con Miles Davis – "Somethin\' Else"', 'Chet Baker – "She Was Too Good to Me"'],
  },
  {
    id: 'modal',
    name: 'Modal AABA (D dórico / E♭ dórico)',
    category: 'Standards',
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
  {
    id: 'giant',
    name: 'Ciclo de terceras mayores (16 compases)',
    category: 'Avanzado',
    key: 'B',
    mode: 'major',
    chart:
      'Bmaj7 D7 | Gmaj7 Bb7 | Ebmaj7 | Am7 D7 | Gmaj7 Bb7 | Ebmaj7 F#7 | Bmaj7 | Fm7 Bb7 | ' +
      'Ebmaj7 | Am7 D7 | Gmaj7 | C#m7 F#7 | Bmaj7 | Fm7 Bb7 | Ebmaj7 | C#m7 F#7',
    tempo: 140,
    notes: 'Los cambios de Giant Steps. Empezá a 120 con 1-2-3-5 y guide tones; subí de a 4 bpm.',
    listen: ['John Coltrane – "Giant Steps"'],
  },
];

export const progressionById = (id: string) => PROGRESSIONS.find((p) => p.id === id)!;
