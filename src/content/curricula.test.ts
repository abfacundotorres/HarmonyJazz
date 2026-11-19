import { describe, expect, it } from 'vitest';
import { stepOf } from './camino';
import { byN, cierre, correlativas, EMPTY, faltan, PLAN, SEMESTERS, siguiente } from './curricula';
import { FOCI, focusById } from './focus';

describe('currícula de tres años', () => {
  it('son 36 meses seguidos, seis por semestre, de seis semestres', () => {
    expect(PLAN.map((m) => m.n)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    for (const s of SEMESTERS) expect(PLAN.filter((m) => m.sem === s.sem)).toHaveLength(6);
    expect(SEMESTERS.map((s) => s.year)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('usa focos que existen, de su área, y todos los focos de lenguaje aparecen al menos una vez', () => {
    for (const m of PLAN) {
      expect(focusById(m.lang)?.area, `${m.n} lang`).toBe('lenguaje');
      expect(focusById(m.tech)?.area, `${m.n} tech`).toBe('tecnica');
      expect(m.goal.length).toBeGreaterThan(15);
    }
    for (const f of FOCI.filter((x) => x.area === 'lenguaje')) expect(PLAN.some((m) => m.lang === f.id), f.id).toBe(true);
    for (const f of FOCI.filter((x) => x.area === 'tecnica')) expect(PLAN.some((m) => m.tech === f.id), f.id).toBe(true);
  });

  it('respeta el camino sugerido: lo que conviene tener antes se trabajó en un mes anterior', () => {
    for (const m of PLAN) {
      for (const id of stepOf(m.lang)!.after) {
        if (m.kind !== 'materia') continue;
        expect(PLAN.some((x) => x.n < m.n && x.lang === id), `${m.name} (${m.n}) pide ${id}`).toBe(true);
      }
      for (const id of stepOf(m.tech)!.after) {
        expect(PLAN.some((x) => x.n < m.n && x.tech === id), `${m.name} (${m.n}) pide la técnica ${id}`).toBe(true);
      }
    }
  });

  it('cada foco de lenguaje se trabaja por primera vez en una materia (no solo en integración o taller)', () => {
    for (const f of FOCI.filter((x) => x.area === 'lenguaje')) {
      const first = PLAN.find((m) => m.lang === f.id)!;
      expect(first.kind === 'materia' || (f.id === 'l-aprender-de-grabaciones' && first.kind === 'taller'), f.id).toBe(true);
    }
  });

  it('los talleres e integraciones cierran semestres o reutilizan focos ya vistos', () => {
    for (const s of SEMESTERS) {
      const ms = PLAN.filter((m) => m.sem === s.sem);
      expect(ms.at(-1)!.kind === 'integracion' || ms.at(-1)!.kind === 'taller').toBe(true);
    }
    for (const m of PLAN.filter((x) => x.kind === 'integracion')) expect(PLAN.some((x) => x.n < m.n && x.lang === m.lang && x.kind === 'materia'), m.name).toBe(true);
  });

  it('cada materia trae criterios de cierre propios y el de técnica', () => {
    for (const m of PLAN) {
      const c = cierre(m);
      expect(c.length, m.name).toBeGreaterThanOrEqual(4);
      expect(new Set(c).size).toBe(c.length);
      expect(c.at(-1)).toMatch(/técnica/);
    }
    expect(cierre(byN(36)!)[0]).toMatch(/tema/);
  });

  it('correlativas y avance: sin aprobar nada empieza por la 1; se salta lo aprobado', () => {
    expect(siguiente(EMPTY)!.n).toBe(1);
    expect(correlativas(byN(1)!)).toEqual([]);
    const bebop = byN(19)!;
    expect(correlativas(bebop).map((c) => c.lang)).toContain('l-arpegios');
    expect(faltan(bebop, EMPTY).length).toBeGreaterThan(0);
    expect(faltan(bebop, { ...EMPTY, aprobadas: PLAN.filter((m) => m.n < 19).map((m) => m.n) })).toEqual([]);
    expect(siguiente({ ...EMPTY, aprobadas: [1, 2, 4] })!.n).toBe(3);
    expect(siguiente({ ...EMPTY, aprobadas: PLAN.map((m) => m.n) })).toBeNull();
  });
});
