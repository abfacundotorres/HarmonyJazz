import { type Ramp, rampTempo } from './ramp';

/**
 * Metrónomo: qué suena en cada compás. Es una función pura (sin audio) para poder comprobar los acentos, las
 * subdivisiones, los compases en silencio y la subida de tempo; el motor sólo agenda lo que devuelve.
 */
export interface MetroOpts {
  /** Pulsos por minuto. */
  tempo: number;
  /** Pulsos por compás (1 a 12). */
  beats: number;
  /** Subdivisión de cada pulso: 1 = nada, 2 = corcheas, 3 = tresillos, 4 = semicorcheas. */
  sub: 1 | 2 | 3 | 4;
  /** Acento en el primer pulso. */
  accent: boolean;
  /** Sólo los contratiempos (2 y 4 en 4/4; los pulsos pares del compás): como el pedal del hi-hat en jazz. */
  backbeat: boolean;
  /** Compases que suenan y compases en silencio, que se repiten. */
  silence?: { play: number; mute: number };
  /** Subir el tempo: `step` bpm cada `every` compases, hasta `max`. */
  ramp?: Ramp;
}

export type TickKind = 'strong' | 'beat' | 'sub';
export interface Tick {
  /** Pulso (desde 0) y subdivisión (desde 0) a la que pertenece. */
  beat: number;
  sub: number;
  kind: TickKind;
  /** Segundos desde el comienzo del compás. */
  t: number;
}
export interface BarPlan {
  tempo: number;
  /** Compás en silencio: no suena nada, pero la pantalla sigue contando. */
  muted: boolean;
  /** Duración del compás en segundos. */
  dur: number;
  ticks: Tick[];
}

export const MIN_TEMPO = 20;
export const MAX_TEMPO = 320;

/** Lo que suena en el compás `bar` (0 = el primero). */
export function barPlan(o: MetroOpts, bar: number): BarPlan {
  const tempo = Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, rampTempo(o.tempo, o.ramp, bar)));
  const beat = 60 / tempo;
  const beats = Math.min(12, Math.max(1, Math.round(o.beats)));
  const cycle = o.silence ? Math.max(1, o.silence.play) + Math.max(0, o.silence.mute) : 0;
  const muted = !!o.silence && o.silence.mute > 0 && bar % cycle >= Math.max(1, o.silence.play);
  const ticks: Tick[] = [];
  if (!muted) {
    for (let b = 0; b < beats; b++) {
      if (o.backbeat) {
        if (b % 2 === 1) ticks.push({ beat: b, sub: 0, kind: 'beat', t: b * beat });
        continue;
      }
      for (let s = 0; s < o.sub; s++) ticks.push({ beat: b, sub: s, kind: s > 0 ? 'sub' : b === 0 && o.accent ? 'strong' : 'beat', t: (b + s / o.sub) * beat });
    }
  }
  return { tempo, muted, dur: beats * beat, ticks };
}
