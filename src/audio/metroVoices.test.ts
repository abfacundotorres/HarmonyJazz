import { describe, expect, it } from 'vitest';
import { cleanCustom, CUSTOM_PRESETS, CUSTOM_RANGES, DEFAULT_CUSTOM, HIT_LEVEL, type HitKind, renderCustom, renderHit, type SoundParams, VARIANTS, VOICES } from './metroVoices';

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

describe('Mi sonido (perillas)', () => {
  const kinds: HitKind[] = ['strong', 'beat', 'sub'];
  it('todos los puntos de partida y los extremos de cada perilla dan un golpe válido', () => {
    const cases: SoundParams[] = CUSTOM_PRESETS.map((x) => x.p);
    for (const k of Object.keys(CUSTOM_RANGES) as (keyof SoundParams)[]) for (const v of CUSTOM_RANGES[k]) cases.push({ ...DEFAULT_CUSTOM, [k]: v });
    cases.push({ pitch: 200, wood: 0, metal: 0, attack: 0, hiss: 0, decay: 0.3, accent: 0 }); // casi nada: igual tiene que sonar algo
    for (const p of cases) for (const kind of kinds) for (let v = 0; v < VARIANTS; v++) {
      const x = renderCustom(p, kind, 48000, v);
      expect(x.every(Number.isFinite)).toBe(true);
      expect(peak(x)).toBeCloseTo(HIT_LEVEL[kind], 2);
      expect(Math.abs(x[x.length - 1])).toBeLessThan(1e-3);
    }
  });
  it('más grave suena más lento (menos cruces por cero) y el siseo la vuelve brillante', () => {
    const low = renderCustom({ ...DEFAULT_CUSTOM, pitch: 400, attack: 0 }, 'beat', SR, 0);
    const high = renderCustom({ ...DEFAULT_CUSTOM, pitch: 2500, attack: 0 }, 'beat', SR, 0);
    expect(zcr(high)).toBeGreaterThan(zcr(low) * 1.5);
    const hiss = renderCustom({ ...DEFAULT_CUSTOM, wood: 0, hiss: 1 }, 'beat', SR, 0);
    expect(zcr(hiss)).toBeGreaterThan(zcr(renderCustom(DEFAULT_CUSTOM, 'beat', SR, 0)));
  });
  it('"duración" alarga la resonancia y el acento sube la altura del primer pulso', () => {
    expect(renderCustom({ ...DEFAULT_CUSTOM, decay: 3 }, 'beat', SR, 0).length).toBeGreaterThan(renderCustom({ ...DEFAULT_CUSTOM, decay: 0.3 }, 'beat', SR, 0).length);
    const strong = renderCustom({ ...DEFAULT_CUSTOM, attack: 0, accent: 12 }, 'strong', SR, 0);
    const beat = renderCustom({ ...DEFAULT_CUSTOM, attack: 0, accent: 12 }, 'beat', SR, 0);
    expect(zcr(strong)).toBeGreaterThan(zcr(beat) * 1.3);
  });
  it('cleanCustom acota lo que se sale y reemplaza lo roto', () => {
    expect(cleanCustom({ pitch: 99999, wood: -4, decay: 'x', accent: 3 })).toEqual({ ...DEFAULT_CUSTOM, pitch: 4000, wood: 0, accent: 3 });
    expect(cleanCustom(null)).toEqual(DEFAULT_CUSTOM);
    expect(cleanCustom({ pitch: NaN }).pitch).toBe(CUSTOM_RANGES.pitch[0]);
  });
});
