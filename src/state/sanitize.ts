/**
 * Validación de los datos guardados. Lo que está en el navegador puede venir de una versión anterior, de una copia
 * de seguridad ajena o estar dañado: nada de eso debe dejar la app en blanco. Cada validador devuelve el dato limpio
 * (con sólo lo válido) o null si no sirve y hay que descartarlo.
 */
import { FOCI } from '../content/focus';
import { cleanCustom } from '../audio/metroVoices';
import { isMemoriaModo } from '../content/memoria';
import { THEME_IDS } from '../ui/themes';

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
  set('focusLesson', str(raw.focusLesson, 40));
  set('volume', num(raw.volume, -14, 2));
  set('output', oneOf(raw.output, ['auto', 'phone', 'normal'] as const));
  set('chordStyle', oneOf(raw.chordStyle, ['ireal', 'full'] as const));
  set('theme', oneOf(raw.theme, THEME_IDS));
  set('a4', num(raw.a4, 415, 466));
  set('keepAwake', typeof raw.keepAwake === 'boolean' ? raw.keepAwake : undefined);
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

/** Cuándo se marcó cada ejercicio y tonalidad (para el repaso espaciado). */
export const sanitizeSeen: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, Record<string, { d: number; n: number }>> = {};
  for (const [id, v] of Object.entries(raw).slice(0, 3000)) {
    if (id.length > 80 || !isObj(v)) continue;
    const keys: Record<string, { d: number; n: number }> = {};
    for (const [k, e] of Object.entries(v).slice(0, 40)) {
      if (k.length > 12 || !isObj(e)) continue;
      const d = num(e.d, 0, 100000);
      const n = num(e.n, 1, 1000);
      if (d !== undefined && n !== undefined) keys[k] = { d: Math.round(d), n: Math.round(n) };
    }
    if (Object.keys(keys).length) out[id] = keys;
  }
  return out;
};

/** El plan del mes (focos elegidos). */
export const sanitizeMonth: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, unknown> = {};
  const m = str(raw.month, 7);
  if (m && /^\d{4}-\d{2}$/.test(m)) out.month = m;
  const ids = new Set(FOCI.map((f) => f.id));
  if (typeof raw.tech === 'string' && ids.has(raw.tech)) out.tech = raw.tech;
  if (typeof raw.lang === 'string' && ids.has(raw.lang)) out.lang = raw.lang;
  const rep = str(raw.rep, 80);
  if (rep !== undefined) out.rep = rep;
  const day = num(raw.startDay, 0, 100000);
  if (day !== undefined) out.startDay = Math.round(day);
  const nivel = num(raw.nivel, 1, 6);
  if (nivel !== undefined) out.nivel = Math.round(nivel);
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

export const sanitizeMemoria: Sanitizer = (raw) => (isObj(raw) ? (isMemoriaModo(raw.modo) ? { modo: raw.modo } : {}) : null);

export const sanitizeEditor: Sanitizer = (raw) => (isObj(raw) ? (typeof raw.auto === 'boolean' ? { auto: raw.auto } : {}) : null);

export const sanitizeMetro: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => v !== undefined && (out[k] = v);
  set('tempo', num(raw.tempo, 20, 320));
  set('beats', num(raw.beats, 1, 12));
  set('sub', [1, 2, 3, 4].includes(raw.sub as number) ? raw.sub : undefined);
  set('sound', oneOf(raw.sound, ['wood', 'click', 'hat', 'cowbell', 'real', 'custom'] as const));
  for (const k of ['accent', 'backbeat', 'silenceOn', 'rampOn'] as const) if (typeof raw[k] === 'boolean') out[k] = raw[k];
  for (const k of ['play', 'mute', 'step', 'every'] as const) set(k, num(raw[k], 1, 64));
  set('max', num(raw.max, 20, 320));
  if (isObj(raw.custom)) out.custom = cleanCustom(raw.custom);
  return out;
};

