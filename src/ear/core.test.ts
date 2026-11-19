import { describe, expect, it } from 'vitest';
import { chordTones, parseChord } from '../theory/chords';
import { CYCLE_OF_FOURTHS } from '../theory/chart';
import { noteName } from '../theory/notes';
import {
  ALL_ITEMS, CHORD_SETS, earDue, earReview, chordId, chordQuestion, guideToneQuestion, intervalId, intervalQuestion, INTERVAL_SEMIS, pickItem, QUALITY_DEFS, record, weight,
} from './core';

const seeded = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);

describe('intervalos', () => {
  it('la distancia sonada es la del intervalo, en el sentido pedido y dentro del registro', () => {
    const rng = seeded(1);
    for (const mode of ['asc', 'desc', 'harm'] as const)
      for (const s of INTERVAL_SEMIS)
        for (let k = 0; k < 30; k++) {
          const q = intervalQuestion(mode, s, rng);
          const [a, b] = q.events.map((e) => e.midi);
          expect(Math.abs(b - a)).toBe(s);
          if (mode === 'asc') expect(b).toBeGreaterThan(a);
          if (mode === 'desc') expect(b).toBeLessThan(a);
          expect(Math.min(a, b)).toBeGreaterThanOrEqual(53);
          expect(Math.max(a, b)).toBeLessThanOrEqual(79);
          expect(q.answer).toBe(String(s));
          expect(q.id).toBe(intervalId(mode, s));
          expect(q.events.every((e) => e.voice === (mode === 'harm' ? 'piano' : 'horn'))).toBe(true);
        }
  });
  it('ofrece los 12 intervalos sin repetir', () => {
    const q = intervalQuestion('asc', 7, seeded(2));
    expect(q.options).toHaveLength(12);
    expect(new Set(q.options.map((o) => o.label)).size).toBe(12);
  });
});

describe('comparar con lo que se contestó', () => {
  it('cada opción trae su sonido con la misma nota de partida', () => {
    const q = intervalQuestion('asc', 7, seeded(7));
    expect(Object.keys(q.optionEvents).sort()).toEqual(q.options.map((o) => o.id).sort());
    expect(q.optionEvents[q.answer]).toEqual(q.events);
    for (const o of q.options) expect(q.optionEvents[o.id][0].midi).toBe(q.events[0].midi);
    for (const s of INTERVAL_SEMIS) expect(q.optionEvents[String(s)][1].midi - q.events[0].midi).toBe(s);
    const c = chordQuestion('sevenths', 'block', 'dom7', seeded(8));
    expect(c.optionEvents.dom7).toEqual(c.events);
    expect(c.optionEvents.m7.map((e) => e.midi - c.events[0].midi)).toEqual(QUALITY_DEFS.m7.tones);
  });
});

describe('calidades de acorde', () => {
  it('las notas son las del acorde y la respuesta está entre las opciones', () => {
    const rng = seeded(3);
    for (const set of ['triads', 'sevenths'] as const)
      for (const mode of ['arp', 'block'] as const)
        for (const k of CHORD_SETS[set]) {
          const q = chordQuestion(set, mode, k, rng);
          const root = q.events[0].midi;
          expect(q.events.map((e) => e.midi - root)).toEqual(QUALITY_DEFS[k].tones);
          expect(q.options.map((o) => o.id)).toContain(q.answer);
          expect(q.id).toBe(chordId(mode, k));
          if (mode === 'block') expect(new Set(q.events.map((e) => e.start)).size).toBe(1);
          else expect(q.events.map((e) => e.start)).toEqual([...q.events.map((e) => e.start)].sort((x, y) => x - y));
        }
  });
});

