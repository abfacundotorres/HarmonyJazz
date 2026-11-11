import { hzToMidi, midiToHz, spectrumAt } from './fft';

/**
 * Altura de notas a partir del espectro (suma de armónicos + seguimiento Viterbi).
 * Está pensado para un instrumento melódico (trompeta) sobre una base: NO es infalible. Con banda
 * detrás, el bajo y el piano pueden confundirlo; por eso los resultados son una estimación para
 * comparar de oído, no una transcripción.
 */
export interface PitchOptions {
  /** Rango de la fundamental (Hz). Por defecto, trompeta en concierto (E3 – D♯6). */
  fmin?: number;
  fmax?: number;
  /** Se ignora la energía por debajo de este corte (Hz): el mismo "corte de graves" del reproductor. */
  hp?: number;
  /** Se ignora la energía por encima (Hz). */
  lp?: number;
}

export interface FrameResult {
  /** Altura (número MIDI con decimales). */
  midi: number;
  /** 0..1: qué tan clara es la altura frente al resto del espectro. */
  strength: number;
}

export interface DetectedNote {
  start: number;
  end: number;
  /** Nota MIDI entera (concierto). */
  midi: number;
  /** Desafinación respecto de la nota entera, en centésimas (−50…+50). */
  cents: number;
  /** 0..1 */
  strength: number;
}

const NFFT = 4096;
const WIN = 1024;
const HOP = 256;
const STEP = 0.25; // semitonos entre candidatos
const H = 8;
const G = Array.from({ length: H + 1 }, (_, h) => (h === 0 ? 0 : 1 / Math.sqrt(h)));

interface Work {
  re: Float64Array;
  im: Float64Array;
  mag: Float32Array;
}
const work = (): Work => ({ re: new Float64Array(NFFT), im: new Float64Array(NFFT), mag: new Float32Array(NFFT / 2 + 1) });

function candidates(fmin: number, fmax: number) {
  const lo = hzToMidi(fmin);
  const hi = hzToMidi(fmax);
  const out: number[] = [];
  for (let m = lo; m <= hi + 1e-9; m += STEP) out.push(m);
  return out;
}

/** Salience (suma ponderada de armónicos) de cada candidato para un espectro. */
function salience(mag: Float32Array, sr: number, cands: number[], hp: number, lp: number, out: Float32Array) {
  const binHz = sr / NFFT;
  const nyq = sr / 2;
  const kLo = Math.max(1, Math.floor(hp / binHz));
  const kHi = Math.min(mag.length - 2, Math.ceil(Math.min(lp, nyq * 0.92) / binHz));
  for (let i = 0; i < cands.length; i++) {
    const f0 = midiToHz(cands[i]);
    let s = 0;
    for (let h = 1; h <= H; h++) {
      const f = f0 * h;
      const k = Math.round(f / binHz);
      if (k > kHi) break;
      if (k < kLo) continue;
      const m = Math.max(mag[k - 1], mag[k], mag[k + 1]);
      s += G[h] * Math.sqrt(m);
    }
    out[i] = s;
  }
}

/** Altura en un instante (para mostrar la nota que suena junto al cursor). */
export function analyzeFrame(x: Float32Array, sr: number, centerSample: number, o: PitchOptions = {}): FrameResult | null {
  const fmin = o.fmin ?? 155;
  const fmax = o.fmax ?? 1250;
  const w = work();
  spectrumAt(x, centerSample, 2048, NFFT, w.re, w.im, w.mag);
  let total = 0;
  for (let k = 1; k < w.mag.length; k++) total += w.mag[k];
  if (total < 1e-4) return null;
  const cands = candidates(fmin, fmax);
  const s = new Float32Array(cands.length);
  salience(w.mag, sr, cands, o.hp ?? 0, o.lp ?? sr, s);
  let best = 0;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += s[i];
    if (s[i] > s[best]) best = i;
  }
  const mean = sum / s.length;
  if (!(s[best] > 0)) return null;
  const midi = refine(s, cands, best);
  const peaky = s[best] / (mean + 1e-9);
  return { midi, strength: Math.max(0, Math.min(1, (peaky - 1.5) / 3)) };
}

function refine(s: Float32Array, cands: number[], i: number) {
  if (i <= 0 || i >= s.length - 1) return cands[i];
  const a = s[i - 1];
  const b = s[i];
  const c = s[i + 1];
  const d = a - 2 * b + c;
  const off = d < 0 ? (0.5 * (a - c)) / d : 0;
  return cands[i] + Math.max(-0.5, Math.min(0.5, off)) * STEP;
}

