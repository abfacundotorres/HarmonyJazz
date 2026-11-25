import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { noteName } from '../theory/notes';
import { lineaGuideTones, melodiaGuideTones, textoGrado, textoMovimiento } from './guideTones';

const linea = (s: string, orden?: number[]) => lineaGuideTones(parseChart(s), orden);

describe('línea de guide tones', () => {
  it('en un ii–V–I mayor la línea se mueve un solo semitono en total (C–B–B o F–F–E: las dos conducciones clásicas)', () => {
    const l = linea('Dm7 | G7 | Cmaj7');
    expect(l.map((p) => p.mov)).toHaveLength(3);
    expect(l.reduce((t, p) => t + Math.abs(p.mov ?? 0), 0)).toBe(1);
    const notas = l.map((p) => noteName(p.nota)).join('');
    expect(['CBB', 'FFE']).toContain(notas);
  });

  it('nunca se mueve más de lo necesario entre acordes seguidos (como mucho una cuarta aumentada)', () => {
    const l = linea('Cmaj7 | A7 | Dm7 | G7 | Em7 | A7 | Dm7 | G7 | Cmaj7');
    for (const p of l) expect(Math.abs(p.mov ?? 0)).toBeLessThanOrEqual(6);
  });

  it('los acordes repetidos seguidos cuentan una vez y los compases se traducen al orden escrito', () => {
    const l = linea('Dm7 | Dm7 | G7 | G7', [4, 5, 6, 7]);
    expect(l).toHaveLength(2);
    expect(l.map((p) => p.compas)).toEqual([5, 7]);
  });

  it('un acorde sin 3.ª (7sus) usa su nota guía propia', () => {
    const l = linea('G7sus | Cmaj7');
    expect(l[0].grado === '4' || l[0].grado === 'b7').toBe(true);
  });

  it('la melodía lleva una nota por acorde de la progresión, con su compás y su duración', () => {
    const c = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7');
    const m = melodiaGuideTones(c, lineaGuideTones(c));
    expect(m).toHaveLength(4); // el Cmaj7 repetido repite la nota en su compás
    expect(m.map((n) => n.start)).toEqual(c.chords.map((x) => x.start));
    expect(m.map((n) => n.dur)).toEqual(c.chords.map((x) => x.dur));
    expect(m[2].pitch && m[3].pitch && noteName(m[2].pitch)).toBe(m[3].pitch && noteName(m[3].pitch));
  });

  it('una progresión vacía no da nada y los textos se leen bien', () => {
    expect(lineaGuideTones({ bars: 0, chords: [] })).toEqual([]);
    expect(textoMovimiento(-1)).toBe('↓ 1 semitono');
    expect(textoMovimiento(2)).toBe('↑ 2 semitonos');
    expect(textoMovimiento(0)).toBe('= misma nota');
    expect(textoGrado('b7')).toBe('♭7.ª');
  });
});
