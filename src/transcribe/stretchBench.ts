/**
 * Banco de medición del estiramiento de tiempo de Transcribir (lo usan scripts/medir-estiramiento.ts y los tests).
 *
 * Nadie puede "oír" desde acá, así que la calidad se mide contra una referencia exacta: una banda sintética
 * (bajo caminante, acordes de piano, línea de trompeta con vibrato, platillo y hi-hat) que se puede generar
 * directamente a cualquier velocidad. La versión lenta "ideal" tiene los ataques en su lugar y tan cortos como en
 * el original, y sólo lo sostenido dura más. Cada algoritmo estira la versión a tempo normal y se compara con ella.
 *
 * Medidas (menos es mejor, salvo "ataques")
 *  - tono:    distancia espectral media (dB) con ventana larga (93 ms): ensuciado de las notas sostenidas.
 *  - tiempo:  distancia espectral media (dB) con ventana corta (6 ms): ataques corridos, repetidos o borroneados.
 *  - ataques: correlación (0–1, más es mejor) entre la curva de ataques de la salida y la de la referencia.
 *  - estéreo: distancia espectral (dB) de la diferencia entre canales: conservación de la imagen estéreo.
 *  - golpes:  golpe por golpe del platillo: error de forma (dB), corrimiento medio y variación (ms).
 */
import { fft } from './fft';
import { PlayerCore } from './stretch';

const SR = 44100;
const rnd = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

interface Mix { L: Float32Array; R: Float32Array }

/** La banda, estirada `s` veces de forma ideal (s = 1: original). `parts` elige qué instrumentos suenan. */
export function band(s: number, seconds = 8, parts = 'bptc'): Mix {
  const n = Math.round(seconds * s * SR) + SR;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const beat = 0.375; // 160 bpm
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const add = (i: number, v: number, pan: number) => {
    if (i < 0 || i >= n) return;
    L[i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
    R[i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
  };
  /** Nota de parciales: ataque fijo, caída y duración estiradas, vibrato más lento. */
  const tone = (t0: number, dur: number, f0: number, harm: number[], o: { att: number; tau: number; pan: number; amp: number; inharm?: number; vib?: number }) => {
    const a = Math.round(t0 * s * SR);
    const len = Math.round(dur * s * SR);
    const rel = Math.round(0.012 * SR);
    const ph = harm.map((_, h) => (h * 2.399) % (2 * Math.PI));
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.min(1, t / o.att) * Math.exp(-t / (o.tau * s)) * Math.min(1, (len - i) / rel);
      const vib = o.vib && dur > 0.5 ? 1 + o.vib * Math.sin((2 * Math.PI * 5.5 * t) / s) * Math.min(1, t / (0.25 * s)) : 1;
      let v = 0;
      for (let h = 0; h < harm.length; h++) {
        const f = f0 * (h + 1) * Math.sqrt(1 + (o.inharm ?? 0) * (h + 1) * (h + 1));
        if (f > 9000) break;
        ph[h] += (2 * Math.PI * f * vib) / SR;
        v += harm[h] * Math.sin(ph[h]);
      }
      add(a + i, v * env * o.amp, o.pan);
    }
  };
  /** Golpe de ruido: ataque fijo, caída estirada. `hp`: cuánto se le quitan los graves. */
  const noise = (t0: number, tau: number, amp: number, pan: number, seed: number, hp: number) => {
    const r = rnd(seed);
    const a = Math.round(t0 * s * SR);
    const len = Math.round(Math.min(tau * s * 6, 1.5 * s) * SR);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const x = r();
      const y = x - hp * prev;
      prev = x;
      add(a + i, y * Math.min(1, t / 0.001) * Math.exp(-t / (tau * s)) * amp, pan);
    }
  };

  const beats = Math.floor(seconds / beat);
  const walk = [41, 43, 45, 46, 48, 46, 45, 43, 38, 40, 41, 45, 43, 41, 40, 36];
  const line = [70, 72, 74, 77, 75, 72, 70, 69, 67, 70, 74, 77, 79, 77, 74, 72, 70, 65, 67, 69];
  const chords = [[53, 57, 60, 64], [52, 55, 58, 62], [50, 53, 57, 60], [51, 55, 58, 61]];
  let li = 0;
  for (let b = 0; b < beats; b++) {
    const t = 0.05 + b * beat;
    if (parts.includes('b')) {
      tone(t, beat * 0.95, hz(walk[b % walk.length]), [1, 0.6, 0.35, 0.2, 0.1], { att: 0.004, tau: 0.5, pan: 0, amp: 0.22 });
      noise(t, 0.004, 0.05, 0, 100 + b, 0);
    }
    if (parts.includes('c')) {
      noise(t, 0.12, 0.07, 0.5, 200 + b, 0.95); // platillo
      if (b % 4 === 2) noise(t + (beat * 2) / 3, 0.09, 0.05, 0.5, 300 + b, 0.95);
      if (b % 2 === 1) noise(t, 0.025, 0.08, -0.4, 400 + b, 0.9); // hi-hat
    }
    if (parts.includes('p') && b % 3 === 0) {
      const ch = chords[(b / 3) % chords.length | 0];
      const tt = t + (b % 2 ? (beat * 2) / 3 : 0);
      for (const m of ch) tone(tt, beat * 2.2, hz(m), [1, 0.5, 0.33, 0.2, 0.12, 0.08], { att: 0.003, tau: 0.8, pan: -0.5, amp: 0.07, inharm: 0.0004 });
      noise(tt, 0.006, 0.04, -0.5, 500 + b, 0.5);
    }
    if (parts.includes('t')) {
      // corcheas con swing; cada cuatro tiempos, una nota larga con vibrato
      if (b % 4 === 3) tone(t, beat * 0.95, hz(line[li++ % line.length]), [1, 0.8, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08], { att: 0.015, tau: 3, pan: 0.1, amp: 0.1, vib: 0.007 });
      else {
        tone(t, (beat * 2) / 3 - 0.01, hz(line[li++ % line.length]), [1, 0.8, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08], { att: 0.015, tau: 3, pan: 0.1, amp: 0.1 });
        tone(t + (beat * 2) / 3, beat / 3 - 0.01, hz(line[li++ % line.length]), [1, 0.8, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08], { att: 0.012, tau: 3, pan: 0.1, amp: 0.08 });
      }
    }
  }
  return { L, R };
}

