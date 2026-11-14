import { abcPitch, keySignature } from '../exercises/abc';
import { CYCLE_OF_FOURTHS } from '../theory/chart';
import {
  degreeNote, Interval, midi, Note, noteName, parseNote, Pitch, placeNear, prettyAcc, simplify, simplifyPitch, transposeNote, transposePitch,
} from '../theory/notes';
import { SCALES } from '../theory/scales';

/** Escalas agrupadas como se estudian. Todas las escalas de `theory/scales.ts` están en algún grupo. */
export const SCALE_GROUPS: { id: string; title: string; scales: string[] }[] = [
  { id: 'modos', title: 'Mayor y modos', scales: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] },
  { id: 'melodica', title: 'Menor melódica', scales: ['melodicMinor', 'lydianDominant', 'mixolydianb6', 'locrian2', 'altered', 'phrygianDominant'] },
  { id: 'simetricas', title: 'Simétricas y bebop', scales: ['halfWhole', 'wholeHalf', 'wholeTone', 'bebopDominant', 'bebopMajor'] },
  { id: 'pentatonicas', title: 'Pentatónicas y blues', scales: ['majorPent', 'minorPent', 'blues'] },
];

export interface ScaleInfo {
  /** Qué es y de dónde sale. */
  what: string;
  /** Sobre qué acordes se usa. */
  chords: string;
  /** La nota o el rasgo que la identifica, para escucharlo. */
  listen: string;
  /** Una advertencia o consejo propio de esta escala. */
  tip: string;
}

