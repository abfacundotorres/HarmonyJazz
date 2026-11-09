import { Chord, qdef, QUALITIES, Quality } from '../theory/chords';
import { Chart, ChartChord } from '../theory/chart';
import {
  degreeNote, degreePc, midi, mod, Note, pc, Pitch, placeNear, shiftOctave, transposeNote, transposePitch,
} from '../theory/notes';
import { SCALES } from '../theory/scales';

/** Nota melódica en concierto. pitch = null es silencio. Tiempos en corcheas. */
export interface MelNote {
  start: number;
  dur: number;
  pitch: Pitch | null;
}

export interface GenOptions {
  /** Rango en concierto (MIDI). */
  low: number;
  high: number;
}

export interface Generator {
  id: string;
  name: string;
  description: string;
  run: (chart: Chart, opt: GenOptions) => MelNote[];
}

type Dir = 'up' | 'down' | 'near';
interface Step {
  note: Note;
  dir: Dir;
  dur: number;
}

// ---------- utilidades ----------

const third = (c: Chord) => qdef(c).guide[0];
const seventh = (c: Chord) => qdef(c).guide[1];
function fifth(c: Chord) {
  const d = qdef(c);
  return d.tones.find((t) => /^(b|#)?5$/.test(t)) ?? d.tensions.find((t) => /13$/.test(t)) ?? '5';
}
function ninth(c: Chord) {
  const d = qdef(c);
  return d.tensions.find((t) => /9$/.test(t)) ?? (SCALES[d.scale].degrees.includes('b2') ? 'b9' : '9');
}
/** [1, 3, 5, 7, 9] concretos del acorde. */
export function arpDegrees(c: Chord): string[] {
  return ['1', third(c), fifth(c), seventh(c), ninth(c)];
}

const N = (c: Chord, deg: string) => degreeNote(c.root, deg);

/** Ubica una secuencia de pasos empezando cerca de `ref` y la encaja en el rango por octavas. */
function realize(steps: Step[], ref: number, opt: GenOptions): Pitch[] {
  const out: Pitch[] = [];
  let cur = ref;
  for (const s of steps) {
    const p = placeNear(s.note, cur, out.length === 0 && s.dir !== 'near' ? 'near' : s.dir);
    out.push(p);
    cur = midi(p);
  }
  return fitRange(out, opt);
}

function fitRange(ps: Pitch[], opt: GenOptions): Pitch[] {
  const ms = ps.map(midi);
  const overflow = (shift: number) =>
    ms.reduce((acc, m) => acc + Math.max(0, m + shift - opt.high) + Math.max(0, opt.low - (m + shift)), 0);
  let best = 0;
  for (const sh of [0, -12, 12, -24, 24]) if (overflow(sh) < overflow(best)) best = sh;
  return best === 0 ? ps : ps.map((p) => shiftOctave(p, best / 12));
}

const center = (opt: GenOptions) => Math.round((opt.low + opt.high) / 2);

/** Recorre los acordes generando un segmento por acorde, encadenando la última nota. */
function perChord(
  chart: Chart,
  opt: GenOptions,
  fn: (cc: ChartChord, i: number) => Step[] | null,
): MelNote[] {
  const notes: MelNote[] = [];
  let ref = center(opt);
  chart.chords.forEach((cc, i) => {
    const steps = fn(cc, i);
    if (!steps || steps.length === 0) {
      notes.push({ start: cc.start, dur: cc.dur, pitch: null });
      return;
    }
    const ps = realize(steps, ref, opt);
    let t = cc.start;
    steps.forEach((s, k) => {
      notes.push({ start: t, dur: s.dur, pitch: ps[k] });
      t += s.dur;
    });
    ref = midi(ps[ps.length - 1]);
  });
  return notes;
}

/** Toma una lista de grados y la ajusta a la duración del acorde (en corcheas). */
function fitDegrees(c: Chord, degs: string[], dirs: Dir[], dur: number): Step[] {
  const n = Math.min(dur, degs.length);
  return degs.slice(0, n).map((d, i) => ({ note: N(c, d), dir: dirs[i] ?? 'near', dur: i === n - 1 ? dur - (n - 1) : 1 }));
}

// ---------- generadores ----------

const guideTones: Generator = {
  id: 'guide',
  name: 'Línea de guide tones (3ª y 7ª)',
  description: 'Una nota por acorde: la 3ª o la 7ª más cercana a la anterior. Es el esqueleto de toda línea bebop.',
  run: (chart, opt) => {
    const notes: MelNote[] = [];
    let ref = center(opt);
    chart.chords.forEach((cc, i) => {
      const degs = i === 0 ? [third(cc.chord)] : qdef(cc.chord).guide;
      const cands: Pitch[] = [];
      for (const g of degs) {
        const n = N(cc.chord, g);
        for (let o = 2; o <= 6; o++) {
          const p = { ...n, octave: o };
          if (midi(p) >= opt.low && midi(p) <= opt.high) cands.push(p);
        }
      }
      const p = cands.sort((a, b) => Math.abs(midi(a) - ref) - Math.abs(midi(b) - ref) || midi(a) - midi(b))[0];
      notes.push({ start: cc.start, dur: cc.dur, pitch: p });
      ref = midi(p);
    });
    return notes;
  },
};

const guideTonesQuarter: Generator = {
  id: 'guide2',
  name: 'Guide tones en blancas (3 → 7 → 3)',
  description: 'Dos guide tones por compás: la línea desciende por grado conjunto y resuelve en la 3ª del acorde siguiente.',
  run: (chart, opt) =>
    perChord(chart, opt, (cc) => {
      const [g3, g7] = qdef(cc.chord).guide;
      if (cc.dur < 8) return [{ note: N(cc.chord, g3), dir: 'near', dur: cc.dur }];
      return [
        { note: N(cc.chord, g3), dir: 'near', dur: 4 },
        { note: N(cc.chord, g7), dir: 'near', dur: 4 },
      ];
    }),
};

const arpeggio: Generator = {
  id: 'arp',
  name: 'Arpegio 1-3-5-7-9',
  description: 'Sube hasta la 9ª y baja. Conocer el acorde en todo el registro, a tempo, en las 12 tonalidades.',
  run: (chart, opt) =>
    perChord(chart, opt, (cc) => {
      const [r, t, f, s, n] = arpDegrees(cc.chord);
      return fitDegrees(cc.chord, [r, t, f, s, n, s, f, t], ['near', 'up', 'up', 'up', 'up', 'down', 'down', 'down'], cc.dur);
    }),
};

const arpeggioFrom3: Generator = {
  id: 'arp3',
  name: 'Arpegio desde la 3ª (3-5-7-9)',
  description: 'Upper structure: empieza en la 3ª para sonar "adentro" sin marcar la fundamental, como un solista y no como un bajista.',
  run: (chart, opt) =>
    perChord(chart, opt, (cc, i) => {
      const [r, t, f, s, n] = arpDegrees(cc.chord);
      const up = i % 2 === 0;
      return up
        ? fitDegrees(cc.chord, [t, f, s, n, s, f, t, r], ['near', 'up', 'up', 'up', 'down', 'down', 'down', 'down'], cc.dur)
        : fitDegrees(cc.chord, [n, s, f, t, f, s, n, s], ['near', 'down', 'down', 'down', 'up', 'up', 'up', 'down'], cc.dur);
    }),
};

const digital: Generator = {
  id: 'digital',
  name: 'Patrones digitales 1-2-3-5 / 3-5-7-9',
  description: 'El vocabulario de Coltrane: células de cuatro notas que se transportan por cualquier progresión.',
  run: (chart, opt) =>
    perChord(chart, opt, (cc) => {
      const [r, t, f, s, n] = arpDegrees(cc.chord);
      return fitDegrees(cc.chord, [r, n, t, f, t, f, s, n], ['near', 'up', 'up', 'up', 'down', 'up', 'up', 'up'], cc.dur);
    }),
};

function upperNeighbor(c: Chord, target: Pitch): Note {
  const deg = SCALES[qdef(c).scale].degrees;
  const tpc = pc(target);
  const root = pc(c.root);
  // grado de la escala inmediatamente arriba del objetivo
  let best = deg[0];
  let bestDist = 99;
  for (const d of deg) {
    const dist = mod(root + degreePc(d) - tpc, 12);
    if (dist > 0 && dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return N(c, best);
}

const enclosure: Generator = {
  id: 'enclosure',
  name: 'Enclosure a la 3ª',
  description: 'Nota de la escala por arriba + cromática por abajo → 3ª. El recurso de aproximación más usado en bebop.',
  run: (chart, opt) => {
    const notes: MelNote[] = [];
    let ref = center(opt);
    chart.chords.forEach((cc) => {
      const c = cc.chord;
      const [target] = fitRange([placeNear(N(c, third(c)), ref)], { low: opt.low + 2, high: opt.high - 2 });
      const above = placeNear(upperNeighbor(c, target), midi(target), 'up');
      const below = transposePitch(target, { steps: -1, semis: -1 });
      const [, , f, s, n] = arpDegrees(c);
      const seq: [Pitch, number][] = [];
      if (cc.dur >= 4) seq.push([above, 1], [below, 1]);
      seq.push([target, cc.dur >= 4 ? 2 : cc.dur]);
      if (cc.dur >= 8) {
        let cur = midi(target);
        for (const d of [f, s, n, s]) {
          const p = placeNear(N(c, d), cur, d === s && cur > midi(target) + 9 ? 'down' : 'up');
          seq.push([p, 1]);
          cur = midi(p);
        }
      }
      const fitted = fitRange(seq.map((x) => x[0]), opt);
      let t = cc.start;
      seq.forEach(([, d], k) => {
        notes.push({ start: t, dur: d, pitch: fitted[k] });
        t += d;
      });
      ref = midi(fitted[fitted.length - 1]);
    });
    return notes;
  },
};

const BEBOP_DESC: Record<string, string[]> = {
  dominant: ['1', '7', 'b7', '6', '5', '4', '3', '2'],
  minor: ['b7', '6', '5', '4', 'b3', '2', '1', 'b7'],
  major: ['1', '7', '6', 'b6', '5', '4', '3', '2'],
  halfdim: ['b7', 'b6', 'b5', '4', 'b3', 'b2', '1', 'b7'],
  dim: ['1', '7', '6', '#5', 'b5', '4', 'b3', '2'],
};

const bebop: Generator = {
  id: 'bebop',
  name: 'Escala bebop descendente',
  description: 'Con la nota de paso cromática, las notas del acorde caen en los tiempos fuertes.',
  run: (chart, opt) =>
    perChord(chart, opt, (cc) => {
      const c = cc.chord;
      const fam = qdef(c).family;
      let degs = BEBOP_DESC[fam];
      if (c.quality === 'm6' || c.quality === 'mMaj7') degs = ['1', '7', '6', 'b6', '5', '4', 'b3', '2'];
      if (c.quality === '7alt') degs = ['b7', 'b6', '#4', '3', '#2', 'b2', '1', 'b7'];
      const dirs: Dir[] = ['near', 'down', 'down', 'down', 'down', 'down', 'down', 'down'];
      return fitDegrees(c, degs, dirs, cc.dur);
    }),
};

type Triad = [string, 'maj' | 'min' | 'aug'];
const TRIAD_PAIRS: Record<Quality, [Triad, Triad] | null> = {
  maj: [['1', 'maj'], ['2', 'maj']],
  maj7: [['1', 'maj'], ['2', 'maj']],
  '6': [['1', 'maj'], ['2', 'maj']],
  'maj7#11': [['1', 'maj'], ['2', 'maj']],
  m: [['b3', 'maj'], ['4', 'maj']],
  m7: [['b3', 'maj'], ['4', 'maj']],
  m6: [['4', 'maj'], ['5', 'maj']],
  mMaj7: [['4', 'maj'], ['5', 'maj']],
  m7b5: [['b6', 'maj'], ['b7', 'maj']],
  dim7: [['2', 'maj'], ['b6', 'maj']],
  '7': [['b7', 'maj'], ['1', 'maj']],
  '7alt': [['b5', 'maj'], ['b6', 'maj']],
  '7b9': [['1', 'maj'], ['b5', 'maj']],
  '7b9b13': [['1', 'maj'], ['b2', 'maj']],
  '7#11': [['1', 'maj'], ['2', 'maj']],
  '7b13': [['b7', 'maj'], ['1', 'maj']],
  '7sus': [['4', 'maj'], ['5', 'min']],
  '7#5': [['1', 'aug'], ['2', 'aug']],
};

export function triadPair(c: Chord): [Note[], Note[]] | null {
  const tp = TRIAD_PAIRS[c.quality];
  if (!tp) return null;
  return tp.map(([deg, q]) => {
    const r = N(c, deg);
    const th = transposeNote(r, q === 'min' ? { steps: 2, semis: 3 } : { steps: 2, semis: 4 });
    const fi = transposeNote(r, q === 'aug' ? { steps: 4, semis: 8 } : { steps: 4, semis: 7 });
    return [r, th, fi];
  }) as [Note[], Note[]];
}

const triadPairs: Generator = {
  id: 'triads',
  name: 'Pares de tríadas',
  description: 'Dos tríadas sin notas en común que juntas forman una escala hexatónica. Se tocan en inversiones, alternando, para que la línea quede compacta. Sonido moderno (Woody Shaw, Brecker).',
  run: (chart, opt) => {
    const notes: MelNote[] = [];
    let ref = center(opt) - 4;
    chart.chords.forEach((cc, i) => {
      const tp = triadPair(cc.chord);
      if (!tp) {
        notes.push({ start: cc.start, dur: cc.dur, pitch: null });
        return;
      }
      // zigzag: una tríada sube, la otra baja, cada una desde su nota más cercana
      const n = Math.min(8, cc.dur);
      const seq: Pitch[] = [];
      let cur = ref;
      let g = 0;
      while (seq.length < n) {
        const up = (g + i) % 2 === 0;
        const triad = tp[g % 2];
        const startNote = triad
          .map((t) => placeNear(t, cur, g === 0 ? 'near' : up ? 'up' : 'down'))
          .sort((a, b) => Math.abs(midi(a) - cur) - Math.abs(midi(b) - cur))[0];
        const placed = [startNote];
        while (placed.length < 3) {
          const last = midi(placed[placed.length - 1]);
          const next = triad
            .filter((t) => !placed.some((p) => p.letter === t.letter && p.acc === t.acc))
            .map((t) => placeNear(t, last, up ? 'up' : 'down'))
            .sort((a, b) => Math.abs(midi(a) - last) - Math.abs(midi(b) - last))[0];
          placed.push(next);
        }
        for (const p of placed) if (seq.length < n) seq.push(p);
        cur = midi(seq[seq.length - 1]);
        g++;
      }
      const fitted = fitRange(seq, opt);
      fitted.forEach((p, k) =>
        notes.push({ start: cc.start + k, dur: k === n - 1 ? cc.dur - (n - 1) : 1, pitch: p }),
      );
      ref = midi(fitted[fitted.length - 1]);
    });
    return notes;
  },
};

const PENT_ROOT: Partial<Record<Quality, string>> = {
  maj: '5', maj7: '5', '6': '5', 'maj7#11': '2',
  m: 'b3', m7: 'b3', m6: '4', mMaj7: '4', m7b5: 'b6',
  '7': '1', '7alt': 'b5', '7#11': '2', '7b13': 'b7', '7sus': 'b7',
};

const pentatonic: Generator = {
  id: 'pent',
  name: 'Superposición pentatónica',
  description: 'Una pentatónica mayor elegida para cada acorde: sobre C7alt, G♭ pentatónica (♯11, ♭13, ♭7, ♭9, ♯9).',
  run: (chart, opt) =>
    perChord(chart, opt, (cc, i) => {
      const c = cc.chord;
      const rootDeg = PENT_ROOT[c.quality];
      if (!rootDeg) {
        const [r, t, f, s, n] = arpDegrees(c);
        return fitDegrees(c, [r, t, f, s, n, s, f, t], ['near', 'up', 'up', 'up', 'up', 'down', 'down', 'down'], cc.dur);
      }
      const pr = N(c, rootDeg);
      const pent = ['1', '2', '3', '5', '6'].map((d) => degreeNote(pr, d));
      const up = i % 2 === 0;
      const idx = up ? [0, 1, 2, 3, 1, 2, 3, 4] : [4, 3, 2, 1, 3, 2, 1, 0];
      const dirs: Dir[] = up
        ? ['near', 'up', 'up', 'up', 'down', 'up', 'up', 'up']
        : ['near', 'down', 'down', 'down', 'up', 'down', 'down', 'down'];
      const n = Math.min(8, cc.dur);
      return idx.slice(0, n).map((k, j) => ({ note: pent[k], dir: dirs[j], dur: j === n - 1 ? cc.dur - (n - 1) : 1 }));
    }),
};

const sideSlip: Generator = {
  id: 'sideslip',
  name: 'Side-slipping (afuera → adentro)',
  description: 'Medio compás medio tono arriba y resolución al acorde real. La tensión sólo funciona si la resolución es clara.',
  run: (chart, opt) =>
    perChord(chart, opt, (cc, i) => {
      const c = cc.chord;
      const [r, t, f, s] = arpDegrees(c);
      if (cc.dur < 8 || i % 2 === 0) {
        return fitDegrees(c, [r, t, f, s, f, t, r, s], ['near', 'up', 'up', 'up', 'down', 'down', 'down', 'down'], cc.dur);
      }
      const out: Chord = { ...c, root: transposeNote(c.root, { steps: 1, semis: 1 }) };
      const outside = [r, t, f, s].map((d) => degreeNote(out.root, d));
      const inside = [s, f, t, r].map((d) => N(c, d));
      return [
        ...outside.map((note, k): Step => ({ note, dir: k === 0 ? 'near' : 'up', dur: 1 })),
        ...inside.map((note): Step => ({ note, dir: 'down', dur: 1 })),
      ];
    }),
};

/** Desplaza una línea una corchea (o más) hacia adelante: el mismo material, otro acento. */
export function displace(notes: MelNote[], total: number, by = 1): MelNote[] {
  const out: MelNote[] = [{ start: 0, dur: by, pitch: null }];
  for (const n of notes) {
    const start = n.start + by;
    if (start >= total) continue;
    out.push({ ...n, start, dur: Math.min(n.dur, total - start) });
  }
  return out;
}

const displaced: Generator = {
  id: 'displaced',
  name: 'Desplazamiento rítmico (1-2-3-5 corrido una corchea)',
  description: 'El mismo patrón digital empezando en el contratiempo. Cambia por completo dónde caen los acentos.',
  run: (chart, opt) => displace(digital.run(chart, opt), chart.bars * 8, 1),
};

export const GENERATORS: Generator[] = [
  guideTones, guideTonesQuarter, arpeggio, arpeggioFrom3, digital, enclosure, bebop, triadPairs, pentatonic, sideSlip, displaced,
];

export const generatorById = (id: string) => GENERATORS.find((g) => g.id === id)!;

/** Para tests y UI: todas las calidades conocidas. */
export const ALL_QUALITIES = Object.keys(QUALITIES) as Quality[];
