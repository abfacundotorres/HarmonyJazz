import { describe, expect, it } from 'vitest';
import { parseChord } from '../theory/chords';
import { traducirAcorde } from './coleccionAcordes';

describe('traducir acordes de una colección', () => {
  it('lo que el motor ya entiende pasa igual y sin aviso', () => {
    for (const c of ['Dm7', 'G7', 'Cmaj7', 'Bb7', 'F#m7b5', 'Eb6', 'C7alt', 'Abmaj7', 'C7/E', 'G7b9']) {
      expect(traducirAcorde(c), c).toEqual({ sym: c });
    }
  });
  it('equivalentes exactos: 07 es °7, h7 es m7♭5 y m/maj7 es m(maj7), también con bajo', () => {
    expect(traducirAcorde('B07')?.sym).toBe('Bdim7');
    expect(traducirAcorde('B07')?.nota).toBeUndefined();
    expect(traducirAcorde('Ab07')?.sym).toBe('Abdim7');
    expect(traducirAcorde('Eh7')?.sym).toBe('Em7b5');
    expect(traducirAcorde('Cm/maj7')).toEqual({ sym: 'CmMaj7' });
    expect(traducirAcorde('Fm/maj7/E')).toEqual({ sym: 'FmMaj7/E' });
  });
  it('lo aproximado lo dice', () => {
    expect(traducirAcorde('Caug')).toEqual({ sym: 'C7#5', nota: 'aumentado → 7♯5' });
    expect(traducirAcorde('G7b9sus')?.sym).toBe('G7sus');
    expect(traducirAcorde('G7b9sus')?.nota).toMatch(/7sus/);
    expect(traducirAcorde('Gmb6')?.sym).toBe('Gm');
    expect(traducirAcorde('Bb7b5b9')?.sym).toBe('Bb7alt');
    expect(traducirAcorde('F9b5')?.sym).toBe('F7#11');
    expect(traducirAcorde('Cmaj7#5')?.sym).toBe('Cmaj7');
    expect(traducirAcorde('F#0')?.sym).toBe('F#dim7');
  });
  it('los paréntesis: «(C7)» es un acorde alternativo y se usa; «C7(Gm7)» descarta el alternativo', () => {
    expect(traducirAcorde('(C7)')).toEqual({ sym: 'C7', nota: 'acorde alternativo (entre paréntesis) → acorde común' });
    expect(traducirAcorde('C7(Gm7)')).toEqual({ sym: 'C7', nota: 'se omitió el acorde alternativo entre paréntesis' });
    expect(traducirAcorde('Bbm6/Eb(Gm7b5)')?.sym).toBe('Bbm6/Eb');
  });
  it('lo vacío o ilegible da null', () => {
    expect(traducirAcorde('')).toBeNull();
    expect(traducirAcorde('   ')).toBeNull();
    expect(traducirAcorde('Zz9')).toBeNull();
    expect(traducirAcorde('hola')).toBeNull();
    expect(traducirAcorde('()')).toBeNull();
  });
  it('todo lo que devuelve lo entiende el motor de acordes', () => {
    for (const c of ['B07', 'Cm/maj7', 'Caug', 'G7b9sus', 'Gmb6', 'Bb7b5b9', 'F9b5', 'A13#9', '(C7)', 'C7(Gm7)', 'Dmaug', 'Cadd9', 'Gsus', 'Cm(add9)']) {
      const t = traducirAcorde(c);
      expect(t, c).not.toBeNull();
      expect(() => parseChord(t!.sym), c).not.toThrow();
    }
  });
});
