import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { FLEX_HARMONICS, LIP_BENDING, LONG_TONES_LOW, PracticeExercise } from './practice';
import { buildPlan } from './plan';

const ALL: PracticeExercise[] = [LONG_TONES_LOW, FLEX_HARMONICS, LIP_BENDING];

describe('ejercicios de práctica', () => {
  it.each(ALL.map((e) => [e.id, e] as const))('%s tiene explicación completa', (_id, e) => {
    expect(e.short.length).toBeGreaterThan(10);
    expect(e.goal.length).toBeGreaterThan(20);
    expect(e.steps.length).toBeGreaterThanOrEqual(4);
    for (const s of e.steps) expect(s.trim().length).toBeGreaterThan(20);
  });

  it.each(ALL.filter((e) => e.abc).map((e) => [e.id, e] as const))('%s: el pentagrama se lee sin advertencias y los compases suman 4 tiempos', (_id, e) => {
    const [tune] = abcjs.parseOnly(e.abc!);
    expect(tune.warnings ?? []).toEqual([]);
    const lines = tune.lines.flatMap((l) => (l as { staff?: { voices: { type?: string; duration?: number[] }[][] }[] }).staff ?? []);
    expect(lines.length).toBeGreaterThan(0);
    const total = lines.flatMap((s) => s.voices[0]).reduce((a, el) => a + (el.duration?.[0] ?? 0), 0);
    expect(total % 1).toBe(0); // compases completos de 4/4 (la duración está en redondas: 1 = 4 tiempos)
  });

  it('el plan del día incluye los ejercicios en los días que corresponden', () => {
    const found = new Set<string>();
    for (let d = 0; d < 6; d++) {
      const plan = buildPlan(new Date(2026, 10, 10 + d), 60);
      for (const x of plan.blocks.find((b) => b.id === 'warm')!.detail) if (typeof x !== 'string') found.add(x.id);
    }
    expect([...found].sort()).toEqual(['flex-harmonics', 'lip-bending', 'long-tones-low']);
  });
});
