import { clampView, Region, View } from './regions';

/** Grilla de compases: tempo, dónde cae el primer tiempo del compás 1 y tiempos por compás. */
export interface Grid {
  bpm: number;
  /** Segundos del primer tiempo del compás 1. */
  offset: number;
  beats: number;
}

export interface Marker {
  id: string;
  t: number;
  name: string;
}

export const MIN_BPM = 30;
export const MAX_BPM = 320;

export const beatLen = (g: Grid) => 60 / g.bpm;
export const barLen = (g: Grid) => (g.beats * 60) / g.bpm;

/** Índice (desde 0, puede ser negativo) del compás que contiene el instante. */
export const barIndexAt = (g: Grid, t: number) => Math.floor((t - g.offset) / barLen(g) + 1e-9);
export const barStart = (g: Grid, bar: number) => g.offset + bar * barLen(g);

/** Instante de la grilla (tiempo o compás) más cercano. */
export function snapTime(g: Grid, t: number, unit: 'beat' | 'bar' = 'beat'): number {
  const step = unit === 'bar' ? barLen(g) : beatLen(g);
  return g.offset + Math.round((t - g.offset) / step) * step;
}

/** Selección de N compases que empieza en el compás donde está el cursor (ajustada a [0, duración]). */
export function loopOfBars(g: Grid, t: number, n: number, duration: number): Region | null {
  const start = Math.max(0, barStart(g, barIndexAt(g, t)));
  const end = Math.min(duration, barStart(g, barIndexAt(g, t) + n));
  return end - start >= 0.1 ? { start, end } : null;
}

/** Ajusta una selección a los compases (inicio al compás anterior más cercano, fin al más cercano, mínimo 1 compás). */
export function snapRegion(g: Grid, r: Region, duration: number): Region | null {
  const s = Math.max(0, snapTime(g, r.start, 'bar'));
  let e = Math.min(duration, snapTime(g, r.end, 'bar'));
  if (e - s < barLen(g) * 0.5) e = Math.min(duration, s + barLen(g));
  return e - s >= 0.1 ? { start: s, end: e } : null;
}

export interface GridLine {
  t: number;
  /** Número de compás (desde 1) si es el primer tiempo; si no, 0. */
  bar: number;
  beat: number;
}

/** Líneas de la grilla visibles. Con la vista muy alejada se muestran sólo los compases. */
export function gridLines(g: Grid, view: View, maxLines = 400): GridLine[] {
  const bl = beatLen(g);
  const first = Math.floor((view.start - g.offset) / bl);
  const last = Math.ceil((view.start + view.dur - g.offset) / bl);
  const all = last - first + 1;
  const stride = all > maxLines ? g.beats : 1;
  const out: GridLine[] = [];
  for (let i = first; i <= last; i++) {
    if (stride > 1 && ((i % g.beats) + g.beats) % g.beats !== 0) continue;
    const t = g.offset + i * bl;
    const inBar = ((i % g.beats) + g.beats) % g.beats;
    if (t < 0) continue;
    out.push({ t, bar: inBar === 0 ? Math.floor(i / g.beats) + 1 : 0, beat: inBar + 1 });
  }
  return out;
}

/** Tempo a partir de toques (en segundos): mediana de los últimos intervalos; los toques separados por más de 2 s reinician. */
export function tapTempo(taps: number[]): { bpm: number | null; taps: number[] } {
  let t = taps;
  if (t.length >= 2 && t[t.length - 1] - t[t.length - 2] > 2) t = [t[t.length - 1]];
  t = t.slice(-9);
  if (t.length < 3) return { bpm: null, taps: t };
  const d: number[] = [];
  for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
  d.sort((a, b) => a - b);
  const med = d[Math.floor(d.length / 2)];
  const bpm = 60 / med;
  return { bpm: bpm >= MIN_BPM && bpm <= MAX_BPM ? Math.round(bpm * 10) / 10 : null, taps: t };
}

export function validGrid(g: unknown): g is Grid {
  const x = g as Grid | null;
  return !!x && typeof x.bpm === 'number' && x.bpm >= MIN_BPM && x.bpm <= MAX_BPM && Number.isFinite(x.offset) && [2, 3, 4, 5, 6, 7].includes(x.beats);
}

/** Vista que contiene una selección de compases (para mostrar el resultado de "loop de N compases"). */
export function viewForRegion(r: Region, duration: number): View {
  const pad = Math.max(0.2, (r.end - r.start) * 0.15);
  return clampView({ start: r.start - pad, dur: r.end - r.start + 2 * pad }, duration);
}
