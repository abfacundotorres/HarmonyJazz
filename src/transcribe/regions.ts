/** Lógica pura del transcriptor: selecciones, loop, vista de la onda y picos. */

export interface Region {
  start: number;
  end: number;
}

export interface View {
  start: number;
  dur: number;
}

export const MIN_REGION = 0.1;
export const MIN_VIEW = 1;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Ordena y recorta una selección a [0, duration]; null si queda más corta que MIN_REGION. */
export function normRegion(a: number, b: number, duration: number): Region | null {
  if (!(duration > 0) || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  const start = clamp(Math.min(a, b), 0, duration);
  const end = clamp(Math.max(a, b), 0, duration);
  return end - start >= MIN_REGION ? { start, end } : null;
}

/** Si el loop está activo y se pasó del final de la selección, a qué tiempo volver (si no, null). */
export function loopTarget(time: number, region: Region | null, loopOn: boolean, guard = 0.02): number | null {
  if (!loopOn || !region) return null;
  if (time >= region.end - guard) return region.start;
  return null;
}

export function fmtTime(s: number, decimals = 1): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  const txt = sec.toFixed(decimals);
  return `${m}:${sec < 10 ? '0' : ''}${txt}`;
}

/** "1:23.5", "83,5" o "83" → segundos; null si no se entiende. */
export function parseTime(txt: string): number | null {
  const t = txt.trim().replace(',', '.');
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(t);
  if (!m) return null;
  return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
}

export function clampView(v: View, duration: number): View {
  const dur = clamp(v.dur, Math.min(MIN_VIEW, duration), duration);
  return { start: clamp(v.start, 0, Math.max(0, duration - dur)), dur };
}

/** Acerca o aleja alrededor de `anchor` (segundos) manteniéndolo en el mismo lugar de la pantalla. */
export function zoomView(v: View, factor: number, anchor: number, duration: number): View {
  const dur = clamp(v.dur * factor, Math.min(MIN_VIEW, duration), duration);
  const frac = v.dur > 0 ? (anchor - v.start) / v.dur : 0.5;
  return clampView({ start: anchor - frac * dur, dur }, duration);
}

/** Vista que sigue al cursor: si se sale por la derecha o la izquierda, pasa de "página". */
export function followView(v: View, time: number, duration: number): View {
  if (time >= v.start && time <= v.start + v.dur) return v;
  return clampView({ start: time - v.dur * 0.1, dur: v.dur }, duration);
}

/** Vista que encuadra una selección con un poco de margen. */
export function fitRegion(r: Region, duration: number): View {
  const pad = Math.max(0.2, (r.end - r.start) * 0.1);
  return clampView({ start: r.start - pad, dur: r.end - r.start + 2 * pad }, duration);
}

export interface Peaks {
  perSec: number;
  min: Float32Array;
  max: Float32Array;
}

/** Mínimos y máximos por intervalo (mezcla de todos los canales). */
export function peaksFromChannels(channels: Float32Array[], sampleRate: number, perSec: number): Peaks {
  const len = channels[0]?.length ?? 0;
  const n = Math.max(1, Math.ceil((len / sampleRate) * perSec));
  const min = new Float32Array(n);
  const max = new Float32Array(n);
  const per = sampleRate / perSec;
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * per);
    const b = Math.min(len, Math.max(a + 1, Math.floor((i + 1) * per)));
    let lo = 0;
    let hi = 0;
    for (const ch of channels) {
      for (let k = a; k < b; k++) {
        const x = ch[k];
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    min[i] = lo;
    max[i] = hi;
  }
  return { perSec, min, max };
}

/** Rango de amplitud (min, max) de los picos entre dos instantes. */
export function peakRange(p: Peaks, t0: number, t1: number): [number, number] {
  const i0 = clamp(Math.floor(t0 * p.perSec), 0, p.min.length - 1);
  const i1 = clamp(Math.max(i0, Math.ceil(t1 * p.perSec) - 1), 0, p.min.length - 1);
  let lo = 0;
  let hi = 0;
  for (let i = i0; i <= i1; i++) {
    if (p.min[i] < lo) lo = p.min[i];
    if (p.max[i] > hi) hi = p.max[i];
  }
  return [lo, hi];
}
