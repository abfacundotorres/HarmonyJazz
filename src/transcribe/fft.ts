/** FFT radix-2 en el lugar (re/im de largo potencia de 2) y utilidades de ventana. */
const twiddles = new Map<number, { cos: Float64Array; sin: Float64Array; rev: Uint32Array }>();

function plan(n: number) {
  let p = twiddles.get(n);
  if (p) return p;
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = -Math.sin((2 * Math.PI * i) / n);
  }
  const rev = new Uint32Array(n);
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    rev[i] = r;
  }
  p = { cos, sin, rev };
  twiddles.set(n, p);
  return p;
}

export function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  const { cos, sin, rev } = plan(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0, t = 0; k < half; k++, t += step) {
        const a = start + k;
        const b = a + half;
        const xr = re[b] * cos[t] - im[b] * sin[t];
        const xi = re[b] * sin[t] + im[b] * cos[t];
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

const hanns = new Map<number, Float64Array>();
export function hann(n: number): Float64Array {
  let w = hanns.get(n);
  if (!w) {
    w = new Float64Array(n);
    for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
    hanns.set(n, w);
  }
  return w;
}

/**
 * Espectro de magnitud (nfft/2+1 valores) de `win` muestras de `x` centradas en `center`,
 * con ventana de Hann y relleno de ceros hasta `nfft`.
 */
export function spectrumAt(x: Float32Array, center: number, win: number, nfft: number, re: Float64Array, im: Float64Array, out: Float32Array) {
  const w = hann(win);
  const a = Math.round(center - win / 2);
  re.fill(0);
  im.fill(0);
  for (let i = 0; i < win; i++) {
    const k = a + i;
    re[i] = k >= 0 && k < x.length ? x[k] * w[i] : 0;
  }
  fft(re, im);
  const scale = 2 / win;
  for (let k = 0; k <= nfft / 2; k++) out[k] = Math.hypot(re[k], im[k]) * scale;
}

export const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const hzToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);
