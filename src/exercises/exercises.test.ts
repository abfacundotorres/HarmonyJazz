import { describe, expect, it } from 'vitest';
import { analyzePc } from '../theory/chords';
import { chordAt, parseChart, CONCERT_KEYS, keyInterval, transposeChart } from '../theory/chart';
import { BB_TRUMPET, midi, pc } from '../theory/notes';
import { PROGRESSIONS } from '../content/progressions';
import { lickInKey, parseLine } from '../content/licks';
import { FIXTURE_LICKS as LICKS } from './fixtures';
import { GENERATORS, generatorById, triadPair } from './generators';
import abcjs from 'abcjs';
import { toAbc, toAbcMap } from './abc';
import { parseChord } from '../theory/chords';

const OPT = { low: 55, high: 77 }; // concierto ≈ escrito A3–G5

describe('generadores', () => {
  for (const g of GENERATORS) {
    it(`${g.id}: cubre la carta sin huecos ni superposiciones y respeta el rango`, () => {
      // los generadores de líneas son de 4/4: las formas en 3/4 y 6/8 sólo sirven para el play-along
      for (const p of PROGRESSIONS.filter((x) => !x.chart.startsWith('@'))) {
        const chart = parseChart(p.chart);
        const notes = g.run(chart, OPT);
        const total = chart.bars * 8;
        const sorted = [...notes].sort((a, b) => a.start - b.start);
        let t = 0;
        for (const n of sorted) {
          expect(n.start, `${p.id}`).toBe(t);
          expect(n.dur).toBeGreaterThan(0);
          t += n.dur;
          if (n.pitch) {
            expect(midi(n.pitch)).toBeGreaterThanOrEqual(OPT.low - 5);
            expect(midi(n.pitch)).toBeLessThanOrEqual(OPT.high + 5);
          }
        }
        expect(t, `${g.id} en ${p.id}`).toBe(total);
      }
    });
  }

  it('guide tones: siempre 3ª o 7ª y saltos chicos', () => {
    const chart = parseChart(PROGRESSIONS.find((p) => p.id === 'rhythm')!.chart);
    const notes = generatorById('guide').run(chart, OPT);
    notes.forEach((n, i) => {
      const cc = chordAt(chart, n.start)!;
      expect(analyzePc(cc.chord, pc(n.pitch!)).guide).toBe(true);
      if (i > 0) expect(Math.abs(midi(n.pitch!) - midi(notes[i - 1].pitch!))).toBeLessThanOrEqual(7);
    });
  });

  it('enclosure: la nota larga es la 3ª', () => {
    const chart = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7');
    const notes = generatorById('enclosure').run(chart, OPT);
    for (const cc of chart.chords) {
      const target = notes.find((n) => n.start === cc.start + 2)!;
      expect(analyzePc(cc.chord, pc(target.pitch!)).degree).toMatch(/^b?3$/);
    }
  });

  it('bebop: notas del acorde en tiempo fuerte sobre el V', () => {
    const chart = parseChart('G7');
    const notes = generatorById('bebop').run(chart, OPT);
    for (const n of notes.filter((x) => x.start % 2 === 0)) {
      expect(analyzePc(chart.chords[0].chord, pc(n.pitch!)).role).toBe('chord');
    }
  });

  it('pares de tríadas: sin notas en común', () => {
    for (const s of ['Dm7', 'G7alt', 'Cmaj7', 'Bm7b5', 'Cm6', 'A7b9', 'Bdim7', 'G7sus', 'C7#5']) {
      const [a, b] = triadPair(parseChord(s))!;
      const pa = new Set(a.map(pc));
      expect(b.some((n) => pa.has(pc(n))), s).toBe(false);
    }
  });

  it('las notas de los pares de tríadas pertenecen a la escala-acorde', () => {
    for (const s of ['Dm7', 'G7alt', 'Cmaj7', 'Bm7b5', 'Cm6', 'A7b9', 'Bdim7', 'G7sus']) {
      const c = parseChord(s);
      for (const n of triadPair(c)!.flat()) expect(analyzePc(c, pc(n)).role, `${s}`).not.toBe('chromatic');
    }
  });
});

describe('licks', () => {
  it('duran exactamente lo que la carta', () => {
    for (const l of LICKS) {
      const total = parseLine(l.line).reduce((s, n) => s + n.dur, 0);
      expect(total, l.id).toBe(parseChart(l.chart).bars * 8);
    }
  });

  it('se transponen a las 12 tonalidades dentro del rango', () => {
    for (const l of LICKS) {
      for (const k of CONCERT_KEYS) {
        const { notes } = lickInKey(l, k, OPT);
        for (const n of notes) if (n.pitch) expect(midi(n.pitch)).toBeLessThanOrEqual(OPT.high + 4);
      }
    }
  });
});

describe('ABC', () => {
  it('genera notación escrita para trompeta', () => {
    const chart = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7');
    const abc = toAbc(chart, generatorById('arp').run(chart, OPT), { transpose: BB_TRUMPET, key: 'C', mode: 'major' });
    expect(abc).toContain('K:D');
    expect(abc).toContain('"Em7"');
    expect(abc).toContain('"A7"');
    expect(abc).toContain('"Dmaj7"');
    expect(abc.trim().endsWith('|]')).toBe(true);
  });

  it('todas las combinaciones generan ABC sin errores', () => {
    for (const p of PROGRESSIONS.filter((x) => !x.chart.startsWith('@'))) {
      for (const k of ['C', 'Gb', 'B']) {
        const chart = p.key ? transposeChart(parseChart(p.chart), keyInterval(p.key, k)) : parseChart(p.chart);
        for (const g of GENERATORS) {
          const abc = toAbc(chart, g.run(chart, OPT), { transpose: BB_TRUMPET, key: p.key ? k : null, mode: p.mode });
          const bars = abc.split('\n').slice(4).join(' ').split(/\|\]?/).filter((x) => x.trim());
          expect(bars.length, `${p.id}/${g.id}`).toBe(chart.bars);
        }
      }
    }
  });
});

