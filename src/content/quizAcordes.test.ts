import { describe, expect, it } from 'vitest';
import { chordSymbol } from '../theory/chords';
import { parseChart } from '../theory/chart';
import { acordesSeguidos, CONTEXTOS, OPCIONES, preguntaAcorde } from './quizAcordes';

const chart = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7 A7 | Dm7 | G7 | Cmaj7 | Cmaj7');
const sim = (c: { chord: Parameters<typeof chordSymbol>[0] }) => chordSymbol(c.chord);
/** Azar repetible: un generador congruencial simple. */
const azar = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

describe('quizAcordes', () => {
  it('une los acordes repetidos seguidos y conserva el compás donde empiezan', () => {
    const s = acordesSeguidos(chart);
    expect(s.map(sim)).toEqual(['Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7']);
    expect(s[3].bar).toBe(3);
  });

  it('cada pregunta tiene cuatro opciones distintas con la correcta adentro', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = preguntaAcorde(chart, azar(seed), { contexto: CONTEXTOS[seed % 3] });
      expect(p).not.toBeNull();
      const q = p!;
      expect(q.opciones).toHaveLength(OPCIONES);
      expect(new Set(q.opciones.map((o) => chordSymbol(o))).size).toBe(OPCIONES);
      expect(chordSymbol(q.opciones[q.acierto])).toBe(chordSymbol(q.correcta.chord));
    }
  });

  it('el contexto son los acordes anteriores, hasta los pedidos, y vacío al empezar', () => {
    const seg = acordesSeguidos(chart);
    for (let seed = 1; seed <= 200; seed++) {
      const p = preguntaAcorde(chart, azar(seed), { contexto: 2 })!;
      const i = p.indice;
      expect(p.contexto.map(sim)).toEqual(seg.slice(Math.max(0, i - 2), i).map(sim));
      expect(sim(p.correcta)).toBe(sim(seg[i]));
      expect(p.despues.map((c) => chordSymbol(c))).toEqual(seg.slice(i + 1, i + 3).map(sim));
      if (i === 0) expect(p.contexto).toEqual([]);
    }
  });

  it('con contexto 0 sólo se muestra el acorde preguntado', () => {
    const p = preguntaAcorde(chart, azar(7), { contexto: 0 })!;
    expect(p.contexto).toEqual([]);
  });

  it('no repite lo ya preguntado mientras queden otros acordes', () => {
    const vistos: number[] = [];
    for (let k = 0; k < 7; k++) {
      const p = preguntaAcorde(chart, azar(100 + k), { evitar: vistos })!;
      expect(vistos).not.toContain(p.indice);
      vistos.push(p.indice);
    }
    // cuando se agotaron, vuelve a empezar en vez de fallar
    expect(preguntaAcorde(chart, azar(5), { evitar: vistos })).not.toBeNull();
  });

  it('los distractores salen del propio tema cuando hay suficientes', () => {
    const propios = new Set(acordesSeguidos(chart).map(sim));
    const p = preguntaAcorde(chart, azar(3))!;
    // el tema tiene 4 acordes distintos: las cuatro opciones son del tema
    expect(p.opciones.every((o) => propios.has(chordSymbol(o)))).toBe(true);
  });

  it('con pocos acordes distintos completa con alternativas verosímiles', () => {
    const p = preguntaAcorde(parseChart('Dm7 | G7'), azar(9))!;
    expect(p.opciones).toHaveLength(OPCIONES);
    expect(new Set(p.opciones.map((o) => chordSymbol(o))).size).toBe(OPCIONES);
  });

  it('un tema de un solo acorde no tiene pregunta', () => {
    expect(preguntaAcorde(parseChart('Cmaj7 | Cmaj7'), azar(1))).toBeNull();
  });

  it('funciona en 3/4', () => {
    const p = preguntaAcorde(parseChart('@3/4 Dm7 | G7 | Cmaj7'), azar(2));
    expect(p?.opciones).toHaveLength(OPCIONES);
  });
});
