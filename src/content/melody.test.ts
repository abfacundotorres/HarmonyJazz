import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { midi } from '../theory/notes';
import { buildMelody, melodyNotes, sliceMelody } from './melody';

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
