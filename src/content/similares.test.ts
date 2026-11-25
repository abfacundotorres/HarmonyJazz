import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { etiqueta, huella, masParecidos, parecido } from './similares';

const h = (s: string) => huella(parseChart(s));

describe('huella armónica', () => {
  it('no depende de la tonalidad', () => {
    expect(h('Dm7 | G7 | Cmaj7 | Cmaj7')).toEqual(h('Em7 | A7 | Dmaj7 | Dmaj7'));
    expect(h('Dm7 | G7 | Cmaj7')).toEqual(h('F#m7 | B7 | Emaj7'));
  });
  it('los acordes repetidos seguidos cuentan una vez, y 7 y 9 son la misma clase (dominante)', () => {
    expect(h('Dm7 | Dm7 | G7 | G7 | Cmaj7')).toEqual(h('Dm7 | G9 | Cmaj7'));
  });
  it('distingue mayor, menor, semidisminuido y dominante', () => {
    expect(h('Cmaj7 | Cm7 | Cm7b5 | C7').length).toBe(3); // tres cambios entre cuatro acordes
    expect(new Set(h('Cmaj7 | Cmaj7')).size).toBe(1);
    expect(h('Cmaj7 | Cm7')).not.toEqual(h('Cmaj7 | C7'));
  });
});

describe('parecido', () => {
  const IIVI = h('Dm7 | G7 | Cmaj7 | Cmaj7');
  it('misma armonía en otra tonalidad es 1; vacío es 0', () => {
    expect(parecido(IIVI, h('Gm7 | C7 | Fmaj7 | Fmaj7'))).toBeCloseTo(1, 5);
    expect(parecido(IIVI, [])).toBe(0);
  });
  it('un tema que contiene la frase pesa más que uno que no tiene nada que ver', () => {
    const conFrase = h('Fmaj7 | Bb7 | Dm7 | G7 | Cmaj7 | A7');
    const sinNada = h('Cm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7');
    expect(parecido(IIVI, conFrase)).toBeGreaterThan(parecido(IIVI, sinNada));
  });
  it('ordena de mayor a menor parecido, desempata por posición y respeta el máximo', () => {
    const cands = [
      { idx: 0, h: h('Cm7 | Fm7 | Bb7 | Ebmaj7') },
      { idx: 1, h: h('Gm7 | C7 | Fmaj7 | Fmaj7') },
      { idx: 2, h: h('Am7 | D7 | Gmaj7 | Gmaj7') },
      { idx: 3, h: h('C6 | A7 | Dm7 | G7') },
    ];
    const r = masParecidos(IIVI, cands, 3, 0);
    expect(r).toHaveLength(3);
    expect(r.slice(0, 2).map((x) => x.idx)).toEqual([1, 2]); // empatan en 1: gana la posición menor
    expect(r[0].puntaje).toBeGreaterThanOrEqual(r[1].puntaje);
    expect(r[1].puntaje).toBeGreaterThanOrEqual(r[2].puntaje);
  });
  it('no muestra los que casi no se parecen', () => {
    const lejano = { idx: 0, h: h('C7 | F7 | C7 | C7 | F7 | F7 | C7 | G7') }; // blues de dominantes: no tiene ningún ii–V–I
    expect(masParecidos(IIVI, [lejano, { idx: 1, h: h('Gm7 | C7 | Fmaj7 | Fmaj7') }]).map((x) => x.idx)).toEqual([1]);
  });
  it('las etiquetas', () => {
    expect(etiqueta(0.95)).toBe('casi igual');
    expect(etiqueta(0.75)).toBe('muy parecida');
    expect(etiqueta(0.55)).toBe('parecida');
    expect(etiqueta(0.2)).toBe('algo en común');
  });
});
