import { useEffect, useState } from 'react';
import { engine, Position } from '../audio/engine';

/** Posición del play-along (compás, acorde, tiempo) mientras suena. */
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
