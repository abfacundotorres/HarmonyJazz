import { describe, expect, it } from 'vitest';
import { parseLine } from '../content/licks';
import { notesToLine } from './toPhrase';

const n = (midi: number, start: number, end: number) => ({ midi, start, end, cents: 0, strength: 1 });

describe('notas detectadas → línea de Vocabulario', () => {
  it('cuantiza a corcheas con el tempo y deja silencios', () => {
    // 120 bpm: una corchea = 0,25 s
    const r = notesToLine([n(62, 10, 10.25), n(65, 10.25, 10.75), n(69, 11.25, 11.5)], 120, 10)!;
    expect(r.line).toBe('D4 F4:2 r:2 A4');
    expect(r.eighths).toBe(6);
    expect(r.bars).toBe(1);
  });

  it('el resultado se lee con el mismo formato que el Vocabulario', () => {
    const r = notesToLine([n(70, 0, 0.3), n(72, 0.3, 0.6), n(58, 1, 2)], 100, 0)!;
    const total = parseLine(r.line).reduce((s, x) => s + x.dur, 0);
    expect(total).toBe(r.eighths);
    expect(r.line.startsWith('Bb4')).toBe(true);
  });

  it('las notas muy cortas valen una corchea y las superpuestas se recortan', () => {
    const r = notesToLine([n(60, 0, 0.05), n(62, 0.02, 0.5)], 120, 0)!;
    expect(parseLine(r.line).map((x) => x.dur)).toEqual([1, 1]);
  });

  it('las notas largas se parten en tramos de 32 corcheas como máximo', () => {
    const r = notesToLine([n(60, 0, 20)], 120, 0)!;
    for (const x of parseLine(r.line)) expect(x.dur).toBeLessThanOrEqual(32);
  });

  it('sin notas o sin tempo válido no hay resultado', () => {
    expect(notesToLine([], 120, 0)).toBeNull();
    expect(notesToLine([n(60, 0, 1)], 0, 0)).toBeNull();
  });
});
