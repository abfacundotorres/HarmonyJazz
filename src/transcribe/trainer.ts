/**
 * Entrenador de loops: sube la velocidad cada N repeticiones hasta la meta.
 */
export interface Trainer {
  on: boolean;
  /** Velocidad a la que se llega (1 = 100 %). */
  target: number;
  /** Cuánto sube cada vez (0,05 = 5 puntos). */
  step: number;
  /** Cada cuántas repeticiones sube. */
  every: number;
  /** Pausa entre repeticiones (segundos). */
  gap: number;
}

export const DEFAULT_TRAINER: Trainer = { on: false, target: 1, step: 0.05, every: 4, gap: 0 };

export const roundRate = (r: number) => Math.round(r * 100) / 100;

/** Velocidad tras completar `loops` repeticiones (acumuladas desde que se empezó). */
export function rateAfter(current: number, t: Trainer, loops: number): number {
  if (!t.on || loops <= 0 || t.every < 1) return current;
  if (loops % t.every !== 0) return current;
  if (current >= t.target - 1e-9) return current;
  return roundRate(Math.min(t.target, current + t.step));
}

/** Cuántas repeticiones faltan para llegar a la meta desde la velocidad actual. */
export function repsToTarget(current: number, t: Trainer): number {
  if (!t.on || current >= t.target - 1e-9) return 0;
  return Math.ceil((t.target - current) / t.step - 1e-9) * t.every;
}

export function validTrainer(t: unknown): t is Trainer {
  const x = t as Trainer | null;
  return (
    !!x && typeof x.on === 'boolean' && x.target >= 0.25 && x.target <= 2 && x.step >= 0.01 && x.step <= 0.5 && Number.isInteger(x.every) && x.every >= 1 && x.every <= 50 && x.gap >= 0 && x.gap <= 10
  );
}
