import { describe, expect, it } from 'vitest';
import { parseChord } from '../theory/chords';
import { compileDoc, ChartDoc, DocBar, docFromChart, docLayout, playedBars, QUALITY_BUTTONS, ROOTS, sanitizeDoc, unroll } from './chartDoc';

const b = (sym: string, extra: Partial<DocBar> = {}): DocBar => ({ chords: sym.split(' '), ...extra });
const names = (bars: DocBar[]) => bars.map((x) => x.chords.join(' ')).join(' | ');

describe('unroll', () => {
  it('sin marcas devuelve los compases tal cual', () => {
    expect(names(unroll([b('C'), b('F'), b('G')]))).toBe('C | F | G');
  });

  it('repite desde repeatStart hasta repeatEnd', () => {
    const bars = [b('C'), b('F', { repeatStart: true }), b('G', { repeatEnd: true }), b('Am')];
    expect(names(unroll(bars))).toBe('C | F | G | F | G | Am');
  });

  it('sin repeatStart vuelve al comienzo de la pieza', () => {
    expect(names(unroll([b('C'), b('F', { repeatEnd: true }), b('G')]))).toBe('C | F | C | F | G');
  });

  it('primer y segundo final: 1.ª vuelta toca el final 1, 2.ª salta al final 2', () => {
    const bars = [
      b('C', { repeatStart: true }),
      b('F'),
      b('G', { ending: 1 }),
      b('Am', { ending: 1 }),
      b('Dm', { ending: 2 }),
      b('C', { ending: 2 }),
      b('E7'),
    ];
    expect(names(unroll(bars))).toBe('C | F | G | Am | C | F | Dm | C | E7');
  });

  it('dos repeticiones seguidas sin repeatStart no se mezclan', () => {
    const bars = [b('C'), b('F', { repeatEnd: true }), b('G'), b('Am', { repeatEnd: true })];
    expect(names(unroll(bars))).toBe('C | F | C | F | G | Am | G | Am');
  });

  it('estructura típica AABA con finales', () => {
    const bars = [
      b('Dm7', { section: 'A', repeatStart: true }),
      b('G7'),
      b('Cmaj7', { ending: 1 }),
      b('A7', { ending: 1 }),
      b('Cmaj7', { ending: 2 }),
      b('Cmaj7', { section: 'B' }),
    ];
    expect(names(unroll(bars))).toBe('Dm7 | G7 | Cmaj7 | A7 | Dm7 | G7 | Cmaj7 | Cmaj7');
  });

  it('termina aunque las marcas sean absurdas', () => {
    const bars = [b('C', { repeatEnd: true, ending: 2 }), b('F', { repeatEnd: true, repeatStart: true })];
    expect(unroll(bars).length).toBeLessThan(20);
  });
});

describe('compileDoc', () => {
  it('resuelve % con el compás anterior en el orden escrito', () => {
    const doc: ChartDoc = { bars: [b('Cm7 F7'), b('%'), b('Bbmaj7')] };
    expect(compileDoc(doc)).toBe('Cm7 F7 | Cm7 F7 | Bbmaj7');
  });

  it('% también funciona dentro de una repetición', () => {
    const doc: ChartDoc = { bars: [b('C', { repeatStart: true }), b('%', { repeatEnd: true })] };
    expect(compileDoc(doc)).toBe('C | C | C | C');
  });

  it('informa el compás con el error', () => {
    expect(() => compileDoc({ bars: [b('C'), b('Xyz')] })).toThrow(/Compás 2/);
    expect(() => compileDoc({ bars: [b('%')] })).toThrow(/Compás 1/);
    expect(() => compileDoc({ bars: [b('C'), { chords: [''] }] })).toThrow(/vacío/);
    expect(() => compileDoc({ bars: [b('C D E F G')] })).toThrow(/1 y 4/);
  });

  it('el final 2 exige un final 1', () => {
    expect(() => compileDoc({ bars: [b('C'), b('F', { ending: 2 })] })).toThrow(/final 1/);
  });

  it('el resultado es un cifrado que el play-along entiende y cuenta compases', () => {
    const doc: ChartDoc = { bars: [b('Dm7', { repeatStart: true }), b('G7', { repeatEnd: true }), b('Cmaj7')] };
    expect(playedBars(doc)).toBe(5);
    expect(playedBars({ bars: [b('Q')] })).toBeNull();
  });

  it('no deja pasar más de 256 compases desplegados', () => {
    const bars = Array.from({ length: 200 }, () => b('C'));
    bars[0].repeatStart = true;
    bars[199].repeatEnd = true;
    expect(() => compileDoc({ bars })).toThrow(/Demasiados/);
  });
});

describe('docFromChart y sanitizeDoc', () => {
  it('convierte texto a compases', () => {
    expect(docFromChart('| Cm7 | F7 Bb7 | % |').bars.map((x) => x.chords)).toEqual([['Cm7'], ['F7', 'Bb7'], ['%']]);
    expect(docFromChart('').bars).toHaveLength(1);
  });

  it('limpia datos desconocidos', () => {
    expect(typeof sanitizeDoc(null)).toBe('string');
    expect(typeof sanitizeDoc({ bars: [{ chords: [] }] })).toBe('string');
    const r = sanitizeDoc({ bars: [{ chords: ['C'], section: 'A', ending: 3, repeatStart: 'sí', x: 1 }] });
    expect(r).toEqual({ bars: [{ chords: ['C'], section: 'A' }] });
  });
});

describe('paleta', () => {
  it('todas las combinaciones raíz + calidad son acordes válidos', () => {
    for (const r of ROOTS) for (const [, suf] of QUALITY_BUTTONS) expect(() => parseChord(r + suf)).not.toThrow();
  });
});

describe('docLayout', () => {
  it('indica de qué compás escrito sale cada compás que se toca', () => {
    const bars = [b('C', { repeatStart: true }), b('F', { ending: 1 }), b('G', { ending: 1, repeatEnd: true }), b('Am', { ending: 2 })];
    const l = docLayout({ bars });
    expect(l?.order).toEqual([0, 1, 2, 0, 3]);
    expect(l?.bars).toHaveLength(4);
  });
  it('sin repeticiones el orden es el escrito, y un documento inválido da null', () => {
    expect(docLayout({ bars: [b('C'), b('F')] })?.order).toEqual([0, 1]);
    expect(docLayout({ bars: [b('Xx')] })).toBeNull();
  });
});
