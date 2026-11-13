import { useCallback, useEffect, useState } from 'react';
import { sanitizeKey } from './sanitize';

const PREFIX = 'harmonyjazz:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    // lo guardado se valida: datos dañados o de otra versión no deben romper la app
    const clean = sanitizeKey(key, JSON.parse(raw));
    return clean && typeof clean === 'object' && !Array.isArray(clean) ? { ...fallback, ...(clean as object) } : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o bloqueado: la app sigue funcionando, pero se avisa que lo último no quedó guardado
    window.dispatchEvent(new Event('hj-save-failed'));
  }
}

const subs = new Map<string, Set<() => void>>();

/** Estado persistido en localStorage y compartido entre componentes. */
export function usePersistent<T extends object>(key: string, fallback: T): [T, (u: Partial<T> | ((t: T) => T)) => void] {
  const [v, setV] = useState<T>(() => load(key, fallback));
  useEffect(() => {
    const f = () => setV(load(key, fallback));
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key)!.add(f);
    return () => {
      subs.get(key)!.delete(f);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = useCallback(
    (u: Partial<T> | ((t: T) => T)) => {
      const cur = load(key, fallback);
      const next = typeof u === 'function' ? (u as (t: T) => T)(cur) : { ...cur, ...u };
      save(key, next);
      subs.get(key)?.forEach((f) => f());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [v, update];
}

// ---------- modelos ----------

export type View = 'Bb' | 'C';
export type Register = 'grave' | 'medio' | 'agudo';

export interface Settings {
  view: View;
  register: Register;
  swing: number;
  minutes: number;
  focusLesson: string;
  /** Volumen general en dB respecto del nivel base (−14…+2). */
  volume: number;
  /** Salida: 'auto' = altavoz del celular si la pantalla es táctil. */
  output: 'auto' | 'phone' | 'normal';
  /** Cifrado en la grilla: estilo iReal Pro (Δ7, -7, ø7) o completo (maj7, m7, m7♭5). */
  chordStyle: 'ireal' | 'full';
}

export const DEFAULT_SETTINGS: Settings = { view: 'Bb', register: 'medio', swing: 0.64, minutes: 60, focusLesson: '', volume: 0, output: 'auto', chordStyle: 'ireal' };

/** Rango escrito para trompeta (MIDI) según el registro elegido. */
export const WRITTEN_RANGE: Record<Register, [number, number]> = {
  grave: [54, 74], // F#3 – D5
  medio: [57, 79], // A3 – G5
  agudo: [62, 84], // D4 – C6
};

export function concertRange(r: Register) {
  const [lo, hi] = WRITTEN_RANGE[r];
  return { low: lo - 2, high: hi - 2 };
}

export interface DayLog {
  done: string[];
  minutes: number;
}
export type PracticeLog = Record<string, DayLog>;

/** Mejor tempo logrado por ejercicio y tonalidad. clave: "lesson:idx" → { C: 140, F: 120 } */
export type Mastery = Record<string, Record<string, number>>;

export function streak(log: PracticeLog, today: Date): number {
  let s = 0;
  const d = new Date(today);
  // si hoy todavía no practicó, la racha cuenta desde ayer
  const key = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!log[key(d)]?.done.length) d.setDate(d.getDate() - 1);
  while (log[key(d)]?.done.length) {
    s++;
    d.setDate(d.getDate() - 1);
  }
  return s;
}
