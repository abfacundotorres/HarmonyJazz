import { describe, expect, it } from 'vitest';
import { detectPitch, NoteTracker } from './yin';
import { freqToMidi } from '../theory/notes';

const SR = 48000;

/** Señal tipo metal: fundamental + armónicos fuertes (la trompeta tiene armónicos 2-4 muy presentes). */
function brassy(freq: number, n = 2048, noise = 0) {
  const b = new Float32Array(n);
  const amps = [1, 0.9, 0.7, 0.5, 0.35, 0.2];
  for (let i = 0; i < n; i++) {
    let v = 0;
    amps.forEach((a, k) => (v += a * Math.sin((2 * Math.PI * freq * (k + 1) * i) / SR)));
    b[i] = 0.2 * v + noise * (Math.random() * 2 - 1);
  }
  return b;
}

describe('YIN', () => {
  for (const f of [164.81, 233.08, 349.23, 466.16, 698.46, 1046.5]) {
    it(`detecta ${f} Hz con armónicos y ruido`, () => {
      const r = detectPitch(brassy(f, 2048, 0.02), SR)!;
      expect(r).not.toBeNull();
      expect(Math.abs(freqToMidi(r.freq) - freqToMidi(f))).toBeLessThan(0.1); // < 10 cents
    });
  }

  it('devuelve null con silencio', () => {
    expect(detectPitch(new Float32Array(2048), SR)).toBeNull();
  });

  it('devuelve null con ruido blanco', () => {
    const b = new Float32Array(2048).map(() => (Math.random() * 2 - 1) * 0.3);
    expect(detectPitch(b, SR)).toBeNull();
  });
});

describe('NoteTracker', () => {
  it('emite una nota cuando se estabiliza', () => {
    const t = new NoteTracker(50, 80);
    expect(t.push(62.1, 0)).toEqual({});
    expect(t.push(61.9, 30)).toEqual({});
    expect(t.push(62.0, 60)).toEqual({ on: 62 });
    expect(t.push(62.0, 90)).toEqual({});
    expect(t.push(null, 100)).toEqual({});
    expect(t.push(null, 200)).toEqual({ off: true });
  });
});
