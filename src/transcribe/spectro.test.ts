import { describe, expect, it } from 'vitest';
import { midiToHz } from './fft';
import { computeSpectro, estimateRefDb, midiToRow, SPEC_ROWS } from './spectro';

const SR = 11025;
const tone = (m: number, secs: number) => {
  const x = new Float32Array(secs * SR);
  for (let i = 0; i < x.length; i++) x[i] = 0.2 * Math.sin(2 * Math.PI * midiToHz(m) * (i / SR));
  return x;
};

describe('espectrograma', () => {
  it('un tono aparece en la fila de su altura', () => {
    for (const m of [52, 60, 69, 79]) {
      const x = tone(m, 2);
      const ref = estimateRefDb(x, SR);
      const img = computeSpectro(x, SR, 0.5, 1.5, 20, ref);
      expect(img.rows).toBe(SPEC_ROWS);
      let best = 0;
      for (let r = 0; r < img.rows; r++) if (img.data[r * 20 + 10] > img.data[best * 20 + 10]) best = r;
      expect(Math.abs(best + 0.5 - midiToRow(m)), `midi ${m}`).toBeLessThan(1.6);
      expect(img.data[best * 20 + 10]).toBeGreaterThan(220);
    }
  });

  it('un tono más agudo no ilumina la fila del grave', () => {
    const x = tone(72, 2);
    const img = computeSpectro(x, SR, 0.5, 1.5, 10, estimateRefDb(x, SR));
    expect(img.data[Math.round(midiToRow(60)) * 10 + 5]).toBeLessThan(60);
  });
});
