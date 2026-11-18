import { describe, expect, it } from 'vitest';
import { afterEach } from 'vitest';
import ticksDataUri from '../../public/samples/metronome/ticks.wav?inline';
import { cleanCustom, CUSTOM_PRESETS, CUSTOM_RANGES, DEFAULT_CUSTOM, hasRealBase, HIT_LEVEL, type HitKind, REAL_COUNT, REAL_SEG_SECONDS, renderCustom, renderHit, resample, setRealBase, type SoundParams, splitReal, VARIANTS, VOICES } from './metroVoices';

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
        expect(a).toHaveLength(v.id === 'real' ? REAL_COUNT : VARIANTS);
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
    cases.push({ pitch: 200, wood: 0, metal: 0, attack: 0, hiss: 0, decay: 0.3, accent: 0, real: 0 }); // casi nada: igual tiene que sonar algo
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

/** Seis golpes sintéticos con la forma de los reales: un pico seco y una caída rápida. */
const fakeBase = (sr = 44100) => {
  const seg = Math.round(sr * REAL_SEG_SECONDS);
  const all = new Float32Array(seg * REAL_COUNT);
  for (let k = 0; k < REAL_COUNT; k++) for (let i = 0; i < seg; i++) all[k * seg + i] = Math.sin((2 * Math.PI * (1500 + 40 * k) * i) / sr) * Math.exp(-i / (0.006 * sr)) * (i < 4 ? i / 4 : 1);
  return { ticks: splitReal(all, sr), sr };
};

describe('golpes grabados', () => {
  afterEach(() => setRealBase(null));

  it('sin la grabación cargada, la voz grabada suena como la madera (no falla)', () => {
    expect(hasRealBase()).toBe(false);
    const x = renderHit('real', 'beat', SR);
    expect(x.length).toBeGreaterThan(0);
    for (const v of x) expect(v.every(Number.isFinite)).toBe(true);
  });

  it('con la grabación: seis variantes válidas, con el pico del nivel y apagándose', () => {
    setRealBase(fakeBase());
    expect(hasRealBase()).toBe(true);
    for (const kind of ['strong', 'beat', 'sub'] as HitKind[]) {
      const vs = renderHit('real', kind, SR);
      expect(vs).toHaveLength(REAL_COUNT);
      for (const v of vs) {
        expect(v.every(Number.isFinite)).toBe(true);
        expect(peak(v)).toBeCloseTo(HIT_LEVEL[kind], 2);
        expect(Math.abs(v[v.length - 1])).toBeLessThan(1e-3);
      }
      expect(Array.from(vs[0])).not.toEqual(Array.from(vs[1]));
    }
  });

  it('funciona con otra frecuencia de muestreo (48 kHz) y el fuerte es más agudo que el pulso', () => {
    setRealBase(fakeBase());
    const strong = renderHit('real', 'strong', 48000)[0];
    const beat = renderHit('real', 'beat', 48000)[0];
    expect(strong.length).toBeLessThan(beat.length);
    expect(zcr(strong)).toBeGreaterThan(zcr(beat));
  });

  it('resample: subir la altura acorta y baja la altura alarga, sin salirse de rango', () => {
    const x = fakeBase().ticks[0];
    expect(resample(x, 2, 44100, 44100).length).toBeCloseTo(x.length / 2, -1);
    expect(resample(x, 0.5, 44100, 44100).length).toBeGreaterThan(x.length * 1.9);
    expect(peak(resample(x, 1, 44100, 44100))).toBeLessThanOrEqual(peak(x) * 1.05);
    // a la misma frecuencia y a ratio 1 es la misma señal
    const same = resample(x, 1, 44100, 44100);
    expect(Math.abs(same[100] - x[100])).toBeLessThan(1e-6);
  });

  it('Mi sonido con grabación: mezcla distinto que sin ella, es válido en los extremos y "Sólo la grabación" no lleva el pitido sintético', () => {
    setRealBase(fakeBase());
    const a = renderCustom(DEFAULT_CUSTOM, 'beat', SR, 0);
    const b = renderCustom({ ...DEFAULT_CUSTOM, real: 1 }, 'beat', SR, 0);
    expect(Array.from(a)).not.toEqual(Array.from(b));
    for (const p of CUSTOM_PRESETS.map((x) => x.p)) for (const kind of ['strong', 'beat', 'sub'] as HitKind[]) {
      const x = renderCustom(p, kind, SR, 1);
      expect(x.every(Number.isFinite)).toBe(true);
      expect(peak(x)).toBeCloseTo(HIT_LEVEL[kind], 2);
    }
    const only = renderCustom(CUSTOM_PRESETS.find((x) => x.name === 'Sólo la grabación')!.p, 'beat', SR, 0);
    const real = renderHit('real', 'beat', SR)[0];
    // la correlación con el golpe grabado solo es muy alta
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < Math.min(only.length, real.length); i++) {
      dot += only[i] * real[i];
      na += only[i] ** 2;
      nb += real[i] ** 2;
    }
    expect(dot / Math.sqrt(na * nb)).toBeGreaterThan(0.9);
  });

  it('el archivo grabado trae seis golpes de 0,2 s en mono, con un pico al comienzo y la cola apagada', () => {
    const bin = atob(ticksDataUri.slice(ticksDataUri.indexOf(',') + 1));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const dv = new DataView(bytes.buffer);
    const tag = (o: number) => String.fromCharCode(...bytes.slice(o, o + 4));
    expect([tag(0), tag(8)]).toEqual(['RIFF', 'WAVE']);
    expect(dv.getUint16(22, true)).toBe(1); // mono
    expect(dv.getUint16(34, true)).toBe(16);
    const sr = dv.getUint32(24, true);
    const x = new Float32Array((bytes.length - 44) / 2);
    for (let i = 0; i < x.length; i++) x[i] = dv.getInt16(44 + 2 * i, true) / 32768;
    const segs = splitReal(x, sr);
    expect(segs).toHaveLength(REAL_COUNT);
    for (const s of segs) {
      expect(s.length).toBe(Math.round(sr * REAL_SEG_SECONDS));
      const head = rms(s, 0, Math.round(sr * 0.025));
      const tail = rms(s, s.length - Math.round(sr * 0.02), s.length);
      expect(head).toBeGreaterThan(0.05);
      expect(tail).toBeLessThan(head * 0.01);
      // el golpe empieza enseguida: el pico cae en el primer milisegundo y medio
      let at = 0;
      for (let i = 0; i < s.length; i++) if (Math.abs(s[i]) > Math.abs(s[at])) at = i;
      expect(at / sr).toBeLessThan(0.0015);
    }
  });
});