/** Estira con el reproductor real, en bloques de 128 como el AudioWorklet. */
export function stretch(src: Mix, rate: number, hq: boolean): Mix {
  const core = new PlayerCore({ channels: [src.L, src.R], sampleRate: SR });
  core.setQuality(hq);
  core.setRate(rate);
  core.play();
  const n = Math.round(src.L.length / rate);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i += 128) core.process(L.subarray(i, Math.min(n, i + 128)), R.subarray(i, Math.min(n, i + 128)));
  return { L, R };
}

/** Espectrograma de magnitud en dB (piso −60 dB respecto de `ref`). Devuelve cuadros de `bins` valores. */
function spectro(x: Float32Array, N: number, hop: number, ref: number, maxHz = 9000): Float32Array[] {
  const bins = Math.min(N / 2, Math.round((maxHz / SR) * N));
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const out: Float32Array[] = [];
  for (let p = 0; p + N <= x.length; p += hop) {
    for (let i = 0; i < N; i++) re[i] = x[p + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    im.fill(0);
    fft(re, im);
    const f = new Float32Array(bins);
    for (let k = 0; k < bins; k++) f[k] = Math.max(-60, 20 * Math.log10(Math.hypot(re[k], im[k]) / ref + 1e-12));
    out.push(f);
  }
  return out;
}
const peakMag = (x: Float32Array, N: number) => {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  return (m * N) / 4;
};
/** Distancia espectral media (dB) entre dos señales, sobre las celdas donde alguna de las dos suena. */
function lsd(a: Float32Array, b: Float32Array, N: number, hop: number): number {
  const ref = peakMag(b, N);
  const A = spectro(a, N, hop, ref);
  const B = spectro(b, N, hop, ref);
  let sum = 0;
  let cnt = 0;
  for (let j = 4; j < Math.min(A.length, B.length) - 4; j++) {
    for (let k = 1; k < A[j].length; k++) {
      if (A[j][k] <= -60 && B[j][k] <= -60) continue;
      sum += Math.abs(A[j][k] - B[j][k]);
      cnt++;
    }
  }
  return sum / Math.max(1, cnt);
}
/** Curva de ataques: crecimiento del espectro (ventana de 6 ms) cuadro a cuadro. */
function flux(x: Float32Array): Float32Array {
  const N = 256;
  const S = spectro(x, N, 64, peakMag(x, N));
  const f = new Float32Array(S.length);
  for (let j = 1; j < S.length; j++) {
    let v = 0;
    for (let k = 1; k < S[j].length; k++) v += Math.max(0, S[j][k] - S[j - 1][k]);
    f[j] = v;
  }
  return f;
}
function corr(a: Float32Array, b: Float32Array, shift = 0): number {
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
  for (let i = Math.max(0, -shift); i < Math.min(a.length, b.length - shift); i++) {
    const x = a[i];
    const y = b[i + shift];
    sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y; n++;
  }
  return (sab - (sa * sb) / n) / Math.sqrt((saa - (sa * sa) / n) * (sbb - (sb * sb) / n) + 1e-12);
}
const mid = (m: Mix) => m.L.map((v, i) => 0.5 * (v + m.R[i]));
const side = (m: Mix) => m.L.map((v, i) => 0.5 * (v - m.R[i]));

/** Energía de agudos en bloques de 1,5 ms (dB): el perfil de un golpe. */
function hfEnv(x: Float32Array, a: number, b: number): Float32Array {
  const B = 64;
  const out = new Float32Array(Math.floor((b - a) / B));
  for (let j = 0; j < out.length; j++) {
    let e = 1e-10;
    for (let i = a + j * B; i < a + (j + 1) * B; i++) {
      const v = i > 0 && i < x.length ? x[i] - x[i - 1] : 0;
      e += v * v;
    }
    out[j] = 10 * Math.log10(e / B);
  }
  return out;
}
/**
 * Golpe por golpe (el platillo suena en cada tiempo): compara el perfil de cada golpe de la salida con el de la
 * referencia, de 60 ms antes a 90 ms después. Devuelve el error medio de forma (dB), el corrimiento medio (ms) y
 * cuánto varía de un golpe a otro (ms): un golpe repetido, borroneado o con eco previo sube el error de forma.
 */
export function hits(out: Mix, ref: Mix, s: number, seconds = 8): { forma: number; corrimiento: number; variacion: number } {
  const o = mid(out);
  const r = mid(ref);
  const beat = 0.375;
  const pre = Math.round(0.06 * SR);
  const post = Math.round(0.09 * SR);
  const shifts: number[] = [];
  let err = 0;
  let n = 0;
  for (let b = 2; b < Math.floor(seconds / beat) - 1; b++) {
    const at = Math.round((0.05 + b * beat) * s * SR);
    const R = hfEnv(r, at - pre, at + post);
    const top = Math.max(...R);
    let best = 1e9;
    let bestK = 0;
    for (let k = -40; k <= 40; k++) {
      const O = hfEnv(o, at - pre + k * 64, at + post + k * 64);
      let d = 0;
      for (let j = 0; j < R.length; j++) d += Math.abs(Math.max(R[j], top - 45) - Math.max(O[j], top - 45));
      d /= R.length;
      if (d < best) {
        best = d;
        bestK = k;
      }
    }
    err += best;
    n++;
    shifts.push((bestK * 64 * 1000) / SR);
  }
  const mean = shifts.reduce((a, b) => a + b, 0) / n;
  return { forma: err / n, corrimiento: mean, variacion: Math.sqrt(shifts.reduce((a, b) => a + (b - mean) ** 2, 0) / n) };
}

export interface Score { tono: number; tiempo: number; ataques: number; estereo: number; retraso: number }

/** Compara una salida con la referencia, después de alinearlas (el algoritmo puede tener un retraso fijo). */
export function score(out: Mix, ref: Mix): Score {
  const fo = flux(mid(out));
  const fr = flux(mid(ref));
  let best = -2;
  let sh = 0;
  for (let k = -40; k <= 40; k++) {
    const c = corr(fo, fr, k);
    if (c > best) {
      best = c;
      sh = k;
    }
  }
  const d = sh * 64; // muestras que hay que correr la referencia
  const cut = (x: Float32Array) => x.subarray(Math.max(0, d), x.length);
  const cutO = (x: Float32Array) => x.subarray(Math.max(0, -d), x.length);
  const o = cutO(mid(out));
  const r = cut(mid(ref));
  return {
    tono: lsd(o, r, 4096, 1024),
    tiempo: lsd(o, r, 256, 64),
    ataques: best,
    estereo: lsd(cutO(side(out)), cut(side(ref)), 2048, 512),
    retraso: (-d / SR) * 1000,
  };
}
