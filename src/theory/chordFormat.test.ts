import { describe, expect, it } from 'vitest';
import { chordParts, partsText } from './chordFormat';
import { parseChord } from './chords';

const f = (s: string) => chordParts(parseChord(s));

describe('cifrado estilo iReal', () => {
  it.each([
    ['Cmaj7', 'CΔ7'], ['CM7', 'CΔ7'], ['C^7', 'CΔ7'], ['Cmaj9', 'CΔ9'], ['C', 'C'], ['C6', 'C6'],
    ['Dm7', 'D-7'], ['Dmin7', 'D-7'], ['D-7', 'D-7'], ['Dm', 'D-'], ['Dm9', 'D-9'], ['Dm6', 'D-6'],
    ['DmMaj7', 'D-Δ7'], ['Dm(maj7)', 'D-Δ7'],
    ['Em7b5', 'Eø7'], ['Eø', 'Eø7'], ['Edim7', 'E°7'], ['Edim', 'E°7'],
    ['G7', 'G7'], ['G9', 'G9'], ['G13', 'G13'], ['G7b9', 'G7♭9'], ['G7#11', 'G7♯11'], ['G7alt', 'G7alt'], ['Galt', 'G7alt'],
    ['G7b13', 'G7♭13'], ['G7sus', 'G7sus'], ['G7sus4', 'G7sus'], ['G7#5', 'G7♯5'], ['G+7', 'G7♯5'],
    ['B♭m7'.replace('♭', 'b'), 'B♭-7'], ['F#m7b5', 'F♯ø7'], ['Cmaj7/E', 'CΔ7/E'], ['Bb7/Ab', 'B♭7/A♭'],
  ])('%s se ve como %s', (src, shown) => expect(partsText(f(src))).toBe(shown));

  it('separa en superíndice las alteraciones', () => {
    expect(f('G7b9')).toMatchObject({ main: '7', sup: '♭9' });
    expect(f('Cmaj7#11')).toMatchObject({ main: 'Δ7', sup: '♯11' });
    expect(f('Dm7')).toMatchObject({ main: '-7', sup: '' });
  });
});
