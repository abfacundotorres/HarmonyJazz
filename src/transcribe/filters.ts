export type CenterChoice = 'keep' | 'remove' | 'only';

export interface Filters {
  /** Corte de graves (Hz); 0 = sin corte. */
  hp: number;
  /** Corte de agudos (Hz); 0 = sin corte. */
  lp: number;
  center: CenterChoice;
}

export const NO_FILTERS: Filters = { hp: 0, lp: 0, center: 'keep' };

/** Preajuste para aislar una trompeta: recorta el bajo y los platillos. */
export const TRUMPET_FILTERS: Filters = { hp: 180, lp: 3500, center: 'keep' };

export function validFilters(f: unknown): f is Filters {
  const x = f as Filters | null;
  return !!x && x.hp >= 0 && x.hp <= 2000 && x.lp >= 0 && x.lp <= 20000 && (x.center === 'keep' || x.center === 'remove' || x.center === 'only');
}
