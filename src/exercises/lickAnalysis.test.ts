import { describe, expect, it } from 'vitest';
import { LICKS, lickById, lickInKey, parseLine } from '../content/licks';
import { CONCERT_KEYS, parseChart } from '../theory/chart';
import { pitchName } from '../theory/notes';
import { analyzeLick, intervalName, lickStats } from './lickAnalysis';

const OPT = { low: 55, high: 77 };
const run = (id: string) => {
  const l = lickById(id);
  const chart = parseChart(l.chart);
  return { rows: analyzeLick(parseLine(l.line), chart), chart };
};

describe('analizador de frases', () => {
  it('nombra los intervalos', () => {
    expect(intervalName(1)).toBe('2ª menor');
    expect(intervalName(-7)).toBe('5ª justa');
    expect(intervalName(12)).toBe('octava');
    expect(intervalName(14)).toBe('2ª mayor + octava');
  });

  it('bebop descendente: la 5ª, 3ª, fundamental y ♭7 caen en los cuatro tiempos de G7', () => {
    const { rows } = run('bebop-scale-251');
    const bar2 = rows.filter((r) => r.bar === 2);
    const strong = bar2.filter((r) => r.strong);
    expect(strong.map((r) => [pitchName(r.pitch), r.degree, r.kind])).toEqual([
      ['D5', '5', 'chord'], ['B4', '3', 'chord'], ['G4', '1', 'chord'], ['F4', '♭7', 'chord'],
    ]);
    const passing = bar2.find((r) => pitchName(r.pitch) === 'F#4')!;
    expect(passing.degree).toBe('7');
    expect(passing.strong).toBe(false);
  });

  it('la E que baja del V se sostiene y es la 3ª del acorde siguiente (anticipación)', () => {
    for (const id of ['bebop-scale-251', 'anticipation-251']) {
      const { rows, chart } = run(id);
      const tied = rows.filter((r) => r.tieTo);
      expect(tied, id).toHaveLength(1);
      expect(pitchName(tied[0].pitch)).toBe('E4');
      expect(tied[0].tieTo!.degree).toBe('3');
      expect(chart.chords[tied[0].tieTo!.chordIndex].chord.quality).toBe('maj7');
    }
  });

  it('detecta el enclosure y su objetivo', () => {
    const { rows } = run('enclosure-251');
    const i = rows.findIndex((r) => r.tags.includes('enclosure (arriba)'));
    expect(rows.filter((r) => r.tags.includes('enclosure (arriba)'))).toHaveLength(1);
    expect(rows[i + 1].tags).toContain('enclosure (abajo)');
    expect(pitchName(rows[i + 2].pitch)).toBe('E4');
    expect(rows[i + 2].tags).toContain('objetivo del enclosure');
  });

  it('detecta la nota azul según el acorde', () => {
    const blues = run('blues-blue-note').rows;
    const ab = blues.find((r) => pitchName(r.pitch) === 'Ab4' && r.bar === 1)!;
    expect(ab.tags).toContain('nota azul (♭3)');
    const minor = run('minor-blues-4').rows.filter((r) => r.tags.includes('nota azul (♭5)'));
    expect(minor.map((r) => pitchName(r.pitch))).toEqual(['Gb4', 'Gb4']);
  });

  it('sustitución tritonal: llega a un guide tone en los 4 acordes y la F es nota común', () => {
    const { rows, chart } = run('tritone-chrom');
    const st = lickStats(rows, chart);
    expect(st.guideLandings).toBe(st.changes);
    const f = rows.find((r) => r.bar === 2)!;
    expect(f.interval!.dir).toBe('=');
    expect(f.degree).toBe('3');
  });

  it('el backdoor conecta por la E: ♯11 de B♭7 y 3ª de Cmaj7', () => {
    const { rows } = run('backdoor');
    const e = rows.filter((r) => pitchName(r.pitch) === 'E4');
    expect(e[0].degree).toBe('♯11');
    expect(e[0].kind).toBe('tension');
    expect(e[1].degree).toBe('3');
  });

  it('estadísticas coherentes', () => {
    for (const l of LICKS) {
      const { rows, chart } = run(l.id);
      const st = lickStats(rows, chart);
      expect(st.notes, l.id).toBe(rows.length);
      expect(st.chordOnStrong, l.id).toBeLessThanOrEqual(st.strongNotes);
      expect(st.stepwise + st.leaps, l.id).toBe(rows.length - 1);
      expect(st.highest, l.id).toBeGreaterThanOrEqual(st.lowest);
    }
  });
});

describe('las frases en las 12 tonalidades', () => {
  const signature = (id: string, key: string) => {
    const l = lickById(id);
    const { chart, notes } = lickInKey(l, key, OPT);
    return analyzeLick(notes, chart).map((r) => `${r.bar}.${r.beat}|${r.degree}|${r.kind}|${r.interval?.semis ?? '-'}|${r.tags.join('+')}`);
  };
  for (const l of LICKS) {
    it(`${l.id}: el análisis es idéntico en todas las tonalidades`, () => {
      const base = signature(l.id, l.key);
      for (const k of CONCERT_KEYS) expect(signature(l.id, k), `${l.id} en ${k}`).toEqual(base);
    });
  }
});
