import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY as EMPTY_CURRICULA, type Progress as CurriculaProgress } from '../content/curricula';
import type { Library } from '../content/library';
import type { Repertorio } from '../content/repertorio';
import { bumpSeen, dayNum, type Seen } from '../state/progress';
import { EMPTY_MONTH, type MonthPlan } from '../content/monthPlan';
import { temasDeRepertorio } from './repertorioTemas';
import { DEFAULT_SETTINGS, Mastery, PracticeLog, Settings, usePersistent } from '../state/storage';
import { BB_TRUMPET, INTERVAL, Interval, noteName, parseNote, simplify, transposeNote } from '../theory/notes';

export interface Route {
  path: string[];
  query: URLSearchParams;
}

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [p, q] = h.split('?');
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q ?? '') };
}

export function useRoute(): Route {
  const [r, setR] = useState(parseHash);
  useEffect(() => {
    const f = () => setR(parseHash());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}

export const navigate = (to: string) => {
  window.location.hash = to.replace(/^#/, '');
};

export const useSettings = () => usePersistent<Settings>('settings', DEFAULT_SETTINGS);
export const useLog = () => usePersistent<PracticeLog>('log', {});
export const useMastery = () => usePersistent<Mastery>('mastery', {});
export const useMonth = () => usePersistent<MonthPlan>('month', EMPTY_MONTH);
export const useCurricula = () => usePersistent<CurriculaProgress>('curricula', EMPTY_CURRICULA);
export const useRepertorio = () => usePersistent<Repertorio>('repertorio', {});
/** El tema que se está estudiando ahora (sólo su id). Vacío si no hay ninguno. */
export interface TemaEstudio {
  id?: string;
}
export const useTemaEstudio = () => usePersistent<TemaEstudio>('temaestudio', {});
export const useSeen = () => usePersistent<Seen>('seen', {});
/** Los temas del repertorio (id y nombre): los propios y la forma del mes. Sirve para dar nombre a lo que se repasa. */
export function useTemasDeRepertorio() {
  const [lib] = usePersistentLibrary();
  const [mp] = useMonth();
  const today = useMemo(() => new Date(), []);
  return useMemo(() => temasDeRepertorio(lib, mp, today).temas, [lib, mp, today]);
}

export const usePersistentLibrary = () => usePersistent<Library>('library', { tunes: [] });

/** Transposición de lectura según la vista elegida. */
export function useReading(): { iv: Interval; view: Settings['view']; keyLabel: (concert: string) => string } {
  const [s] = useSettings();
  return useMemo(() => {
    const iv = s.view === 'Bb' ? BB_TRUMPET : INTERVAL.P1;
    return {
      iv,
      view: s.view,
      keyLabel: (k: string) => noteName(simplify(transposeNote(parseNote(k), iv)), true),
    };
  }, [s.view]);
}

/** Marca un ejercicio como "salió limpio" en una tonalidad: guarda el mejor tempo y la fecha, para el repaso espaciado. */
export function useMark() {
  const [, setMastery] = useMastery();
  const [, setSeen] = useSeen();
  return useCallback(
    (id: string, key: string, bpm: number) => {
      setMastery((m) => ({ ...m, [id]: { ...(m[id] ?? {}), [key]: Math.max(bpm, m[id]?.[key] ?? 0) } }));
      setSeen((s) => bumpSeen(s, id, key, dayNum()));
    },
    [setMastery, setSeen],
  );
}
