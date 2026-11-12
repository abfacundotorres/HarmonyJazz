import { describe, expect, it } from 'vitest';
import { CONCERT_KEYS, parseChart } from '../theory/chart';
import { parseChord } from '../theory/chords';
import { diatonic, TEMPLATES, templateBars, transposeBars, transposeKey } from './chartTemplates';
import { compileDoc } from './chartDoc';

describe('acordes de la tonalidad', () => {
  it('mayor: C, B♭ y D♭ con la ortografía de jazz', () => {
    expect(diatonic('C').map((d) => d.sym)).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
    expect(diatonic('Bb').map((d) => d.sym)).toEqual(['Bbmaj7', 'Cm7', 'Dm7', 'Ebmaj7', 'F7', 'Gm7', 'Am7b5']);
    expect(diatonic('Db').map((d) => d.sym)).toEqual(['Dbmaj7', 'Ebm7', 'Fm7', 'Gbmaj7', 'Ab7', 'Bbm7', 'Cm7b5']);
  });
  it('menor: C menor con V7 dominante', () => {
    expect(diatonic('C', true).map((d) => d.sym)).toEqual(['Cm7', 'Dm7b5', 'Ebmaj7', 'Fm7', 'G7', 'Abmaj7', 'Bb7']);
  });
  it('todos son acordes válidos en las 12 tonalidades', () => {
    for (const k of CONCERT_KEYS) for (const minor of [false, true]) for (const d of diatonic(k, minor)) expect(() => parseChord(d.sym), `${k} ${d.sym}`).not.toThrow();
  });
});

describe('plantillas', () => {
  it('ii–V–I en B♭ y D♭', () => {
    expect(templateBars('ii-v-i', 'Bb').map((b) => b.chords.join(' '))).toEqual(['Cm7', 'F7', 'Bbmaj7', 'Bbmaj7']);
    expect(templateBars('ii-v-i', 'Db').map((b) => b.chords.join(' '))).toEqual(['Ebm7', 'Ab7', 'Dbmaj7', 'Dbmaj7']);
  });
  it('el blues en F es el de la progresión de la app', () => {
    expect(templateBars('blues', 'F').map((b) => b.chords.join(' ')).join(' | ')).toBe(
      'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7b5 D7b9 | Gm7 | C7 | F7 D7b9 | Gm7 C7',
    );
  });
  it('rhythm changes A en B♭ es el de la progresión de la app', () => {
    expect(templateBars('rhythm-a', 'Bb').map((b) => b.chords.join(' ')).join(' | ')).toBe(
      'Bbmaj7 G7b9 | Cm7 F7 | Dm7 G7b9 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Ab7 | Dm7 G7b9 | Cm7 F7',
    );
  });
  it('turnaround y ii–V–i menor', () => {
    expect(templateBars('turnaround', 'C').map((b) => b.chords.join(' '))).toEqual(['Cmaj7 A7b9', 'Dm7 G7']);
    expect(templateBars('ii-v-i-minor', 'C').map((b) => b.chords.join(' '))).toEqual(['Dm7b5', 'G7alt', 'Cm6', 'Cm6']);
  });
  it('todas se leen y se compilan en las 12 tonalidades', () => {
    for (const t of TEMPLATES) {
      for (const k of CONCERT_KEYS) {
        const bars = templateBars(t.id, k);
        expect(() => compileDoc({ bars }), `${t.id} en ${k}`).not.toThrow();
        expect(() => parseChart(compileDoc({ bars })), `${t.id} en ${k}`).not.toThrow();
      }
    }
  });
  it('la cadena de ii–V baja por cuartas', () => {
    expect(templateBars('cycle', 'C').map((b) => b.chords.join(' '))).toEqual(['Dm7 G7', 'Gm7 C7', 'Cm7 F7', 'Fm7 Bb7']);
  });
});

describe('transponer la grilla', () => {
  it('sube un tono, conserva los % y deja los símbolos inválidos como están', () => {
    const out = transposeBars([{ chords: ['Dm7'] }, { chords: ['%'] }, { chords: ['G7', 'Cmaj7'], section: 'A' }, { chords: ['Xyz'] }], 2);
    expect(out.map((b) => b.chords.join(' '))).toEqual(['Em7', '%', 'A7 Dmaj7', 'Xyz']);
    expect(out[2].section).toBe('A');
  });
  it('ida y vuelta de un semitono vuelve al original', () => {
    const bars = templateBars('blues', 'F');
    expect(transposeBars(transposeBars(bars, 1), -1)).toEqual(bars);
  });
  it('usa bemoles al bajar (B7 → B♭7, no A♯7) y conserva el bajo de un acorde con inversión', () => {
    expect(transposeBars([{ chords: ['B7'] }, { chords: ['Cmaj7/E'] }], -1).map((b) => b.chords[0])).toEqual(['Bb7', 'Bmaj7/Eb']);
  });
  it('tonalidad transpuesta', () => {
    expect(transposeKey('C', 5)).toBe('F');
    expect(transposeKey('C', 10)).toBe('Bb');
  });
});
