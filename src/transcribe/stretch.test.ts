import { describe, expect, it } from 'vitest';
import { PlayerCore } from './stretch';

const SR = 44100;

/** Mezcla de senos (señal de banda limitada, no periódica en el tramo de loop). */
function signal(seconds: number, freqs: number[], amp = 0.3): Float32Array {
  const n = Math.round(seconds * SR);
  const x = new Float32Array(n);
  freqs.forEach((f, k) => {
    const ph = k * 1.7;
    for (let i = 0; i < n; i++) x[i] += (amp / freqs.length) * Math.sin(2 * Math.PI * f * (i / SR) + ph);
  });
  return x;
}

/** Renderiza `seconds` de salida en bloques de 128 (como el AudioWorklet). */
function render(core: PlayerCore, seconds: number, onBlock?: (t: number) => void) {
  const n = Math.round(seconds * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i += 128) {
    const m = Math.min(128, n - i);
    core.process(L.subarray(i, i + m), R.subarray(i, i + m));
    onBlock?.(i / SR);
  }
  return { L, R };
}

/** Frecuencia por cruces ascendentes por cero, en [t0, t1) segundos. */
function freqOf(x: Float32Array, t0: number, t1: number) {
  const a = Math.round(t0 * SR);
  const b = Math.round(t1 * SR);
  const cross: number[] = [];
  for (let i = a + 1; i < b; i++) if (x[i - 1] < 0 && x[i] >= 0) cross.push(i - x[i] / (x[i] - x[i - 1]));
  if (cross.length < 3) return 0;
  return ((cross.length - 1) * SR) / (cross[cross.length - 1] - cross[0]);
}

const rms = (x: Float32Array, a: number, b: number) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / (b - a));
};
const maxStep = (x: Float32Array, a = 1, b = x.length) => {
  let m = 0;
  for (let i = Math.max(1, a); i < b; i++) m = Math.max(m, Math.abs(x[i] - x[i - 1]));
  return m;
};

const mk = (x: Float32Array) => new PlayerCore({ channels: [x, x], sampleRate: SR });

describe('modo directo', () => {
  it('copia las muestras sin alterarlas (tras el fundido de entrada)', () => {
    const x = signal(2, [440]);
    const c = mk(x);
    c.play();
    const { L } = render(c, 1);
    for (let i = 200; i < 40000; i += 997) expect(L[i]).toBeCloseTo(x[i], 6);
  });

  it('la posición avanza al ritmo del tiempo real', () => {
    const c = mk(signal(5, [440]));
    c.play();
    render(c, 2);
    expect(c.getPosition() / SR).toBeCloseTo(2, 1);
  });

  it('termina al llegar al final y avisa', () => {
    const c = mk(signal(1, [440]));
    c.play();
    render(c, 1.5);
    expect(c.ended).toBe(true);
  });
});

