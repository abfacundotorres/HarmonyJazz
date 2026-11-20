/** Tamaño de la letra del modo atril (en rem, el de la letra de los acordes de la grilla). Se cambia en Más → Ajustes. */
export const ATRIL_SIZE = { min: 1.2, max: 5, default: 2, step: 0.1 };

export const clampAtrilSize = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? Math.min(ATRIL_SIZE.max, Math.max(ATRIL_SIZE.min, n)) : ATRIL_SIZE.default);
