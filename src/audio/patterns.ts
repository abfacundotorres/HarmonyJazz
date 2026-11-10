/**
 * Patrones de acompañamiento (bajo, piano, batería) como funciones puras y reproducibles.
 * No tocan el audio: devuelven golpes ("hits") con su posición en corcheas, y el motor los
 * reproduce. Así las reglas musicales se pueden verificar con tests.
 */
import { qdef, Chord } from '../theory/chords';
import { Chart, ChartChord, EIGHTHS_PER_BAR } from '../theory/chart';
import { degreePc, mod, pc } from '../theory/notes';
import { SCALES } from '../theory/scales';
import { buildVoicing } from '../theory/voicings';

export type Style = 'swing' | 'two' | 'ballad' | 'bossa';

// ---------- azar con semilla ----------

export type Rng = () => number;
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r: Rng, a: number, b: number) => a + r() * (b - a);
function weighted<T>(r: Rng, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [it, w] of items) {
    x -= w;
    if (x <= 0) return it;
  }
  return items[items.length - 1][0];
}

// ---------- swing ----------

/**
 * Relación de la corchea larga (0,5 = recto, 0,67 = tresillo). El swing real se aplana al subir el tempo:
 * a ritmo lento se acerca al tresillo y a ritmo rápido casi a corcheas iguales. `amount` es el ajuste del usuario.
 */
export function effectiveSwing(tempo: number, amount: number, style: Style): number {
  if (style === 'bossa') return 0.5;
  const pts: [number, number][] = [[80, 1.15], [100, 1.1], [160, 0.9], [200, 0.65], [260, 0.35], [320, 0.25]];
  let f = pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, f0] = pts[i];
    const [t1, f1] = pts[i + 1];
    if (tempo <= pts[0][0]) {
      f = pts[0][1];
      break;
    }
    if (tempo <= t1) {
      f = f0 + ((f1 - f0) * (tempo - t0)) / (t1 - t0);
      break;
    }
  }
  return Math.max(0.5, Math.min(0.72, 0.5 + (amount - 0.5) * f));
}

// ---------- bajo ----------

export const BASS_LOW = 33; // A1
export const BASS_HIGH = 55; // G3 (la muestra más aguda del contrabajo)
/** Centro cómodo del registro: la línea se mantiene cerca para no "derivar" hacia un borde. */
const BASS_CENTER = 43;

export interface BassHit {
  /** Posición en corcheas desde el inicio del chorus. */
  e: number;
  /** Duración en corcheas. */
  dur: number;
  midi: number;
  vel: number;
}

/** Clases de altura de las notas del acorde y de su escala (exportado para los tests). */
export function chordPcs(c: Chord) {
  const d = qdef(c);
  const r = pc(c.root);
  return {
    root: r,
    tones: d.tones.map((t) => mod(r + degreePc(t), 12)),
    scale: SCALES[d.scale].degrees.map((t) => mod(r + degreePc(t), 12)),
  };
}

/** Todas las alturas dentro del registro del bajo que tienen alguna de estas clases de altura. */
function inRange(pcs: number[], lo = BASS_LOW, hi = BASS_HIGH): number[] {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (pcs.includes(mod(m, 12))) out.push(m);
  return out;
}

function nearest(list: number[], target: number): number {
  return list.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
}

/**
 * Octava de la fundamental: la más cercana a la nota anterior, pero mirando también hacia dónde hay que ir
 * (la fundamental siguiente); así no se queda en el borde del registro con un salto forzado.
 */
function pickNext(pcv: number, from: number): number {
  let best = 0;
  let bestCost = Infinity;
  for (const m of inRange([pcv])) {
    const cost = Math.abs(m - from) + 0.45 * Math.abs(m - BASS_CENTER);
    if (cost < bestCost) {
      bestCost = cost;
      best = m;
    }
  }
  return best;
}

function pickRoot(rootPc: number, nextRootPc: number, prev: number): number {
  let best = 0;
  let bestCost = Infinity;
  for (const m of inRange([rootPc])) {
    const cost = Math.abs(m - prev) + 0.9 * Math.abs(pickNext(nextRootPc, m) - m) + 0.45 * Math.abs(m - BASS_CENTER);
    if (cost < bestCost) {
      bestCost = cost;
      best = m;
    }
  }
  return best;
}

/**
 * Un compás de walking bass sobre un acorde de un compás:
 *  1: fundamental · 2: nota de paso o del acorde · 3: nota del acorde · 4: aproximación a la fundamental siguiente.
 * Reglas: movimiento mayormente por grado conjunto, sin repetir notas, sin saltos grandes y con la
 * aproximación a medio tono (o un tono) de la fundamental que sigue.
 */
