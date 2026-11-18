import { describe, expect, it } from 'vitest';
import { HIT_LEVEL, type HitKind, renderHit, VARIANTS, VOICES } from './metroVoices';

const SR = 44100;
const KINDS: HitKind[] = ['strong', 'beat', 'sub'];
const peak = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (x: Float32Array, a: number, b: number) => Math.sqrt(x.slice(a, b).reduce((s, v) => s + v * v, 0) / Math.max(1, b - a));
/** Cruces por cero por muestra: sube con el brillo. */
const zcr = (x: Float32Array) => {
  let n = 0;
  for (let i = 1; i < x.length; i++) if ((x[i] >= 0) !== (x[i - 1] >= 0)) n++;
  return n / x.length;
};

describe('voces del metrónomo', () => {
  for (const v of VOICES) {
    describe(v.name, () => {
      for (const kind of KINDS) {
        it(`${kind}: finito, sin pasar de ±1, con el pico del nivel y apagándose`, () => {
          for (const x of renderHit(v.id, kind, SR)) {
            expect(x.length).toBeGreaterThan(SR * 0.05);
            expect(x.every(Number.isFinite)).toBe(true);
            expect(peak(x)).toBeCloseTo(HIT_LEVEL[kind], 2);
            // arranca y termina en cero (sin chasquidos) y la cola es mucho más débil que el ataque
            expect(Math.abs(x[0])).toBeLessThan(0.02);
            expect(Math.abs(x[x.length - 1])).toBeLessThan(1e-3);
            const n = x.length;
            expect(rms(x, Math.floor(n * 0.8), n)).toBeLessThan(0.05 * Math.max(rms(x, 0, Math.floor(n * 0.1)), 1e-9));
          }
        });
      }
      it('es determinista y tiene variantes distintas', () => {
        const a = renderHit(v.id, 'beat', SR);
        const b = renderHit(v.id, 'beat', SR);
        expect(a).toHaveLength(VARIANTS);
        expect(Array.from(a[0])).toEqual(Array.from(b[0]));
        expect(Array.from(a[0])).not.toEqual(Array.from(a[1]));
      });
      it('el pulso fuerte suena más fuerte que la subdivisión', () => {
        const [s] = renderHit(v.id, 'strong', SR);
        const [u] = renderHit(v.id, 'sub', SR);
        expect(peak(s)).toBeGreaterThan(peak(u));
      });
    });
  }
  it('con otra frecuencia de muestreo también sale válido', () => {
    for (const v of VOICES) for (const x of renderHit(v.id, 'beat', 22050)) expect(x.every(Number.isFinite)).toBe(true);
  });
  it('el hi-hat es más brillante que la madera', () => {
    expect(zcr(renderHit('hat', 'beat', SR)[0])).toBeGreaterThan(zcr(renderHit('wood', 'beat', SR)[0]) * 1.5);
  });
});