export const SCALE_INFO: Record<string, ScaleInfo> = {
  ionian: { what: 'La escala mayor: modo I de sí misma. Es la referencia con la que se comparan todas las demás.', chords: 'Imaj7, IVmaj7 (maj7, 6).', listen: 'La 7ª mayor resuelve a la tónica: sonido estable y luminoso.', tip: 'Sobre un maj7 la 4ª es una nota a evitar: choca con la 3ª; pasá por ella sin quedarte.' },
  dorian: { what: 'Modo II de la mayor: menor con 6ª mayor.', chords: 'm7, m9, m11 (el ii de un ii–V–I y los temas modales).', listen: 'La 6ª mayor es lo que la separa de la menor natural y le da su brillo.', tip: 'Es la escala menor "de partida" del jazz: aprendela primero en las 12 tonalidades.' },
  phrygian: { what: 'Modo III de la mayor: menor con ♭2.', chords: 'm7 sobre el iii y acordes sus♭9.', listen: 'La ♭2 pegada a la tónica da el color español u oscuro.', tip: 'Cantá la ♭2 → 1: es el rasgo que hay que oír en cada pasada.' },
  lydian: { what: 'Modo IV de la mayor: mayor con ♯4.', chords: 'maj7 y maj7♯11 (IVmaj7 y los acordes mayores modernos).', listen: 'La ♯4 evita la fricción de la 4ª justa: suena abierta y flotante.', tip: 'Ideal sobre un maj7 que no resuelve; la ♯11 se toca sin miedo.' },
  mixolydian: { what: 'Modo V de la mayor: mayor con ♭7.', chords: 'Dominantes sin alterar: 7, 9, 13.', listen: 'La ♭7 pide resolver; la 3ª y la ♭7 son los guide tones.', tip: 'La 4ª es nota a evitar sobre un dominante (choca con la 3ª).' },
  aeolian: { what: 'Modo VI de la mayor: la menor natural.', chords: 'm7 sobre el vi y los temas menores sin resolución dominante.', listen: 'La ♭6 le da el aire melancólico.', tip: 'Sobre un m7 de ii–V suena mejor la dórica; la eólica es para el vi.' },
  locrian: { what: 'Modo VII de la mayor: ♭2 y ♭5.', chords: 'm7♭5 (en la teoría de modos de la mayor).', listen: 'Es inestable: la ♭5 hace que la tónica no "descanse".', tip: 'En la práctica del jazz se prefiere la locria ♮2 (más abajo, en la menor melódica).' },
  melodicMinor: { what: 'Menor con 6ª y 7ª mayores, igual subiendo y bajando (a diferencia de la clásica).', chords: 'm6, m(maj7) y el acorde de tónica menor del ii–V–i.', listen: 'La 7ª mayor sobre una tríada menor es el sonido tenso de la menor melódica.', tip: 'Es la escala madre: de ella salen cuatro modos más. Estudiala en las 12 tonalidades.' },
  lydianDominant: { what: 'Modo IV de la menor melódica: mixolidia con ♯4.', chords: '7♯11, y los dominantes de sustitución tritonal.', listen: 'El ♯11 y la ♭7 juntos: un dominante luminoso, no tenso.', tip: 'Es la escala de los dominantes que no resuelven a un acorde esperado.' },
  mixolydianb6: { what: 'Modo V de la menor melódica: mixolidia con ♭6.', chords: '7♭13, el V7 que va hacia un acorde menor.', listen: 'La ♭13 anticipa el carácter menor de la resolución.', tip: 'La 4ª sigue siendo nota a evitar sobre la 3ª del acorde.' },
  locrian2: { what: 'Modo VI de la menor melódica: locria con 9ª natural.', chords: 'm7♭5 como ii de un ii–V–i menor.', listen: 'Se parece a la locria pero la 9ª natural la hace más cantable.', tip: 'Es la que se usa en la práctica sobre m7♭5; la locria "pura" casi no se toca.' },
  altered: { what: 'Modo VII de la menor melódica (superlocria): ♭9, ♯9, ♯11, ♭13.', chords: '7alt: el V7 de un ii–V–i menor (o cualquier dominante que resuelve).', listen: 'Todas las tensiones a la vez: ♭9 y ♯9 arriba, ♯11 y ♭13 abajo; la 3ª y la ♭7 mantienen la identidad.', tip: 'No la toques como escala sino como fuente de tensiones que resolvés por semitono.' },
  phrygianDominant: { what: 'Modo V de la menor armónica: mixolidia ♭9 ♭13.', chords: '7♭9♭13 sobre el V de un tema menor.', listen: 'La ♭9 y la ♭13 le dan el sonido de dominante "dramático" hacia el menor.', tip: 'Es más conservadora que la alterada: no tiene ♯9 ni ♯11.' },
  halfWhole: { what: 'Disminuida semitono-tono: ocho notas simétricas.', chords: '7♭9 y 7♯9 (dominantes) con ♯11 y 13.', listen: 'Se repite cada tres semitonos: un patrón de semitono y tono.', tip: 'Como es simétrica, aprendés cuatro posiciones y las trasladás a las 12 tonalidades.' },
  wholeHalf: { what: 'Disminuida tono-semitono: ocho notas simétricas.', chords: 'Acorde disminuido (dim7) y m7♭5 con 9ª.', listen: 'Alterna tono y semitono: el acorde disminuido está dentro de ella.', tip: 'Se repite cada tres semitonos: sólo hay tres escalas distintas en las 12 tonalidades.' },
  wholeTone: { what: 'Tonos enteros: seis notas a distancia de tono.', chords: '7♯5 y 7♭5 (el dominante aumentado).', listen: 'Sin semitonos, el sonido flota y no define una tónica.', tip: 'Sólo hay dos escalas de tonos enteros: las 12 tonalidades son dos escalas con distinto punto de partida.' },
  bebopDominant: { what: 'Mixolidia con la 7ª mayor como nota de paso: ocho notas.', chords: 'Dominantes (7, 9, 13).', listen: 'Con la nota de paso, las notas del acorde caen en los tiempos fuertes si se toca en corcheas.', tip: 'Empezá siempre en una nota del acorde y mantené la dirección: es una herramienta de fraseo.' },
  bebopMajor: { what: 'Mayor con la ♯5 como nota de paso: ocho notas.', chords: 'Acordes de tónica mayor: maj7 y 6.', listen: 'La nota de paso cae en el contratiempo y pone la 5ª y la 6ª en los tiempos.', tip: 'Igual que la dominante, hay que empezar en una nota del acorde.' },
  majorPent: { what: 'Cinco notas: 1, 2, 3, 5, 6.', chords: 'Sobre acordes mayores y, elegidas por grado, sobre otros acordes (superposición).', listen: 'Sin semitonos ni notas a evitar: suena bien casi siempre.', tip: 'Los saltos de cuarta y de tercera son parte del carácter: practicalos ligados.' },
  minorPent: { what: 'Cinco notas: 1, ♭3, 4, 5, ♭7.', chords: 'm7, blues, y dominantes en contexto de blues.', listen: 'Es el esqueleto de la escala de blues.', tip: 'Sobre un dominante, la ♭3 choca con la 3ª: es la blue note.' },
  blues: { what: 'Pentatónica menor con la ♭5 (blue note): seis notas.', chords: 'Blues y dominantes en contexto de blues.', listen: 'La ♭5 es una nota de paso con fricción: no te quedes en ella.', tip: 'Usá glissandos o medias válvulas en la ♭3 y la ♭5: no son notas fijas.' },
};