describe('mapa de notas de la partitura', () => {
  const chart = parseChart('Dm7 G7 | Cmaj7 | Cmaj7');
  const note = (start: number, dur: number, letter: number, octave = 4) => ({ start, dur, pitch: { letter, acc: 0, octave } });
  it('cada nota que suena apunta a su primera pieza dibujada, aunque una nota larga se parta en ligadas', () => {
    // re (corchea) · sol (negra) · do larga de 3 compases... cruza el cambio de acorde y las barras
    const notes = [note(0, 1, 1), note(1, 2, 4), note(3, 13, 0, 5), note(16, 8, 4)];
    const { abc, firstPiece } = toAbcMap(chart, notes, { transpose: { steps: 0, semis: 0 }, key: 'C', mode: 'major' });
    expect(firstPiece).toHaveLength(4);
    // contando en el ABC las notas dibujadas (sin silencios), la i-ésima pieza inicial es la de cada nota
    const body = abc.split('\n').slice(4).join(' ').replace(/"[^"]*"/g, '');
    const drawn = [...body.matchAll(/[\^_=]*[A-Ga-g][,']*\d*-?/g)].map((m) => m[0]);
    expect(drawn[firstPiece[0]]).toMatch(/^D/);
    expect(drawn[firstPiece[1]]).toMatch(/^G/);
    expect(drawn[firstPiece[2]]).toMatch(/^c/);
    expect(drawn[firstPiece[3]]).toMatch(/^G/);
    // la nota larga ocupó más de una pieza: la siguiente empieza varias posiciones después
    expect(firstPiece[3] - firstPiece[2]).toBeGreaterThan(1);
    expect(toAbc(chart, notes, { transpose: { steps: 0, semis: 0 }, key: 'C', mode: 'major' })).toBe(abc);
  });
  it('los silencios no cuentan como notas dibujadas', () => {
    const notes = [{ start: 0, dur: 2, pitch: null }, note(2, 2, 2), { start: 4, dur: 2, pitch: null }, note(6, 2, 4)];
    const { firstPiece } = toAbcMap(chart, notes, { transpose: { steps: 0, semis: 0 }, key: 'C', mode: 'major' });
    expect(firstPiece).toEqual([0, 1]);
  });
});

describe('partitura en 3/4 y 6/8', () => {
  const note = (start: number, dur: number, letter: number, octave = 4) => ({ start, dur, pitch: { letter, acc: 0, octave } });
  const opt = { transpose: { steps: 0, semis: 0 }, key: 'C', mode: 'major' as const };

  it('3/4: el compás del encabezado, seis corcheas por compás y la partitura se lee sin avisos', () => {
    const chart = parseChart('@3/4 Dm7 | G7 C7 | Cmaj7');
    const notes = [note(0, 2, 1), note(2, 1, 3), note(3, 1, 4), note(4, 2, 5), note(6, 6, 4), note(12, 6, 0, 5)];
    const abc = toAbc(chart, notes, opt);
    expect(abc).toContain('M:3/4');
    const [tune] = abcjs.parseOnly(abc);
    expect(tune.warnings ?? []).toEqual([]);
    // tres compases de seis corcheas = 18 corcheas = 9 negras
    const body = abc.split('\n').slice(4).join(' ');
    expect(body.split('|').filter((b) => b.trim() && b.trim() !== ']').length).toBe(3);
  });

  it('6/8: las notas no cruzan el pulso (una negra con puntillo que empieza a media corchea se parte y se liga)', () => {
    const chart = parseChart('@6/8 Am7 | D7');
    const notes = [note(0, 1, 5), note(1, 3, 4), note(4, 2, 2), note(6, 6, 1, 5)];
    const abc = toAbc(chart, notes, opt);
    expect(abc).toContain('M:6/8');
    const [tune] = abcjs.parseOnly(abc);
    expect(tune.warnings ?? []).toEqual([]);
    const body = abc.split('\n').slice(4).join(' ').replace(/"[^"]*"/g, '');
    // la nota de 3 corcheas que arranca en la corchea 1 queda como 2 + 1 ligadas; no hay negras de 4 corcheas en 6/8
    expect(body).toMatch(/G2- G/);
    expect(body).not.toMatch(/[A-Ga-g]4/);
  });

  it('una nota que dura el compás entero es una blanca con puntillo (6) en 3/4 y 6/8', () => {
    for (const m of ['3/4', '6/8']) {
      const abc = toAbc(parseChart(`@${m} Dm7 | G7`), [note(0, 6, 1), note(6, 6, 4)], opt);
      expect(abc).toMatch(/D6.*\|.*G6/);
      expect(abcjs.parseOnly(abc)[0].warnings ?? []).toEqual([]);
    }
  });

  it('en 4/4 la partitura no cambia', () => {
    const abc = toAbc(parseChart('Dm7 | G7'), [note(0, 8, 1), note(8, 8, 4)], opt);
    expect(abc).toContain('M:4/4');
  });
});
