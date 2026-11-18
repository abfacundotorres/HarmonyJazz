import { describe, expect, it } from 'vitest';
import { byDay, trend, type LongNote } from './longnotes';

const n = (day: string, spread: number, secs = 3): LongNote => ({ day, midi: 60, secs, spread, offset: 0 });

describe('notas largas: evolución', () => {
  it('promedia por día y ordena del más viejo al más nuevo', () => {
    const s = byDay([n('2026-11-18', 4), n('2026-11-16', 10, 2), n('2026-11-18', 6, 5), n('2026-11-16', 8, 4)]);
    expect(s.map((d) => d.day)).toEqual(['2026-11-16', '2026-11-18']);
    expect(s[0]).toEqual({ day: '2026-11-16', count: 2, spread: 9, secs: 3 });
    expect(s[1].spread).toBe(5);
  });
  it('se queda con los últimos días pedidos', () => {
    const rows = Array.from({ length: 20 }, (_, i) => n(`2026-10-${String(i + 1).padStart(2, '0')}`, 5));
    expect(byDay(rows, 14)).toHaveLength(14);
    expect(byDay(rows, 14)[0].day).toBe('2026-10-07');
  });
  it('la tendencia es negativa si el sonido se vuelve más estable y no existe con un solo día', () => {
    expect(trend(byDay([n('2026-11-10', 9), n('2026-11-18', 5)]))).toBe(-4);
    expect(trend(byDay([n('2026-11-10', 9)]))).toBeNull();
    expect(trend([])).toBeNull();
  });
});
