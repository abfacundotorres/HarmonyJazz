import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { CONCERT_KEYS } from '../theory/chart';
import { FOCI, focusById, LANG_FOCI, REPERTOIRE_WEEKS, SESSIONS_PER_WEEK, TECH_FOCI, TRIAD_FACTS, triadDegrees, WEEKS, type FocusTask } from './focus';
import { LESSONS } from './lessons';
import { abcOf } from './practice';
import { PROGRESSIONS } from './progressions';

const allTasks = (): { where: string; t: FocusTask }[] => [
  ...FOCI.flatMap((f) => f.weeks.flatMap((w, i) => w.tasks.map((t, j) => ({ where: `${f.id} semana ${i + 1} tarea ${j + 1}`, t })))),
  ...REPERTOIRE_WEEKS('Tema de prueba').flatMap((w, i) => w.tasks.map((t, j) => ({ where: `repertorio semana ${i + 1} tarea ${j + 1}`, t }))),
];

describe('catálogo de focos', () => {
  it('hay focos de técnica y de lenguaje, con identificadores únicos', () => {
    expect(TECH_FOCI.length).toBeGreaterThanOrEqual(4);
    expect(LANG_FOCI.length).toBeGreaterThanOrEqual(4);
    expect(new Set(FOCI.map((f) => f.id)).size).toBe(FOCI.length);
    // los tres que se pidieron
    expect(TECH_FOCI.some((f) => f.title === 'Nota larga y articulación')).toBe(true);
    expect(LANG_FOCI.some((f) => f.title === 'Tríadas mayores')).toBe(true);
    expect(focusById('t-largas-artic')?.area).toBe('tecnica');
    expect(focusById('nada')).toBeUndefined();
  });

  it('cada foco son cuatro semanas con tres tareas, y cada semana dice qué busca', () => {
    expect([WEEKS, SESSIONS_PER_WEEK]).toEqual([4, 6]);
    for (const f of FOCI) {
      expect(f.summary.length, f.id).toBeGreaterThan(20);
      expect(f.weeks, f.id).toHaveLength(WEEKS);
      for (const w of f.weeks) {
        expect(w.title.length).toBeGreaterThan(3);
        expect(w.goal.length).toBeGreaterThan(15);
        expect(w.tasks, `${f.id}: ${w.title}`).toHaveLength(3);
      }
    }
    const rep = REPERTOIRE_WEEKS('X');
    expect(rep).toHaveLength(WEEKS);
    expect(rep.every((w) => w.tasks.length === 3)).toBe(true);
  });

  it('cada tarea tiene título, para qué sirve y pasos concretos', () => {
    for (const { where, t } of allTasks()) {
      expect(t.id, where).toMatch(/^[a-z0-9-]+$/);
      expect(t.short.length, where).toBeGreaterThan(15);
      expect(t.goal.length, where).toBeGreaterThan(15);
      expect(t.steps.length, where).toBeGreaterThanOrEqual(2);
      for (const s of t.steps) expect(s.length, where).toBeGreaterThan(10);
      expect(t.steps.join(' '), where).not.toMatch(/\bTODO\b|lorem ipsum|XXX/);
    }
  });

  it('los identificadores de las tareas propias no se repiten dentro de un mismo foco', () => {
    for (const f of FOCI) {
      const ids = f.weeks.flatMap((w) => w.tasks.map((t) => t.id));
      // una misma tarea de técnica puede volver en otra semana (se reutilizan ejercicios), pero no dos propias iguales
      const own = ids.filter((id) => id.startsWith('foco-'));
      expect(new Set(own).size, f.id).toBe(own.length);
    }
  });

  it('los enlaces apuntan a pantallas, lecciones y progresiones que existen', () => {
    for (const { where, t } of allTasks()) {
      if (!t.link) continue;
      expect(t.linkLabel, where).toBeTruthy();
      const m = /^#\/(\w+)(?:\/([\w-]+))?(?:\?(.*))?$/.exec(t.link);
      expect(m, `${where}: ${t.link}`).toBeTruthy();
      const [, page, sub, query] = m!;
      const q = new URLSearchParams(query ?? '');
      if (page === 'lecciones') {
        const lesson = LESSONS.find((l) => l.id === sub);
        expect(lesson, `${where}: lección ${sub}`).toBeTruthy();
        const ex = Number(q.get('ex'));
        expect(ex >= 0 && ex < lesson!.exercises.length, `${where}: ejercicio ${ex}`).toBe(true);
      } else if (page === 'playalong') {
        const p = q.get('p')!;
        expect(p === '{rep}' || PROGRESSIONS.some((x) => x.id === p), `${where}: progresión ${p}`).toBe(true);
      } else expect(['transcribir', 'escucha'], `${where}: ${page}`).toContain(page);
      // sólo se usan estos dos marcadores
      expect(t.link.replace(/\{k\}|\{rep\}/g, ''), where).not.toMatch(/[{}]/);
    }
  });

  it('los pentagramas de las tareas se leen sin avisos en las doce tonalidades', () => {
    let n = 0;
    for (const { where, t } of allTasks()) {
      for (const k of CONCERT_KEYS) {
        const abc = abcOf(t, k);
        if (!abc) continue;
        n++;
        expect(abcjs.parseOnly(abc)[0].warnings ?? [], `${where} en ${k}`).toEqual([]);
      }
    }
    expect(n).toBeGreaterThan(100);
  });

  it('la tabla de tríadas coincide con la teoría: cada tríada mayor cae en los grados que dice', () => {
    for (const f of TRIAD_FACTS) for (const t of f.triads) expect(triadDegrees(f.chord, t.root), `${t.root} sobre ${f.chord}`).toBe(t.degrees);
    // y los textos del foco de tríadas la citan
    const mapa = focusById('l-triadas-mayores')!.weeks[1].tasks[0].steps.join(' ');
    for (const f of TRIAD_FACTS) expect(mapa).toContain(f.chord);
    expect(mapa).toContain('F mayor (♭3-5-♭7)');
    expect(mapa).toContain('G mayor (5-7-9)');
  });

  it('el repertorio nombra el tema elegido y cada semana tiene su meta', () => {
    const rep = REPERTOIRE_WEEKS('Mi tema');
    expect(rep[0].goal).toContain('Mi tema');
    expect(rep[1].goal).toContain('Mi tema');
    expect(rep[0].tasks[0].short).toContain('Mi tema');
  });
});
