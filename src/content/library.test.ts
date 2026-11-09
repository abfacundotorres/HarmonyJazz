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

import { parseBulk, parseKeySpec } from './library';

describe('parseKeySpec', () => {
  it('entiende las formas habituales', () => {
    expect(parseKeySpec('G')).toEqual({ key: 'G', mode: 'major' });
    expect(parseKeySpec('Gm')).toEqual({ key: 'G', mode: 'minor' });
    expect(parseKeySpec('g minor')).toEqual({ key: 'G', mode: 'minor' });
    expect(parseKeySpec('Bb')).toEqual({ key: 'Bb', mode: 'major' });
    expect(parseKeySpec('F# menor')).toEqual({ key: 'Gb', mode: 'minor' });
    expect(parseKeySpec('C♯m')).toEqual({ key: 'Db', mode: 'minor' });
    expect(parseKeySpec('Ebmaj')).toEqual({ key: 'Eb', mode: 'major' });
    expect(parseKeySpec('E#')).toEqual({ key: 'F', mode: 'major' });
  });
  it('rechaza lo que no entiende', () => {
    expect(parseKeySpec('H')).toBeNull();
    expect(parseKeySpec('Do menor')).toBeNull();
    expect(parseKeySpec('')).toBeNull();
  });
});

describe('parseBulk', () => {
  const text = `# Autumn Leaves
compositor: J. Kosma
tonalidad: G menor
tempo: 140
estilo: swing
[A] Cm7 | F7 | Bbmaj7 | Ebmaj7 |
Am7b5 | D7 | Gm | %

# Un blues sin tonalidad
F7 | Bb7 | F7 | F7

# Termina en tónica
Dm7 | G7 | Cmaj7

# Mal cifrado
Dm7 | Zz9 | G7

# Sin cifrado
tempo: 120

#
Dm7 | G7
`;
  const r = parseBulk(text);

  it('separa los temas y reporta la línea de cada uno', () => {
    expect(r.map((e) => [e.line, e.name])).toEqual([
      [1, 'Autumn Leaves'], [9, 'Un blues sin tonalidad'], [12, 'Termina en tónica'], [15, 'Mal cifrado'], [18, 'Sin cifrado'], [21, ''],
    ]);
  });
  it('lee los metadatos y limpia el cifrado', () => {
    const t = r[0].tune!;
    expect(t).toMatchObject({ name: 'Autumn Leaves', composer: 'J. Kosma', key: 'G', mode: 'minor', tempo: 140, style: 'swing' });
    expect(t.chart).toBe('Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7 | Gm | %');
    expect(r[0].bars).toBe(8);
  });
  it('no deduce la tonalidad si el último acorde no es una tónica', () => {
    expect(r[1].tune!.key).toBeNull(); // termina en F7
    expect(r[1].notes.join(' ')).toMatch(/Sin tonalidad fija/);
  });
  it('deduce la tonalidad del último acorde cuando es una tónica clara, y lo avisa', () => {
    expect(r[2].tune).toMatchObject({ key: 'C', mode: 'major' });
    expect(r[2].notes.join(' ')).toMatch(/deducida/);
  });
  it('marca los temas con error sin frenar a los demás', () => {
    expect(r[3].tune).toBeNull();
    expect(r[3].error).toMatch(/Zz9|Calidad/);
    expect(r[4].error).toMatch(/cifrado/);
    expect(r[5].error).toMatch(/nombre/);
    expect(r.filter((e) => e.tune).length).toBe(3);
  });
  it('avisa si no hay ningún tema o hay texto suelto antes del primero', () => {
    expect(parseBulk('Dm7 | G7')[0].error).toMatch(/empezar con una línea/);
    const withStray = parseBulk('texto suelto\n# Tema\nDm7 | G7 | Cmaj7');
    expect(withStray[0].tune).not.toBeNull();
    expect(withStray[0].notes.join(' ')).toMatch(/ignoraron/);
  });
  it('acepta saltos de línea de Windows y un BOM', () => {
    const e = parseBulk('﻿# Tema\r\nDm7 | G7 |\r\nCmaj7\r\n');
    expect(e[0].tune!.chart).toBe('Dm7 | G7 | Cmaj7');
  });
  it('un estilo o tonalidad ilegibles generan un aviso y no un error', () => {
    const e = parseBulk('# T\ntonalidad: xx\nestilo: polka\nDm7 | G7');
    expect(e[0].tune).not.toBeNull();
    expect(e[0].notes.join(' ')).toMatch(/tonalidad/);
    expect(e[0].notes.join(' ')).toMatch(/estilo/);
  });
});
