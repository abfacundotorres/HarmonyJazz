import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { parseLine } from './licks';
import { buildPhrase, PhraseInput, validatePhrase } from './phrases';

const base: PhraseInput = {
  name: 'Prueba', key: 'C', mode: 'major', level: 'Intermedio', tempo: 120,
  chart: 'Dm7 | G7 | Cmaj7 | Cmaj7',
  line: 'D4 F4 A4 C5 | B4 D5 F5 D5 | E5:2 C5:2 | r:4',
  idea: '', reading: 'C',
};

describe('frases cargadas a mano', () => {
  it('en concierto queda igual y se completa con silencio hasta el final', () => {
    const p = buildPhrase(base, 'x');
    expect(typeof p).not.toBe('string');
    if (typeof p === 'string') return;
    const total = parseLine(p.line).reduce((s, n) => s + n.dur, 0);
    expect(total).toBe(parseChart(p.chart).bars * 8);
    expect(p.key).toBe('C');
  });

  it('lo escrito para trompeta en Si♭ se pasa a concierto (2ª mayor abajo)', () => {
    const p = buildPhrase({ ...base, reading: 'Bb', chart: 'Em7 | A7 | Dmaj7 | Dmaj7', key: 'D', line: 'E4 G4 B4 D5' }, 'x');
    if (typeof p === 'string') throw new Error(p);
    expect(p.key).toBe('C');
    expect(p.chart).toBe('Dm7 | G7 | Cmaj7 | Cmaj7');
    expect(p.line.startsWith('D4 F4 A4 C5')).toBe(true);
  });

  it('rechaza lo inválido con un mensaje', () => {
    expect(buildPhrase({ ...base, name: ' ' }, 'x')).toMatch(/nombre/i);
    expect(buildPhrase({ ...base, chart: 'Xm7' }, 'x')).toMatch(/Cifrado/);
    expect(buildPhrase({ ...base, line: 'H4 C5' }, 'x')).toMatch(/Notas/);
    expect(buildPhrase({ ...base, line: 'r:8' }, 'x')).toMatch(/al menos una nota/);
    expect(buildPhrase({ ...base, chart: 'Dm7', line: 'D4 F4 A4 C5 D5 F5 A5 C6 D6' }, 'x')).toMatch(/ocupan/);
    expect(buildPhrase({ ...base, tempo: 5 }, 'x')).toMatch(/tempo/i);
  });

  it('una frase guardada vuelve a validar igual', () => {
    const p = buildPhrase(base, 'x');
    if (typeof p === 'string') throw new Error(p);
    expect(validatePhrase(p)).toEqual(p);
    expect(typeof validatePhrase({ id: 3 })).toBe('string');
  });
});