export interface StudyPattern {
  id: string;
  title: string;
  /** Qué hace y cómo se estudia. */
  how: string[];
  /** Tempo de partida (negra). */
  bpm: number;
}

export const PATTERNS: StudyPattern[] = [
  {
    id: 'octave', title: 'Una octava', bpm: 60,
    how: [
      'Antes de tocar, cantá o nombrá las notas de la escala en voz alta, subiendo y bajando.',
      'Tocala en corcheas, ligada y suave, con un solo aire y el sonido parejo de la primera a la última nota.',
      'Apretá bien los pistones y escuchá la afinación de cada nota contra el Afinador de la app.',
      'Al terminar, repetila articulada con "tu" liviano. Si una nota se tropieza, aislala y repetila despacio.',
    ],
  },
  {
    id: 'twoOct', title: 'Dos octavas', bpm: 60,
    how: [
      'La misma escala en toda su extensión cómoda (hasta donde permite el registro), subiendo y bajando.',
      'Cuidá que el sonido no se achique al subir ni se ensucie al bajar: el aire sostiene todo el recorrido.',
      'Si el aire no alcanza, respirá en la tónica del medio, sin perder el pulso.',
    ],
  },
  {
    id: 'thirds', title: 'En terceras', bpm: 72,
    how: [
      'Saltá de a una tercera por la escala (1-3, 2-4, 3-5…) y bajá igual. Cantá el patrón antes de tocarlo.',
      'Los saltos obligan a pensar la escala como una estructura de acordes, no sólo como notas contiguas.',
      'Variá la articulación en cada vuelta: todo ligado, picado liviano y, cuando sea fácil, doble picado.',
    ],
  },
  {
    id: 'digital', title: '1-2-3-5 sobre cada grado', bpm: 72,
    how: [
      'Sobre cada nota de la escala, tocá la célula grado 1, 2, 3 y 5 contados desde esa nota dentro de la escala.',
      'Es la célula del vocabulario de Coltrane: sirve para improvisar sobre cualquier acorde cuya escala conocés.',
      'Atacá cada grupo con un acento suave en la primera nota y mantené las demás parejas.',
    ],
  },
  {
    id: 'arp', title: 'Arpegios dentro de la escala', bpm: 72,
    how: [
      'Sobre cada grado, armá el acorde de cuatro notas apilando terceras con las notas de la escala (grado, +2, +4, +6).',
      'Así descubrís qué acordes salen de la escala: nombrá cada uno en voz alta (m7, maj7, 7, m7♭5…).',
      'Los arpegios rápidos dependen de la flexibilidad: si un salto se cae, tocalo como lip slur.',
    ],
  },
  {
    id: 'groups4', title: 'Grupos de cuatro notas', bpm: 72,
    how: [
      'Grupos de cuatro notas consecutivas (1-2-3-4, 2-3-4-5, 3-4-5-6…) subiendo y, bajando, los mismos grupos al revés.',
      'Es el ejercicio de agilidad de dedos: tocalo lento al principio y después tan rápido como puedas sin que se ensucie.',
      'Muy suave y en un solo aire, como pedía Clarke para los ejercicios de resistencia: sin forzar.',
    ],
  },
];

