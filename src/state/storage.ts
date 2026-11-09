import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'harmonyjazz:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: la app sigue funcionando sin persistencia */
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
}

export const DEFAULT_SETTINGS: Settings = { view: 'Bb', register: 'medio', swing: 0.64, minutes: 60, focusLesson: '' };

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
