import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { CYCLE_OF_FOURTHS } from '../theory/chart';
import { midi, parseNote } from '../theory/notes';
import { HIGH, LOW, SHAPES, techniqueAbc, UNIT, writtenTonic } from './techniqueAbc';

describe('pentagramas de técnica en las 12 tonalidades', () => {
  for (const id of Object.keys(SHAPES)) {
    it(`${id}: dentro del registro, compases completos y ABC sin advertencias`, () => {
      for (const key of CYCLE_OF_FOURTHS) {
        const items = SHAPES[id](writtenTonic(key));
        expect(items.length, `${id} en ${key}`).toBeGreaterThan(4);
        const total = items.reduce((s, i) => s + i.dur, 0);
        expect(total % (UNIT[id] ?? 8), `${id} en ${key}: compases completos`).toBe(0);
        for (const it of items) {
          if (!it.p) continue;
          const m = midi(it.p);
          expect(m, `${id} en ${key}`).toBeGreaterThanOrEqual(LOW);
          expect(m, `${id} en ${key}`).toBeLessThanOrEqual(HIGH);
        }
        const [tune] = abcjs.parseOnly(techniqueAbc(id, key, 100));
        expect(tune.warnings ?? [], `${id} en ${key}`).toEqual([]);
      }
    });
  }

  it('empieza y termina en la tónica escrita (Si♭ concierto = C escrito)', () => {
    const t = writtenTonic('Bb');
    expect(t).toEqual(parseNote('C'));
    for (const id of ['thirds', 'intervals', 'blues', 'triads']) {
      const items = SHAPES[id](t);
      expect(midi(items[0].p!) % 12).toBe(0);
      const pitched = items.filter((i) => i.p);
      expect(midi(pitched[pitched.length - 1].p!) % 12).toBe(0);
    }
  });
});