/** Tempo que se sube de a este paso. */
export const BPM_STEP = 4;

// ---------------------------------------------------------------------------------------------------------------
// Generación de las notas (siempre en concierto) y del pentagrama
// ---------------------------------------------------------------------------------------------------------------

/** Rango en concierto: de MIDI 52 (F♯3 escrito) a 78 (G♯5 escrito aprox.). */
const LOW_C = 52;
const HIGH_C = 78;

export interface Item {
  p: Pitch | null;
  /** Duración en corcheas. */
  dur: number;
}

export function scaleDegrees(scaleId: string): string[] {
  return SCALES[scaleId].degrees;
}

/** Notas de la escala subiendo desde la tónica, `count` notas. */
export function scalePitches(root: Note, scaleId: string, count: number): Pitch[] {
  const degs = scaleDegrees(scaleId);
  const out: Pitch[] = [placeNear(root, LOW_C - 1, 'up')];
  for (let i = 1; i < count; i++) out.push(placeNear(degreeNote(root, degs[i % degs.length]), midi(out[i - 1]), 'up'));
  return out;
}

const ALLOWED = [8, 6, 4, 3, 2, 1];
function finish(items: Item[], tonic: Pitch): Item[] {
  const total = items.reduce((s, i) => s + i.dur, 0);
  const rem = total % 8 === 0 ? 8 : 8 - (total % 8);
  const out = [...items];
  if (ALLOWED.includes(rem)) out.push({ p: tonic, dur: rem });
  else {
    const first = ALLOWED.find((a) => a < rem) ?? 4;
    out.push({ p: tonic, dur: first }, { p: null, dur: rem - first });
  }
  return out;
}

/** Notas del patrón en corcheas (cada nota dura 1; la última, hasta cerrar el compás). */
export function patternItems(scaleId: string, patternId: string, concertKey: string): Item[] {
  const root = parseNote(concertKey);
  const len = scaleDegrees(scaleId).length;
  const P = scalePitches(root, scaleId, len * 3 + 1);
  const cap = P.reduce((m, p, i) => (midi(p) <= HIGH_C ? i : m), 0);
  const tonic = P[0];
  const up = (idx: number[]) => idx.filter((i) => i <= cap).map((i) => ({ p: P[i], dur: 1 }));
  const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, k) => a + k);
  /** Grupos cuyas notas caben enteras en el registro. */
  const groups = (gs: number[][]) => gs.filter((g) => g.every((i) => i <= cap));
  const flat = (gs: number[][]) => gs.flat();

  let idx: number[] = [];
  switch (patternId) {
    case 'octave':
      idx = [...range(0, len), ...range(0, len - 1).reverse()];
      break;
    case 'twoOct': {
      const top = Math.min(2 * len, cap);
      idx = [...range(0, top), ...range(0, top - 1).reverse()];
      break;
    }
    case 'thirds': {
      const top = Math.min(len + 2, cap);
      const upIdx: number[][] = [];
      for (let i = 0; i + 2 <= top && i <= len; i++) upIdx.push([i, i + 2]);
      const downIdx: number[][] = [];
      for (let i = Math.min(len + 2, top); i >= 2; i--) downIdx.push([i, i - 2]);
      idx = flat([...upIdx, ...downIdx]);
      break;
    }
    case 'digital':
      idx = flat(groups(range(0, len).map((i) => [i, i + 1, i + 2, i + 4])));
      break;
    case 'arp':
      idx = flat(groups(range(0, len - 1).map((i) => [i, i + 2, i + 4, i + 6])));
      break;
    case 'groups4': {
      const upG = groups(range(0, len).map((i) => [i, i + 1, i + 2, i + 3]));
      const downG = [...upG].reverse().map((g) => [...g].reverse());
      idx = flat([...upG, ...downG]);
      break;
    }
    default:
      throw new Error(`Patrón desconocido: ${patternId}`);
  }
  return finish(up(idx), tonic);
}