describe('dictado de guide tones', () => {
  it('en las 12 tonalidades toca la 3ª o la 7ª de cada acorde, con conducción cercana', () => {
    const rng = seeded(4);
    for (const key of CYCLE_OF_FOURTHS)
      for (let k = 0; k < 10; k++) {
        const q = guideToneQuestion(key, rng);
        expect(q.slots).toHaveLength(3);
        const horn = q.events.filter((e) => e.voice === 'horn').map((e) => e.midi);
        expect(horn).toHaveLength(3);
        q.slots.forEach((s, i) => {
          const chord = parseChord(s.chord);
          const t = chordTones(chord);
          expect(noteName(s.names['3'])).toBe(noteName(t[1]));
          expect(noteName(s.names['7'])).toBe(noteName(t[3]));
          const pcOf = (n: typeof t[0]) => ((({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[noteName(n)[0]] + n.acc) % 12 + 12) % 12;
          expect(horn[i] % 12).toBe(pcOf(s.names[s.played]));
          if (i > 0) expect(Math.abs(horn[i] - horn[i - 1])).toBeLessThanOrEqual(6);
          expect(horn[i]).toBeGreaterThanOrEqual(55);
          expect(horn[i]).toBeLessThanOrEqual(76);
        });
        // el piano no toca la 3ª ni la 7ª
        const slotPcs = q.slots.map((s) => new Set([s.names['3'], s.names['7']].map((n) => ((('CDEFGAB'.indexOf(noteName(n)[0]) >= 0 ? [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(noteName(n)[0])] : 0) + n.acc) % 12 + 12) % 12)));
        q.events.filter((e) => e.voice === 'piano').forEach((e, i) => expect(slotPcs[Math.floor(i / 2)].has(e.midi % 12)).toBe(false));
      }
  });
  it('toca más la 7ª si es la que se falla, y las dos si no hay datos', () => {
    const count = (stats: Parameters<typeof guideToneQuestion>[2]) => {
      const rng = seeded(9);
      let sevens = 0;
      for (let i = 0; i < 300; i++) sevens += guideToneQuestion('C', rng, stats).slots.filter((x) => x.played === '7').length;
      return sevens / 900;
    };
    expect(count(undefined)).toBeGreaterThan(0.4);
    expect(count(undefined)).toBeLessThan(0.6);
    expect(count({ 'g:7': { n: 20, ok: 3, d: 1 }, 'g:3': { n: 20, ok: 20, d: 1 } })).toBeGreaterThan(0.75);
  });
  it('los acordes son ii7, V7 y Imaj7 de la tonalidad', () => {
    expect(guideToneQuestion('F', seeded(5)).slots.map((s) => s.chord)).toEqual(['Gm7', 'C7', 'Fmaj7']);
    expect(guideToneQuestion('Db', seeded(5)).slots.map((s) => s.chord)).toEqual(['Ebm7', 'Ab7', 'Dbmaj7']);
  });
});

describe('estadísticas y elección', () => {
  it('lo fallado pesa más que lo acertado y lo nuevo queda en el medio', () => {
    const s = record(record(record({}, 'a', true, 1), 'a', true, 1), 'b', false, 1);
    expect(weight(s.b)).toBeGreaterThan(weight(undefined));
    expect(weight(undefined)).toBeGreaterThan(weight(s.a));
  });
  it('no repite el anterior y favorece lo que se falla', () => {
    const stats = { x: { n: 20, ok: 2, d: 1 }, y: { n: 20, ok: 20, d: 1 }, z: { n: 20, ok: 20, d: 1 } };
    const rng = seeded(6);
    const c = { x: 0, y: 0, z: 0 } as Record<string, number>;
    for (let i = 0; i < 600; i++) c[pickItem(['x', 'y', 'z'], stats, rng, 'z')]++;
    expect(c.z).toBe(0);
    expect(c.x).toBeGreaterThan(c.y * 3);
    expect(pickItem(['solo'], {}, rng, 'solo')).toBe('solo');
  });
  it('los ítems del resumen son únicos', () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(3 * 12 + 2 * 8 + 2);
  });
});

describe('repaso del oído', () => {
  it('sin datos no hay nada para repasar', () => {
    const r = earReview({}, 100);
    expect(r).toEqual({ weak: [], idle: null });
    expect(earDue(r)).toBe(false);
  });
  it('lo flojo (3+ respuestas y menos de 70 %) sale primero lo peor; lo firme o con pocos datos no', () => {
    const stats = {
      [intervalId('asc', 6)]: { n: 6, ok: 2, d: 99 },
      [intervalId('asc', 5)]: { n: 4, ok: 2, d: 99 },
      [intervalId('asc', 7)]: { n: 10, ok: 9, d: 99 },
      [intervalId('asc', 1)]: { n: 2, ok: 0, d: 99 },
    };
    const r = earReview(stats, 100);
    expect(r.weak.map((w) => [w.label, w.group])).toEqual([['Tritono', 'Intervalos · Ascendente'], ['4ª justa', 'Intervalos · Ascendente']]);
    expect(r.idle).toBe(1);
    expect(earDue(r)).toBe(true);
  });
  it('si todo está firme avisa sólo cuando pasan tres días sin practicar', () => {
    const stats = { [intervalId('asc', 7)]: { n: 10, ok: 10, d: 90 } };
    expect(earDue(earReview(stats, 91))).toBe(false);
    expect(earDue(earReview(stats, 93))).toBe(true);
    expect(earReview(stats, 93).idle).toBe(3);
  });
});
