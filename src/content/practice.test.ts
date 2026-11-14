import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { CYCLE_OF_FOURTHS } from '../theory/chart';
import { buildPlan } from './plan';
import { abcOf, PracticeExercise, TECHNIQUE_EXERCISES, WARMUP_EXERCISES } from './practice';

const ALL: PracticeExercise[] = [...WARMUP_EXERCISES, ...TECHNIQUE_EXERCISES];

describe('ejercicios de práctica', () => {
  it('los identificadores no se repiten', () => {
    expect(new Set(ALL.map((e) => e.id)).size).toBe(ALL.length);
  });

  it.each(ALL.map((e) => [e.id, e] as const))('%s tiene explicación completa', (_id, e) => {
    expect(e.short.length).toBeGreaterThan(10);
    expect(e.goal.length).toBeGreaterThan(20);
    expect(e.steps.length).toBeGreaterThanOrEqual(4);
    for (const s of e.steps) expect(s.trim().length).toBeGreaterThan(20);
    expect((e.tips ?? []).length).toBeGreaterThanOrEqual(1);
    if (e.abc) expect(e.abcCaption, 'el pentagrama lleva epígrafe').toBeTruthy();
  });

  it.each(ALL.filter((e) => e.abc).map((e) => [e.id, e] as const))('%s: el pentagrama se lee sin advertencias', (_id, e) => {
    for (const key of typeof e.abc === 'function' ? CYCLE_OF_FOURTHS : ['C']) {
      const [tune] = abcjs.parseOnly(abcOf(e, key)!);
      expect(tune.warnings ?? [], `${e.id} en ${key}`).toEqual([]);
      expect(tune.lines.length).toBeGreaterThan(0);
    }
  });

  it('en cinco días aparecen todos los calentamientos y en ocho todos los ejercicios de técnica', () => {
    const warm = new Set<string>();
    const tech = new Set<string>();
    for (let d = 0; d < 8; d++) {
      const plan = buildPlan(new Date(2026, 10, 10 + d), 60);
      for (const x of plan.blocks.find((b) => b.id === 'warm')!.detail) if (typeof x !== 'string') warm.add(x.id);
      for (const x of plan.blocks.find((b) => b.id === 'tech')!.detail) if (typeof x !== 'string') tech.add(x.id);
    }
    expect([...warm].sort()).toEqual(WARMUP_EXERCISES.map((e) => e.id).sort());
    expect([...tech].sort()).toEqual(TECHNIQUE_EXERCISES.map((e) => e.id).sort());
  });
});
