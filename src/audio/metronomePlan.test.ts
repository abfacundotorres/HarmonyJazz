import { describe, expect, it } from 'vitest';
import { barPlan, type MetroOpts } from './metronomePlan';

const base: MetroOpts = { tempo: 120, beats: 4, sub: 1, accent: true, backbeat: false };
const at = (o: MetroOpts, bar = 0) => barPlan(o, bar);

describe('metrónomo: qué suena en cada compás', () => {
  it('4/4 a 120: cuatro clics, el primero acentuado, cada medio segundo', () => {
    const p = at(base);
    expect(p.tempo).toBe(120);
    expect(p.dur).toBeCloseTo(2, 9);
    expect(p.ticks.map((t) => [t.beat, t.kind, t.t])).toEqual([[0, 'strong', 0], [1, 'beat', 0.5], [2, 'beat', 1], [3, 'beat', 1.5]]);
    expect(p.muted).toBe(false);
  });
  it('sin acento todos los pulsos suenan igual', () => {
    expect(at({ ...base, accent: false }).ticks.map((t) => t.kind)).toEqual(['beat', 'beat', 'beat', 'beat']);
  });
  it('cualquier cantidad de pulsos (3/4, 5/4, 7/4) y se mantienen entre 1 y 12', () => {
    expect(at({ ...base, beats: 3 }).ticks).toHaveLength(3);
    expect(at({ ...base, beats: 7 }).dur).toBeCloseTo(3.5, 9);
    expect(at({ ...base, beats: 0 }).ticks).toHaveLength(1);
    expect(at({ ...base, beats: 40 }).ticks).toHaveLength(12);
  });
  it('subdivisiones: corcheas, tresillos y semicorcheas, con los pulsos aparte de las subdivisiones', () => {
    const eighths = at({ ...base, sub: 2 }).ticks;
    expect(eighths.map((t) => t.kind)).toEqual(['strong', 'sub', 'beat', 'sub', 'beat', 'sub', 'beat', 'sub']);
    expect(eighths[1].t).toBeCloseTo(0.25, 9);
    expect(at({ ...base, sub: 3 }).ticks).toHaveLength(12);
    expect(at({ ...base, sub: 3 }).ticks[1].t).toBeCloseTo(0.5 / 3, 9);
    expect(at({ ...base, sub: 4 }).ticks).toHaveLength(16);
    expect(at({ ...base, sub: 4 }).ticks.filter((t) => t.kind === 'sub')).toHaveLength(12);
  });
  it('sólo contratiempos: en 4/4 suenan el 2 y el 4, sin acento ni subdivisiones', () => {
    const p = at({ ...base, backbeat: true, sub: 2 });
    expect(p.ticks.map((t) => [t.beat, t.kind, t.t])).toEqual([[1, 'beat', 0.5], [3, 'beat', 1.5]]);
    expect(at({ ...base, backbeat: true, beats: 3 }).ticks.map((t) => t.beat)).toEqual([1]);
  });
  it('compases en silencio: suenan N y se callan M, y se repite; el tiempo sigue corriendo', () => {
    const o = { ...base, silence: { play: 2, mute: 1 } };
    expect([0, 1, 2, 3, 4, 5, 6].map((b) => at(o, b).muted)).toEqual([false, false, true, false, false, true, false]);
    expect(at(o, 2).ticks).toEqual([]);
    expect(at(o, 2).dur).toBeCloseTo(2, 9);
    // "silenciar 0" y "tocar 0" no rompen nada
    expect(at({ ...base, silence: { play: 3, mute: 0 } }, 5).muted).toBe(false);
    expect(at({ ...base, silence: { play: 0, mute: 2 } }, 0).muted).toBe(false);
    expect(at({ ...base, silence: { play: 0, mute: 2 } }, 1).muted).toBe(true);
  });
  it('subir el tempo: de a N bpm cada N compases, sin pasar del máximo; el compás se acorta', () => {
    const o = { ...base, ramp: { step: 10, every: 2, max: 140 } };
    expect([0, 1, 2, 3, 4, 5, 6, 20].map((b) => at(o, b).tempo)).toEqual([120, 120, 130, 130, 140, 140, 140, 140]);
    expect(at(o, 2).dur).toBeCloseTo((4 * 60) / 130, 9);
  });
  it('el tempo se mantiene entre 20 y 320', () => {
    expect(at({ ...base, tempo: 5 }).tempo).toBe(20);
    expect(at({ ...base, tempo: 900 }).tempo).toBe(320);
  });
});