export function walkBar(chord: Chord, next: Chord, prev: number, r: Rng): [number, number, number, number] {
  const c = chordPcs(chord);
  const n = chordPcs(next);
  const b1 = pickRoot(c.root, n.root, prev);
  const nextRoot = pickNext(n.root, b1);

  // 4.º tiempo: aproximación cromática (la más usada) o a un tono
  const cand4: [number, number][] = [];
  for (const [d, w] of [[-1, 6], [1, 6], [-2, 1.2], [2, 1.2]] as const) {
    const m = nextRoot + d;
    if (m >= BASS_LOW && m <= BASS_HIGH && m !== b1) cand4.push([m, w]);
  }
  const b4 = cand4.length ? weighted(r, cand4) : nextRoot;

  // 3.er tiempo: nota del acorde (3ª, 5ª o 7ª) a una distancia razonable de la aproximación
  const toneMidis = inRange(c.tones).filter((m) => m !== b1 && m !== b4);
  const mid = (b1 + b4) / 2;
  const c3 = toneMidis
    .filter((m) => Math.abs(m - b4) >= 1 && Math.abs(m - b4) <= 7)
    .map((m): [number, number] => [m, Math.abs(m - mid) + Math.abs(m - b1) * 0.15])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([m], i): [number, number] => [m, [5, 2.5, 1][i]]);
  const near4 = toneMidis.length ? nearest(toneMidis, b4) : b1 + 4;
  const b3 = c3.length ? weighted(r, c3) : near4;

  // 2.º tiempo: nota de la escala o del acorde, cerca de la primera y de la tercera
  const scaleMidis = inRange(c.scale).filter((m) => m !== b1 && m !== b3 && m !== b4);
  const c2 = scaleMidis
    .filter((m) => Math.abs(m - b1) <= 4 && Math.abs(m - b3) <= 5)
    .map((m): [number, number] => {
      const step = Math.abs(m - b1) <= 2 ? 3 : 1; // se prefiere el grado conjunto
      const towards = Math.sign(m - b1) === Math.sign(b3 - b1) ? 1.5 : 1; // y avanzar hacia la nota siguiente
      return [m, step * towards];
    });
  const fallback2 = inRange(c.tones.concat(c.scale)).filter((m) => m !== b1 && m !== b3 && m !== b4);
  const b2 = c2.length ? weighted(r, c2) : nearest(fallback2.length ? fallback2 : [b1 + 2], (b1 + b3) / 2);
  return [b1, b2, b3, b4];
}

export function bassLine(chart: Chart, style: Style, r: Rng, prev: number): { hits: BassHit[]; last: number } {
  const hits: BassHit[] = [];
  const chords = chart.chords;
  let last = prev;
  chords.forEach((cc, i) => {
    const nextCc = chords[(i + 1) % chords.length];
    const beats = cc.dur / 2;
    const c = chordPcs(cc.chord);
    const n = chordPcs(nextCc.chord);
    const place = (pcv: number, near: number) => nearest(inRange([pcv]), near);

    if (style === 'bossa') {
      const root = place(c.root, last);
      const fifth = place(mod(c.root + 7, 12), root + 5);
      const spec: [number, number, number][] =
        beats >= 4 ? [[0, 3, root], [3, 1, fifth], [4, 4, fifth]] : beats >= 2 ? [[0, 3, root], [3, 1, fifth]] : [[0, 2, root]];
      for (const [e, d, m] of spec) hits.push({ e: cc.start + e, dur: d * 0.9, midi: m, vel: 0.85 });
      last = root;
      return;
    }
    if (style === 'two' || style === 'ballad') {
      const root = place(c.root, last);
      const fifth = place(mod(c.root + 7, 12), root + 4);
      if (beats >= 4) {
        hits.push({ e: cc.start, dur: 3.6, midi: root, vel: 0.9 }, { e: cc.start + 4, dur: 3.6, midi: fifth, vel: 0.75 });
        last = fifth;
      } else {
        hits.push({ e: cc.start, dur: Math.max(1.5, cc.dur * 0.9), midi: root, vel: 0.9 });
        last = root;
      }
      return;
    }
    // swing en 4
    if (beats >= 4) {
      const [b1, b2, b3, b4] = walkBar(cc.chord, nextCc.chord, last, r);
      const notes = [b1, b2, b3, b4];
      notes.forEach((m, k) => hits.push({ e: cc.start + k * 2, dur: 1.85, midi: m, vel: k % 2 === 0 ? between(r, 0.88, 0.98) : between(r, 0.7, 0.82) }));
      last = b4;
    } else if (beats >= 2) {
      const root = pickRoot(c.root, n.root, last);
      const nextRoot = pickNext(n.root, root);
      const cands = [nextRoot - 1, nextRoot + 1].filter((m) => m >= BASS_LOW && m <= BASS_HIGH && m !== root);
      const ap = cands.length ? weighted(r, cands.map((m): [number, number] => [m, 1])) : nextRoot;
      hits.push({ e: cc.start, dur: 1.85, midi: root, vel: between(r, 0.88, 0.98) }, { e: cc.start + 2, dur: 1.85, midi: ap, vel: between(r, 0.7, 0.82) });
      last = ap;
    } else {
      const root = nearest(inRange([c.root]), last);
      hits.push({ e: cc.start, dur: 1.85, midi: root, vel: 0.9 });
      last = root;
    }
  });
  return { hits, last };
}

