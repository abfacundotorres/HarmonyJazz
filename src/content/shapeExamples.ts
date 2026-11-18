/**
 * Los pentagramas de ejemplo de cada tarea de los focos de tríadas, acordes de cuatro notas y células. Cada entrada
 * va por el identificador de la tarea y dibuja varios compases en la tonalidad del día (escrita para trompeta en Si♭).
 */
import { degreeNote, midi, type Note, noteName, placeNear, simplify } from '../theory/notes';
import {
  abcFromBars, arpUpDown, type Bar, type Cell, cellTwice, chordName, cycleRoots, extended, iiVI, type Shape, shapeQuarters, shapeQuartersBoth, shapeUpDown, threeRhythms, tonicOf,
} from './shapeAbc';

/** Nota del grado `g` sobre `r`, con la ortografía más simple (sin dobles alteraciones ni Cb, Fb, E♯, B♯). */
const d = (r: Note, g: string) => simplify(degreeNote(r, g));
const label = (r: Note, s: string) => `${noteName(r)} ${s}`;

/** Raíces de tres tonalidades para comparar (la del día, su cuarta y su quinta). */
const three = (t: Note) => [t, d(t, '4'), d(t, '5')];

/** Los acordes del ii–V–I con su símbolo. */
const prog = (t: Note) => {
  const { ii, v, i } = iiVI(t);
  return { ii, v, i, cii: chordName(ii, 'm7'), cv: chordName(v, 'dom7'), ci: chordName(i, 'maj7') };
};

/** Las dos tríadas mayores y las dos menores que caben en cada acorde del ii–V–I (las de las tablas de los focos). */
const triadsIn = (t: Note) => {
  const p = prog(t);
  return [
    { chord: p.cii, major: [d(t, '4'), d(t, '1')], minor: [d(t, '2'), d(t, '6')] },
    { chord: p.cv, major: [d(t, '5'), d(t, '4')], minor: [d(t, '2'), d(t, '5')] },
    { chord: p.ci, major: [d(t, '1'), d(t, '5')], minor: [d(t, '3'), d(t, '6')] },
  ];
};

/** Un compás con la tríada nombrada sobre el acorde que suena. */
const onChord = (b: Bar, chord: string, text: string): Bar => ({ ...b, chord, text });

type Ex = (t: Note) => Bar[];

