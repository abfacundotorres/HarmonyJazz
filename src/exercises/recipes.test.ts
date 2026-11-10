import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { mod, pc } from '../theory/notes';
import { GENERATORS, generatorById } from './generators';
import { analyzeLick } from './lickAnalysis';

const OPT = { low: 55, high: 77 };
const chart = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7');
const degrees = (id: string, bar: number) => {
  const notes = generatorById(id).run(chart, OPT);
  return analyzeLick(notes, chart).filter((r) => r.bar === bar).map((r) => r.degree);
};
const pcsOf = (id: string, bar: number) => {
  const notes = generatorById(id).run(chart, OPT);
  return generatorById(id).run(chart, OPT).filter((n) => n.pitch && Math.floor(n.start / 8) + 1 === bar).map((n) => mod(pc(n.pitch!), 12)).concat(notes.length ? [] : []);
};

describe('las recetas dicen lo que cada generador hace', () => {
  it('todos los generadores tienen receta', () => {
    for (const g of GENERATORS) expect(g.recipe.length, g.id).toBeGreaterThan(30);
  });

  it('guide: una nota por acorde y es la 3ª o la 7ª', () => {
    const rows = analyzeLick(generatorById('guide').run(chart, OPT), chart);
    expect(rows.map((r) => r.bar)).toEqual([1, 2, 3, 4]);
    expect(rows[0].degree).toBe('♭3');
    for (const r of rows) expect(r.guide).toBe(true);
  });

  it('guide2: la 3ª y después la 7ª, en blancas', () => {
    expect(degrees('guide2', 1)).toEqual(['♭3', '♭7']);
    expect(degrees('guide2', 2)).toEqual(['3', '♭7']);
    const n = generatorById('guide2').run(chart, OPT);
    expect(n.slice(0, 2).map((x) => x.dur)).toEqual([4, 4]);
  });

  it('arp: 1–3–5–7–9–7–5–3', () => {
    expect(degrees('arp', 1)).toEqual(['1', '♭3', '5', '♭7', '9', '♭7', '5', '♭3']);
    expect(degrees('arp', 3)).toEqual(['1', '3', '5', '7', '9', '7', '5', '3']);
  });

  it('arp3: alterna 3–5–7–9–7–5–3–1 y 9–7–5–3–5–7–9–7', () => {
    expect(degrees('arp3', 1)).toEqual(['♭3', '5', '♭7', '9', '♭7', '5', '♭3', '1']);
    expect(degrees('arp3', 2)).toEqual(['9', '♭7', '5', '3', '5', '♭7', '9', '♭7']);
  });

  it('digital: 1–9–3–5 y 3–5–7–9', () => {
    expect(degrees('digital', 1)).toEqual(['1', '9', '♭3', '5', '♭3', '5', '♭7', '9']);
    expect(degrees('digital', 3)).toEqual(['1', '9', '3', '5', '3', '5', '7', '9']);
  });

  it('enclosure: arriba, abajo y la 3ª como objetivo', () => {
    const rows = analyzeLick(generatorById('enclosure').run(chart, OPT), chart).filter((r) => r.bar === 3);
    expect(rows[0].tags).toContain('enclosure (arriba)');
    expect(rows[1].tags).toContain('enclosure (abajo)');
    expect(rows[2].degree).toBe('3');
    expect(rows[2].tags).toContain('objetivo del enclosure');
    expect(rows.slice(3).map((r) => r.degree)).toEqual(['5', '7', '9', '7']);
  });

  it('bebop sobre el dominante: 1–7–♭7–6–5–4–3–2 y las notas del acorde en los tiempos', () => {
    const rows = analyzeLick(generatorById('bebop').run(chart, OPT), chart).filter((r) => r.bar === 2);
    expect(rows.map((r) => r.degree)).toEqual(['1', '7', '♭7', '13', '5', '11', '3', '9']);
    expect(rows.filter((r) => r.strong).every((r) => r.kind === 'chord')).toBe(true);
  });

  it('pent: las notas son de la pentatónica elegida, subiendo en pares y bajando en impares', () => {
    const f = new Set([5, 7, 9, 0, 2]); // pentatónica mayor de F sobre Dm7
    const g = new Set([7, 9, 11, 2, 4]); // pentatónica mayor de G sobre G7
    expect(pcsOf('pent', 1).every((x) => f.has(x))).toBe(true);
    expect(pcsOf('pent', 2).every((x) => g.has(x))).toBe(true);
    const notes = generatorById('pent').run(chart, OPT);
    const ms = (bar: number) => notes.filter((n) => n.pitch && Math.floor(n.start / 8) + 1 === bar).map((n) => (n.pitch!.octave + 1) * 12 + [0, 2, 4, 5, 7, 9, 11][n.pitch!.letter] + n.pitch!.acc);
    expect(ms(1)[0]).toBeLessThan(ms(1)[3]); // sube
    expect(ms(2)[0]).toBeGreaterThan(ms(2)[3]); // baja
  });

  it('triads: las notas son de dos tríadas sin notas en común', () => {
    const set = new Set([5, 9, 0, 7, 11, 2]); // F A C + G B D sobre Dm7
    expect(pcsOf('triads', 1).every((x) => set.has(x))).toBe(true);
  });

  it('sideslip: en los impares, el arpegio medio tono arriba y luego el real', () => {
    const rows = analyzeLick(generatorById('sideslip').run(chart, OPT), chart).filter((r) => r.bar === 2);
    expect(rows.length).toBe(8);
    expect(pcsOf('sideslip', 2).slice(0, 4)).toEqual([8, 0, 3, 6]); // A♭ C E♭ G♭
    expect(rows.slice(4).map((r) => r.degree)).toEqual(['♭7', '5', '3', '1']);
  });

  it('displaced: una corchea de silencio al principio', () => {
    const n = generatorById('displaced').run(chart, OPT);
    expect(n[0].pitch).toBeNull();
    expect(n[0].dur).toBe(1);
    expect(n[1].start).toBe(1);
  });
});