describe('estiramiento (WSOLA)', () => {
  for (const rate of [0.5, 0.75, 1.5, 2]) {
    it(`a ${rate * 100} % mantiene el tono (440 Hz) y la velocidad`, () => {
      const c = mk(signal(30, [440]));
      c.setRate(rate);
      c.play();
      const { L } = render(c, 4);
      expect(freqOf(L, 0.5, 3.5)).toBeGreaterThan(438);
      expect(freqOf(L, 0.5, 3.5)).toBeLessThan(442);
      // en 4 s de salida se consumieron 4 × rate s de origen
      expect(c.getPosition() / SR).toBeGreaterThan(4 * rate - 0.12);
      expect(c.getPosition() / SR).toBeLessThan(4 * rate + 0.12);
    });
  }

  it('un tono estable sigue estable en amplitud (sin pulsaciones por el solape)', () => {
    const c = mk(signal(30, [440]));
    c.setRate(0.6);
    c.play();
    const { L } = render(c, 5);
    const levels: number[] = [];
    for (let t = 0.5; t < 4.5; t += 0.1) levels.push(rms(L, Math.round(t * SR), Math.round((t + 0.1) * SR)));
    const mean = levels.reduce((s, v) => s + v, 0) / levels.length;
    for (const v of levels) expect(Math.abs(v - mean) / mean).toBeLessThan(0.08);
  });

  it('un acorde de varios tonos conserva todas sus frecuencias', () => {
    const c = mk(signal(30, [220, 330, 523.25]));
    c.setRate(0.5);
    c.play();
    const { L } = render(c, 4);
    // energía en cada frecuencia, tramo a tramo de 0,2 s (la fase no se mantiene entre tramos)
    const energy = (f: number) => {
      let total = 0;
      for (let t = 0.5; t < 3.4; t += 0.2) {
        let re = 0;
        let im = 0;
        for (let i = Math.round(t * SR); i < Math.round((t + 0.2) * SR); i++) {
          re += L[i] * Math.cos((2 * Math.PI * f * i) / SR);
          im += L[i] * Math.sin((2 * Math.PI * f * i) / SR);
        }
        total += Math.hypot(re, im);
      }
      return total;
    };
    const e220 = energy(220);
    expect(energy(330) / e220).toBeGreaterThan(0.8);
    expect(energy(523.25) / e220).toBeGreaterThan(0.8);
    expect(energy(277) / e220).toBeLessThan(0.25); // una frecuencia que no está
  });
});

describe('afinación', () => {
  it('+100 cents sube un semitono sin cambiar la velocidad', () => {
    const c = mk(signal(30, [440]));
    c.setPitch(Math.pow(2, 1 / 12));
    c.play();
    const { L } = render(c, 3);
    expect(freqOf(L, 0.5, 2.5)).toBeGreaterThan(466.16 - 1);
    expect(freqOf(L, 0.5, 2.5)).toBeLessThan(466.16 + 1);
    expect(c.getPosition() / SR).toBeGreaterThan(3 - 0.12);
    expect(c.getPosition() / SR).toBeLessThan(3 + 0.12);
  });

  it('−1 semitono y velocidad 50 % a la vez', () => {
    const c = mk(signal(30, [440]));
    c.setPitch(Math.pow(2, -1 / 12));
    c.setRate(0.5);
    c.play();
    const { L } = render(c, 4);
    expect(freqOf(L, 0.5, 3.5)).toBeGreaterThan(415.3 - 1);
    expect(freqOf(L, 0.5, 3.5)).toBeLessThan(415.3 + 1);
    expect(c.getPosition() / SR).toBeGreaterThan(2 - 0.12);
    expect(c.getPosition() / SR).toBeLessThan(2 + 0.12);
  });
});

describe('loop', () => {
  const x = signal(6, [233, 311, 587, 880, 1319, 1760]);
  const A = Math.round(1.0 * SR);
  const B = Math.round(1.6 * SR);
  const src = maxStep(x);

  for (const rate of [1, 0.5, 1.5]) {
    it(`a ${rate * 100} %: la posición no sale del tramo y no hay saltos en el empalme`, () => {
      const c = mk(x);
      c.setLoop(A, B);
      c.setRate(rate);
      c.seek(A);
      c.play();
      let minP = Infinity;
      let maxP = -Infinity;
      const { L } = render(c, 8, () => {
        const p = c.getPosition();
        if (p > 0) {
          minP = Math.min(minP, p);
          maxP = Math.max(maxP, p);
        }
      });
      expect(minP).toBeGreaterThanOrEqual(A - 2);
      expect(maxP).toBeLessThanOrEqual(B + 2);
      // vueltas: 8 s de salida a esa velocidad sobre 0,6 s de loop
      const expected = (8 * rate) / 0.6;
      expect(c.loops).toBeGreaterThan(expected - 2.5);
      expect(c.loops).toBeLessThan(expected + 2.5);
      // sin clics: el salto máximo entre muestras no pasa de lo que tiene la propia señal
      expect(maxStep(L, Math.round(0.2 * SR))).toBeLessThan(src * 1.6);
    });
  }

  it('el loop dura exactamente lo marcado (a 100 %)', () => {
    const c = mk(x);
    c.setLoop(A, B);
    c.seek(A);
    c.play();
    render(c, 6.0);
    // 6 s / 0,6 s = 10 vueltas
    expect(c.loops).toBe(10);
  });

  it('una pausa entre repeticiones deja silencio real (directo y estirado)', () => {
    for (const rate of [1, 0.5]) {
      const c = mk(x);
      c.setLoop(A, B);
      c.setGap(0.5);
      c.setRate(rate);
      c.seek(A);
      c.play();
      const { L } = render(c, 6);
      // busca el silencio más largo
      let run = 0;
      let best = 0;
      for (let i = Math.round(0.3 * SR); i < L.length; i++) {
        if (Math.abs(L[i]) < 1e-5) best = Math.max(best, ++run);
        else run = 0;
      }
      expect(best / SR, `rate ${rate}`).toBeGreaterThan(0.45);
      expect(best / SR, `rate ${rate}`).toBeLessThan(0.6);
    }
  });
});

