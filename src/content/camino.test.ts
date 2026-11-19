import { describe, expect, it } from 'vitest';
import { FOCI } from './focus';
import { missingBefore, nextFocus, PATH, STAGE_TITLES, stagesOf, stepOf } from './camino';

describe('camino sugerido', () => {
  it('cada foco del catálogo está en el camino exactamente una vez, y sólo ellos', () => {
    const ids = PATH.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(FOCI.map((f) => f.id).sort());
  });

  it('lo que conviene tener antes existe, es del mismo área, está en una etapa anterior o igual y va antes en la lista', () => {
    const area = new Map(FOCI.map((f) => [f.id, f.area]));
    PATH.forEach((s, i) => {
      for (const a of s.after) {
        expect(stepOf(a), `${s.id} pide ${a}`).toBeDefined();
        expect(area.get(a), `${s.id} pide ${a}`).toBe(area.get(s.id));
        expect(stepOf(a)!.stage, `${s.id} pide ${a}`).toBeLessThanOrEqual(s.stage);
        expect(PATH.findIndex((x) => x.id === a), `${a} va antes que ${s.id}`).toBeLessThan(i);
      }
      expect(s.why.length).toBeGreaterThan(20);
    });
  });

  it('las etapas existen y no quedan vacías', () => {
    for (const area of ['tecnica', 'lenguaje'] as const) {
      const g = stagesOf(area);
      expect(g.length).toBe(STAGE_TITLES[area].length);
      expect(g.every((x) => x.steps.length > 0)).toBe(true);
    }
    expect(PATH.every((s) => s.stage >= 1 && s.stage <= 6)).toBe(true);
  });

  it('las tríadas van antes que las escalas bebop, y los guide tones antes que la sustitución tritonal y Coltrane', () => {
    const before = (a: string, b: string) => expect(PATH.findIndex((s) => s.id === a)).toBeLessThan(PATH.findIndex((s) => s.id === b));
    before('l-triadas-mayores', 'l-escalas-bebop');
    before('l-guide-tones', 'l-sustitucion-tritonal');
    before('l-sustitucion-tritonal', 'l-cambios-coltrane');
    before('t-largas-artic', 't-registro-resistencia');
    // la base también está en la cadena de requisitos de bebop
    const chain = (id: string, seen = new Set<string>()): Set<string> => {
      for (const a of stepOf(id)!.after) if (!seen.has(a)) { seen.add(a); chain(a, seen); }
      return seen;
    };
    expect(chain('l-escalas-bebop').has('l-triadas-mayores')).toBe(true);
    expect(chain('l-cambios-coltrane').has('l-triadas-mayores')).toBe(true);
  });

  it('sin nada trabajado propone la base; al avanzar propone el siguiente con su base lista', () => {
    expect(nextFocus('lenguaje', new Set())).toBe('l-triadas-mayores');
    expect(nextFocus('tecnica', new Set())).toBe('t-largas-artic');
    expect(nextFocus('lenguaje', new Set(['l-triadas-mayores']))).toBe('l-swing-articulacion');
    const done = new Set(['l-triadas-mayores', 'l-swing-articulacion', 'l-triadas-menores']);
    expect(nextFocus('lenguaje', done)).toBe('l-triadas-mayor-menor');
    expect(missingBefore('l-escalas-bebop', done).length).toBeGreaterThan(0);
    expect(missingBefore('l-triadas-mayores', new Set())).toEqual([]);
  });

  it('con todo trabajado no hay próximo; con un hueco propone el que falta aunque su base no esté', () => {
    expect(nextFocus('lenguaje', new Set(PATH.map((s) => s.id)))).toBeNull();
    const todo = new Set(PATH.map((s) => s.id));
    todo.delete('l-escalas-bebop');
    expect(nextFocus('lenguaje', todo)).toBe('l-escalas-bebop');
  });
});
