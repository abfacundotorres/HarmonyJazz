/**
 * Tablas de teoría que citan los focos y que los tests comprueban contra el motor de acordes. Viven aparte para que
 * `focus.ts` y `focusShapes.ts` las compartan sin importarse el uno al otro.
 */
import { analyzePc, parseChord, prettyDegree } from '../theory/chords';
import { mod, parseNote, pc } from '../theory/notes';

/** Qué tríadas mayores contiene cada acorde y qué grados son (se verifica con un test contra la teoría). */
export const TRIAD_FACTS: { chord: string; triads: { root: string; degrees: string }[] }[] = [
  { chord: 'Cmaj7', triads: [{ root: 'C', degrees: '1-3-5' }, { root: 'G', degrees: '5-7-9' }] },
  { chord: 'Dm7', triads: [{ root: 'F', degrees: '♭3-5-♭7' }, { root: 'C', degrees: '♭7-9-11' }] },
  { chord: 'G7', triads: [{ root: 'G', degrees: '1-3-5' }, { root: 'F', degrees: '♭7-9-11' }] },
];

/** Grados (como se muestran) de la tríada mayor de raíz `root` sobre el acorde `chord`. */
export function triadDegrees(chord: string, root: string): string {
  const c = parseChord(chord);
  const r = pc(parseNote(root));
  return [0, 4, 7].map((i) => prettyDegree(analyzePc(c, mod(r + i, 12)).degree)).join('-');
}