describe('saltos y cambios en marcha', () => {
  it('buscar una posición con el audio sonando no produce clics', () => {
    const x = signal(10, [233, 311, 587, 880, 1319]);
    const src = maxStep(x);
    for (const rate of [1, 0.5]) {
      const c = mk(x);
      c.setRate(rate);
      c.play();
      const n = SR * 3;
      const L = new Float32Array(n);
      const R = new Float32Array(n);
      for (let i = 0; i < n; i += 128) {
        if (i === 40 * 128) c.seek(6 * SR);
        if (i === 120 * 128) c.setRate(rate === 1 ? 0.7 : 1);
        c.process(L.subarray(i, i + 128), R.subarray(i, i + 128));
      }
      expect(maxStep(L, 2000)).toBeLessThan(src * 1.6);
      expect(c.getPosition() / SR).toBeGreaterThan(6);
    }
  });

  it('pausar y seguir no pierde la posición y no hace clic', () => {
    const x = signal(10, [233, 311, 587, 880]);
    const c = mk(x);
    c.setRate(0.8);
    c.play();
    render(c, 1);
    const p = c.getPosition();
    c.pause();
    const { L } = render(c, 0.2);
    expect(Math.abs(L[L.length - 1])).toBe(0);
    expect(Math.abs(c.getPosition() - p)).toBeLessThan(0.02 * SR);
    c.play();
    const r2 = render(c, 1);
    expect(maxStep(r2.L)).toBeLessThan(maxStep(x) * 1.6);
  });
});

describe('estéreo', () => {
  it('"quitar el centro" anula lo que es igual en los dos canales', () => {
    const c = mk(signal(3, [440]));
    c.setCenter(1);
    c.play();
    const { L } = render(c, 1);
    expect(rms(L, 5000, 30000)).toBeLessThan(1e-6);
  });

  it('"sólo el centro" deja pasar lo que es igual en los dos canales y quita lo que no', () => {
    const a = signal(3, [440]);
    const b = signal(3, [660]);
    const l = new Float32Array(a.length);
    const r = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      l[i] = a[i] + b[i];
      r[i] = a[i] - b[i];
    }
    const c = new PlayerCore({ channels: [l, r], sampleRate: SR });
    c.setCenter(2);
    c.play();
    const { L } = render(c, 1);
    expect(freqOf(L, 0.2, 0.9)).toBeGreaterThan(438);
    expect(freqOf(L, 0.2, 0.9)).toBeLessThan(442);
  });

  it('un audio mono suena igual por los dos lados', () => {
    const x = signal(2, [440]);
    const c = new PlayerCore({ channels: [x], sampleRate: SR });
    c.play();
    const { L, R } = render(c, 0.5);
    for (let i = 300; i < 20000; i += 313) expect(R[i]).toBe(L[i]);
  });
});

