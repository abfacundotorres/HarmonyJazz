import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { CONCERT_KEYS } from '../theory/chart';
import { midi, pc } from '../theory/notes';
import { FOCI } from './focus';
import { ideaBars, poolPitches, SETS } from './ideas';
import { barUnits, tonicOf } from './shapeAbc';
import { HIGH, LOW } from './techniqueAbc';

const withIdeas = () => FOCI.flatMap((f) => f.weeks.flatMap((w) => w.tasks)).filter((t) => t.ideas);

describe('ideas de lenguaje', () => {
  it('hay muchísimas: todas las tareas de los cuatro focos traen 10 ideas (480 en total)', () => {
    const ts = withIdeas();
    expect(ts.length).toBe(48);
    expect(ts.reduce((n, t) => n + t.ideas!.count, 0)).toBe(480);
    for (const t of ts) expect(t.ideas!.caption.length, t.id).toBeGreaterThan(40);
  });

  it('se leen sin avisos en las doce tonalidades y traen todas las ideas', () => {
    for (const k of CONCERT_KEYS) {
      for (const t of withIdeas()) {
        const abc = t.ideas!.abc(k);
        expect(abcjs.parseOnly(abc)[0].warnings ?? [], `${t.id} en ${k}`).toEqual([]);
        expect((abc.match(/Idea \d+/g) ?? []).length, `${t.id} en ${k}`).toBe(t.ideas!.count);
      }
    }
  });

  for (const [name, mk] of Object.entries(SETS)) {
    describe(`material «${name}»`, () => {
      it('cada compás dura 8 corcheas, cabe en el registro y usa sólo notas del material', () => {
        for (const k of CONCERT_KEYS) {
          const set = mk(tonicOf(k));
          for (const seed of [0, 1, 2, 3, 4, 5]) {
            const bars = ideaBars(set, 10, seed);
            expect(bars).toHaveLength(30);
            bars.forEach((b, i) => {
              const pos = i % 3;
              expect(Math.round(barUnits(b) * 1000) / 1000, `${name} ${k} compás ${i}`).toBe(8);
              const allowed = new Set(set.pools[pos].flatMap((p) => p.notes.map(pc)));
              for (const c of b.cells) {
                if (!c.p) continue;
                expect(midi(c.p), `${name} ${k}`).toBeGreaterThanOrEqual(LOW);
                expect(midi(c.p), `${name} ${k}`).toBeLessThanOrEqual(HIGH);
                // la nota final puede ser de las del acorde (3ª o 5ª) aunque no esté en el material elegido
                if (!(pos === 2 && c === b.cells[b.cells.length - 1])) expect(allowed.has(pc(c.p)), `${name} ${k} compás ${i}`).toBe(true);
              }
            });
          }
        }
      });

      it('cada idea cierra en una nota larga que es la 3ª o la 5ª del último acorde, y la conducción es suave', () => {
        for (const k of CONCERT_KEYS) {
          const set = mk(tonicOf(k));
          const targets = new Set(set.targets.map(pc));
          const bars = ideaBars(set, 10, 2);
          let prevLast: number | null = null;
          bars.forEach((b, i) => {
            const notes = b.cells.filter((c) => c.p);
            if (i % 3 === 2) {
              const last = notes[notes.length - 1];
              expect(last.d, `${name} ${k}`).toBeGreaterThanOrEqual(4);
              expect(targets.has(pc(last.p!)), `${name} ${k} compás ${i}`).toBe(true);
            }
            if (prevLast !== null && i % 3 !== 0) expect(Math.abs(midi(notes[0].p!) - prevLast), `${name} ${k} compás ${i}`).toBeLessThanOrEqual(7);
            prevLast = midi(notes[notes.length - 1].p!);
          });
        }
      });

      it('las ideas son distintas entre sí', () => {
        const set = mk(tonicOf('C'));
        const sig = (bs: ReturnType<typeof ideaBars>) => bs.map((b) => b.cells.map((c) => (c.p ? midi(c.p) : 'z') + ':' + c.d).join(',')).join('|');
        const ideas = ideaBars(set, 10, 0);
        const uniq = new Set(Array.from({ length: 10 }, (_, j) => sig(ideas.slice(j * 3, j * 3 + 3))));
        expect(uniq.size).toBeGreaterThanOrEqual(9);
        // y otra semilla da otras ideas
        expect(sig(ideaBars(set, 10, 1))).not.toBe(sig(ideas));
      });
    });
  }

  it('el conjunto de alturas está ordenado y dentro del registro', () => {
    const ps = poolPitches(SETS.cuatroNotas(tonicOf('C')).pools[0][0].notes);
    expect(ps.map(midi)).toEqual([...ps.map(midi)].sort((a, b) => a - b));
    expect(ps.length).toBeGreaterThan(6);
  });
});
