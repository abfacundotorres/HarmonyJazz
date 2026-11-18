import { describe, expect, it } from 'vitest';
import { pendulumAngle, posToTempo, SCALE_MARKS, SWING_DEG, tempoName, tempoToPos, trimBeats, type SwingBeat } from './pendulum';

const beats = (n: number, dur = 0.5, t0 = 10): SwingBeat[] => Array.from({ length: n }, (_, i) => ({ time: t0 + i * dur, dur, index: i }));

describe('péndulo', () => {
  it('toca un extremo justo en cada pulso, alternando de lado', () => {
    const b = beats(4);
    expect(pendulumAngle(10, b)).toBeCloseTo(SWING_DEG);
    expect(pendulumAngle(10.5, b)).toBeCloseTo(-SWING_DEG);
    expect(pendulumAngle(11, b)).toBeCloseTo(SWING_DEG);
  });
  it('pasa por el centro a mitad de pulso y es continuo', () => {
    const b = beats(4);
    expect(pendulumAngle(10.25, b)).toBeCloseTo(0, 5);
    expect(pendulumAngle(10.4999, b)).toBeCloseTo(pendulumAngle(10.5, b), 1);
  });
  it('sin pulsos o antes del primero queda en reposo', () => {
    expect(pendulumAngle(5, [])).toBe(0);
    expect(pendulumAngle(5, beats(2), 7)).toBe(7);
  });
  it('sigue un cambio de tempo sin saltos', () => {
    const b: SwingBeat[] = [
      { time: 0, dur: 1, index: 0 },
      { time: 1, dur: 0.5, index: 1 },
      { time: 1.5, dur: 0.5, index: 2 },
    ];
    expect(pendulumAngle(1, b)).toBeCloseTo(-SWING_DEG);
    expect(pendulumAngle(1.5, b)).toBeCloseTo(SWING_DEG);
    expect(pendulumAngle(0.9999, b)).toBeCloseTo(-SWING_DEG, 1);
  });
  it('descarta los pulsos viejos y deja el actual', () => {
    const t = trimBeats(beats(6), 11.1);
    expect(t[0].index).toBe(2);
    expect(trimBeats(beats(3), 5)).toHaveLength(3);
  });
  it('la escala de la pesa es monótona y reversible, con marcas dentro de 40–208', () => {
    expect(posToTempo(0)).toBeCloseTo(40);
    expect(posToTempo(1)).toBeCloseTo(208);
    for (const m of SCALE_MARKS) expect(posToTempo(tempoToPos(m))).toBeCloseTo(m, 5);
    expect(tempoToPos(20)).toBe(0);
    expect(tempoToPos(300)).toBe(1);
    expect(tempoToPos(120)).toBeGreaterThan(tempoToPos(100));
  });
  it('nombres de tempo', () => {
    expect(tempoName(50)).toBe('Largo');
    expect(tempoName(100)).toBe('Andante');
    expect(tempoName(140)).toBe('Allegro');
    expect(tempoName(250)).toBe('Prestissimo');
  });
});