describe('datos en 16 bits', () => {
  it('se reproducen igual que en coma flotante', () => {
    const x = signal(2, [440]);
    const q = new Int16Array(x.length);
    for (let i = 0; i < x.length; i++) q[i] = Math.round(x[i] * 32767);
    const c = new PlayerCore({ channels: [q, q], sampleRate: SR });
    c.setRate(0.5);
    c.play();
    const { L } = render(c, 1.5);
    expect(freqOf(L, 0.3, 1.3)).toBeGreaterThan(438);
    expect(freqOf(L, 0.3, 1.3)).toBeLessThan(442);
    expect(Math.max(...L)).toBeGreaterThan(0.1);
  });
});

describe('click de metrónomo', () => {
  /** Instantes (s de salida) en que empieza cada click: sube de silencio a sonido. */
  const onsets = (x: Float32Array, from = 0) => {
    const out: number[] = [];
    let quiet = 1e9; // antes de empezar se considera silencio
    for (let i = Math.round(from * SR); i < x.length; i++) {
      if (Math.abs(x[i]) > 0.02 && quiet > 0.05 * SR) {
        out.push(i / SR);
        quiet = 0;
      } else if (Math.abs(x[i]) <= 0.02) quiet++;
      else quiet = 0;
    }
    return out;
  };
  const silent = (s: number) => new PlayerCore({ channels: [new Float32Array(s * SR), new Float32Array(s * SR)], sampleRate: SR });

  for (const rate of [1, 0.5, 1.5]) {
    it(`a ${rate * 100} %: cada tiempo de la grilla suena donde le toca (±15 ms)`, () => {
      const c = silent(20);
      c.setRate(rate);
      c.setClick({ bpm: 120, offset: 0.1, beats: 4, gain: 0.5 });
      c.play();
      const { L } = render(c, 6);
      const got = onsets(L, 0.05);
      const exp: number[] = [];
      for (let k = 0; 0.1 + k * 0.5 < 6 * rate - 0.3; k++) exp.push((0.1 + k * 0.5) / rate);
      expect(got.length).toBeGreaterThanOrEqual(exp.length - 1);
      for (let i = 0; i < Math.min(got.length, exp.length); i++) expect(Math.abs(got[i] - exp[i]), `click ${i}`).toBeLessThan(0.015);
    });
  }

  it('en loop, el click sigue la grilla también después de la vuelta', () => {
    const c = silent(20);
    c.setLoop(1 * SR, 3 * SR); // dos segundos = 4 tiempos a 120 bpm
    c.setClick({ bpm: 120, offset: 0, beats: 4, gain: 0.5 });
    c.seek(1 * SR);
    c.play();
    const { L } = render(c, 6);
    const got = onsets(L, 0.05);
    // un click cada 0,5 s de salida (la grilla cae justo en el empalme)
    for (let i = 1; i < got.length; i++) expect(Math.abs(got[i] - got[i - 1] - 0.5), `intervalo ${i}`).toBeLessThan(0.02);
    expect(got.length).toBeGreaterThanOrEqual(10);
  });

  it('apagado no suena y el acento (tiempo 1) es más agudo', () => {
    const c = silent(5);
    c.play();
    expect(Math.max(...render(c, 1).L.map(Math.abs))).toBe(0);
    const d = silent(20);
    d.setClick({ bpm: 120, offset: 0, beats: 4, gain: 0.5 });
    d.play();
    const { L } = render(d, 2.2);
    // cruces por cero en 15 ms: el click del tiempo 1 (1800 Hz) tiene más que el del tiempo 2 (1200 Hz)
    const zc = (a: number) => { let n = 0; for (let i = Math.round(a * SR) + 1; i < Math.round((a + 0.015) * SR); i++) if (L[i - 1] < 0 && L[i] >= 0) n++; return n; };
    expect(zc(0.002)).toBeGreaterThan(zc(0.502));
  });

  it('con "quitar el centro" el click se sigue oyendo', () => {
    const c = silent(20);
    c.setCenter(1);
    c.setClick({ bpm: 120, offset: 0, beats: 4, gain: 0.5 });
    c.play();
    const { L } = render(c, 1.2);
    expect(Math.max(...L.map(Math.abs))).toBeGreaterThan(0.1);
  });
});
