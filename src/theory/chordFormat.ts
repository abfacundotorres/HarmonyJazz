import { Chord } from './chords';
import { noteName, prettyAcc } from './notes';

/** Un cifrado partido para dibujarlo: raíz, calidad (en línea), alteraciones (en superíndice) y bajo. */
export interface ChordParts {
  root: string;
  main: string;
  sup: string;
  bass: string;
}

const MAJ = '(?:maj|Maj|ma|M|Δ|\\^)';
const clean = (s: string) => prettyAcc(s.replace(/[()]/g, '').replace(/^\+/, '♯5'));

/**
 * Parte el sufijo escrito en el estilo de iReal Pro: Δ7, -7, ø7, °7, 7 con las alteraciones y suspensiones
 * pequeñas y arriba (7♭9, 7♯11, 7alt, 7sus). Sólo cambia cómo se ve; el significado musical no se toca.
 */
export function suffixParts(suffix: string): { main: string; sup: string } {
  const s = suffix;
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^${MAJ}(\\d*)(.*)$`).exec(s))) return m[1] ? { main: `Δ${m[1]}`, sup: clean(m[2]) } : { main: '', sup: clean(m[2]) };
  if ((m = new RegExp(`^(?:min|mi|m|-)\\(?${MAJ}(\\d*)\\)?(.*)$`).exec(s))) return { main: `-Δ${m[1] || '7'}`, sup: clean(m[2]) };
  if ((m = /^(?:min|mi|m|-)(\d*)b5(.*)$/.exec(s)) || (m = /^ø(\d*)(.*)$/.exec(s))) return { main: `ø${m[1] || '7'}`, sup: clean(m[2]) };
  if ((m = /^(?:min|mi|m|-)(\d*)(.*)$/.exec(s))) return { main: `-${m[1]}`, sup: clean(m[2]) };
  if ((m = /^(?:dim|o|°)(\d*)(.*)$/.exec(s))) return { main: `°${m[1] || '7'}`, sup: clean(m[2]) };
  if ((m = /^(?:7\+|aug7|\+7)$/.exec(s))) return { main: '7', sup: '♯5' };
  if ((m = /^(\d*)(sus4?)(.*)$/.exec(s))) return { main: m[1], sup: 'sus' + clean(m[3]) };
  if ((m = /^alt(.*)$/.exec(s))) return { main: '7', sup: 'alt' };
  if ((m = /^(\d+)(.*)$/.exec(s))) return { main: m[1], sup: clean(m[2]) };
  return { main: '', sup: clean(s) };
}

export function chordParts(c: Chord): ChordParts {
  const { main, sup } = suffixParts(c.suffix);
  return { root: prettyAcc(noteName(c.root)), main, sup, bass: c.bass ? prettyAcc(noteName(c.bass)) : '' };
}

/** Texto plano equivalente (para lectores de pantalla y pruebas). */
export const partsText = (p: ChordParts) => p.root + p.main + p.sup + (p.bass ? '/' + p.bass : '');
