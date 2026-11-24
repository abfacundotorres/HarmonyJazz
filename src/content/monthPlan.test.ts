import { describe, expect, it } from 'vitest';
import { sanitizeMonth } from '../state/sanitize';
import { dayOfIso } from '../state/progress';
import { REPERTOIRE_WEEKS } from './focus';
import { buildMonthPlan, EMPTY_MONTH, focusPick, monthActive, monthName, monthOf, pickFor, repertoireName, sesionDelMes, sessionNumber } from './monthPlan';

const MP = { month: '2026-12', tech: 't-largas-artic', lang: 'l-triadas-mayores', rep: 'ii-v-i', startDay: dayOfIso('2026-12-01')! };
const TUNES = [{ id: 'u:abcd', name: 'Autumn Leaves' }];
const D = (iso: string) => dayOfIso(iso)!;
const day = (iso: string, done: string[] = ['warm']) => [iso, { done, minutes: 30 }] as const;

describe('qué toca en cada sesión', () => {
  it('seis sesiones por semana: tres tareas, cada una dos veces; la segunda vez es más exigente', () => {
    const p = [1, 2, 3, 4, 5, 6, 7].map(pickFor);
    expect(p.map((x) => [x.week, x.index, x.pass])).toEqual([[0, 0, 1], [0, 1, 1], [0, 2, 1], [0, 0, 2], [0, 1, 2], [0, 2, 2], [1, 0, 1]]);
    expect(pickFor(13)).toMatchObject({ week: 2, index: 0, pass: 1 });
    expect(pickFor(24)).toMatchObject({ week: 3, index: 2, pass: 2 });
  });
  it('pasadas las 24 sesiones se repite la última semana', () => {
    expect(pickFor(25)).toMatchObject({ week: 3, index: 0, pass: 1 });
    expect(pickFor(30)).toMatchObject({ week: 3, index: 2, pass: 2 });
    expect(pickFor(0)).toMatchObject({ week: 0, index: 0, pass: 1 });
  });
  it('la sesión avanza con los días en que se practicó, no con el calendario', () => {
    const log = Object.fromEntries([day('2026-12-01'), day('2026-12-02', []), day('2026-12-04'), day('2026-12-05'), day('2026-11-20')]);
    // 4 y 5 cuentan (con algo tildado); el 2 no (nada tildado) y el 20 de noviembre es anterior al comienzo
    expect(sessionNumber(log, MP.startDay, D('2026-12-06'))).toBe(1 + 3);
    // el día de hoy no se cuenta dos veces aunque ya tenga algo tildado
    expect(sessionNumber(log, MP.startDay, D('2026-12-05'))).toBe(1 + 2);
    expect(sessionNumber({}, MP.startDay, D('2026-12-01'))).toBe(1);
  });
});

