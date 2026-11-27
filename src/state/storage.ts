import { useCallback, useEffect, useState } from 'react';
import type { ThemeId } from '../ui/themes';
import { defaultMixer, type Mixer } from '../audio/mixer';
import { sanitizeKey } from './sanitize';
import { VOLUME } from './volume';

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
  focusLesson: string;
  /** Volumen general en dB respecto del nivel base (−14…+2). */
  volume: number;
  /** Volumen y ecualizador de cada instrumento y de la mezcla general. */
  mixer: Mixer;
  /** Salida: 'auto' = altavoz del celular si la pantalla es táctil. */
  output: 'auto' | 'phone' | 'normal';
  /** Cifrado en la grilla: estilo iReal Pro (Δ7, -7, ø7) o completo (maj7, m7, m7♭5). */
  chordStyle: 'ireal' | 'full';
  /** Tema visual ('auto' = claro u oscuro según el celular). */
  theme: ThemeId;
  /** Afinación del La (Hz): 440 o 442, para el afinador y el bordón. */
  a4: number;
  /** Mantener la pantalla encendida mientras la app esté abierta (además de cuando suena algo). */
  keepAwake: boolean;
  /** Al dar play en el Play-along, abrir el modo atril solo. */
  autoAtril: boolean;
}

export const DEFAULT_SETTINGS: Settings = { view: 'Bb', register: 'medio', swing: 0.64, focusLesson: '', volume: VOLUME.default, mixer: defaultMixer(), output: 'auto', chordStyle: 'ireal', theme: 'auto', a4: 440, keepAwake: false, autoAtril: true };

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
