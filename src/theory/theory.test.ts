import { describe, expect, it } from 'vitest';
import { analyzePc, chordSymbol, chordTones, parseChord, transposeChord } from './chords';
import { parseChart, transposeChart, keyInterval, chartToString } from './chart';
import {
  BB_TRUMPET, degreeNote, midi, noteName, parseNote, parsePitch, pc, pitchName, placeNear, simplify, transposePitch,
} from './notes';
import { scaleNotes } from './scales';
import { buildVoicing } from './voicings';
import { PROGRESSIONS } from '../content/progressions';

const names = (ns: { letter: number; acc: number }[]) => ns.map((n) => noteName(n)).join(' ');

describe('notas', () => {
  it('midi y parsing', () => {
    expect(midi(parsePitch('C4'))).toBe(60);
    expect(midi(parsePitch('Bb3'))).toBe(58);
    expect(midi(parsePitch('B#3'))).toBe(60);
    expect(midi(parsePitch('Cb4'))).toBe(59);
  });

  it('trompeta en Si♭ escribe una 2ª mayor arriba', () => {
    const w = (s: string) => pitchName(transposePitch(parsePitch(s), BB_TRUMPET));
    expect(w('Bb3')).toBe('C4');
    expect(w('Eb4')).toBe('F4');
    expect(w('F#4')).toBe('G#4');
    expect(w('B4')).toBe('C#5');
    expect(w('C5')).toBe('D5');
  });

  it('simplifica ortografías incómodas', () => {
    expect(noteName(simplify(parseNote('Cb')))).toBe('B');
    expect(noteName(simplify(parseNote('E#')))).toBe('F');
    expect(noteName(simplify(parseNote('Ebb')))).toBe('D');
    expect(noteName(simplify(parseNote('F##')))).toBe('G');
    expect(noteName(simplify(parseNote('Bb')))).toBe('Bb');
  });

  it('grados', () => {
    const c = parseNote('C');
    expect(noteName(degreeNote(c, 'b9'))).toBe('Db');
    expect(noteName(degreeNote(c, '#11'))).toBe('F#');
    expect(noteName(degreeNote(parseNote('Db'), 'b9'))).toBe('Ebb');
  });

  it('placeNear respeta la dirección', () => {
    const e = parseNote('E');
    expect(midi(placeNear(e, 60, 'up'))).toBe(64);
    expect(midi(placeNear(e, 60, 'down'))).toBe(52);
    expect(midi(placeNear(e, 62, 'near'))).toBe(64);
  });
});

describe('escalas', () => {
  it('alterada con ortografía de jazz', () => {
    expect(names(scaleNotes(parseNote('G'), 'altered'))).toBe('G Ab A# B C# Eb F');
  });
  it('dórica y lidia ♭7', () => {
    expect(names(scaleNotes(parseNote('D'), 'dorian'))).toBe('D E F G A B C');
    expect(names(scaleNotes(parseNote('Bb'), 'lydianDominant'))).toBe('Bb C D E F G Ab');
  });
  it('disminuida semitono-tono', () => {
    expect(names(scaleNotes(parseNote('C'), 'halfWhole'))).toBe('C Db D# E F# G A Bb');
  });
});

describe('acordes', () => {
  it('parsea cifrados comunes', () => {
    const cases: [string, string][] = [
      ['Cmaj7', 'maj7'], ['C^7', 'maj7'], ['Dm7', 'm7'], ['D-7', 'm7'], ['Bø', 'm7b5'], ['Bm7b5', 'm7b5'],
      ['G7alt', '7alt'], ['G7#9', '7alt'], ['A7b9', '7b9'], ['Db7#11', '7#11'], ['Bdim7', 'dim7'], ['Cm6', 'm6'],
      ['F6', '6'], ['G7sus', '7sus'], ['G13', '7'], ['Bb', 'maj'], ['Cm(maj7)', 'mMaj7'],
    ];
    for (const [s, q] of cases) expect(parseChord(s).quality, s).toBe(q);
  });

  it('notas del acorde', () => {
    expect(names(chordTones(parseChord('Bdim7')))).toBe('B D F Ab');
    expect(names(chordTones(parseChord('F#m7b5')))).toBe('F# A C E');
  });

  it('transpone y simplifica raíces', () => {
    expect(chordSymbol(transposeChord(parseChord('Gb7'), BB_TRUMPET))).toBe('Ab7');
    expect(chordSymbol(transposeChord(parseChord('Bdim7'), keyInterval('C', 'Gb')))).toBe('Fdim7');
    expect(chordSymbol(transposeChord(parseChord('E7'), BB_TRUMPET))).toBe('F#7');
  });

  it('analiza el rol de cada nota', () => {
    const c7 = parseChord('C7alt');
    expect(analyzePc(c7, pc(parseNote('E')))).toMatchObject({ role: 'chord', guide: true });
    expect(analyzePc(c7, pc(parseNote('Ab')))).toMatchObject({ role: 'tension', degree: 'b13' });
    expect(analyzePc(c7, pc(parseNote('A'))).role).toBe('chromatic');
    const d = parseChord('Dm7');
    expect(analyzePc(d, pc(parseNote('B'))).role).toBe('tension');
  });
});

describe('cartas', () => {
  it('parsea compases y duraciones', () => {
    const c = parseChart('Dm7 G7 | Cmaj7 | % | Em7 A7 Dm7');
    expect(c.bars).toBe(4);
    expect(c.chords.map((x) => [x.start, x.dur])).toEqual([[0, 4], [4, 4], [8, 8], [16, 8], [24, 4], [28, 2], [30, 2]]);
  });

  it('todas las progresiones parsean', () => {
    for (const p of PROGRESSIONS) expect(() => parseChart(p.chart), p.id).not.toThrow();
  });

  it('transpone una carta', () => {
    const c = transposeChart(parseChart('Dm7 | G7 | Cmaj7'), keyInterval('C', 'Eb'));
    expect(chartToString(c)).toBe('| Fm7 | Bb7 | Ebmaj7 |');
  });

  it('ii-V-I por las 12 cubre las 12 tónicas', () => {
    const p = PROGRESSIONS.find((x) => x.id === 'ii-v-i-12')!;
    const tonics = parseChart(p.chart).chords.filter((c) => c.chord.quality === 'maj7').map((c) => pc(c.chord.root));
    expect(new Set(tonics).size).toBe(12);
  });
});

describe('voicings', () => {
  it('rootless con conducción de voces suave', () => {
    const chords = ['Dm7', 'G7', 'Cmaj7'].map(parseChord);
    let prev: number[] | null = null;
    const vs = chords.map((c) => (prev = buildVoicing(c, prev)));
    for (let i = 1; i < vs.length; i++) {
      const move = vs[i].reduce((s, n, k) => s + Math.abs(n - vs[i - 1][k]), 0);
      expect(move).toBeLessThanOrEqual(6);
    }
    // G7: 3, 13, b7, 9 → B E F A en alguna forma
    expect(new Set(vs[1].map((m) => m % 12))).toEqual(new Set([11, 4, 5, 9]));
  });
});
