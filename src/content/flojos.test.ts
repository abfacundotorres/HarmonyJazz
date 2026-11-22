import { describe, expect, it } from 'vitest';
import { sanitizeFlojos } from '../state/sanitize';
import { docLayout } from './chartDoc';
import type { ChartDoc } from './chartDoc';
import { alternarFloja, flojosDentro, secciones, sonados, tramoSiguiente, tramosFlojos } from './flojos';

const doc = (bars: ChartDoc['bars']): ChartDoc => ({ bars });
const b = (c: string, extra: Partial<ChartDoc['bars'][number]> = {}) => ({ chords: [c], ...extra });

describe('flojos', () => {
  it('marca y desmarca un compás, siempre ordenado', () => {
    expect(alternarFloja(undefined, 4)).toEqual([4]);
    expect(alternarFloja([4], 1)).toEqual([1, 4]);
    expect(alternarFloja([1, 4], 4)).toEqual([1]);
  });

  it('junta los compases seguidos en tramos', () => {
    expect(tramosFlojos([2, 3, 4, 9])).toEqual([[2, 4], [9, 9]]);
    expect(tramosFlojos([5, 3, 4, 3])).toEqual([[3, 5]]);
    expect(tramosFlojos([])).toEqual([]);
  });

  it('descarta los que quedaron fuera si el tema se acortó', () => {
    expect(flojosDentro([1, 5, 9], 6)).toEqual([1, 5]);
  });

  it('recorre los tramos de a uno y da la vuelta', () => {
    const t: [number, number][] = [[1, 2], [6, 6]];
    expect(tramoSiguiente(t, null)).toEqual([1, 2]);
    expect(tramoSiguiente(t, [1, 2])).toEqual([6, 6]);
    expect(tramoSiguiente(t, [6, 6])).toEqual([1, 2]);
    expect(tramoSiguiente(t, [3, 3])).toEqual([1, 2]);
    expect(tramoSiguiente([], null)).toBeNull();
  });

  it('las secciones salen de la grilla, cada una hasta donde empieza la siguiente', () => {
    const l = docLayout(doc([b('C', { section: 'A' }), b('F'), b('G', { section: 'B' }), b('C'), b('F')]));
    expect(secciones(l)).toEqual([{ nombre: 'A', desde: 0, hasta: 1 }, { nombre: 'B', desde: 2, hasta: 4 }]);
  });

  it('con una sola sección o sin ellas no hay nada que ofrecer', () => {
    expect(secciones(docLayout(doc([b('C', { section: 'A' }), b('F')])))).toEqual([]);
    expect(secciones(docLayout(doc([b('C'), b('F')])))).toEqual([]);
    expect(secciones(null)).toEqual([]);
  });

  it('con repeticiones, un tramo se toca desde su primera aparición', () => {
    // 0 1 2 3 · 0 1 2 3 · 4 5 → A (0–3) suena dos veces; B (4–5) una
    const l = docLayout(doc([b('C', { section: 'A', repeatStart: true }), b('F'), b('G'), b('C', { repeatEnd: true }), b('Dm', { section: 'B' }), b('G')]));
    expect(l?.order).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 4, 5]);
    expect(sonados(0, 3, l?.order)).toEqual([0, 3]);
    expect(sonados(4, 5, l?.order)).toEqual([8, 9]);
    expect(sonados(9, 9, l?.order)).toBeNull();
    expect(sonados(2, 3)).toEqual([2, 3]);
  });
});

describe('sanitizeFlojos', () => {
  it('limpia lo dañado y conserva lo válido', () => {
    expect(sanitizeFlojos({ 'u:abcd': [3, 1, 1, 2.5, -1, 300, 'x'], malo: 'x', vacio: [] })).toEqual({ 'u:abcd': [1, 3] });
    expect(sanitizeFlojos(null)).toBeNull();
    expect(sanitizeFlojos([])).toBeNull();
  });
});
