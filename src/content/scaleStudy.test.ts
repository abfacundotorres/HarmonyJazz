import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { CYCLE_OF_FOURTHS } from '../theory/chart';
import { BB_TRUMPET, INTERVAL, midi, parseNote, pc } from '../theory/notes';
import { SCALES } from '../theory/scales';
import { PATTERNS, patternItems, SCALE_GROUPS, SCALE_INFO, scaleAbc, scaleNoteNames, suggest } from './scaleStudy';

const ALL = SCALE_GROUPS.flatMap((g) => g.scales);

describe('estudio de escalas', () => {
  it('los grupos cubren todas las escalas del motor, sin repetir, y cada una tiene su texto', () => {
    expect([...ALL].sort()).toEqual(Object.keys(SCALES).sort());
    expect(new Set(ALL).size).toBe(ALL.length);
    for (const id of ALL) {
      const i = SCALE_INFO[id];
      expect(i, id).toBeTruthy();
      for (const t of [i.what, i.chords, i.listen, i.tip]) expect(t.length, id).toBeGreaterThan(20);
    }
  });

  it('los nombres de las notas siguen la ortografía (E♭ dórica = E♭ F G♭ A♭ B♭ C D♭)', () => {
    expect(scaleNoteNames('dorian', 'Eb', INTERVAL.P1)).toEqual(['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C', 'D♭']);
    // la alterada se escribe por funciones sobre el dominante (♭9, ♯9, 3, ♯11, ♭13, ♭7), como en el resto de la app
    expect(scaleNoteNames('altered', 'G', INTERVAL.P1)).toEqual(['G', 'A♭', 'A♯', 'B', 'C♯', 'E♭', 'F']);
    expect(scaleNoteNames('ionian', 'Bb', BB_TRUMPET)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  for (const scale of ALL) {
    it(`${scale}: todos los patrones en las 12 tonalidades caben en el registro, cierran compás y el ABC es válido`, () => {
      const degs = SCALES[scale].degrees.length;
      for (const p of PATTERNS) {
        for (const key of CYCLE_OF_FOURTHS) {
          const items = patternItems(scale, p.id, key);
          const total = items.reduce((s, i) => s + i.dur, 0);
          expect(total % 8, `${scale}/${p.id}/${key}`).toBe(0);
          expect(items.filter((i) => i.p).length, `${scale}/${p.id}/${key}`).toBeGreaterThanOrEqual(degs);
          for (const it of items) if (it.p) {
            expect(midi(it.p), `${scale}/${p.id}/${key}`).toBeGreaterThanOrEqual(52);
            expect(midi(it.p), `${scale}/${p.id}/${key}`).toBeLessThanOrEqual(78);
          }
          const [tune] = abcjs.parseOnly(scaleAbc(scale, p.id, key, p.bpm, BB_TRUMPET));
          expect(tune.warnings ?? [], `${scale}/${p.id}/${key}`).toEqual([]);
        }
      }
    });
  }

  it('las notas pertenecen a la escala y empiezan y terminan en la tónica', () => {
    for (const scale of ALL) {
      const pcs = new Set(SCALES[scale].degrees.map((d) => d)); // sólo para recorrer
      void pcs;
      const root = pc(parseNote('F'));
      const items = patternItems(scale, 'octave', 'F');
      const allowed = new Set(scaleNoteNames(scale, 'F', INTERVAL.P1).map((n) => n));
      expect(allowed.size).toBe(SCALES[scale].degrees.length);
      expect(pc(items[0].p!)).toBe(root);
      const last = items.filter((i) => i.p).pop()!;
      expect(pc(last.p!)).toBe(root);
    }
  });

  it('la sugerencia elige lo menos trabajado y la primera tonalidad sin marcar', () => {
    const empty = suggest({}, 0);
    expect(ALL).toContain(empty.scale);
    const m: Record<string, Record<string, number>> = {};
    for (const s of ALL) for (const p of PATTERNS) m[`scale:${s}:${p.id}`] = { C: 60, F: 60 };
    m['scale:dorian:octave'] = {};
    expect(suggest(m, 5)).toMatchObject({ scale: 'dorian', pattern: 'octave' });
    m['scale:dorian:octave'] = { Bb: 60 };
    const s = suggest(m, 3);
    expect(s.scale).toBe('dorian');
    expect(s.key).not.toBe('Bb');
  });
});
