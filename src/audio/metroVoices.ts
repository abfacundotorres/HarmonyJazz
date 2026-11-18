/**
 * Voces del metrónomo, sintetizadas por modelado modal (sumas de resonancias que se apagan) y ruido filtrado.
 * Son funciones puras: devuelven muestras (`Float32Array`) y no tocan el audio, así se pueden comprobar. El motor
 * las convierte en buffers una sola vez y las dispara con el reloj de audio.
 *
 * Cada voz tiene varias variantes por golpe (pequeñas diferencias de afinación y de ruido) para que una serie de
 * golpes iguales no suene a ametralladora: un metrónomo mecánico real nunca repite exactamente el mismo golpe.
 *
 * Para sumar muestras propias más adelante alcanza con agregar una entrada a `VOICES` con su `render`.
 */

export type VoiceId = 'wood' | 'click' | 'hat' | 'cowbell';
/** Fuerte (primer pulso), pulso y subdivisión. */
export type HitKind = 'strong' | 'beat' | 'sub';

export interface VoiceInfo {
  id: VoiceId;
  name: string;
  /** Genera un golpe. `variant` elige una de las variantes (0 a VARIANTS − 1). Pico normalizado según el nivel del golpe. */
  render: (kind: HitKind, sampleRate: number, variant: number) => Float32Array;
}

export const VARIANTS = 3;
/** Pico de cada golpe: el primer pulso sobresale y la subdivisión queda de fondo. */
export const HIT_LEVEL: Record<HitKind, number> = { strong: 0.92, beat: 0.74, sub: 0.4 };

/** Generador pseudoaleatorio con semilla (mulberry32): el mismo golpe sale siempre igual. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Mode {
  /** Frecuencia (Hz), amplitud relativa y constante de caída (s). */
  f: number;
  a: number;
  tau: number;
}

/** Suma de resonancias que se apagan exponencialmente. Se descartan las que pasan de ~0,45 de la frecuencia de muestreo. */
function modal(len: number, sr: number, modes: Mode[], rand: () => number): Float32Array {
  const out = new Float32Array(len);
  for (const m of modes) {
    if (m.f > sr * 0.45) continue;
    const w = (2 * Math.PI * m.f) / sr;
    const ph = rand() * 0.6; // fase inicial levemente distinta en cada variante
    const k = Math.exp(-1 / (m.tau * sr));
    let env = m.a;
    for (let i = 0; i < len && env > 1e-5; i++) {
      out[i] += env * Math.sin(w * i + ph);
      env *= k;
    }
  }
  return out;
}