/** Notas de un tramo [t0, t1] (segundos) del audio de análisis. */
export function detectNotes(x: Float32Array, sr: number, t0: number, t1: number, o: PitchOptions = {}): DetectedNote[] {
  const fmin = o.fmin ?? 155;
  const fmax = o.fmax ?? 1250;
  const hp = o.hp ?? 0;
  const lp = o.lp ?? sr;
  const cands = candidates(fmin, fmax);
  const S = cands.length;
  const a0 = Math.max(0, Math.floor(t0 * sr));
  const a1 = Math.min(x.length, Math.ceil(t1 * sr));
  const T = Math.floor((a1 - a0) / HOP);
  if (T < 3) return [];
  const w = work();
  const sal = new Float32Array(S);
  const sals: Float32Array[] = [];
  const rmsDb: number[] = [];
  const frameMax: number[] = [];
  for (let t = 0; t < T; t++) {
    const c = a0 + t * HOP + HOP / 2;
    spectrumAt(x, c, WIN, NFFT, w.re, w.im, w.mag);
    let e = 0;
    for (let i = Math.max(0, Math.round(c - WIN / 2)); i < Math.min(x.length, Math.round(c + WIN / 2)); i++) e += x[i] * x[i];
    rmsDb.push(Math.sqrt(e / WIN));
    salience(w.mag, sr, cands, hp, lp, sal);
    sals.push(Float32Array.from(sal));
    let m = 0;
    for (let i = 0; i < S; i++) m = Math.max(m, sal[i]);
    frameMax.push(m);
  }
  // referencia: percentil 90 del máximo de cada cuadro
  const sorted = [...frameMax].sort((a, b) => a - b);
  const ref = Math.max(1e-6, sorted[Math.floor(sorted.length * 0.9)]);
  const rmsSorted = [...rmsDb].sort((a, b) => a - b);
  const rmsRef = rmsSorted[Math.floor(rmsSorted.length * 0.9)];

  // Viterbi: premia la salience y castiga los saltos
  const W = 8; // ±2 semitonos sin penalización de "salto"
  const lam = 0.05; // por candidato
  const jump = 0.5;
  const score = new Float32Array(S);
  const prev = new Float32Array(S);
  const back: Int16Array[] = [];
  for (let i = 0; i < S; i++) prev[i] = sals[0][i] / ref;
  back.push(new Int16Array(S));
  for (let t = 1; t < T; t++) {
    let gBest = 0;
    for (let i = 1; i < S; i++) if (prev[i] > prev[gBest]) gBest = i;
    const bp = new Int16Array(S);
    for (let i = 0; i < S; i++) {
      let best = prev[gBest] - jump;
      let arg = gBest;
      for (let d = -W; d <= W; d++) {
        const j = i + d;
        if (j < 0 || j >= S) continue;
        const v = prev[j] - lam * Math.abs(d);
        if (v > best) {
          best = v;
          arg = j;
        }
      }
      score[i] = best + sals[t][i] / ref;
      bp[i] = arg;
    }
    prev.set(score);
    back.push(bp);
  }
  let cur = 0;
  for (let i = 1; i < S; i++) if (prev[i] > prev[cur]) cur = i;
  const path = new Int16Array(T);
  for (let t = T - 1; t >= 0; t--) {
    path[t] = cur;
    cur = back[t][cur];
  }

  // cuadros con voz: salience suficiente y nivel suficiente
  const midi = new Float32Array(T);
  const voiced: boolean[] = [];
  const strength = new Float32Array(T);
  for (let t = 0; t < T; t++) {
    midi[t] = refine(sals[t], cands, path[t]);
    const rel = sals[t][path[t]] / ref;
    strength[t] = Math.max(0, Math.min(1, rel));
    voiced.push(rel >= 0.3 && rmsDb[t] >= Math.max(0.12 * rmsRef, 0.002));
  }
  // se cierran huecos de un solo cuadro
  for (let t = 1; t < T - 1; t++) if (!voiced[t] && voiced[t - 1] && voiced[t + 1] && Math.abs(midi[t - 1] - midi[t + 1]) < 0.7) voiced[t] = true;

  const notes: DetectedNote[] = [];
  const frameT = (t: number) => (a0 + t * HOP) / sr;
  const median = (v: number[]) => {
    const s = [...v].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  let t = 0;
  while (t < T) {
    if (!voiced[t]) {
      t++;
      continue;
    }
    const startT = t;
    let vals: number[] = [midi[t]];
    let st: number[] = [strength[t]];
    t++;
    const flush = (end: number) => {
      if (vals.length >= 3) {
        const med = median(vals);
        const n = Math.round(med);
        notes.push({ start: frameT(startNote), end: frameT(end), midi: n, cents: Math.round((med - n) * 100), strength: st.reduce((s, v) => s + v, 0) / st.length });
      }
    };
    let startNote = startT;
    while (t < T && voiced[t]) {
      const med = median(vals);
      const d = midi[t] - med;
      if (Math.abs(d) >= 0.75) {
        // ¿cambio sostenido de nota? (2 cuadros siguientes coinciden entre sí y difieren de la nota actual)
        const n1 = t + 1 < T && voiced[t + 1] ? midi[t + 1] : NaN;
        const n2 = t + 2 < T && voiced[t + 2] ? midi[t + 2] : NaN;
        const ok = (Number.isNaN(n1) || Math.abs(n1 - med) >= 0.6) && (Number.isNaN(n2) || Math.abs(n2 - n1) < 0.6 || Number.isNaN(n1));
        if (ok) {
          flush(t);
          startNote = t;
          vals = [];
          st = [];
        }
      }
      vals.push(midi[t]);
      st.push(strength[t]);
      t++;
    }
    flush(t);
  }
  // fuera notas de menos de 50 ms
  return notes.filter((n) => n.end - n.start >= 0.05);
}
