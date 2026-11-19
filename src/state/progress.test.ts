import { describe, expect, it } from 'vitest';
import { sanitizeSeen } from './sanitize';
import { bumpSeen, dayNum, dayOfIso, dueItems, intervalDays, keyBalance, keyMatrix, parseItem, weakestKeys } from './progress';

const D = (iso: string) => dayOfIso(iso)!;

describe('repaso espaciado', () => {
  it('los plazos crecen con las marcas: 2, 4, 9, 18 y 35 días (y no pasan de 35)', () => {
    expect([1, 2, 3, 4, 5, 6, 40].map(intervalDays)).toEqual([2, 4, 9, 18, 35, 35, 35]);
  });

  it('marcar dos veces el mismo día cuenta una sola; otro día suma', () => {
    let s = bumpSeen({}, 'a:0', 'C', 100);
    s = bumpSeen(s, 'a:0', 'C', 100);
    expect(s['a:0'].C).toEqual({ d: 100, n: 1 });
    s = bumpSeen(s, 'a:0', 'C', 103);
    expect(s['a:0'].C).toEqual({ d: 103, n: 2 });
    s = bumpSeen(s, 'a:0', 'F', 103);
    expect(s['a:0'].F).toEqual({ d: 103, n: 1 });
  });

  it('vence cuando pasó el plazo, y el más atrasado (en proporción) va primero', () => {
    const mastery = { 'a:0': { C: 100, F: 90 }, 'b:1': { G: 120 }, 'c:2': { D: 80 } };
    const seen = {
      'a:0': { C: { d: 90, n: 1 }, F: { d: 99, n: 1 } }, // C: 10 días de 2 (×5); F: 1 día de 2 (no vence)
      'b:1': { G: { d: 80, n: 3 } }, // 20 días de 9 (×2,2)
      'c:2': { D: { d: 100, n: 1 } }, // hoy
    };
    const due = dueItems(mastery, seen, 100);
    expect(due.map((d) => `${d.id}|${d.key}`)).toEqual(['a:0|C', 'b:1|G']);
    expect(due[0]).toMatchObject({ ago: 10, late: 8, bpm: 100, undated: false });
    expect(due[1].late).toBe(11);
  });

  it('una marca vieja sin fecha se trata como de hace 6 días y se avisa', () => {
    const due = dueItems({ 'a:0': { C: 100 } }, {}, 500);
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({ undated: true, ago: 6 });
  });

  it('ignora la marca "todas", los tempos en 0 y respeta el límite', () => {
    const mastery = { 'a:0': { todas: 100, C: 0 }, 'b:0': { C: 90, D: 90, E: 90 } };
    expect(dueItems(mastery, {}, 500).map((d) => d.key).sort()).toEqual(['C', 'D', 'E']);
    expect(dueItems(mastery, {}, 500, 2)).toHaveLength(2);
  });
});

describe('identificadores', () => {
  it('reconoce lecciones, escalas y frases', () => {
    expect(parseItem('guide-tones:2')).toEqual({ kind: 'lesson', lesson: 'guide-tones', idx: 2 });
    expect(parseItem('scale:lydianDominant:thirds')).toEqual({ kind: 'scale', scale: 'lydianDominant', pattern: 'thirds' });
    expect(parseItem('lick:p-ab12')).toEqual({ kind: 'lick', id: 'p-ab12' });
    expect(parseItem('???')).toEqual({ kind: 'other', id: '???' });
  });
});

describe('tonalidades', () => {
  const mastery = { 'l:0': { C: 100, F: 90 }, 'l:1': { C: 100 }, 'scale:ionian:octave': { C: 80, Bb: 0 }, 'x:0': { todas: 90 } };
  it('cuenta los ejercicios con marca en cada tonalidad', () => {
    const b = keyBalance(mastery);
    expect(b.C).toBe(3);
    expect(b.F).toBe(1);
    expect(b.Bb).toBe(0);
    expect(Object.keys(b)).toHaveLength(12);
  });
  it('las más flojas son las del mínimo, en el orden de práctica; sin marcas no hay ninguna', () => {
    expect(weakestKeys(keyBalance({}))).toEqual([]);
    const w = weakestKeys(keyBalance(mastery));
    expect(w).not.toContain('C');
    expect(w).not.toContain('F');
    expect(w[0]).toBe('Bb');
    expect(w).toHaveLength(10);
  });
  it('la matriz cuenta por fila cuántos ejercicios están marcados', () => {
    const m = keyMatrix(mastery, [{ id: 'l', ids: ['l:0', 'l:1', 'l:2'] }]);
    expect(m[0].total).toBe(3);
    expect(m[0].counts.C).toBe(2);
    expect(m[0].counts.F).toBe(1);
    expect(m[0].counts.G).toBe(0);
  });
});

describe('fechas', () => {
  it('dayNum coincide con el de las fechas de texto', () => {
    expect(dayNum(new Date(2026, 10, 18, 23, 59))).toBe(D('2026-11-18'));
    expect(dayOfIso('2026-13-40')).toBeNull();
    expect(dayOfIso('no')).toBeNull();
  });
});

describe('datos guardados', () => {
  it('se descartan fechas y cuentas inválidas', () => {
    expect(sanitizeSeen({ 'a:0': { C: { d: 100, n: 2 }, F: { d: 'x', n: 1 }, G: 5 }, b: 7, 'c:1': { D: { d: -5, n: 0 } } })).toEqual({
      'a:0': { C: { d: 100, n: 2 } },
      'c:1': { D: { d: 0, n: 1 } },
    });
    expect(sanitizeSeen([])).toBeNull();
  });
});
