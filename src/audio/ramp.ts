/** Subir el tempo solo: `step` bpm cada `every` vueltas, hasta `max`. */
export interface Ramp {
  step: number;
  every: number;
  max: number;
}

/** Tempo de la vuelta `k` (0 = la primera): el de partida más lo que haya subido, sin pasar del máximo ni bajar del de partida. */
export function rampTempo(base: number, ramp: Ramp | undefined, k: number): number {
  if (!ramp) return base;
  const up = ramp.step * Math.floor(Math.max(0, k) / Math.max(1, ramp.every));
  return Math.min(Math.max(base, ramp.max), base + up);
}
