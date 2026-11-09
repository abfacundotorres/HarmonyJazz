import { describe, expect, it } from 'vitest';
import { LICKS } from '../content/licks';
import { COMMON_EXERCISES, LICK_STUDY } from '../content/licksStudy';
import { BB_TRUMPET, INTERVAL } from '../theory/notes';
import { localizeNotes } from './localize';

const bb = (t: string, from = 'C', to = 'C') => localizeNotes(t, from, to, BB_TRUMPET);
const conc = (t: string, from = 'C', to = 'C') => localizeNotes(t, from, to, INTERVAL.P1);

describe('localizeNotes', () => {
  it('pasa de concierto a trompeta en Si♭ (una 2ª mayor arriba)', () => {
    expect(bb('Dm7 – D♭7 – Cmaj7')).toBe('Em7 – E♭7 – Dmaj7');
    expect(bb('F A♭ C')).toBe('G B♭ D');
    expect(bb('B D F G7alt')).toBe('C♯ E G A7alt');
  });
  it('sin transposición devuelve el mismo texto', () => {
    const t = 'La B llega después de la C: Dm7 → G7♭9 y B♭maj7, E♭, F♯.';
    expect(conc(t)).toBe(t);
  });
  it('sigue la tonalidad elegida', () => {
    expect(conc('Dm7 G7 Cmaj7', 'C', 'E♭'.replace('♭', 'b'))).toBe('Fm7 B♭7 E♭maj7');
    expect(bb('Dm7 G7 Cmaj7', 'C', 'Eb')).toBe('Gm7 C7 F' + 'maj7');
  });
  it('no toca palabras, siglas ni símbolos que no son notas', () => {
    const t = 'Así, las cuartas de GT (guide tone) en el ii–V–I: ♭7, 3ª, 13ª y 9ª. Do menor, Fa, Re. Cuartas, Dórico, Estos, Aplicalos, Blues.';
    expect(bb(t)).toBe(t);
    // Limitación conocida: una "A" suelta usada como preposición ("A veces") es indistinguible de la nota La.
    // Por eso los textos de estudio no la usan; lo verifica el test de más abajo.
  });
  it('respeta alteraciones y calidades largas', () => {
    expect(conc('G7♭9♭13, Dm7♭5, Cmaj7♯11', 'C', 'D')).toBe('A7♭9♭13, Em7♭5, Dmaj7♯11');
  });
});

describe('los textos de estudio', () => {
  const texts: [string, string][] = [];
  for (const l of LICKS) {
    texts.push([`${l.id}.idea`, l.idea], [`${l.id}.name`, l.name]);
    const st = LICK_STUDY[l.id];
    st.ideas.forEach((i, k) => texts.push([`${l.id}.ideas[${k}]`, `${i.name} ${i.text} ${i.why}`]));
    st.why.concat(st.exercises, st.trumpet).forEach((t, k) => texts.push([`${l.id}.t[${k}]`, t]));
  }
  COMMON_EXERCISES.forEach((t, k) => texts.push([`common[${k}]`, t]));

  it('no hay una "A" suelta usada como preposición (se confundiría con la nota La)', () => {
    for (const [where, t] of texts) expect(t, where).not.toMatch(/(^|[.:;!?¿¡("] ?)A [a-záéíóú]/);
  });

  it('todas las notas nombradas existen y se traducen a las 12 tonalidades sin error', () => {
    for (const [where, t] of texts) {
      for (const key of ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G']) {
        const out = bb(t, 'C', key);
        expect(out.length, `${where} en ${key}`).toBeGreaterThan(0);
        expect(out, `${where} en ${key}`).not.toMatch(/undefined|NaN/);
      }
    }
  });

  it('los nombres no usan "b" ni "#" ASCII para alteraciones (usan ♭ y ♯)', () => {
    for (const [where, t] of texts) expect(t, where).not.toMatch(/\b[A-G][b#]\d?\b/);
  });
});