// ---------- piano ----------

export interface CompHit {
  e: number;
  dur: number;
  midis: number[];
  vel: number;
}

/** Células rítmicas de un compás [posición en corcheas, duración en corcheas]. -1 = anticipación del compás anterior. */
const CELLS_BAR: Record<string, [number, number][]> = {
  charleston: [[0, 3], [3, 1]],
  andOfTwo: [[3, 1]],
  twoStabs: [[2, 1], [5, 1]],
  syncopated: [[1, 1], [4, 2], [7, 1]],
  reverseCharleston: [[1, 1], [4, 3]],
  antic: [[-1, 2], [4, 1]],
  offbeats: [[3, 1], [6, 1]],
  sparse: [[4, 1]],
};
const CELL_WEIGHTS: [string, number][] = [
  ['charleston', 3], ['andOfTwo', 2], ['twoStabs', 2], ['syncopated', 1.5], ['reverseCharleston', 1.5], ['antic', 1.5], ['offbeats', 1.5], ['sparse', 1],
];

export interface CompState {
  voicing: number[] | null;
  lastCell: string | null;
  repeats: number;
}
export const newCompState = (): CompState => ({ voicing: null, lastCell: null, repeats: 0 });

export function compLine(chart: Chart, style: Style, r: Rng, chorus: number, st: CompState): CompHit[] {
  const hits: CompHit[] = [];
  const intensity = 0.85 + 0.15 * Math.min(chorus, 3) / 3;
  chart.chords.forEach((cc: ChartChord, idx: number) => {
    const v = buildVoicing(cc.chord, st.voicing, 52, 64);
    st.voicing = v;
    const push = (e: number, dur: number, vel: number) => hits.push({ e: Math.max(0, cc.start + e), dur, midis: v, vel: Math.min(1, vel * intensity) });

    if (style === 'ballad') {
      push(0, cc.dur * 0.97, between(r, 0.3, 0.4));
      if (cc.dur >= 8 && r() < 0.4) push(5, 3, between(r, 0.22, 0.3));
      return;
    }
    if (style === 'bossa') {
      if (cc.dur >= 8) {
        const cell = weighted(r, [[[[0, 2], [3, 3], [6, 2]], 1], [[[1, 2], [4, 1], [6, 2]], 1], [[[0, 2], [3, 2], [7, 1]], 1]] as [[number, number][], number][]);
        cell.forEach(([e, d]) => push(e, d * 0.9, between(r, 0.38, 0.52)));
      } else push(0, 2, between(r, 0.38, 0.5));
      return;
    }
    // swing
    if (cc.dur >= 8) {
      // no repetir la misma célula más de dos veces seguidas; dejar aire de vez en cuando
      const rest = r() < 0.12 && st.lastCell !== 'rest';
      let name = rest ? 'rest' : weighted(r, CELL_WEIGHTS);
      if (name === st.lastCell && st.repeats >= 2) name = weighted(r, CELL_WEIGHTS.filter(([n]) => n !== st.lastCell));
      st.repeats = name === st.lastCell ? st.repeats + 1 : 1;
      st.lastCell = name;
      if (name === 'rest') return;
      CELLS_BAR[name].forEach(([e, d]) => {
        if (e < 0 && idx === 0 && chorus === 0) return; // sin compás anterior en el primer chorus
        const accent = e < 0 || e === 3 ? 0.07 : 0;
        push(e, d * 0.55, between(r, 0.4, 0.58) + accent);
      });
    } else if (cc.dur >= 4) {
      const cell = weighted(r, [[[[0, 2]], 3], [[[1, 1]], 1.5], [[[0, 1], [3, 1]], 1]] as [[number, number][], number][]);
      cell.forEach(([e, d]) => push(e, d * 0.6, between(r, 0.4, 0.55)));
    } else {
      push(0, 1, between(r, 0.4, 0.5));
    }
  });
  return hits;
}

// ---------- batería ----------

export type DrumVoice = 'ride' | 'chick' | 'hatc' | 'kick' | 'ghost' | 'snare' | 'stick';
export interface DrumHit {
  voice: DrumVoice;
  e: number;
  vel: number;
}

