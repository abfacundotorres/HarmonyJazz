import { describe, expect, it } from 'vitest';
import { analyzePc } from '../theory/chords';
import { chordAt, parseChart, CONCERT_KEYS, keyInterval, transposeChart } from '../theory/chart';
import { BB_TRUMPET, midi, pc } from '../theory/notes';
import { PROGRESSIONS } from '../content/progressions';
import { lickInKey, parseLine } from '../content/licks';
import { FIXTURE_LICKS as LICKS } from './fixtures';
import { GENERATORS, generatorById, triadPair } from './generators';
import { toAbc } from './abc';
import { parseChord } from '../theory/chords';

const OPT = { low: 55, high: 77 }; // concierto ≈ escrito A3–G5

describe('generadores', () => {
  for (const g of GENERATORS) {
    it(`${g.id}: cubre la carta sin huecos ni superposiciones y respeta el rango`, () => {
      for (const p of PROGRESSIONS) {
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
    for (const p of PROGRESSIONS) {
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
