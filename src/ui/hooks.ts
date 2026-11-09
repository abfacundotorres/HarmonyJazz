import { useEffect, useMemo, useState } from 'react';
import { engine, Position } from '../audio/engine';
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

export function usePosition(): Position | null {
  const [p, setP] = useState<Position | null>(null);
  useEffect(() => {
    const off = engine.onPosition(setP);
    return () => {
      off();
    };
  }, []);
  return p;
}
