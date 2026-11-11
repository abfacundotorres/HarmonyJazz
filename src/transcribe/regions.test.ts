import { describe, expect, it } from 'vitest';
import { clampView, fitRegion, fmtTime, followView, loopTarget, normRegion, parseTime, peakRange, peaksFromChannels, zoomView } from './regions';

describe('selecciones y loop', () => {
  it('ordena y recorta la selección, y descarta las muy cortas', () => {
    expect(normRegion(10, 4, 60)).toEqual({ start: 4, end: 10 });
    expect(normRegion(-5, 100, 60)).toEqual({ start: 0, end: 60 });
    expect(normRegion(5, 5.05, 60)).toBeNull();
    expect(normRegion(1, 2, 0)).toBeNull();
    expect(normRegion(NaN, 2, 60)).toBeNull();
  });

  it('el loop vuelve al inicio al llegar al final, sólo si está activo', () => {
    const r = { start: 4, end: 10 };
    expect(loopTarget(9.5, r, true)).toBeNull();
    expect(loopTarget(9.99, r, true)).toBe(4);
    expect(loopTarget(10.2, r, true)).toBe(4);
    expect(loopTarget(10.2, r, false)).toBeNull();
    expect(loopTarget(10.2, null, true)).toBeNull();
  });
});

describe('tiempo', () => {
  it('formatea y lee', () => {
    expect(fmtTime(83.54)).toBe('1:23.5');
    expect(fmtTime(5)).toBe('0:05.0');
    expect(fmtTime(-3)).toBe('0:00.0');
    expect(parseTime('1:23.5')).toBeCloseTo(83.5);
    expect(parseTime('83,5')).toBeCloseTo(83.5);
    expect(parseTime('2:05')).toBe(125);
    expect(parseTime('abc')).toBeNull();
  });
});

describe('vista de la onda', () => {
  it('zoom mantiene el ancla y respeta los límites', () => {
    const v = zoomView({ start: 0, dur: 60 }, 0.5, 30, 120);
    expect(v.dur).toBe(30);
    expect(v.start).toBeCloseTo(15); // el punto 30 s sigue en el centro
    expect(zoomView({ start: 0, dur: 10 }, 100, 5, 60).dur).toBe(60);
    expect(zoomView({ start: 0, dur: 10 }, 0.0001, 5, 60).dur).toBe(1);
  });

  it('clampView no deja salir de [0, duración]', () => {
    expect(clampView({ start: 100, dur: 10 }, 60)).toEqual({ start: 50, dur: 10 });
    expect(clampView({ start: -3, dur: 10 }, 60)).toEqual({ start: 0, dur: 10 });
  });

  it('la vista sigue al cursor sólo cuando se sale', () => {
    const v = { start: 0, dur: 10 };
    expect(followView(v, 5, 100)).toBe(v);
    expect(followView(v, 12, 100).start).toBeCloseTo(11);
  });

  it('encuadra una selección con margen', () => {
    const v = fitRegion({ start: 20, end: 30 }, 100);
    expect(v.start).toBeLessThan(20);
    expect(v.start + v.dur).toBeGreaterThan(30);
  });
});

describe('picos', () => {
  it('mínimos y máximos por intervalo, mezclando canales', () => {
    const sr = 100;
    const a = new Float32Array(200).fill(0);
    a[10] = 0.5;
    a[150] = -0.8;
    const b = new Float32Array(200).fill(0);
    b[12] = 0.9;
    const p = peaksFromChannels([a, b], sr, 10); // 10 muestras por pico, 20 picos
    expect(p.max.length).toBe(20);
    expect(p.max[1]).toBeCloseTo(0.9);
    expect(p.min[15]).toBeCloseTo(-0.8);
    expect(peakRange(p, 0, 0.2)).toEqual([0, p.max[1]]);
    expect(peakRange(p, 1.4, 1.6)[0]).toBeCloseTo(-0.8);
  });
});