export const EXAMPLES: Record<string, { bars: Ex; caption: string; bpm?: number }> = {
  // ----------------------------------------------------------------------------------------- tríadas menores
  'foco-trm-ciclo': {
    caption: 'La tríada menor de las doce tonalidades en el ciclo de cuartas, empezando por la del día: un compás por tríada, 1-♭3-5-1-5-♭3.',
    bars: (t) => cycleRoots(t).map((r) => arpUpDown(r, 'm')),
  },
  'foco-trm-tercera': {
    caption: 'Misma raíz en mayor y en menor, en tres tonalidades: sólo cambia la 3ª.',
    bars: (t) => three(t).flatMap((r) => [arpUpDown(r, 'M', { text: 'mayor' }), arpUpDown(r, 'm', { text: 'menor' })]),
  },
  'foco-trm-oido': {
    caption: 'La tríada menor para cantar y tocar, en cuatro tonalidades.',
    bars: (t) => [t, d(t, '4'), d(t, '5'), d(t, '2')].map((r) => shapeQuarters(r, 'm')),
  },
  'foco-trm-mapa': {
    caption: 'Las dos tríadas menores que caben en cada acorde del ii–V–I (en el orden de la tabla), arpegiadas en negras.',
    bars: (t) => triadsIn(t).flatMap((c) => c.minor.map((r) => onChord(shapeQuarters(r, 'm'), c.chord, label(r, 'menor')))),
  },
  'foco-trm-negras': {
    caption: 'Una tríada menor por acorde, subiendo y bajando: primero la primera de la tabla, después la segunda.',
    bars: (t) => triadsIn(t).flatMap((c) => c.minor.map((r) => onChord(shapeUpDown(r, 'm'), c.chord, label(r, 'menor')))),
  },
  'foco-trm-g7': {
    caption: 'La tríada de la misma raíz del dominante en menor (su ♭3 es la ♯9 del acorde) y su resolución al maj7.',
    bars: (t) => {
      const p = prog(t);
      return [
        onChord(shapeQuarters(p.v, 'm'), p.cv, label(p.v, 'menor')),
        onChord(shapeUpDown(p.v, 'm'), p.cv, label(p.v, 'menor')),
        { chord: p.ci, text: '3ª del maj7', cells: [{ p: placeNear(d(p.i, '3'), midi(placeNear(d(p.v, '3'), 62, 'near')), 'near'), d: 8 }] },
      ];
    },
  },
  'foco-trm-cells': {
    caption: 'Tres células de la tríada menor sobre un acorde menor (el ii del ii–V–I): 1-♭3-5-♭3, 5-♭3-1-♭3 y ♭3-5-1-5, dos veces cada una.',
    bars: (t) => {
      const r = prog(t).ii;
      return [
        cellTwice(r, 'm', [0, 1, 2, 1], { chord: chordName(r, 'm7'), text: '1-♭3-5-♭3' }),
        cellTwice(r, 'm', [2, 1, 0, 1], { chord: chordName(r, 'm7'), text: '5-♭3-1-♭3' }),
        cellTwice(r, 'm', [1, 2, 3, 2], { chord: chordName(r, 'm7'), text: '♭3-5-1-5' }),
      ];
    },
  },
  'foco-trm-ritmo': {
    caption: 'La misma tríada menor con tres ritmos: corcheas, síncopa y tresillos.',
    bars: (t) => threeRhythms(prog(t).ii, 'm').map((b, i) => (i === 0 ? { ...b, chord: chordName(prog(t).ii, 'm7') } : b)),
  },
  // ----------------------------------------------------------------------------------------- mayores y menores
  'foco-trmm-ciclo': {
    caption: 'Ciclo de cuartas alternando la tríada mayor y la menor de cada tonalidad, un compás cada una.',
    bars: (t) => cycleRoots(t).flatMap((r) => [arpUpDown(r, 'M', { text: 'mayor' }), arpUpDown(r, 'm', { text: 'menor' })]),
  },
  'foco-trmm-moneda': {
    caption: 'Material para la moneda: mayor y menor desde seis notas de partida.',
    bars: (t) => [t, d(t, '2'), d(t, '3'), d(t, '5'), d(t, '6'), d(t, '4')].flatMap((r) => [shapeQuarters(r, 'M'), shapeQuarters(r, 'm')]),
  },
  'foco-trmm-tercera': {
    caption: 'La 3ª como nota larga: 1-3-5 y 1-♭3-5 con la blanca en la 3ª, en tres tonalidades.',
    bars: (t) =>
      three(t).flatMap((r) =>
        (['M', 'm'] as Shape[]).map((s) => {
          const a = extended(r, s);
          return { chord: chordName(r, s), text: s === 'M' ? '3ª mayor' : '3ª menor', cells: [{ p: a[0], d: 2 }, { p: a[1], d: 4 }, { p: a[2], d: 2 }] };
        }),
      ),
  },
  'foco-trmm-mapa': {
    caption: 'Las dos tríadas mayores y las dos menores de cada acorde del ii–V–I (las de las dos tablas), arpegiadas subiendo y bajando.',
    bars: (t) =>
      triadsIn(t).flatMap((c) => [
        ...c.major.map((r) => onChord(shapeUpDown(r, 'M'), c.chord, label(r, 'mayor'))),
        ...c.minor.map((r) => onChord(shapeUpDown(r, 'm'), c.chord, label(r, 'menor'))),
      ]),
  },
  'foco-trmm-alternar': {
    caption: 'Sobre cada acorde: una tríada mayor y después una menor, en negras.',
    bars: (t) => triadsIn(t).flatMap((c) => [onChord(shapeQuarters(c.major[0], 'M'), c.chord, label(c.major[0], 'mayor')), onChord(shapeQuarters(c.minor[0], 'm'), c.chord, label(c.minor[0], 'menor'))]),
  },
  'foco-trmm-oidoacorde': {
    caption: 'Las cuatro tríadas posibles sobre el dominante, para elegir de oído.',
    bars: (t) => {
      const p = prog(t);
      return [d(t, '5'), d(t, '4')].map((r) => onChord(shapeUpDown(r, 'M'), p.cv, label(r, 'mayor'))).concat([d(t, '2'), d(t, '5')].map((r) => onChord(shapeUpDown(r, 'm'), p.cv, label(r, 'menor'))));
    },
  },
  'foco-trmm-cells': {
    caption: 'Frases de dos compases: la tríada mayor y la menor de la misma raíz, en tres tonalidades y en los dos órdenes.',
    bars: (t) =>
      three(t).flatMap((r) => [
        cellTwice(r, 'M', [0, 1, 2, 1], { text: 'mayor' }),
        cellTwice(r, 'm', [2, 1, 0, 1], { text: 'menor' }),
        cellTwice(r, 'm', [0, 1, 2, 1], { text: 'menor' }),
        cellTwice(r, 'M', [2, 1, 0, 1], { text: 'mayor' }),
      ]),
  },
  'foco-trmm-ritmo': {
    caption: 'Tres ritmos sobre la tríada mayor y sobre la menor: corcheas, síncopa y tresillos.',
    bars: (t) => [...threeRhythms(t, 'M'), ...threeRhythms(t, 'm')].map((b, i) => (i === 0 ? { ...b, chord: chordName(t, 'M') } : i === 3 ? { ...b, chord: chordName(t, 'm') } : { ...b, chord: undefined })),
  },
  // ----------------------------------------------------------------------------------------- acordes de cuatro notas
  'foco-a7-familia': {
    caption: 'Las cuatro calidades sobre la misma raíz (maj7, m7, 7, m7♭5), en tres tonalidades: de una a otra cambia una sola nota.',
    bars: (t) => three(t).flatMap((r) => (['maj7', 'm7', 'dom7', 'm7b5'] as Shape[]).map((s) => arpUpDown(r, s))),
  },
  'foco-a7-ciclo': {
    caption: 'Cada calidad en las doce tonalidades del ciclo de cuartas (maj7, después m7, después 7 y después m7♭5), un compás por acorde.',
    bars: (t) => (['maj7', 'm7', 'dom7', 'm7b5'] as Shape[]).flatMap((s) => cycleRoots(t).map((r) => arpUpDown(r, s))),
  },
  'foco-a7-oido': {
    caption: 'Las cuatro calidades para cantar y tocar, desde la tónica del día y desde su quinta.',
    bars: (t) => [t, d(t, '5')].flatMap((r) => (['maj7', 'm7', 'dom7', 'm7b5'] as Shape[]).map((s) => shapeQuarters(r, s))),
  },
  'foco-a7-iivi': {
    caption: 'El arpegio 1-3-5-7 de cada acorde del ii–V–I, subiendo y bajando en negras.',
    bars: (t) => {
      const p = prog(t);
      return [
        ...shapeQuartersBoth(p.ii, 'm7'),
        ...shapeQuartersBoth(p.v, 'dom7'),
        ...shapeQuartersBoth(p.i, 'maj7'),
      ];
    },
  },
  'foco-a7-guia': {
    caption: 'Cada arpegio termina en la 7ª, que baja un semitono a la 3ª del acorde siguiente.',
    bars: (t) => {
      const p = prog(t);
      const a = extended(p.ii, 'm7');
      const d7 = a[3];
      const v3 = placeNear(d(p.v, '3'), midi(d7), 'down');
      const v5 = placeNear(d(p.v, '5'), midi(v3), 'up');
      const v7 = placeNear(d(p.v, 'b7'), midi(v5), 'up');
      const i3 = placeNear(d(p.i, '3'), midi(v7), 'down');
      return [
        { chord: p.cii, cells: [{ p: a[0], d: 2 }, { p: a[1], d: 2 }, { p: a[2], d: 2 }, { p: d7, d: 2 }] },
        { chord: p.cv, text: '7ª → 3ª', cells: [{ p: v3, d: 2 }, { p: v5, d: 2 }, { p: v7, d: 4 }] },
        { chord: p.ci, text: '7ª → 3ª', cells: [{ p: i3, d: 8 }] },
      ];
    },
  },
  'foco-a7-lesson1': {
    caption: 'Los arpegios del ii–V–I de la tonalidad del día, subiendo y bajando en corcheas.',
    bars: (t) => {
      const p = prog(t);
      return [arpUpDown(p.ii, 'm7'), arpUpDown(p.v, 'dom7'), arpUpDown(p.i, 'maj7')];
    },
  },
  'foco-a7-inversiones': {
    caption: 'El arpegio del maj7 empezando en la 1, la 3, la 5 y la 7, subiendo y bajando; abajo, bajando y subiendo.',
    bars: (t) => {
      const a = extended(t, 'maj7');
      const up = [0, 1, 2, 3].map((k) => a.slice(k, k + 4));
      const toBar = (c: typeof a, text: string, desc: boolean): Bar => {
        const n = desc ? c.slice().reverse() : c;
        const seq = [...n, ...n.slice(0, -1).reverse()];
        return { chord: chordName(t, 'maj7'), text, cells: [...seq.map((p) => ({ p, d: 1 })), { p: null, d: 1 }] };
      };
      return [
        ...up.map((c, k) => toBar(c, ['desde la 1', 'desde la 3', 'desde la 5', 'desde la 7'][k], false)),
        ...up.map((c, k) => toBar(c, ['desde la 1', 'desde la 3', 'desde la 5', 'desde la 7'][k], true)),
      ];
    },
  },
  'foco-a7-menor': {
    caption: 'ii–V–i menor: arpegios del m7♭5, del dominante y del menor, subiendo y bajando en corcheas.',
    bars: (t) => {
      const p = prog(t);
      return [
        arpUpDown(p.ii, 'm7b5'),
        shapeUpDown(p.ii, 'm7b5'),
        arpUpDown(p.v, 'dom7'),
        shapeUpDown(p.v, 'dom7'),
        arpUpDown(p.i, 'm7'),
        shapeUpDown(p.i, 'm7'),
      ];
    },
  },
  'foco-a7-ritmo': {
    caption: 'El arpegio con tres ritmos: corcheas, síncopa y tresillos, sobre el maj7 y sobre el dominante.',
    bars: (t) => [...threeRhythms(t, 'maj7'), ...threeRhythms(d(t, '5'), 'dom7')].map((b, i) => (i === 0 ? { ...b, chord: chordName(t, 'maj7') } : i === 3 ? { ...b, chord: chordName(d(t, '5'), 'dom7') } : { ...b, chord: undefined })),
  },
  // ----------------------------------------------------------------------------------------- células
  'foco-cel-mayor': {
    caption: 'Célula 1-2-3-5 de las doce tonalidades del ciclo de cuartas: sube en un compás y baja en el siguiente, en negras.',
    bars: (t) => cycleRoots(t).flatMap((r) => shapeQuartersBoth(r, 'celdaM', { chord: '', text: `${noteName(r)}: 1-2-3-5` })),
  },
  'foco-cel-menor': {
    caption: 'Célula 1-♭3-4-5 de las doce tonalidades del ciclo de cuartas: sube en un compás y baja en el siguiente, en negras.',
    bars: (t) => cycleRoots(t).flatMap((r) => shapeQuartersBoth(r, 'celdam', { chord: '', text: `${noteName(r)}: 1-♭3-4-5` })),
  },
  'foco-cel-oido': {
    caption: 'Las dos células para cantar y tocar desde la tónica del día, desde su cuarta y desde su quinta.',
    bars: (t) => three(t).flatMap((r) => [shapeQuarters(r, 'celdaM', { chord: '', text: '1-2-3-5' }), shapeQuarters(r, 'celdam', { chord: '', text: '1-♭3-4-5' })]),
  },
  'foco-cel-mapa': {
    caption: 'Cada célula sobre su acorde: 1-♭3-4-5 sobre el m7, 1-2-3-5 sobre el dominante y sobre el maj7; sube en un compás y baja en el siguiente.',
    bars: (t) => {
      const p = prog(t);
      return [
        ...shapeQuartersBoth(p.ii, 'celdam', { chord: p.cii, text: '1-♭3-4-5' }),
        ...shapeQuartersBoth(p.v, 'celdaM', { chord: p.cv, text: '1-2-3-5' }),
        ...shapeQuartersBoth(p.i, 'celdaM', { chord: p.ci, text: '1-2-3-5' }),
      ];
    },
  },
  'foco-cel-conectar': {
    caption: 'Una célula por compás sobre el ii–V–I: cada una empieza en la nota más cercana a donde terminó la anterior.',
    bars: (t) => {
      const p = prog(t);
      const chords: { r: Note; s: Shape; c: string; txt: string }[] = [
        { r: p.ii, s: 'celdam', c: p.cii, txt: '1-♭3-4-5' },
        { r: p.v, s: 'celdaM', c: p.cv, txt: '1-2-3-5' },
        { r: p.i, s: 'celdaM', c: p.ci, txt: '1-2-3-5' },
      ];
      let prev = 0;
      return chords.map(({ r, s: shape, c, txt }, i): Bar => {
        const a = extended(r, shape).slice(0, 4);
        // la primera nota es la raíz más cercana a la última de la célula anterior (la misma forma, desplazada de octava)
        const shift = i === 0 ? 0 : midi(placeNear(degreeNote(r, '1'), prev, 'near')) - midi(a[0]);
        const seq = a.map((p0) => ({ ...p0, octave: p0.octave + shift / 12 }));
        prev = midi(seq[3]);
        const cells: Cell[] = [...seq, ...seq.slice(0, -1).reverse()].map((p0) => ({ p: p0, d: 1 }));
        return { chord: c, text: txt, cells: [...cells, { p: null, d: 1 }] };
      });
    },
  },
  'foco-cel-rotar': {
    caption: 'Las cuatro rotaciones de cada célula sobre un acorde: 1-2-3-5, 2-3-5-1, 3-5-1-2, 5-1-2-3 y lo mismo con 1-♭3-4-5.',
    bars: (t) =>
      (['celdaM', 'celdam'] as Shape[]).flatMap((s) => {
        const a = extended(t, s);
        return [0, 1, 2, 3].map((k): Bar => {
          const c = a.slice(k, k + 4);
          const seq = [...c, ...c.slice(0, -1).reverse()];
          return { chord: s === 'celdaM' ? chordName(t, 'maj7') : chordName(t, 'm7'), text: `rotación ${k + 1}`, cells: [...seq.map((p) => ({ p, d: 1 })), { p: null, d: 1 }] };
        });
      }),
  },
  'foco-cel-ritmo': {
    caption: 'Tres ritmos sobre la célula mayor y sobre la menor: corcheas, síncopa y tresillos.',
    bars: (t) => [...threeRhythms(t, 'celdaM'), ...threeRhythms(t, 'celdam')].map((b, i) => ({ ...b, chord: i === 0 ? '' : undefined, text: i === 0 ? 'corcheas (1-2-3-5)' : i === 3 ? 'corcheas (1-♭3-4-5)' : b.text })),
  },
  'foco-cel-menorlesson': {
    caption: 'Células sobre los acordes de la cadena: la menor sobre el m7, la mayor sobre el dominante y el maj7, subiendo y bajando en corcheas.',
    bars: (t) => {
      const p = prog(t);
      return [
        shapeUpDown(p.ii, 'celdam', { chord: p.cii, text: '1-♭3-4-5' }),
        shapeUpDown(p.v, 'celdaM', { chord: p.cv, text: '1-2-3-5' }),
        shapeUpDown(p.i, 'celdaM', { chord: p.ci, text: '1-2-3-5' }),
        shapeUpDown(p.i, 'celdam', { chord: chordName(p.i, 'm7'), text: '1-♭3-4-5' }),
      ];
    },
  },
};

/** ABC del ejemplo de una tarea en la tonalidad del día (concierto). */
export function exampleAbc(id: string, concertKey: string): string | undefined {
  const e = EXAMPLES[id];
  if (!e) return undefined;
  const t = tonicOf(concertKey);
  return abcFromBars(e.bars(t), t, e.bpm ?? 70);
}
