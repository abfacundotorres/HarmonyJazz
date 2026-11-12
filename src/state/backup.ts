import type { TrackMeta } from '../transcribe/audioStore';

/**
 * Copia de seguridad de los datos del usuario (temas, frases, progreso, ajustes y las fichas de los audios de
 * Transcribir: pasajes, marcadores, grilla). Es un archivo JSON que se guarda en el celular o la computadora.
 * Los audios en sí no se incluyen (pesan decenas de MB): se vuelven a cargar. La contraseña de acceso y los
 * borradores transitorios nunca entran en la copia.
 */
export const PREFIX = 'harmonyjazz:';
export const LAST_BACKUP = 'lastBackup';
const SKIP = new Set([LAST_BACKUP, 'phrase-draft']);
const KEY_RE = /^[a-z][a-z0-9_-]{0,40}$/i;
const MAX_VALUE_CHARS = 2_000_000;
const MAX_TOTAL_CHARS = 8_000_000;

export interface BackupFile {
  app: 'harmonyjazz';
  version: 2;
  created: string;
  /** Claves de la app (sin el prefijo) con su valor ya interpretado. */
  data: Record<string, unknown>;
  audios: TrackMeta[];
}

type ReadStorage = Pick<Storage, 'length' | 'key' | 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem' | 'getItem'>;

export function collectLocal(storage: ReadStorage): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    const name = k.slice(PREFIX.length);
    if (SKIP.has(name) || !KEY_RE.test(name)) continue;
    try {
      const raw = storage.getItem(k);
      if (raw !== null) out[name] = JSON.parse(raw);
    } catch {
      /* valor dañado: no se copia */
    }
  }
  return out;
}

export function buildBackup(data: Record<string, unknown>, audios: TrackMeta[], now = new Date()): BackupFile {
  return { app: 'harmonyjazz', version: 2, created: now.toISOString(), data, audios };
}

export const backupFileName = (now = new Date()) => `harmonyjazz-copia-${now.toISOString().slice(0, 10)}.json`;

/** Lee y valida un archivo de copia. Devuelve la copia o un mensaje de error. */
export function parseBackup(text: string): BackupFile | string {
  if (text.length > MAX_TOTAL_CHARS * 2) return 'El archivo es demasiado grande para ser una copia de HarmonyJazz';
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return 'El archivo no es una copia válida (no se puede leer)';
  }
  const f = raw as Partial<BackupFile> | null;
  if (!f || typeof f !== 'object' || f.app !== 'harmonyjazz') return 'Este archivo no es una copia de HarmonyJazz';
  if (typeof f.data !== 'object' || f.data === null || Array.isArray(f.data)) return 'La copia no tiene datos';
  const data: Record<string, unknown> = {};
  let total = 0;
  for (const [k, v] of Object.entries(f.data)) {
    if (!KEY_RE.test(k) || SKIP.has(k) || k === '__proto__') continue;
    const s = JSON.stringify(v);
    if (s === undefined || s.length > MAX_VALUE_CHARS) return `El dato "${k}" es demasiado grande`;
    total += s.length;
    if (total > MAX_TOTAL_CHARS) return 'La copia es demasiado grande';
    data[k] = v;
  }
  const audios = Array.isArray(f.audios) ? f.audios.filter((a): a is TrackMeta => !!a && typeof a === 'object' && typeof (a as TrackMeta).id === 'string').slice(0, 500) : [];
  return { app: 'harmonyjazz', version: 2, created: typeof f.created === 'string' ? f.created : '', data, audios };
}

/** Escribe los datos de la copia (reemplaza las claves que trae). Devuelve cuántas escribió. */
export function applyLocal(storage: WriteStorage, data: Record<string, unknown>): number {
  let n = 0;
  for (const [k, v] of Object.entries(data)) {
    storage.setItem(PREFIX + k, JSON.stringify(v));
    n++;
  }
  return n;
}

export interface Summary {
  tunes: number;
  phrases: number;
  mastered: number;
  audios: number;
}

export function summarize(data: Record<string, unknown>, audios: unknown[]): Summary {
  const len = (v: unknown, key: string) => {
    const a = (v as Record<string, unknown> | undefined)?.[key];
    return Array.isArray(a) ? a.length : 0;
  };
  const mastery = data.mastery;
  return {
    tunes: len(data.library, 'tunes'),
    phrases: len(data.phrases, 'phrases'),
    mastered: mastery && typeof mastery === 'object' ? Object.keys(mastery as object).length : 0,
    audios: audios.length,
  };
}

/** Días desde la última copia (null si nunca se hizo). */
export function daysSinceBackup(storage: Pick<Storage, 'getItem'>, now = Date.now()): number | null {
  try {
    const raw = storage.getItem(PREFIX + LAST_BACKUP);
    const t = raw ? Number(JSON.parse(raw)) : NaN;
    return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86_400_000)) : null;
  } catch {
    return null;
  }
}

export const markBackup = (storage: Pick<Storage, 'setItem'>, now = Date.now()) => storage.setItem(PREFIX + LAST_BACKUP, JSON.stringify(now));

/** ¿Hay algo que valga la pena respaldar? */
export function hasData(s: Summary) {
  return s.tunes + s.phrases + s.mastered + s.audios > 0;
}
