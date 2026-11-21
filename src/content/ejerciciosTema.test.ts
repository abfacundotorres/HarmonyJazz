import { describe, expect, it } from 'vitest';
import { concertRange } from '../state/storage';
import { generatorById } from '../exercises/generators';
import { keyInterval, parseChart, transposeChart } from '../theory/chart';
import { describeItem } from '../ui/progressItems';
import { parseItem } from '../state/progress';
import { LESSONS } from './lessons';
import { admiteEjercicios, EJERCICIOS_TEMA, ejercicioTemaById, idEjercicioTema, parseIdEjercicioTema } from './ejerciciosTema';
import { PROGRESSIONS } from './progressions';

describe('catálogo de ejercicios del tema', () => {
  it('ids únicos, en letras y números, con generador y textos', () => {
    expect(new Set(EJERCICIOS_TEMA.map((e) => e.id)).size).toBe(EJERCICIOS_TEMA.length);
    for (const e of EJERCICIOS_TEMA) {
      expect(e.id).toMatch(/^[a-z0-9]+$/);
      expect(e.titulo.length).toBeGreaterThan(5);
      expect(() => generatorById(e.generator)).not.toThrow();
      expect(generatorById(e.generator)).toBeDefined();
      expect(generatorById(e.generator).description.length).toBeGreaterThan(10);
    }
  });
});

describe('ids de mastery', () => {
  it('se arman y se leen, también con ":" en el id del tema', () => {
    for (const t of ['u:abc123xyz', 'blues-f', 'ii-v-i']) {
      for (const e of EJERCICIOS_TEMA) {
        const id = idEjercicioTema(t, e.id);
        expect(parseIdEjercicioTema(id)).toEqual({ tema: t, ex: e.id });
        expect(parseItem(id)).toEqual({ kind: 'tema', tema: t, ex: e.id });
        expect(id.length).toBeLessThanOrEqual(80); // tope de sanitizeMastery
      }
    }
    expect(parseIdEjercicioTema('tema:x')).toBeNull();
  });
  it('no se confunden con los de lecciones, escalas ni frases', () => {
    expect(parseItem(`${LESSONS[0].id}:2`).kind).toBe('lesson');
    expect(parseItem('scale:dorian:thirds').kind).toBe('scale');
    expect(parseItem('lick:abc').kind).toBe('lick');
    expect(parseItem('tema:u:abc:guide').kind).toBe('tema');
  });
  it('un ejercicio de tema se describe con el nombre del tema y lleva al repertorio; si el tema o el ejercicio ya no existen, no se muestra', () => {
    const d = describeItem('tema:u:abc:guide', [], [{ id: 'u:abc', name: 'Mi tema' }])!;
    expect(d.title).toBe('Mi tema');
    expect(d.detail).toBe(ejercicioTemaById('guide')!.titulo);
    expect(d.href('D')).toBe('#/repertorio?t=u%3Aabc&ex=guide&k=D');
    expect(describeItem('tema:u:abc:guide', [], [])).toBeNull();
    expect(describeItem('tema:u:abc:nada', [], [{ id: 'u:abc', name: 'Mi tema' }])).toBeNull();
  });
});

describe('los generadores sobre temas', () => {
  it('sólo se ofrecen en 4/4', () => {
    expect(admiteEjercicios(parseChart('Dm7 | G7 | Cmaj7'))).toBe(true);
    expect(admiteEjercicios(parseChart('@3/4 Dm7 | G7 | Cmaj7'))).toBe(false);
    expect(admiteEjercicios(parseChart('@6/8 Dm7 | G7 | Cmaj7'))).toBe(false);
  });
  const cuatro = PROGRESSIONS.filter((p) => !parseChart(p.chart).meter);
  it('hay formas de 4/4 para probar', () => expect(cuatro.length).toBeGreaterThan(10));

  for (const reg of ['grave', 'medio', 'agudo'] as const) {
    it(`cada ejercicio da una línea válida sobre todas las formas incluidas (registro ${reg})`, () => {
      const r = concertRange(reg);
      for (const p of cuatro) {
        const chart = parseChart(p.chart);
        for (const e of EJERCICIOS_TEMA) {
          const notes = generatorById(e.generator).run(chart, r);
          const donde = `${p.id} / ${e.id}`;
          expect(notes.some((n) => n.pitch), donde).toBe(true);
          for (const n of notes) {
            expect(n.start, donde).toBeGreaterThanOrEqual(0);
            expect(n.dur, donde).toBeGreaterThanOrEqual(1);
            expect(n.start + n.dur, donde).toBeLessThanOrEqual(chart.bars * 8);
          }
        }
      }
    });
  }

  it('en las 12 tonalidades de un tema con tonalidad', () => {
    const p = PROGRESSIONS.find((x) => x.id === 'ii-v-i')!;
    for (const k of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']) {
      const chart = transposeChart(parseChart(p.chart), keyInterval(p.key!, k));
      for (const e of EJERCICIOS_TEMA) expect(generatorById(e.generator).run(chart, concertRange('medio')).some((n) => n.pitch), `${k} ${e.id}`).toBe(true);
    }
  });
});
