import { midiToHz, spectrumAt } from './fft';

/** Eje vertical del espectrograma: altura (MIDI, concierto) en escala logarítmica. */
export const SPEC_LO = 40; // E2
export const SPEC_HI = 96; // C7
export const ROWS_PER_SEMITONE = 3;
export const SPEC_ROWS = (SPEC_HI - SPEC_LO) * ROWS_PER_SEMITONE;

export interface SpectroImage {
  cols: number;
  rows: number;
  /** rows × cols, 0..255; la fila 0 es la más grave. */
  data: Uint8Array;
  t0: number;
  t1: number;
}

const WIN = 2048;
const NFFT = 4096;

/** Nivel de referencia (dB) del audio: el cuadro más fuerte entre unas 150 muestras repartidas. */
export function estimateRefDb(x: Float32Array, sr: number): number {
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  const mag = new Float32Array(NFFT / 2 + 1);
  const binHz = sr / NFFT;
  const kLo = Math.round(midiToHz(SPEC_LO) / binHz);
  const kHi = Math.min(mag.length - 1, Math.round(midiToHz(SPEC_HI) / binHz));
  const n = 150;
  const peaks: number[] = [];
  for (let i = 0; i < n; i++) {
    spectrumAt(x, ((i + 0.5) / n) * x.length, WIN, NFFT, re, im, mag);
    let m = 0;
    for (let k = kLo; k <= kHi; k++) m = Math.max(m, mag[k]);
    peaks.push(m);
  }
  peaks.sort((a, b) => a - b);
  return 20 * Math.log10(Math.max(1e-6, peaks[Math.floor(n * 0.95)]));
}

export function computeSpectro(x: Float32Array, sr: number, t0: number, t1: number, cols: number, refDb: number): SpectroImage {
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  const mag = new Float32Array(NFFT / 2 + 1);
  const binHz = sr / NFFT;
  const data = new Uint8Array(SPEC_ROWS * cols);
  const half = 0.5 / ROWS_PER_SEMITONE;
  const k0 = new Int32Array(SPEC_ROWS);
  const k1 = new Int32Array(SPEC_ROWS);
  for (let r = 0; r < SPEC_ROWS; r++) {
    const m = SPEC_LO + (r + 0.5) / ROWS_PER_SEMITONE;
    k0[r] = Math.max(1, Math.round(midiToHz(m - half) / binHz));
    k1[r] = Math.min(mag.length - 1, Math.max(k0[r], Math.round(midiToHz(m + half) / binHz)));
  }
  const floor = refDb - 55;
  for (let c = 0; c < cols; c++) {
    const t = t0 + ((c + 0.5) / cols) * (t1 - t0);
    spectrumAt(x, t * sr, WIN, NFFT, re, im, mag);
    for (let r = 0; r < SPEC_ROWS; r++) {
      let m = 0;
      for (let k = k0[r]; k <= k1[r]; k++) if (mag[k] > m) m = mag[k];
      const db = 20 * Math.log10(m + 1e-7);
      data[r * cols + c] = Math.max(0, Math.min(255, Math.round(((db - floor) / 55) * 255)));
    }
  }
  return { cols, rows: SPEC_ROWS, data, t0, t1 };
}

/** Fila (fraccionaria) de una altura MIDI. */
export const midiToRow = (m: number) => (m - SPEC_LO) * ROWS_PER_SEMITONE;
