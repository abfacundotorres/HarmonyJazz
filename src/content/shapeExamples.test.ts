import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { CONCERT_KEYS } from '../theory/chart';
import { degreeNote, midi, mod, parseNote, pc } from '../theory/notes';
import { FOCI } from './focus';
import { abcOf } from './practice';
import { arpUpDown, barUnits, cycleRoots, extended, FORMULA, iiVI, tonicOf } from './shapeAbc';
import { EXAMPLES } from './shapeExamples';
import { HIGH, LOW } from './techniqueAbc';

describe('pentagramas de ejemplo de los focos nuevos', () => {
  it('cada ejemplo pertenece a una tarea que existe y la tarea lo trae', () => {
    const tasks = new Map(FOCI.flatMap((f) => f.weeks.flatMap((w) => w.tasks)).map((t) => [t.id, t]));
    for (const id of Object.keys(EXAMPLES)) {
      expect(tasks.has(id), id).toBe(true);
      expect(typeof tasks.get(id)!.abc, id).toBe('function');
      expect(tasks.get(id)!.abcCaption, id).toBe(EXAMPLES[id].caption);
    }
  });

  it('hay muchísimos: al menos 30 ejemplos y más de 300 compases en cada tonalidad', () => {
    expect(Object.keys(EXAMPLES).length).toBeGreaterThanOrEqual(30);
    for (const k of CONCERT_KEYS) {
      const t = tonicOf(k);
      const bars = Object.values(EXAMPLES).reduce((n, e) => n + e.bars(t).length, 0);
      expect(bars, k).toBeGreaterThan(300);
    }
  });

  it('cada compás dura 8 corcheas, cabe en el registro de la trompeta y no está vacío', () => {
    for (const k of CONCERT_KEYS) {
      const t = tonicOf(k);
      for (const [id, e] of Object.entries(EXAMPLES)) {
        for (const [i, b] of e.bars(t).entries()) {
          expect(Math.round(barUnits(b) * 1000) / 1000, `${id} compás ${i + 1} en ${k}`).toBe(8);
          const ms = b.cells.flatMap((c) => (c.p ? [midi(c.p)] : []));
          expect(ms.length, `${id} compás ${i + 1}`).toBeGreaterThan(0);
          expect(Math.min(...ms), `${id} compás ${i + 1} en ${k}`).toBeGreaterThanOrEqual(LOW);
          expect(Math.max(...ms), `${id} compás ${i + 1} en ${k}`).toBeLessThanOrEqual(HIGH);
        }
      }
    }
  });

  it('se leen sin avisos en las doce tonalidades', () => {
    for (const k of CONCERT_KEYS) {
      for (const id of Object.keys(EXAMPLES)) {
        const task = FOCI.flatMap((f) => f.weeks.flatMap((w) => w.tasks)).find((t) => t.id === id)!;
        const abc = abcOf(task, k)!;
        const parsed = abcjs.parseOnly(abc)[0];
        expect(parsed.warnings ?? [], `${id} en ${k}`).toEqual([]);
      }
    }
  });

  it('las notas de cada arpegio son las de su acorde (en cualquier tonalidad)', () => {
    for (const k of CONCERT_KEYS) {
      const t = tonicOf(k);
      for (const r of cycleRoots(t)) {
        for (const [shape, degs] of Object.entries(FORMULA)) {
          const allowed = new Set(degs.map((d) => pc(degreeNote(r, d))));
          const b = arpUpDown(r, shape as keyof typeof FORMULA);
          for (const c of b.cells) if (c.p) expect(allowed.has(pc(c.p)), `${shape} sobre ${r.letter}`).toBe(true);
        }
      }
    }
  });

  it('el ciclo de cuartas pasa por las doce notas y el ii–V–I sale de la tonalidad', () => {
    const t = tonicOf('C');
    expect(new Set(cycleRoots(t).map(pc)).size).toBe(12);
    const { ii, v, i } = iiVI(t);
    expect([pc(ii), pc(v), pc(i)].map((n) => mod(n - pc(t), 12))).toEqual([2, 7, 0]);
  });

  it('las inversiones y octavas usan las mismas notas de la forma, siempre hacia arriba', () => {
    const r = parseNote('C');
    const e = extended(r, 'maj7');
    expect(e.map((p) => midi(p))).toEqual([...e.map((p) => midi(p))].sort((a, b) => a - b));
    expect(e).toHaveLength(8);
  });
});
