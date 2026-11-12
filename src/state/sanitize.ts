/**
 * Validación de los datos guardados. Lo que está en el navegador puede venir de una versión anterior, de una copia
 * de seguridad ajena o estar dañado: nada de eso debe dejar la app en blanco. Cada validador devuelve el dato limpio
 * (con sólo lo válido) o null si no sirve y hay que descartarlo.
 */
export type Sanitizer = (raw: unknown) => unknown;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (v: unknown, lo: number, hi: number): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' ? v.slice(0, max) : undefined);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (list.includes(v as T) ? (v as T) : undefined);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Sólo quedan los campos válidos; los demás los completan los valores por defecto. */
export const sanitizeSettings: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => v !== undefined && (out[k] = v);
  set('view', oneOf(raw.view, ['Bb', 'C'] as const));
  set('register', oneOf(raw.register, ['grave', 'medio', 'agudo'] as const));
  set('swing', num(raw.swing, 0.5, 0.72));
  set('minutes', num(raw.minutes, 15, 240));
  set('focusLesson', str(raw.focusLesson, 40));
  set('volume', num(raw.volume, -14, 2));
  set('output', oneOf(raw.output, ['auto', 'phone', 'normal'] as const));
  return out;
};

export const sanitizeLog: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, { done: string[]; minutes: number }> = {};
  for (const [day, v] of Object.entries(raw).slice(-800)) {
    if (!DAY.test(day) || !isObj(v)) continue;
    const done = Array.isArray(v.done) ? v.done.filter((d): d is string => typeof d === 'string').map((d) => d.slice(0, 40)).slice(0, 30) : [];
    out[day] = { done, minutes: num(v.minutes, 0, 1440) ?? 0 };
  }
  return out;
};

export const sanitizeMastery: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, Record<string, number>> = {};
  for (const [id, v] of Object.entries(raw).slice(0, 3000)) {
    if (id.length > 80 || !isObj(v)) continue;
    const keys: Record<string, number> = {};
    for (const [k, t] of Object.entries(v).slice(0, 40)) {
      const n = num(t, 0, 600);
      if (n !== undefined && k.length <= 12) keys[k] = n;
    }
    out[id] = keys;
  }
  return out;
};

/** Listas de objetos (temas, frases): se descarta lo que no sea objeto; cada elemento se valida después al usarlo. */
const listOf = (field: string, max: number): Sanitizer => (raw) => {
  if (!isObj(raw) || !Array.isArray(raw[field])) return null;
  return { [field]: (raw[field] as unknown[]).filter(isObj).slice(0, max) };
};
export const sanitizeLibrary = listOf('tunes', 600);
export const sanitizePhrases = listOf('phrases', 400);

export const sanitizeAtril: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const size = num(raw.size, 1.2, 5);
  return size === undefined ? {} : { size };
};

export const SANITIZERS: Record<string, Sanitizer> = {
  settings: sanitizeSettings,
  log: sanitizeLog,
  mastery: sanitizeMastery,
  library: sanitizeLibrary,
  phrases: sanitizePhrases,
  atril: sanitizeAtril,
};

/**
 * Dato limpio de una clave (sin el prefijo), o null si hay que descartarlo. Las claves que no se conocen pasan sin
 * cambios mientras sean datos simples.
 */
export function sanitizeKey(key: string, raw: unknown): unknown {
  const s = SANITIZERS[key];
  if (s) {
    try {
      return s(raw);
    } catch {
      return null;
    }
  }
  return raw === undefined ? null : raw;
}
