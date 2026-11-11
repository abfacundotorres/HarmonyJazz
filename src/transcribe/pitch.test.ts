import { describe, expect, it } from 'vitest';
import { midiToHz } from './fft';
import { analyzeFrame, detectNotes } from './pitch';

const SR = 11025;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
}

interface TNote {
  midi: number;
  start: number;
  dur: number;
}

/** Tono tipo trompeta: armónicos 1–10, ataque 30 ms, vibrato suave. */
function addTrumpet(x: Float32Array, n: TNote, amp: number) {
  const a = Math.round(n.start * SR);
  const len = Math.round(n.dur * SR);
  const f0 = midiToHz(n.midi);
  let ph = 0;
  for (let i = 0; i < len && a + i < x.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.03) * Math.min(1, (n.dur - t) / 0.04);
    const vib = t > 0.15 ? 1 + 0.0087 * Math.sin(2 * Math.PI * 5.5 * t) : 1; // ±15 centésimas
    ph += (2 * Math.PI * f0 * vib) / SR;
    let v = 0;
    for (let h = 1; h <= 10; h++) v += Math.sin(h * ph) / Math.pow(h, 0.9);
    x[a + i] += amp * env * v;
  }
}

function addBass(x: Float32Array, line: number[], beat: number, amp: number) {
  line.forEach((m, k) => {
    const a = Math.round(k * beat * SR);
    const len = Math.round(beat * 0.9 * SR);
    const f0 = midiToHz(m);
    for (let i = 0; i < len && a + i < x.length; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 3);
      let v = 0;
      [1, 0.6, 0.3, 0.15].forEach((g, h) => (v += g * Math.sin(2 * Math.PI * f0 * (h + 1) * t)));
      x[a + i] += amp * env * v;
    }
  });
}

const MELODY: TNote[] = (() => {
  const pitches = [58, 62, 65, 63, 60, 62, 65, 70, 69, 67, 65, 62, 58, 60, 63, 67];
  const durs = [0.2, 0.2, 0.4, 0.2, 0.2, 0.4, 0.2, 0.2, 0.4, 0.2, 0.2, 0.4, 0.3, 0.3, 0.3, 0.6];
  let t = 0.2;
  return pitches.map((midi, i) => {
    const n = { midi, start: t, dur: durs[i] };
    t += durs[i] + 0.04;
    return n;
  });
})();
const TOTAL = Math.ceil(MELODY[MELODY.length - 1].start + MELODY[MELODY.length - 1].dur + 0.5);

function score(truth: TNote[], found: ReturnType<typeof detectNotes>) {
  const used = new Set<number>();
  let hit = 0;
  for (const t of truth) {
    const k = found.findIndex((f, i) => !used.has(i) && f.midi === t.midi && Math.abs(f.start - t.start) < 0.1);
    if (k >= 0) {
      used.add(k);
      hit++;
    }
  }
  return { recall: hit / truth.length, precision: found.length ? hit / found.length : 0 };
}

describe('detección de notas (señales sintéticas)', () => {
  it('trompeta sola con vibrato: encuentra casi todas las notas', () => {
    const x = new Float32Array(TOTAL * SR);
    for (const n of MELODY) addTrumpet(x, n, 0.1);
    const r = score(MELODY, detectNotes(x, SR, 0, TOTAL));
    expect(r.recall).toBeGreaterThan(0.9);
    expect(r.precision).toBeGreaterThan(0.85);
  });

  it('con bajo caminante, ruido y platillos: sigue encontrando la mayor parte', () => {
    const x = new Float32Array(TOTAL * SR);
    for (const n of MELODY) addTrumpet(x, n, 0.1);
    addBass(x, [34, 38, 41, 43, 45, 41, 38, 36, 34, 38, 41, 43, 45, 41, 38, 36, 34, 38, 41, 43, 45, 41, 38, 36, 34, 38, 41, 43], 0.4, 0.12);
    const rand = rng(7);
    for (let i = 0; i < x.length; i++) x[i] += 0.02 * rand();
    // platillo: ráfagas de ruido cada 0,2 s
    for (let b = 0; b * 0.2 < TOTAL; b++) for (let i = 0; i < 0.04 * SR; i++) x[Math.round(b * 0.2 * SR) + i] += 0.05 * rand() * Math.exp(-i / (0.01 * SR));
    const found = detectNotes(x, SR, 0, TOTAL, { hp: 150 });
    const r = score(MELODY, found);
    // los números reales se informan al usuario; este piso evita regresiones
    expect(r.recall).toBeGreaterThan(0.7);
    expect(r.precision).toBeGreaterThan(0.6);
  });

  it('mide la desafinación en centésimas', () => {
    const x = new Float32Array(3 * SR);
    addTrumpet(x, { midi: 60.3, start: 0.1, dur: 2 }, 0.1); // 30 centésimas arriba de C4
    const f = detectNotes(x, SR, 0, 3);
    expect(f.length).toBeGreaterThan(0);
    expect(f[0].midi).toBe(60);
    expect(Math.abs(f[0].cents - 30)).toBeLessThan(12);
  });

  it('el silencio no produce notas', () => {
    const x = new Float32Array(2 * SR);
    const r = rng(3);
    for (let i = 0; i < x.length; i++) x[i] = 0.001 * r();
    expect(detectNotes(x, SR, 0, 2)).toHaveLength(0);
  });
});

describe('nota en un instante', () => {
  it('lee la altura de una nota sostenida con error menor a 20 centésimas', () => {
    for (const m of [55, 60, 67, 74, 82]) {
      const x = new Float32Array(2 * SR);
      addTrumpet(x, { midi: m, start: 0, dur: 2 }, 0.1);
      const r = analyzeFrame(x, SR, SR, { fmin: 150 });
      expect(r, `midi ${m}`).not.toBeNull();
      expect(Math.abs(r!.midi - m), `midi ${m}`).toBeLessThan(0.2);
    }
  });

  it('en silencio no devuelve nada', () => {
    expect(analyzeFrame(new Float32Array(SR), SR, 5000)).toBeNull();
  });
});
