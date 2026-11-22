/**
 * Traducción de los símbolos de acorde de una colección en JSON (estilo iReal Pro) a los que entiende el motor de la app. Funciones
 * puras. Lo que no tiene equivalente exacto se aproxima y se avisa (por ejemplo «aug» pasa a 7♯5).
 */
import { parseChord } from '../theory/chords';

export interface AcordeTraducido {
  /** Símbolo que entiende `parseChord`. */
  sym: string;
  /** Si hubo que aproximar o descartar algo, qué se hizo. */
  nota?: string;
}

/** Sufijos de la colección → el que entiende la app, con la explicación si es una aproximación. */
const SUFIJOS: [RegExp, string, string?][] = [
  [/^(07|o7|°7)$/, 'dim7'],
  [/^(0|o|°)$/, 'dim7', 'disminuido (tríada) → °7'],
  [/^(h7|h)$/, 'm7b5'],
  [/^(m\/maj7|m\/M7|mM7|m\(maj7\)|m\^7)$/, 'mMaj7'],
  [/^(aug|\+|aug7|\+7|7aug)$/, '7#5', 'aumentado → 7♯5'],
  [/^m(aug|\+)$/, 'm7', 'm aumentado → m7'],
  [/^(mb6|m\(b6\)|-b6)$/, 'm', 'm♭6 → m'],
  [/^(7b9sus4?|7sus4?b9|7b13sus4?|7sus4?b13|7#11sus4?|9b9sus4?)$/, '7sus', '7sus con alteraciones → 7sus'],
  [/^(7b5b9|7b5#9|7#5b9|7b9b5|7#9b5|7b5b13|7#9#11|7b9#9)$/, '7alt', 'dominante alterado → 7alt'],
  [/^(7b5|9b5|13b5)$/, '7#11', '7♭5 → 7♯11'],
  [/^(13#9|13b9#9|9#9)$/, '7alt', 'dominante alterado → 7alt'],
  [/^(maj7#5|maj7\+)$/, 'maj7', 'maj7♯5 → maj7'],
  [/^(add9|add2|2)$/, '', 'add9 → tríada'],
  [/^(sus|sus4|sus2)$/, '7sus', 'sus → 7sus'],
  [/^m(add9|add2)$/, 'm', 'm(add9) → m'],
];

function probar(sym: string): boolean {
  try {
    parseChord(sym);
    return true;
  } catch {
    return false;
  }
}

/**
 * Traduce un acorde. Devuelve null si está vacío o no se pudo entender. Los acordes entre paréntesis (alternativos) se leen como acorde
 * normal si son el compás entero, y el alternativo que acompaña a otro («C7(Gm7)») se descarta.
 */
export function traducirAcorde(raw: string): AcordeTraducido | null {
  let s = raw.trim();
  if (!s) return null;
  const notas: string[] = [];
  const entero = /^\((.*)\)$/.exec(s);
  if (entero) {
    s = entero[1].trim();
    notas.push('acorde alternativo (entre paréntesis) → acorde común');
  } else if (/\(/.test(s)) {
    s = s.replace(/\([^)]*\)/g, '').trim();
    notas.push('se omitió el acorde alternativo entre paréntesis');
  }
  if (!s) return null;
  // «Cm/maj7» es menor con séptima mayor, no un bajo: la barra se parte distinto
  s = s.replace(/m\/(maj7|M7)/, 'mMaj7');
  const m = /^([A-G](?:bb|b|##|#)?)([^/]*)(?:\/([A-G](?:bb|b|##|#)?))?$/.exec(s);
  if (!m) return null;
  const [, raiz, sufijo, bajo] = m;
  const con = (suf: string) => `${raiz}${suf}${bajo ? '/' + bajo : ''}`;
  if (probar(con(sufijo))) return { sym: con(sufijo), ...(notas.length ? { nota: notas.join('; ') } : {}) };
  for (const [re, suf, nota] of SUFIJOS) {
    if (re.test(sufijo) && probar(con(suf))) {
      if (nota) notas.push(nota);
      return { sym: con(suf), ...(notas.length ? { nota: notas.join('; ') } : {}) };
    }
  }
  // último recurso: sin el bajo (que a veces no es una nota válida) y con la calidad más cercana por el comienzo
  for (const suf of ['7', 'maj7', 'm7', 'm']) {
    if (sufijo.startsWith(suf) && probar(`${raiz}${suf}`)) {
      notas.push(`«${sufijo}» no se entiende → ${suf}`);
      return { sym: `${raiz}${suf}`, nota: notas.join('; ') };
    }
  }
  return null;
}
