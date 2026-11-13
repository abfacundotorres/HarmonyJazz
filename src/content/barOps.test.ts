import { describe, expect, it } from 'vitest';
import { copyRange, pasteBars, range, removeRange, repeatRange } from './barOps';
import type { DocBar } from './chartDoc';
import { MAX_BARS } from '../theory/chart';

const b = (s: string, extra: Partial<DocBar> = {}): DocBar => ({ chords: s.split(' '), ...extra });
const txt = (bars: DocBar[]) => bars.map((x) => x.chords.join(' ')).join(' | ');
const G = [b('C', { section: 'A', repeatStart: true }), b('F'), b('G', { ending: 1 }), b('Am')];

describe('operaciones sobre rangos de compases', () => {
  it('normaliza el rango sin importar el orden y lo acota', () => {
    expect(range(G, 2, 1)).toEqual([1, 2]);
    expect(range(G, -3, 99)).toEqual([0, 3]);
  });

  it('copiar no arrastra secciones, repeticiones ni finales; con keepMarks sí', () => {
    expect(copyRange(G, 0, 2)).toEqual([b('C'), b('F'), b('G')]);
    expect(copyRange(G, 0, 0, true)[0]).toMatchObject({ section: 'A', repeatStart: true });
  });

  it('pegar inserta antes de la posición y no comparte objetos con el portapapeles', () => {
    const clip = copyRange(G, 1, 2);
    const r = pasteBars(G, 4, clip);
    expect(txt(r.bars)).toBe('C | F | G | Am | F | G');
    expect(r.added).toBe(2);
    r.bars[4].chords[0] = 'X';
    expect(clip[0].chords[0]).toBe('F');
  });

  it('pegar respeta el máximo de compases', () => {
    const full = Array.from({ length: MAX_BARS - 1 }, () => b('C'));
    expect(pasteBars(full, 0, [b('F'), b('G'), b('A')]).added).toBe(1);
  });

  it('borrar un rango deja un compás vacío si se borra todo', () => {
    expect(txt(removeRange(G, 1, 2))).toBe('C | Am');
    expect(removeRange(G, 0, 3)).toEqual([{ chords: [''] }]);
  });

  it('repetir duplica el rango justo después y admite varias veces', () => {
    expect(txt(repeatRange(G, 1, 2).bars)).toBe('C | F | G | F | G | Am');
    expect(txt(repeatRange(G, 1, 1, 2).bars)).toBe('C | F | F | F | G | Am');
  });
});