/** Filtro bicuadrático (RBJ) aplicado en el lugar. */
function biquad(x: Float32Array, type: 'lp' | 'hp' | 'bp', f: number, q: number, sr: number): Float32Array {
  const w0 = (2 * Math.PI * Math.min(f, sr * 0.45)) / sr;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0: number, b1: number, b2: number;
  if (type === 'lp') {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = b0;
  } else if (type === 'hp') {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = b0;
  } else {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }
  const a0 = 1 + alpha;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  b0 /= a0;
  b1 /= a0;
  b2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/** Ruido blanco con caída exponencial. */
function noise(len: number, sr: number, tau: number, rand: () => number): Float32Array {
  const out = new Float32Array(len);
  const k = Math.exp(-1 / (tau * sr));
  let env = 1;
  for (let i = 0; i < len; i++) {
    out[i] = (rand() * 2 - 1) * env;
    env *= k;
  }
  return out;
}

function mix(len: number, parts: [Float32Array, number][]): Float32Array {
  const out = new Float32Array(len);
  for (const [p, g] of parts) for (let i = 0; i < len; i++) out[i] += p[i] * g;
  return out;
}

/** Entrada de 0,3 ms (sin chasquido de arranque), salida de 6 ms (sin corte seco) y pico en `peak`. */
function finish(x: Float32Array, sr: number, peak: number): Float32Array {
  const a = Math.max(1, Math.round(sr * 0.0003));
  const r = Math.min(x.length, Math.round(sr * 0.006));
  for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a;
  for (let i = 0; i < r; i++) x[x.length - 1 - i] *= i / r;
  let max = 0;
  for (let i = 0; i < x.length; i++) max = Math.max(max, Math.abs(x[i]));
  if (max > 0) for (let i = 0; i < x.length; i++) x[i] = (x[i] / max) * peak;
  return x;
}

/** Desvío pequeño y distinto en cada variante: ±0,7 % de afinación. */
const detune = (variant: number) => 1 + [0, 0.007, -0.006][variant % VARIANTS];

/** Madera: el "tac" de un metrónomo de péndulo. Cuerpo de caja grave más resonancias de madera dura y un golpe seco. */
function wood(kind: HitKind, sr: number, variant: number): Float32Array {
  const rand = rng(1000 + variant * 7 + (kind === 'strong' ? 1 : kind === 'beat' ? 2 : 3));
  const f0 = 1150 * detune(variant) * (kind === 'strong' ? 1.26 : kind === 'sub' ? 1.12 : 1);
  const len = Math.round(sr * 0.2);
  const body = modal(
    len,
    sr,
    [
      { f: f0 * 0.5, a: 0.5, tau: 0.045 },
      { f: f0, a: 1, tau: 0.03 },
      { f: f0 * 2.31, a: 0.6, tau: 0.018 },
      { f: f0 * 3.76, a: 0.28, tau: 0.011 },
      { f: f0 * 5.4, a: 0.12, tau: 0.007 },
    ],
    rand,
  );
  const hit = biquad(noise(len, sr, 0.0016, rand), 'bp', 3400, 0.9, sr);
  return finish(mix(len, [[body, 1], [hit, 0.55]]), sr, HIT_LEVEL[kind]);
}

/** Clic electrónico: un "ping" seco de seno con un toque de armónico. Muy claro y corto, bueno para tempos altos. */
function click(kind: HitKind, sr: number, variant: number): Float32Array {
  const rand = rng(2000 + variant * 7);
  const f = (kind === 'strong' ? 2400 : kind === 'sub' ? 1500 : 1800) * detune(variant);
  const len = Math.round(sr * 0.07);
  const ping = modal(len, sr, [{ f, a: 1, tau: 0.007 }, { f: f * 2.01, a: 0.18, tau: 0.004 }], rand);
  const tick = biquad(noise(len, sr, 0.0008, rand), 'hp', 4000, 0.7, sr);
  return finish(mix(len, [[ping, 1], [tick, 0.25]]), sr, HIT_LEVEL[kind]);
}

/** Hi-hat cerrado: ruido brillante con resonancias metálicas y el "chick" grave del pedal. El pulso fuerte queda más abierto. */
function hat(kind: HitKind, sr: number, variant: number): Float32Array {
  const rand = rng(3000 + variant * 7 + (kind === 'strong' ? 1 : kind === 'beat' ? 2 : 3));
  const tau = kind === 'strong' ? 0.05 : kind === 'beat' ? 0.026 : 0.014;
  const len = Math.round(sr * (kind === 'strong' ? 0.22 : 0.14));
  const shimmer = biquad(noise(len, sr, tau, rand), 'hp', 6500, 0.7, sr);
  const metal = modal(
    len,
    sr,
    [5120, 7340, 9060, 11300].map((f, i) => ({ f: f * detune(variant + i), a: 0.18, tau: tau * 0.8 })),
    rand,
  );
  const chick = biquad(noise(len, sr, 0.007, rand), 'bp', 1300, 1.1, sr);
  return finish(mix(len, [[shimmer, 1], [metal, 0.5], [chick, 0.35]]), sr, HIT_LEVEL[kind]);
}

/** Cencerro: dos resonancias casi inarmónicas con caída media, para marcar de modo inconfundible entre otros sonidos. */
function cowbell(kind: HitKind, sr: number, variant: number): Float32Array {
  const rand = rng(4000 + variant * 7 + (kind === 'strong' ? 1 : kind === 'beat' ? 2 : 3));
  const f0 = 587 * detune(variant) * (kind === 'strong' ? 1.19 : 1);
  const len = Math.round(sr * 0.32);
  const body = modal(
    len,
    sr,
    [
      { f: f0, a: 1, tau: 0.09 },
      { f: f0 * 1.44, a: 0.85, tau: 0.06 },
      { f: f0 * 2.02, a: 0.25, tau: 0.03 },
      { f: f0 * 2.88, a: 0.15, tau: 0.02 },
    ],
    rand,
  );
  const hit = biquad(noise(len, sr, 0.002, rand), 'bp', 2600, 0.8, sr);
  return finish(mix(len, [[body, 1], [hit, 0.3]]), sr, HIT_LEVEL[kind]);
}

export const VOICES: VoiceInfo[] = [
  { id: 'wood', name: 'Madera (péndulo)', render: wood },
  { id: 'click', name: 'Clic electrónico', render: click },
  { id: 'hat', name: 'Hi-hat', render: hat },
  { id: 'cowbell', name: 'Cencerro', render: cowbell },
];

export const isVoiceId = (v: unknown): v is VoiceId => VOICES.some((x) => x.id === v);

/** Todas las variantes de un golpe de una voz. */
export function renderHit(voice: VoiceId, kind: HitKind, sampleRate: number): Float32Array[] {
  const v = VOICES.find((x) => x.id === voice) ?? VOICES[0];
  return Array.from({ length: VARIANTS }, (_, i) => v.render(kind, sampleRate, i));
}
