import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { PLAN, SEMESTERS } from './curricula';
import { buildMonthPlan, EMPTY_MONTH } from './monthPlan';
import { PROGRESSIONS, progressionById } from './progressions';
import { FORMAS, NIVELES, formaDe, nivelDe, nombreForma, repertoireWeeks } from './standards';

describe('formas nuevas para los standards', () => {
  const nuevas: [string, number][] = [['aaba-subdominante', 32], ['menor-aaba', 32], ['bossa-mayor', 16], ['blues-bb-rapido', 12], ['ii-v-semitonos', 8]];
  it.each(nuevas)('%s parsea y tiene %i compases', (id, bars) => {
    const p = progressionById(id);
    expect(p, id).toBeDefined();
    const c = parseChart(p.chart);
    expect(c.bars).toBe(bars);
    expect(c.chords.length).toBeGreaterThanOrEqual(bars);
    expect(p.notes.length).toBeGreaterThan(40);
    expect(p.tempo).toBeGreaterThan(50);
  });
  it('las formas nuevas son formas de ejercicio y no traen el nombre de ningún tema', () => {
    for (const [id] of nuevas) expect(progressionById(id).notes + progressionById(id).name).not.toMatch(/Autumn|All the Things|Stella|Giant|Oleo/i);
  });
  it('los ids de las progresiones siguen siendo únicos', () => {
    const ids = PROGRESSIONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('los standards en la currícula', () => {
  it('cada mes de la currícula tiene su forma sugerida y existe', () => {
    for (const m of PLAN) {
      expect(FORMAS[m.n], `mes ${m.n}`).toBeDefined();
      expect(PROGRESSIONS.some((p) => p.id === formaDe(m.n)), `mes ${m.n}`).toBe(true);
      expect(nombreForma(m.n).length).toBeGreaterThan(5);
    }
    expect(Object.keys(FORMAS)).toHaveLength(36);
  });
  it('cada semestre tiene su tipo de standard, su meta y ejemplos (sólo títulos)', () => {
    expect(NIVELES.map((n) => n.nivel)).toEqual(SEMESTERS.map((s) => s.sem));
    for (const n of NIVELES) {
      expect(n.tipo.length).toBeGreaterThan(8);
      expect(n.meta.length).toBeGreaterThan(20);
      expect(n.ejemplos.length).toBeGreaterThanOrEqual(3);
      for (const e of n.ejemplos) expect(e.length).toBeLessThan(40);
    }
    expect(nivelDe(4)!.tipo).toMatch(/Rhythm/);
  });
  it('la forma del mes de los vals y del 6/8 es de tres tiempos', () => {
    expect(formaDe(23)).toBe('vals-ii-v-i');
  });
});

describe('el recorrido del tema según el semestre', () => {
  const marcas = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  it('sin semestre es el recorrido general; con semestre, cuatro semanas con tres tareas y la primera propia', () => {
    const base = repertoireWeeks('X');
    const sin = repertoireWeeks('X', undefined);
    expect(sin).toEqual(base);
    for (let n = 1; n <= 6; n++) {
      const w = repertoireWeeks('Mi tema', n);
      expect(w, `semestre ${n}`).toHaveLength(4);
      w.forEach((s, i) => {
        expect(s.tasks, `${n}.${i}`).toHaveLength(3);
        expect(s.title.length).toBeGreaterThan(5);
        expect(s.tasks[0].id).toMatch(new RegExp(`^rep${n}-`));
        expect(s.tasks[0].steps.length).toBeGreaterThanOrEqual(3);
        expect(s.tasks[1]).toEqual(base[i].tasks[1]);
        expect(s.tasks[2]).toEqual(base[i].tasks[2]);
        for (const t of s.tasks) for (const m of marcas(t.link ?? '')) expect(['rep', 'k']).toContain(m);
      });
      expect(w.every((x) => x.goal.length > 15)).toBe(true);
    }
  });
  it('los ids de tareas de todos los semestres son únicos', () => {
    const ids = [1, 2, 3, 4, 5, 6].flatMap((n) => repertoireWeeks('X', n).map((w) => w.tasks[0].id));
    expect(new Set(ids).size).toBe(24);
  });
  it('el semestre sube la exigencia: la primera semana de cada uno es distinta', () => {
    const t = [1, 2, 3, 4, 5, 6].map((n) => repertoireWeeks('X', n)[0].title);
    expect(new Set(t).size).toBe(6);
  });
  it('el plan del mes usa el recorrido del semestre', () => {
    const mp = { ...EMPTY_MONTH, month: '2026-12', tech: 't-largas-artic', lang: 'l-triadas-mayores', rep: 'ii-v-i', startDay: 20000, nivel: 4 };
    const plan = buildMonthPlan(new Date(2026, 11, 10), mp, 1, 'Mi tema');
    const rep = plan.blocks.find((b) => b.id === 'rep')!;
    expect(rep.detail[0]).toMatch(/La forma sin grilla/);
    const general = buildMonthPlan(new Date(2026, 11, 10), { ...mp, nivel: undefined }, 1, 'Mi tema').blocks.find((b) => b.id === 'rep')!;
    expect(general.detail[0]).toMatch(/Conocer la forma/);
  });
});
