import { describe, expect, it } from 'vitest';
import { chartToString, keyInterval, parseChart, semitoneInterval, sliceChart, transposeChart } from '../theory/chart';
import { normalizeChartText, parseImport, tuneToProgression, validateTune } from './library';

describe('normalizeChartText', () => {
  it('limpia secciones, repeticiones y saltos de línea', () => {
    const raw = '[A] Dm7 | G7 |: Cmaj7 | A7 :|\n[B] Dm7 G7 || Cmaj7 {Em7} *A';
    const c = parseChart(normalizeChartText(raw));
    expect(chartToString(c)).toBe('| Dm7 | G7 | Cmaj7 | A7 | Dm7 G7 | Cmaj7 | Em7 |');
  });
  it('no rompe acordes con paréntesis', () => {
    expect(chartToString(parseChart(normalizeChartText('Cm(maj7) | Dm7')))).toBe('| Cm(maj7) | Dm7 |');
  });
});

describe('validateTune', () => {
  const ok = { name: 'Mi tema', key: 'Eb', mode: 'major', chart: 'Ebmaj7 | Cm7', tempo: 130, style: 'bossa' };
  it('acepta un tema válido y lo normaliza', () => {
    const t = validateTune({ ...ok, chart: '[A] Ebmaj7 || Cm7' });
    expect(t).toMatchObject({ name: 'Mi tema', key: 'Eb', style: 'bossa', chart: 'Ebmaj7 | Cm7' });
  });
  it('rechaza lo inválido con un mensaje', () => {
    expect(typeof validateTune({ ...ok, name: '  ' })).toBe('string');
    expect(typeof validateTune({ ...ok, name: 'x'.repeat(81) })).toBe('string');
    expect(typeof validateTune({ ...ok, chart: 'Hm7 | G7' })).toBe('string');
    expect(typeof validateTune({ ...ok, chart: '' })).toBe('string');
    expect(typeof validateTune({ ...ok, chart: 'C D E F G | C' })).toBe('string'); // 5 acordes en un compás
    expect(typeof validateTune(null)).toBe('string');
  });
  it('sanea campos fuera de rango', () => {
    const t = validateTune({ ...ok, tempo: 9999, key: 'H#', style: 'rock', id: '<script>' });
    expect(t).toMatchObject({ tempo: 320, key: null, style: 'swing' });
    expect((t as { id: string }).id).toMatch(/^u:[a-z0-9]+$/);
  });
  it('un tema se convierte en una progresión tocable', () => {
    const p = tuneToProgression(validateTune(ok) as never);
    expect(p.category).toBe('Mis temas');
    expect(() => parseChart(p.chart)).not.toThrow();
  });
});

describe('parseImport', () => {
  it('importa una lista y reporta los errores por tema', () => {
    const json = JSON.stringify({ tunes: [{ name: 'A', chart: 'Dm7 | G7' }, { name: '', chart: 'C' }, { name: 'C', chart: 'Zz' }] });
    const r = parseImport(json);
    expect(r.tunes.map((t) => t.name)).toEqual(['A']);
    expect(r.errors).toHaveLength(2);
  });
  it('rechaza archivos que no son JSON', () => {
    expect(parseImport('hola').errors[0]).toMatch(/JSON/);
    expect(parseImport('{"x":1}').errors[0]).toMatch(/lista/);
  });
});

describe('loops y transposición', () => {
  const chart = parseChart('Dm7 G7 | Cmaj7 | Am7 | D7 | Gmaj7');
  it('sliceChart recorta y reubica desde 0', () => {
    const s = sliceChart(chart, 1, 3);
    expect(s.bars).toBe(3);
    expect(s.chords.map((c) => [c.bar, c.start, c.dur])).toEqual([[0, 0, 8], [1, 8, 8], [2, 16, 8]]);
    expect(chartToString(s)).toBe('| Cmaj7 | Am7 | D7 |');
  });
  it('sliceChart acepta los extremos en cualquier orden y los limita', () => {
    expect(sliceChart(chart, 3, 1).bars).toBe(3);
    expect(sliceChart(chart, 3, 99).bars).toBe(2);
  });
  it('semitoneInterval da la ortografía de jazz', () => {
    const t = (n: number) => chartToString(transposeChart(parseChart('Cmaj7 | F7'), semitoneInterval(n)));
    expect(t(1)).toBe('| Dbmaj7 | Gb7 |');
    expect(t(6)).toBe('| Gbmaj7 | B7 |');
    expect(t(-1)).toBe('| Bmaj7 | E7 |');
    expect(t(12)).toBe('| Cmaj7 | F7 |');
  });
  it('transponer por tonalidad y por semitonos coinciden', () => {
    const a = chartToString(transposeChart(parseChart('Dm7 | G7 | Cmaj7'), keyInterval('C', 'Eb')));
    const b = chartToString(transposeChart(parseChart('Dm7 | G7 | Cmaj7'), semitoneInterval(3)));
    expect(a).toBe(b);
  });
});
