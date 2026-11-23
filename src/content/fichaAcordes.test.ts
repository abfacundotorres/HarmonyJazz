import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { fichaAcordes, textoCompases } from './fichaAcordes';

describe('fichaAcordes', () => {
  it('lista cada acorde distinto una vez, en orden de aparición, con sus compases', () => {
    const f = fichaAcordes(parseChart('Dm7 | G7 | Cmaj7 | Dm7'));
    expect(f.map((x) => x.compases)).toEqual([[1, 4], [2], [3]]);
  });
  it('traduce al compás escrito con el orden de las repeticiones', () => {
    const f = fichaAcordes(parseChart('Dm7 | G7 | Dm7 | G7'), [0, 1, 0, 1]);
    expect(f.map((x) => x.compases)).toEqual([[1], [2]]);
  });
  it('dice los compases en texto', () => {
    expect(textoCompases([3])).toBe('compás 3');
    expect(textoCompases([1, 4, 7])).toBe('compases 1, 4 y 7');
  });
});
