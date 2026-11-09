import { describe, expect, it } from 'vitest';
import { LICKS, parseLine } from './licks';
import { COMMON_EXERCISES, LICK_STUDY, learningSteps } from './licksStudy';

describe('contenido de estudio de las frases', () => {
  it('toda frase tiene su estudio y toda entrada de estudio tiene su frase', () => {
    expect(Object.keys(LICK_STUDY).sort()).toEqual(LICKS.map((l) => l.id).sort());
  });

  for (const l of LICKS) {
    describe(l.id, () => {
      const st = LICK_STUDY[l.id];
      const notes = parseLine(l.line).filter((n) => n.pitch).length;

      it('las ideas cubren todas las notas, en orden y sin huecos ni solapes', () => {
        let next = 1;
        for (const idea of st.ideas) {
          expect(idea.from, `${idea.name} debería empezar en ${next}`).toBe(next);
          expect(idea.to).toBeGreaterThanOrEqual(idea.from);
          next = idea.to + 1;
        }
        expect(next - 1, 'las ideas deben llegar a la última nota').toBe(notes);
      });

      it('tiene el contenido mínimo y sin marcas de borrador', () => {
        expect(st.ideas.length).toBeGreaterThanOrEqual(2);
        expect(st.why.length).toBeGreaterThanOrEqual(2);
        expect(st.exercises.length).toBeGreaterThanOrEqual(3);
        expect(st.trumpet.length).toBeGreaterThanOrEqual(1);
        const all = JSON.stringify(st) + l.idea;
        expect(all).not.toMatch(/TODO|XXX|\.\.\. no:|lorem/i);
        for (const i of st.ideas) {
          expect(i.name.trim()).not.toBe('');
          expect(i.text.length).toBeGreaterThan(15);
          expect(i.why.length).toBeGreaterThan(15);
        }
      });

      it('tiene nivel, tempo y modo válidos', () => {
        expect(['Esencial', 'Intermedio', 'Avanzado']).toContain(l.level);
        expect(l.tempo).toBeGreaterThanOrEqual(60);
        expect(l.tempo).toBeLessThanOrEqual(220);
      });
    });
  }

  it('los pasos usan el tempo de la frase y llevan de lento a rápido', () => {
    for (const l of LICKS) {
      const steps = learningSteps(l);
      expect(steps.length).toBe(8);
      const bpm = steps.map((s) => /♩ = (\d+)/.exec(s)?.[1]).filter(Boolean).map(Number);
      expect(bpm.length).toBe(3);
      expect(bpm[0]).toBeLessThan(bpm[1]);
      expect(bpm[1]).toBeLessThan(bpm[2]);
      expect(bpm[2]).toBe(l.tempo);
    }
    expect(COMMON_EXERCISES.length).toBeGreaterThanOrEqual(5);
  });
});
