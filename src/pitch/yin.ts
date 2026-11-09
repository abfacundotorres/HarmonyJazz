/**
 * Detector de altura YIN (de Cheveigné & Kawahara, 2002), suficiente para trompeta:
 * rango de trabajo ~80 Hz – 1500 Hz (concierto E3 ≈ 165 Hz, techo D6 ≈ 1175 Hz).
 */
export interface PitchResult {
  freq: number;
  /** 0..1, 1 = periodicidad perfecta. */
  clarity: number;
  rms: number;
}

export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  { minFreq = 80, maxFreq = 1500, threshold = 0.12, minRms = 0.01 } = {},
): PitchResult | null {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < minRms) return null;

  const tauMin = Math.floor(sampleRate / maxFreq);
  const tauMax = Math.min(Math.floor(sampleRate / minFreq), Math.floor(buf.length / 2));
  const W = buf.length - tauMax;
  const d = new Float32Array(tauMax + 1);

  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  // diferencia normalizada acumulada
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }

  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return null;

  // interpolación parabólica
  let better = tau;
  if (tau > 1 && tau < tauMax) {
    const a = cmnd[tau - 1];
    const b = cmnd[tau];
    const c = cmnd[tau + 1];
    const den = a + c - 2 * b;
    if (den !== 0) better = tau + (a - c) / (2 * den);
  }
  return { freq: sampleRate / better, clarity: 1 - cmnd[tau], rms };
}

/**
 * Segmentador de notas: convierte un flujo de detecciones en eventos "nota nueva"
 * cuando una altura se mantiene estable unos milisegundos.
 */
export class NoteTracker {
  private candidate: number | null = null;
  private since = 0;
  private current: number | null = null;
  private silentSince = 0;

  constructor(private stableMs = 60, private releaseMs = 90) {}

  /** midi: altura detectada (concierto, fraccional) o null si no hay sonido. */
  push(midi: number | null, now: number): { on?: number; off?: boolean } {
    if (midi === null) {
      if (this.current !== null) {
        if (!this.silentSince) this.silentSince = now;
        if (now - this.silentSince > this.releaseMs) {
          this.current = null;
          this.candidate = null;
          return { off: true };
        }
      }
      return {};
    }
    this.silentSince = 0;
    const r = Math.round(midi);
    if (r !== this.candidate) {
      this.candidate = r;
      this.since = now;
      return {};
    }
    if (r !== this.current && now - this.since >= this.stableMs) {
      this.current = r;
      return { on: r };
    }
    return {};
  }
}
