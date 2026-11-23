import { describe, expect, it } from 'vitest';
import { cleanMixer, defaultMixer, isFlat } from './mixer';

describe('cleanMixer', () => {
  it('lo dañado o ausente queda plano', () => {
    for (const bad of [null, 5, 'x', [], { piano: 3 }, { piano: [] }, { piano: { vol: 'a', low: NaN } }]) {
      expect(cleanMixer(bad)).toEqual(defaultMixer());
    }
  });
  it('recorta a los rangos y redondea', () => {
    const m = cleanMixer({ piano: { vol: 99, low: -99, mid: 2.6, high: 4 }, bass: { vol: -50 } });
    expect(m.piano).toEqual({ vol: 6, low: -12, mid: 3, high: 4 });
    expect(m.bass.vol).toBe(-18);
    expect(isFlat(m.drums)).toBe(true);
  });
});
