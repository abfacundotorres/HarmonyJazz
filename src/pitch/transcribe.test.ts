import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { pitchName } from '../theory/notes';
import { analyzeSolo, spellInContext, transcribe } from './transcribe';
import { parseChord } from '../theory/chords';

const chart = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7');

describe('transcripción', () => {
  it('escribe según el acorde', () => {
    expect(pitchName(spellInContext(68, parseChord('G7alt')))).toBe('Ab4'); // b9
    expect(pitchName(spellInContext(70, parseChord('G7alt')))).toBe('A#4'); // #9
    expect(pitchName(spellInContext(66, parseChord('D7')))).toBe('F#4');
  });

  it('arma notas con duración hasta la siguiente o hasta el fin', () => {
    const t = transcribe(
      [
        { chorus: 0, eighth: 0, midi: 65 },
        { chorus: 0, eighth: 3, midi: 64 },
        { chorus: 0, eighth: 4, midi: null },
        { chorus: 0, eighth: 8, midi: 71 },
        { chorus: 0, eighth: 8, midi: 72 }, // mismo ataque: queda el último
        { chorus: 0, eighth: 10, midi: null },
      ],
      chart,
    );
    expect(t).toHaveLength(1);
    expect(t[0].notes.map((n) => [n.start, n.dur, pitchName(n.pitch!)])).toEqual([
      [0, 3, 'F4'],
      [3, 1, 'E4'],
      [8, 2, 'C5'],
    ]);
  });

  it('corta notas que cruzan el final del chorus', () => {
    const t = transcribe(
      [
        { chorus: 0, eighth: 30, midi: 64 },
        { chorus: 1, eighth: 2, midi: null },
      ],
      chart,
    );
    expect(t.map((c) => c.chorus)).toEqual([0, 1]);
    expect(t[0].notes[0].dur).toBe(2);
    expect(t[1].notes[0]).toMatchObject({ start: 0, dur: 2 });
  });

  it('analiza llegadas a guide tones', () => {
    // F (3ª de Dm7), B (3ª de G7), E (3ª de C), C (raíz)
    const t = transcribe(
      [
        { chorus: 0, eighth: 0, midi: 65 },
        { chorus: 0, eighth: 1, midi: 69 },
        { chorus: 0, eighth: 2, midi: null },
        { chorus: 0, eighth: 8, midi: 71 },
        { chorus: 0, eighth: 9, midi: 74 },
        { chorus: 0, eighth: 10, midi: 77 },
        { chorus: 0, eighth: 16, midi: 64 },
        { chorus: 0, eighth: 17, midi: 67 },
        { chorus: 0, eighth: 24, midi: 60 },
        { chorus: 0, eighth: 26, midi: null },
      ],
      chart,
    );
    const a = analyzeSolo(t[0].notes, chart);
    expect(a.changesPlayed).toBe(4);
    expect(a.guideLandings).toBe(75);
    expect(a.notes).toBe(8);
  });
});
