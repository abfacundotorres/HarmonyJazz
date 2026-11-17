import { describe, expect, it } from 'vitest';
import { barDurations, barLen, beatsPerBar, chartToString, chordAt, maxChordsPerBar, parseChart, pulseLen, sliceChart, splitMeter, transposeChart, keyInterval } from './chart';

describe('compases 3/4 y 6/8', () => {
  it('4/4 sigue igual: sin indicación, 8 corcheas, 4 pulsos', () => {
    const c = parseChart('Dm7 | G7 | Cmaj7');
    expect(c.meter).toBeUndefined();
    expect([barLen(c), pulseLen(c), beatsPerBar(c), maxChordsPerBar(c.meter)]).toEqual([8, 2, 4, 4]);
    expect(c.chords.map((x) => [x.start, x.dur])).toEqual([[0, 8], [8, 8], [16, 8]]);
    expect(parseChart('@4/4 Dm7 | G7').meter).toBeUndefined();
  });

  it('3/4: seis corcheas por compás, tres pulsos de negra', () => {
    const c = parseChart('@3/4 Dm7 | G7 C7 | Cmaj7 A7 D7');
    expect(c.meter).toBe('3/4');
    expect([barLen(c), pulseLen(c), beatsPerBar(c), maxChordsPerBar(c.meter)]).toEqual([6, 2, 3, 3]);
    // 1 acorde = todo el compás; 2 = 2+1 pulsos; 3 = un pulso cada uno
    expect(c.chords.map((x) => [x.bar, x.start, x.dur])).toEqual([[0, 0, 6], [1, 6, 4], [1, 10, 2], [2, 12, 2], [2, 14, 2], [2, 16, 2]]);
    expect(c.bars).toBe(3);
  });

  it('6/8: seis corcheas por compás, dos pulsos de negra con puntillo', () => {
    const c = parseChart('@6/8 Am7 | D7 Gmaj7 | %'.replace('%', 'Gmaj7'));
    expect(c.meter).toBe('6/8');
    expect([barLen(c), pulseLen(c), beatsPerBar(c), maxChordsPerBar(c.meter)]).toEqual([6, 3, 2, 2]);
    expect(c.chords.map((x) => [x.start, x.dur])).toEqual([[0, 6], [6, 3], [9, 3], [12, 6]]);
  });

  it('el "%" repite el compás anterior también en 3/4', () => {
    const c = parseChart('@3/4 Dm7 G7 | %');
    expect(c.chords.map((x) => x.chord.root.letter)).toEqual([1, 4, 1, 4]);
    expect(c.chords[3].start).toBe(10);
  });

  it('avisa cuando hay más acordes de los que entran', () => {
    expect(() => parseChart('@3/4 Dm7 G7 C7 Fmaj7 | G7')).toThrow(/Demasiados acordes en el compás 1.*3/);
    expect(() => parseChart('@6/8 Dm7 G7 C7 | G7')).toThrow(/entran hasta 2/);
    expect(() => parseChart('Dm7 G7 C7 Fmaj7 Bb7 | G7')).toThrow(/Demasiados acordes/);
  });

  it('chordAt da la vuelta con el largo del compás', () => {
    const c = parseChart('@3/4 Dm7 | G7');
    expect(chordAt(c, 0)!.chord.root.letter).toBe(1);
    expect(chordAt(c, 6)!.chord.root.letter).toBe(4);
    expect(chordAt(c, 11)!.chord.root.letter).toBe(4);
    expect(chordAt(c, 12)!.chord.root.letter).toBe(1); // 12 = 2 compases de 6: vuelve al principio
  });

  it('el recorte, la transposición y el texto conservan el compás', () => {
    const c = parseChart('@3/4 Dm7 | G7 | Cmaj7 | Am7');
    const s = sliceChart(c, 1, 2);
    expect(s.meter).toBe('3/4');
    expect(s.chords.map((x) => [x.bar, x.start])).toEqual([[0, 0], [1, 6]]);
    expect(transposeChart(c, keyInterval('C', 'F')).meter).toBe('3/4');
    expect(chartToString(c)).toBe('@3/4 | Dm7 | G7 | Cmaj7 | Am7 |');
    expect(parseChart(chartToString(c))).toEqual(c);
    expect(chartToString(parseChart('Dm7 | G7'))).toBe('| Dm7 | G7 |');
  });

  it('separa la indicación de compás del cifrado', () => {
    expect(splitMeter('@6/8 Am7 | D7')).toEqual({ meter: '6/8', body: 'Am7 | D7' });
    expect(splitMeter('  @3/4|Dm7')).toEqual({ meter: '3/4', body: '|Dm7' });
    expect(splitMeter('Dm7 | G7')).toEqual({ body: 'Dm7 | G7' });
    expect(splitMeter('@5/4 Dm7')).toEqual({ body: '@5/4 Dm7' });
  });

  it('duraciones por cantidad de acordes', () => {
    expect([1, 2, 3, 4, 5].map((n) => barDurations(n))).toEqual([[8], [4, 4], [4, 2, 2], [2, 2, 2, 2], null]);
    expect([1, 2, 3, 4].map((n) => barDurations(n, '3/4'))).toEqual([[6], [4, 2], [2, 2, 2], null]);
    expect([1, 2, 3].map((n) => barDurations(n, '6/8'))).toEqual([[6], [3, 3], null]);
  });
});
