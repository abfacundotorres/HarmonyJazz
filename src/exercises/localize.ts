import { keyInterval } from '../theory/chart';
import { Interval, noteName, parseNote, simplify, transposeNote } from '../theory/notes';

const SUFFIX =
  '(?:maj7♯11|maj13|maj9|maj7|mMaj7|m7♭5|m7♭9|m11|m9|m7|m6|ø7|ø|°7|°|7alt|7♯11|7♭9♭13|7♭13|7♭9|7♯9|7♯5|7sus|13|9|6|7|m)?';
/** Una nota o un cifrado: letra A–G, alteración opcional y calidad opcional, aislado (no parte de una palabra). */
const TOKEN = new RegExp(`(?<![\\p{L}\\p{N}♭♯])([A-G])([♭♯]?)(${SUFFIX})(?![\\p{L}\\p{N}])`, 'gu');

/**
 * Traduce los nombres de notas y de acordes de un texto escrito en la tonalidad `fromKey` (concierto)
 * a la tonalidad `toKey`, y después a la lectura elegida (`reading`: Si♭ o concierto).
 * Así las explicaciones coinciden con la partitura y la tabla que se ven en pantalla.
 */
export function localizeNotes(text: string, fromKey: string, toKey: string, reading: Interval): string {
  const shift = keyInterval(fromKey, toKey);
  return text.replace(TOKEN, (_m, letter: string, acc: string, suffix: string) => {
    const n = simplify(transposeNote(transposeNote(parseNote(letter + acc), shift), reading));
    return noteName(n, true) + suffix;
  });
}
