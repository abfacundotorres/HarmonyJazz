import { describe, expect, it } from 'vitest';
import { rampTempo } from './ramp';

describe('subir el tempo solo', () => {
  it('sin pedirlo, el tempo no cambia', () => {
    expect([0, 1, 50].map((k) => rampTempo(120, undefined, k))).toEqual([120, 120, 120]);
  });
  it('sube `step` cada `every` vueltas', () => {
    const r = { step: 4, every: 2, max: 200 };
    expect([0, 1, 2, 3, 4, 5, 6].map((k) => rampTempo(120, r, k))).toEqual([120, 120, 124, 124, 128, 128, 132]);
  });
  it('no pasa del máximo, ni baja del tempo de partida aunque el máximo sea menor', () => {
    expect(rampTempo(120, { step: 10, every: 1, max: 135 }, 9)).toBe(135);
    expect(rampTempo(150, { step: 10, every: 1, max: 135 }, 9)).toBe(150);
  });
  it('valores raros no rompen: vuelta negativa y "cada 0 vueltas"', () => {
    expect(rampTempo(100, { step: 5, every: 0, max: 300 }, 3)).toBe(115);
    expect(rampTempo(100, { step: 5, every: 2, max: 300 }, -4)).toBe(100);
  });
});
