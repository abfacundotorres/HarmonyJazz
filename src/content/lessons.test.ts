import { describe, expect, it } from 'vitest';
import { GENERATORS } from '../exercises/generators';
import { localizeNotes } from '../exercises/localize';
import { BB_TRUMPET, INTERVAL } from '../theory/notes';
import { lickById } from './licks';
import { LESSONS } from './lessons';
import { PROGRESSIONS } from './progressions';

const texts = (l: (typeof LESSONS)[number]) => [l.title, l.summary, ...l.body, ...l.steps, ...l.why, ...l.trumpet, ...(l.listen ?? []), ...l.exercises.map((e) => e.label)];

describe('lecciones', () => {
  it('hay 12, con ids únicos', () => {
    expect(LESSONS).toHaveLength(12);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(12);
  });

  for (const l of LESSONS) {
    describe(l.id, () => {
      it('tiene paso a paso, por qué funciona y varios ejercicios', () => {
        expect(l.steps.length).toBeGreaterThanOrEqual(5);
        expect(l.why.length).toBeGreaterThanOrEqual(3);
        expect(l.exercises.length).toBeGreaterThanOrEqual(4);
        for (const t of [...l.steps, ...l.why]) expect(t.length).toBeGreaterThan(25);
      });

      it('todo lo que referencia existe', () => {
        for (const e of l.exercises) {
          expect(PROGRESSIONS.some((p) => p.id === e.progression), `${l.id}: progresión ${e.progression}`).toBe(true);
          if (e.generator) expect(GENERATORS.some((g) => g.id === e.generator), `${l.id}: generador ${e.generator}`).toBe(true);
          if (e.lick) expect(() => lickById(e.lick!)).not.toThrow();
          expect(Boolean(e.generator) !== Boolean(e.lick), `${l.id}: ${e.label} debe tener generador o frase, no ambos`).toBe(true);
          expect(e.tempo ?? 120).toBeGreaterThanOrEqual(60);
        }
      });

      it('los textos se traducen sin cambios en concierto y sin tocar nombres propios', () => {
        for (const t of texts(l)) expect(localizeNotes(t, 'C', 'C', INTERVAL.P1)).toBe(t);
        for (const t of [l.title, ...(l.listen ?? [])]) expect(localizeNotes(t, 'C', 'C', BB_TRUMPET), t).toBe(t);
      });

      it('ningún texto usa una "A" suelta que se confundiría con la nota La', () => {
        for (const t of texts(l)) expect(t).not.toMatch(/(^|[.:;!?¿¡("] ?)A [a-záéíóú]/);
      });

      it('no hay marcas de borrador ni alteraciones ASCII', () => {
        for (const t of texts(l)) {
          expect(t).not.toMatch(/\bTODO\b|XXX|lorem ipsum/);
          expect(t).not.toMatch(/\b[A-G][b#]\d?\b/);
        }
      });
    });
  }
});
