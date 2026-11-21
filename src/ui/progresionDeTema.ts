import { tuneToProgression, validateTune } from '../content/library';
import { type Progression, PROGRESSIONS } from '../content/progressions';

/** El tema de repertorio como progresión (cifrado en concierto, tonalidad, tempo…): un tema propio o una forma incluida. null si ya no existe o está dañado. */
export function progresionDeTema(id: string, lib: { tunes?: unknown[] }): Progression | null {
  const own = (lib.tunes ?? []).find((t) => typeof t === 'object' && t !== null && (t as { id?: unknown }).id === id);
  if (own) {
    const v = validateTune(own);
    return typeof v === 'string' ? null : tuneToProgression(v);
  }
  return PROGRESSIONS.find((p) => p.id === id) ?? null;
}