describe('plan del mes', () => {
  it('es vigente sólo este mes y mientras existan los focos y el tema', () => {
    const d = new Date(2026, 11, 10);
    expect(monthOf(d)).toBe('2026-12');
    expect(monthActive(MP, d, TUNES)).toBe(true);
    expect(monthActive(MP, new Date(2027, 0, 2), TUNES)).toBe(false);
    expect(monthActive(EMPTY_MONTH, d, TUNES)).toBe(false);
    expect(monthActive({ ...MP, tech: 'inexistente' }, d, TUNES)).toBe(false);
    expect(monthActive({ ...MP, rep: 'u:borrado' }, d, TUNES)).toBe(false);
    expect(monthActive({ ...MP, rep: 'u:abcd' }, d, TUNES)).toBe(true);
    expect(monthName('2026-12')).toBe('diciembre');
    expect(repertoireName('u:abcd', TUNES)).toBe('Autumn Leaves');
    expect(repertoireName('blues-f', [])).toMatch(/Blues/);
    expect(repertoireName('zzz', TUNES)).toBeNull();
  });

  it('son tres bloques sin minutos: calentamiento, el foco del día y el repertorio', () => {
    const d = new Date(2026, 11, 10);
    expect(buildMonthPlan(d, MP, 1, 'Autumn Leaves').blocks.map((b) => b.id)).toEqual(['warm', 'tech', 'rep']);
    expect(buildMonthPlan(d, MP, 2, 'Autumn Leaves').blocks.map((b) => b.id)).toEqual(['warm', 'lang', 'rep']);
    expect(buildMonthPlan(d, MP, 1, 'X').blocks.every((b) => !('minutes' in b))).toBe(true);
  });

  it('técnica y lenguaje se alternan y cada foco avanza una tarea por vez: tres por semana, doce en el mes', () => {
    const f = [1, 2, 3, 4, 5, 6, 7, 8, 13, 24, 25, 26].map(focusPick);
    expect(f.map((x) => [x.area, x.pick.week, x.pick.index])).toEqual([
      ['tech', 0, 0], ['lang', 0, 0], ['tech', 0, 1], ['lang', 0, 1], ['tech', 0, 2], ['lang', 0, 2], ['tech', 1, 0], ['lang', 1, 0],
      ['tech', 2, 0], ['lang', 3, 2], ['tech', 3, 0], ['lang', 3, 0],
    ]);
    expect(focusPick(0)).toMatchObject({ area: 'tech', pick: { week: 0, index: 0 } });
    // en un mes (24 sesiones) cada foco pasa por sus doce tareas distintas
    const tareas = (area: string) => new Set(Array.from({ length: 24 }, (_, i) => focusPick(i + 1)).filter((x) => x.area === area).map((x) => `${x.pick.week}:${x.pick.index}`));
    expect(tareas('tech').size).toBe(12);
    expect(tareas('lang').size).toBe(12);
  });

  it('cada área trabaja su foco: título, semana y la tarea que corresponde a la sesión', () => {
    const d = new Date(2026, 11, 10);
    const s1 = buildMonthPlan(d, MP, 1, 'Autumn Leaves');
    expect(s1.month).toEqual({ week: 0, session: 1 });
    const [, tech, rep] = s1.blocks;
    expect(tech.title).toBe('Técnica: Nota larga y articulación');
    expect(buildMonthPlan(d, MP, 2, 'Autumn Leaves').blocks[1].title).toBe('Lenguaje: Tríadas mayores');
    expect(rep.title).toBe('Repertorio: Autumn Leaves');
    expect((tech.detail[0] as string)).toMatch(/^Semana 1 de 4 · Sonido y ataque\./);
    expect(typeof tech.detail[1]).toBe('object'); // la tarea (con su explicación)
    expect(tech.detail).toHaveLength(2);
    // el repertorio se repite dos veces por semana y la segunda avisa que hay que exigirse un poco más
    const s4 = buildMonthPlan(d, MP, 4, 'Autumn Leaves');
    expect(s4.blocks[2].detail).toHaveLength(3);
    expect(s4.blocks[2].detail[1]).toMatch(/Segunda vez esta semana/);
    // las sesiones impares recorren las tres tareas de técnica de la semana y la 7 cambia de semana
    const t = (n: number) => (buildMonthPlan(d, MP, n, 'X').blocks[1].detail.at(-1) as { id: string }).id;
    expect(new Set([t(1), t(3), t(5)]).size).toBe(3);
    expect(t(7)).not.toBe(t(1));
    expect(buildMonthPlan(d, MP, 7, 'X').month!.week).toBe(1);
  });

  it('los enlaces salen con la tonalidad del día y el tema elegido', () => {
    const d = new Date(2026, 11, 10);
    const plan = buildMonthPlan(d, { ...MP, rep: 'u:abcd' }, 1, 'Autumn Leaves');
    const rep = plan.blocks[2];
    expect(rep.link).toBe('#/playalong?p=u%3Aabcd');
    const lang = buildMonthPlan(d, MP, 8, 'X').blocks[1]; // semana 2: tríadas dentro de cada acorde
    expect(lang.link).toBe(`#/playalong?p=ii-v-i&k=${plan.key}`);
    expect(plan.blocks.every((b) => !b.link || !/[{}]/.test(b.link))).toBe(true);
    // el nombre del tema se usa en los textos del repertorio
    expect(REPERTOIRE_WEEKS('Autumn Leaves')[0].goal).toContain('Autumn Leaves');
  });

  it('datos guardados dañados se limpian: sólo quedan focos que existen y un mes válido', () => {
    expect(sanitizeMonth(MP)).toEqual(MP);
    expect(sanitizeMonth({ month: 'diciembre', tech: 'x', lang: 7, rep: 'ok', startDay: -4 })).toEqual({ rep: 'ok', startDay: 0 });
    expect(sanitizeMonth([])).toBeNull();
  });
});

describe('sesión corregida a mano', () => {
  const log = { '2026-12-04': { done: ['hoy'], minutes: 0 }, '2026-12-05': { done: ['hoy'], minutes: 0 } };
  const base = { startDay: MP.startDay };
  it('sin ajuste es la que se cuenta sola', () => {
    expect(sesionDelMes(log, base, D('2026-12-06'))).toBe(sessionNumber(log, MP.startDay, D('2026-12-06')));
  });
  it('el ajuste se suma, y nunca baja de la sesión 1', () => {
    const auto = sessionNumber(log, MP.startDay, D('2026-12-06'));
    expect(sesionDelMes(log, { ...base, ajuste: 2 }, D('2026-12-06'))).toBe(auto + 2);
    expect(sesionDelMes(log, { ...base, ajuste: -50 }, D('2026-12-06'))).toBe(1);
  });
});

describe('ajuste guardado', () => {
  it('se limita a ±50, se redondea y el 0 o lo dañado se descarta', () => {
    expect((sanitizeMonth({ ...MP, ajuste: 3.4 }) as { ajuste?: number }).ajuste).toBe(3);
    expect((sanitizeMonth({ ...MP, ajuste: 999 }) as { ajuste?: number }).ajuste).toBe(50);
    expect((sanitizeMonth({ ...MP, ajuste: 0 }) as { ajuste?: number }).ajuste).toBeUndefined();
    expect((sanitizeMonth({ ...MP, ajuste: 'x' }) as { ajuste?: number }).ajuste).toBeUndefined();
  });
});
