import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { midi } from '../theory/notes';
import { buildMelody, melodyNotes, mergeMelody, sliceMelody } from './melody';

const CHART = 'Dm7 | G7 | Cmaj7 | Cmaj7';

describe('melodía de un tema propio', () => {
  it('valida y normaliza; en Si♭ baja un tono para pasar a concierto', () => {
    expect(buildMelody(CHART, 'D4 F4 A4 C5 | B4:2 G4:2', 'C')).toEqual({ line: 'D4 F4 A4 C5 B4:2 G4:2', bars: 1 });
    const bb = buildMelody(CHART, 'E4:2 G4:2', 'Bb') as { line: string };
    expect(bb.line).toBe('D4:2 F4:2');
  });
  it('rechaza lo vacío, lo ilegible, lo que se pasa del tema y las duraciones raras', () => {
    expect(buildMelody(CHART, 'r:4', 'C')).toMatch(/al menos una nota/);
    expect(buildMelody(CHART, 'H4', 'C')).toMatch(/^Notas:/);
    expect(buildMelody(CHART, 'D4:8 D4:8 D4:8 D4:8 D4:8', 'C')).toMatch(/ocupa 5 compases y el tema tiene 4/);
    expect(buildMelody(CHART, 'D4:40', 'C')).toMatch(/duraciones/);
    expect(buildMelody('Xx9', 'D4', 'C')).toMatch(/^Cifrado:/);
  });
  it('un 3/4 tiene compases de 6 corcheas', () => {
    const c = parseChart('@3/4 Dm7 | G7 | Cmaj7 | Cmaj7');
    expect(buildMelody(c, 'D4:6 E4:6 F4:6 G4:6', 'C')).toMatchObject({ bars: 4 });
    expect(buildMelody(c, 'D4:6 E4:6 F4:6 G4:6 A4:1', 'C')).toMatch(/ocupa 5 compases/);
  });
  it('transpone con el mismo intervalo que el cifrado', () => {
    const up = melodyNotes('C4 E4:2', { steps: 1, semis: 2 });
    expect(up.map((n) => n.pitch && midi(n.pitch))).toEqual([62, 66]);
    expect(melodyNotes('H9')).toEqual([]);
  });
  it('un tramo conserva lo que cae adentro, lo recorta en los bordes y cuenta desde su comienzo', () => {
    const notes = melodyNotes('C4:8 D4:8 E4:6 r:2 F4:8');
    // compases 1 a 2 (índices 1 y 2): del segundo compás al tercero
    const s = sliceMelody(notes, 1, 1, 8);
    expect(s.map((n) => [n.start, n.dur])).toEqual([[0, 8]]);
    const s2 = sliceMelody(notes, 1, 2, 8);
    expect(s2.map((n) => [n.start, n.dur, !!n.pitch])).toEqual([[0, 8, true], [8, 6, true], [14, 2, false]]);
    // una nota que cruza el borde se parte
    const largo = melodyNotes('C4:12 D4:4');
    expect(sliceMelody(largo, 1, 1, 8).map((n) => [n.start, n.dur])).toEqual([[0, 4], [4, 4]]);
  });
});

describe('poner un tramo transcripto dentro de la melodía', () => {
  const dur = (line: string) => melodyNotes(line).reduce((s, n) => s + n.dur, 0);
  it('en una melodía vacía rellena con silencios hasta donde empieza', () => {
    expect(mergeMelody(undefined, 'D4 F4:2', 8)).toEqual({ line: 'r:8 D4 F4:2', eighths: 11 });
    expect(mergeMelody('', 'D4', 0)).toEqual({ line: 'D4', eighths: 1 });
    expect(mergeMelody(undefined, 'D4', 40)!.line).toBe('r:32 r:8 D4'); // los silencios largos se parten en 32
  });
  it('reemplaza lo que había en ese tramo y conserva lo anterior y lo posterior', () => {
    const r = mergeMelody('C4:8 D4:8 E4:8', 'G4:4 A4:4', 8)!;
    expect(r.line).toBe('C4:8 G4:4 A4:4 E4:8');
    expect(r.eighths).toBe(24);
  });
  it('recorta las notas que cruzan el borde en vez de perderlas', () => {
    // una nota larga de 0 a 12; el tramo nuevo ocupa de 4 a 8: queda un pedazo antes (4) y otro después (4)
    const r = mergeMelody('C4:12', 'D4:2 E4:2', 4)!;
    expect(r.line).toBe('C4:4 D4:2 E4:2 C4:4');
    expect(dur(r.line)).toBe(12);
  });
  it('un tramo al final extiende la melodía; sin notas o posición negativa no hace nada', () => {
    expect(mergeMelody('C4:4', 'D4:4', 4)!.line).toBe('C4:4 D4:4');
    expect(mergeMelody('C4:4', 'r:4', 0)).toBeNull();
    expect(mergeMelody('C4:4', 'D4', -1)).toBeNull();
  });
  it('el resultado pasa por buildMelody si cabe en el tema', () => {
    const r = mergeMelody(undefined, 'D4:4 E4:4', 8)!;
    expect(buildMelody('Dm7 | G7 | Cmaj7 | Cmaj7', r.line, 'C')).toMatchObject({ bars: 2 });
  });
});