/** Probabilidad de un "fill" en este compás: casi seguro al final del chorus, probable al final de cada frase de 8, ocasional cada 4. */
export function fillProbability(bar: number, bars: number): number {
  if (bar === bars - 1) return 0.95;
  if (bars >= 8 && (bar + 1) % 8 === 0) return 0.7;
  if (bars >= 8 && (bar + 1) % 4 === 0) return 0.25;
  return 0;
}

export function drumLine(chart: Chart, style: Style, r: Rng, chorus: number): DrumHit[] {
  const hits: DrumHit[] = [];
  const intensity = 0.88 + 0.12 * Math.min(chorus, 3) / 3;
  const add = (voice: DrumVoice, e: number, vel: number) => hits.push({ voice, e, vel: Math.max(0.04, Math.min(1, vel * intensity)) });

  for (let b = 0; b < chart.bars; b++) {
    const e0 = b * EIGHTHS_PER_BAR;
    const fillP = fillProbability(b, chart.bars);

    if (style === 'bossa') {
      const clave = b % 2 === 0 ? [0, 3, 6] : [2, 4];
      for (let e = 0; e < 8; e++) add('hatc', e0 + e, e % 2 ? between(r, 0.26, 0.34) : between(r, 0.4, 0.5));
      for (const e of clave) add('stick', e0 + e, between(r, 0.42, 0.55));
      for (const [e, v] of [[0, 0.5], [3, 0.3], [4, 0.45], [7, 0.3]] as const) add('kick', e0 + e, v + between(r, -0.04, 0.04));
      if (fillP > 0 && r() < fillP) add('ghost', e0 + 6, 0.3);
      continue;
    }

    if (style === 'ballad') {
      // sin escobillas en la biblioteca: ride muy suave, pedal en 2 y 4, golpes fantasma de caja
      for (const k of [0, 2, 4, 6]) add('ride', e0 + k, between(r, 0.28, 0.36));
      add('ride', e0 + 3, between(r, 0.16, 0.22));
      add('ride', e0 + 7, between(r, 0.16, 0.22));
      add('chick', e0 + 2, between(r, 0.3, 0.38));
      add('chick', e0 + 6, between(r, 0.3, 0.38));
      for (const k of [0, 2, 4, 6]) add('kick', e0 + k, between(r, 0.08, 0.14));
      if (r() < 0.3) add('ghost', e0 + weighted(r, [[3, 1], [5, 1], [7, 1]]), between(r, 0.12, 0.2));
      continue;
    }

    // swing y swing en 2: ride "spang-a-lang", pedal en 2 y 4, bombo apenas audible y caja que comenta
    const light = style === 'two' ? 0.85 : 1;
    for (const k of [0, 2, 4, 6]) add('ride', e0 + k, (k === 2 || k === 6 ? between(r, 0.66, 0.78) : between(r, 0.5, 0.62)) * light);
    // nota de salto (el "y" de 2 y 4), la que da el swing
    for (const e of [3, 7]) if (r() < 0.96) add('ride', e0 + e, between(r, 0.4, 0.52) * light);
    add('chick', e0 + 2, between(r, 0.5, 0.62));
    add('chick', e0 + 6, between(r, 0.5, 0.62));
    for (const k of [0, 2, 4, 6]) add('kick', e0 + k, between(r, 0.14, 0.24));

    // la caja comenta: golpes fantasma y algún acento anticipando el cambio de acorde
    const comment = weighted(r, [['none', 3], ['ghost', 3], ['accent', 1.5], ['two', 1]] as [string, number][]);
    if (comment === 'ghost') add('ghost', e0 + weighted(r, [[1, 1], [3, 1], [5, 1], [7, 1]]), between(r, 0.2, 0.34));
    if (comment === 'accent') {
      add('snare', e0 + weighted(r, [[3, 2], [5, 1], [7, 2]]), between(r, 0.38, 0.5));
      add('kick', e0 + 4, between(r, 0.3, 0.4));
    }
    if (comment === 'two') {
      add('ghost', e0 + 5, between(r, 0.2, 0.3));
      add('ghost', e0 + 7, between(r, 0.2, 0.3));
    }
    // fill al final de la frase
    if (fillP > 0 && r() < fillP) {
      add('ghost', e0 + 4, between(r, 0.3, 0.4));
      add('snare', e0 + 5, between(r, 0.42, 0.52));
      add('ghost', e0 + 6, between(r, 0.3, 0.4));
      add('snare', e0 + 7, between(r, 0.55, 0.68));
      add('kick', e0 + 6, between(r, 0.4, 0.5));
    }
  }
  return hits;
}
