import { describe, expect, it } from 'vitest';
import { GENERATORS } from '../exercises/generators';
import { localizeNotes } from '../exercises/localize';
import { LESSONS } from './lessons';
import { COMMON_METHOD, GUIDES } from './exerciseGuides';

describe('guías de práctica de las lecciones', () => {
  it('hay una guía completa para cada generador usado en las lecciones', () => {
    const used = new Set(LESSONS.flatMap((l) => l.exercises.map((e) => e.generator!)));
    for (const id of used) expect(GUIDES[id], `falta la guía de ${id}`).toBeTruthy();
    for (const g of GENERATORS) expect(GUIDES[g.id], `falta la guía de ${g.id}`).toBeTruthy();
  });

  it.each(Object.entries(GUIDES))('%s tiene foco, pasos, qué escuchar y consejos', (_id, g) => {
    expect(g.focus.length).toBeGreaterThan(40);
    expect(g.steps.length).toBeGreaterThanOrEqual(3);
    expect(g.listen.length).toBeGreaterThan(30);
    expect(g.trumpet.length).toBeGreaterThanOrEqual(2);
  });

  it('el método común tiene cinco pasos', () => {
    expect(COMMON_METHOD).toHaveLength(5);
  });
});

describe('los textos de las guías no se confunden con notas al traducirlos', () => {
  it('sólo se traducen los ejemplos de acordes que están escritos a propósito', () => {
    const iv = { steps: 1, semis: 2 };
    const changed = new Set<string>();
    for (const g of Object.values(GUIDES)) {
      for (const s of [g.focus, ...g.steps, g.listen, ...g.trumpet]) {
        const out = localizeNotes(s, 'C', 'C', iv);
        if (out !== s) changed.add(s.slice(0, 50));
      }
    }
    expect([...changed]).toEqual([expect.stringContaining('Tocá 3-5-7-9')]);
  });
});