/** Alteración de cada letra en la armadura: la de la mayor de `tonic`. */
function chooseKey(scaleId: string, writtenTonic: Note): Note {
  const degs = scaleDegrees(scaleId);
  const MODE_DOWN: Record<string, Interval> = {
    ionian: { steps: 0, semis: 0 }, dorian: { steps: -1, semis: -2 }, phrygian: { steps: -2, semis: -4 },
    lydian: { steps: -3, semis: -5 }, mixolydian: { steps: -4, semis: -7 }, aeolian: { steps: -5, semis: -9 }, locrian: { steps: -6, semis: -11 },
  };
  if (MODE_DOWN[scaleId]) return simplify(transposeNote(writtenTonic, MODE_DOWN[scaleId]));
  return degs.includes('b3') && !degs.includes('3') ? simplify(transposeNote(writtenTonic, { steps: 2, semis: 3 })) : writtenTonic;
}

/** Pentagrama ABC. `reading` es el intervalo de lectura (Si♭ o unísono). */
export function scaleAbc(scaleId: string, patternId: string, concertKey: string, bpm: number, reading: Interval): string {
  const items = patternItems(scaleId, patternId, concertKey);
  const tonic = simplify(transposeNote(parseNote(concertKey), reading));
  const keyNote = chooseKey(scaleId, tonic);
  const keyAcc = keySignature(keyNote);
  let acc = new Map<string, number>();
  let body = '';
  let pos = 0;
  for (const it of items) {
    if (pos % 8 === 0) {
      if (pos > 0) body += (pos / 8) % 4 === 0 ? ' |\n' : ' | ';
      acc = new Map();
    } else if (pos % 4 === 0) body += ' ';
    body += (it.p ? abcPitch(simplifyPitch(transposePitch(it.p, reading)), acc, keyAcc) : 'z') + (it.dur === 1 ? '' : String(it.dur));
    pos += it.dur;
  }
  return `X:1\nM:4/4\nL:1/8\nQ:1/4=${bpm}\nK:${noteName(keyNote)}\n${body} |]\n`;
}

/** Nombres de las notas de la escala en la tonalidad (en la lectura elegida), con ortografía de jazz. */
export function scaleNoteNames(scaleId: string, concertKey: string, reading: Interval): string[] {
  const root = parseNote(concertKey);
  return scaleDegrees(scaleId).map((d) => prettyAcc(noteName(simplify(transposeNote(degreeNote(root, d), reading)))));
}

// ---------------------------------------------------------------------------------------------------------------
// Qué estudiar hoy
// ---------------------------------------------------------------------------------------------------------------

export interface Suggestion {
  scale: string;
  pattern: string;
  key: string;
}

export const masteryId = (scale: string, pattern: string) => `scale:${scale}:${pattern}`;

/**
 * La combinación (escala, patrón) menos trabajada y, dentro de ella, la primera tonalidad sin marcar siguiendo
 * el ciclo de cuartas desde la del día. Los empates rotan con el día para no repetir siempre lo mismo.
 */
export function suggest(mastery: Record<string, Record<string, number>>, dayNumber: number, scales: string[] = SCALE_GROUPS.flatMap((g) => g.scales)): Suggestion {
  const combos = scales.flatMap((s) => PATTERNS.map((p) => ({ scale: s, pattern: p.id })));
  const score = (c: { scale: string; pattern: string }) => Object.keys(mastery[masteryId(c.scale, c.pattern)] ?? {}).length;
  const min = Math.min(...combos.map(score));
  const tied = combos.filter((c) => score(c) === min);
  const pick = tied[dayNumber % tied.length];
  const done = mastery[masteryId(pick.scale, pick.pattern)] ?? {};
  const start = dayNumber % 12;
  const key = CYCLE_OF_FOURTHS.map((_, i) => CYCLE_OF_FOURTHS[(start + i) % 12]).find((k) => !done[k]) ?? CYCLE_OF_FOURTHS[start];
  return { ...pick, key };
}