/** Notas largas guardadas: una por fila, con el día, la nota (concierto), la dispersión y el desvío en cents. */
export const sanitizeLongNotes: Sanitizer = (raw) => {
  if (!isObj(raw) || !Array.isArray(raw.rows)) return null;
  const out: { day: string; midi: number; secs: number; spread: number; offset: number }[] = [];
  for (const r of raw.rows.slice(-600)) {
    if (!isObj(r) || typeof r.day !== 'string' || !DAY.test(r.day)) continue;
    const midi = num(r.midi, 24, 108), secs = num(r.secs, 0, 600), spread = num(r.spread, 0, 100), offset = num(r.offset, -100, 100);
    if (midi === undefined || secs === undefined || spread === undefined || offset === undefined) continue;
    out.push({ day: r.day, midi: Math.round(midi), secs, spread, offset });
  }
  return { rows: out };
};

/** Aciertos del entrenamiento del oído: por ítem, respuestas, aciertos y último día. */
export const sanitizeEar: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, { n: number; ok: number; d: number }> = {};
  for (const [id, v] of Object.entries(raw).slice(0, 400)) {
    if (id.length > 30 || !isObj(v)) continue;
    const n = num(v.n, 0, 1e6);
    const ok = num(v.ok, 0, 1e6);
    const d = num(v.d, 0, 1e6);
    if (n !== undefined && ok !== undefined && d !== undefined) out[id] = { n: Math.round(n), ok: Math.min(Math.round(ok), Math.round(n)), d: Math.round(d) };
  }
  return out;
};

/** Ajustes de la pantalla Oído (qué ejercicio y con qué opciones). */
export const sanitizeEarSet: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => v !== undefined && (out[k] = v);
  set('kind', oneOf(raw.kind, ['int', 'chord', 'gt'] as const));
  set('intMode', oneOf(raw.intMode, ['asc', 'desc', 'harm', 'mix'] as const));
  set('chSet', oneOf(raw.chSet, ['triads', 'sevenths'] as const));
  set('chMode', oneOf(raw.chMode, ['arp', 'block', 'mix'] as const));
  return out;
};

/** Focos del mes ya trabajados (para el camino sugerido). */
export const sanitizeCamino: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const done = Array.isArray(raw.done) ? [...new Set(raw.done.filter((d): d is string => typeof d === 'string' && d.length <= 40))].slice(0, 100) : [];
  return { done };
};

/** Currícula: materias aprobadas, la que está en curso y los criterios de cierre tildados. */
export const sanitizeCurricula: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const ints = (v: unknown, lo: number, hi: number) => (Array.isArray(v) ? [...new Set(v.filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi))] : []);
  const checks: Record<string, number[]> = {};
  if (isObj(raw.checks)) for (const [k, v] of Object.entries(raw.checks).slice(0, 36)) if (/^\d{1,2}$/.test(k) && Number(k) >= 1 && Number(k) <= 36) checks[k] = ints(v, 0, 11);
  const actual = typeof raw.actual === 'number' && Number.isInteger(raw.actual) && raw.actual >= 1 && raw.actual <= 36 ? raw.actual : null;
  return { aprobadas: ints(raw.aprobadas, 1, 36), actual, checks };
};

/** Mi repertorio: por tema, pasos logrados, último día que se tocó y día en que se empezó. */
export const sanitizeRepertorio: Sanitizer = (raw) => {
  if (!isObj(raw)) return null;
  const out: Record<string, { hechos: number[]; ultimo: number; inicio: number }> = {};
  for (const [id, v] of Object.entries(raw).slice(0, 300)) {
    if (id.length > 80 || !isObj(v)) continue;
    const hechos = Array.isArray(v.hechos) ? [...new Set(v.hechos.filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 6))].sort((a, b) => a - b) : [];
    out[id] = { hechos, ultimo: Math.round(num(v.ultimo, 0, 100000) ?? 0), inicio: Math.round(num(v.inicio, 0, 100000) ?? 0) };
  }
  return out;
};

export const SANITIZERS: Record<string, Sanitizer> = {
  settings: sanitizeSettings,
  log: sanitizeLog,
  mastery: sanitizeMastery,
  seen: sanitizeSeen,
  month: sanitizeMonth,
  library: sanitizeLibrary,
  phrases: sanitizePhrases,
  atril: sanitizeAtril,
  memoria: sanitizeMemoria,
  editor: sanitizeEditor,
  metro: sanitizeMetro,
  longnotes: sanitizeLongNotes,
  ear: sanitizeEar,
  earset: sanitizeEarSet,
  camino: sanitizeCamino,
  curricula: sanitizeCurricula,
  repertorio: sanitizeRepertorio,
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
