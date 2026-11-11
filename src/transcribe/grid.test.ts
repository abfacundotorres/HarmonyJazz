import { describe, expect, it } from 'vitest';
import { barIndexAt, barLen, barStart, gridLines, loopOfBars, snapRegion, snapTime, tapTempo, validGrid } from './grid';
import { DEFAULT_TRAINER, rateAfter, repsToTarget, validTrainer } from './trainer';

const g = { bpm: 120, offset: 1, beats: 4 }; // 2 s por compás, primer tiempo en 1 s

describe('grilla de compases', () => {
  it('longitudes y compás en un instante', () => {
    expect(barLen(g)).toBe(2);
    expect(barIndexAt(g, 1)).toBe(0);
    expect(barIndexAt(g, 2.99)).toBe(0);
    expect(barIndexAt(g, 3)).toBe(1);
    expect(barIndexAt(g, 0.5)).toBe(-1);
    expect(barStart(g, 3)).toBe(7);
  });

  it('ajusta al tiempo o al compás más cercano', () => {
    expect(snapTime(g, 1.4)).toBeCloseTo(1.5);
    expect(snapTime(g, 1.1, 'bar')).toBeCloseTo(1);
    expect(snapTime(g, 2.2, 'bar')).toBeCloseTo(3);
  });

  it('loop de N compases desde el compás del cursor', () => {
    expect(loopOfBars(g, 3.3, 2, 60)).toEqual({ start: 3, end: 7 });
    expect(loopOfBars(g, 58.5, 4, 60)?.end).toBe(60);
    expect(loopOfBars(g, 100, 2, 60)).toBeNull();
  });

  it('ajusta una selección a los compases, con mínimo medio compás', () => {
    expect(snapRegion(g, { start: 3.2, end: 6.7 }, 60)).toEqual({ start: 3, end: 7 });
    const r = snapRegion(g, { start: 3.1, end: 3.3 }, 60)!;
    expect(r.end - r.start).toBeCloseTo(2);
  });

  it('líneas de la grilla: numera los compases y se aligera al alejar', () => {
    const lines = gridLines(g, { start: 0, dur: 5 });
    expect(lines.filter((l) => l.bar > 0).map((l) => [l.t, l.bar])).toEqual([[1, 1], [3, 2], [5, 3]]);
    expect(gridLines(g, { start: 0, dur: 5000 }, 400).every((l) => l.beat === 1)).toBe(true);
  });

  it('valida lo guardado', () => {
    expect(validGrid(g)).toBe(true);
    expect(validGrid({ bpm: 5, offset: 0, beats: 4 })).toBe(false);
    expect(validGrid({ bpm: 120, offset: 0, beats: 9 })).toBe(false);
    expect(validGrid(null)).toBe(false);
  });
});

describe('tap tempo', () => {
  it('calcula el tempo con la mediana', () => {
    const taps = [0, 0.5, 1.0, 1.5, 2.02, 2.5];
    expect(tapTempo(taps).bpm).toBeCloseTo(120, 0);
  });
  it('necesita 3 toques y reinicia tras una pausa larga', () => {
    expect(tapTempo([0, 0.5]).bpm).toBeNull();
    const r = tapTempo([0, 0.5, 1, 10]);
    expect(r.taps).toEqual([10]);
    expect(r.bpm).toBeNull();
  });
  it('descarta tempos imposibles', () => {
    expect(tapTempo([0, 5, 10, 15]).bpm).toBeNull(); // 12 bpm
  });
});

describe('entrenador de loops', () => {
  const t = { ...DEFAULT_TRAINER, on: true, target: 1, step: 0.1, every: 3 };
  it('sube cada N repeticiones y se detiene en la meta', () => {
    let rate = 0.6;
    const seen: number[] = [];
    for (let loops = 1; loops <= 20; loops++) {
      rate = rateAfter(rate, t, loops);
      seen.push(rate);
    }
    expect(seen.slice(0, 3)).toEqual([0.6, 0.6, 0.7]);
    expect(rate).toBe(1);
    expect(Math.max(...seen)).toBe(1);
  });
  it('apagado no cambia nada', () => {
    expect(rateAfter(0.5, { ...t, on: false }, 3)).toBe(0.5);
  });
  it('no llega a pasar la meta ni con pasos que no encajan', () => {
    expect(rateAfter(0.95, { ...t, step: 0.1, every: 1 }, 1)).toBe(1);
  });
  it('cuenta las repeticiones que faltan', () => {
    expect(repsToTarget(0.6, t)).toBe(12);
    expect(repsToTarget(1, t)).toBe(0);
  });
  it('valida lo guardado', () => {
    expect(validTrainer(t)).toBe(true);
    expect(validTrainer({ ...t, every: 0 })).toBe(false);
    expect(validTrainer(undefined)).toBe(false);
  });
});
