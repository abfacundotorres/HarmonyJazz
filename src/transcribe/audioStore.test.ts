import { describe, expect, it } from 'vitest';
import { normalizeMeta, TrackMeta } from './audioStore';

const old = { id: 'a:1', name: 'x', size: 1, type: 'audio/mpeg', added: 1, opened: 1, pos: 12, rate: 0.7, loopOn: true, region: { start: 1, end: 2 }, loops: [{ id: 'l', name: 'p', start: 1, end: 2 }] };

describe('fichas guardadas', () => {
  it('una ficha de la versión anterior se completa con los valores por defecto y conserva lo suyo', () => {
    const m = normalizeMeta(old as unknown as TrackMeta);
    expect(m.rate).toBe(0.7);
    expect(m.loops).toHaveLength(1);
    expect(m.region).toEqual({ start: 1, end: 2 });
    expect(m.pitchSemis).toBe(0);
    expect(m.filters).toEqual({ hp: 0, lp: 0, center: 'keep' });
    expect(m.grid).toBeNull();
    expect(m.markers).toEqual([]);
    expect(m.trainer.on).toBe(false);
    expect(m.viewMode).toBe('wave');
    expect(m.simple).toBe(false);
    expect(m.clickOn).toBe(false);
    expect(m.clickGain).toBe(0.5);
  });

  it('descarta valores dañados o fuera de rango', () => {
    const m = normalizeMeta({ ...old, rate: 99, pitchSemis: 40, pitchCents: 'x', grid: { bpm: 1 }, trainer: { on: 'si' }, filters: { hp: -5 }, markers: [null, { t: 3, name: 'a' }, { t: 'x' }], viewMode: 'raro', text: 5 } as unknown as TrackMeta);
    expect(m.rate).toBe(1);
    expect(m.pitchSemis).toBe(0);
    expect(m.pitchCents).toBe(0);
    expect(m.grid).toBeNull();
    expect(m.trainer.on).toBe(false);
    expect(m.filters.hp).toBe(0);
    expect(m.markers).toHaveLength(1);
    expect(m.viewMode).toBe('wave');
    expect(m.text).toBe('');
  });
});
