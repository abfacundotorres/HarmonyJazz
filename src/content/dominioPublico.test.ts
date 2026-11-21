import { describe, expect, it } from 'vitest';
import { concertRange } from '../state/storage';
import { generatorById } from '../exercises/generators';
import { CONCERT_KEYS, parseChart } from '../theory/chart';
import { AVISO_DOMINIO_PUBLICO, DOMINIO_PUBLICO, PROGRESIONES_DOMINIO_PUBLICO } from './dominioPublico';
import { validateTune } from './library';
import { EJERCICIOS_TEMA } from './ejerciciosTema';
import { PROGRESSIONS } from './progressions';

describe('temas de dominio público', () => {
  it('ids únicos y que no chocan con las formas incluidas', () => {
    const ids = DOMINIO_PUBLICO.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(PROGRESSIONS.some((p) => p.id === id)).toBe(false);
    expect(DOMINIO_PUBLICO.length).toBeGreaterThanOrEqual(1);
  });

  it('cada uno dice quién, de cuándo y por qué es de dominio público, y avisa que no está verificado', () => {
    for (const t of DOMINIO_PUBLICO) {
      expect(t.autoria.length, t.id).toBeGreaterThan(5);
      expect(t.epoca.length, t.id).toBeGreaterThan(3);
      expect(t.base.length, t.id).toBeGreaterThan(30);
    }
    for (const p of PROGRESIONES_DOMINIO_PUBLICO) {
      expect(p.category).toBe('Dominio público');
      expect(p.notes, p.id).toContain('Dominio público');
      expect(p.notes, p.id).toContain('SIN VERIFICAR');
      expect(p.notes, p.id).toContain(AVISO_DOMINIO_PUBLICO);
    }
  });

  it('el cifrado se lee, tiene la tonalidad en concierto y no trae melodía ni letra', () => {
    for (const t of DOMINIO_PUBLICO) {
      const c = parseChart(t.chart);
      expect(c.bars, t.id).toBeGreaterThanOrEqual(8);
      expect(CONCERT_KEYS, t.id).toContain(t.key);
      expect(t.tempo).toBeGreaterThanOrEqual(40);
      expect(t.chart, t.id).not.toMatch(/[¡¿!?]|\b(the|and|my|of|to)\b/i); // sólo acordes
    }
    for (const p of PROGRESIONES_DOMINIO_PUBLICO) expect(p.melody).toBeUndefined();
  });

  it('no incluye ningún standard protegido (lista de vigilancia de títulos)', () => {
    const prohibidos = /Autumn Leaves|All the Things|Stella|Giant Steps|Oleo|Body and Soul|Summertime|Misty|Take Five|So What|Blue Bossa|Round Midnight|Fly Me|Girl from Ipanema|Satin Doll|Embraceable|I Got Rhythm|Georgia on My Mind|Ain't Misbehavin|Honeysuckle/i;
    for (const t of DOMINIO_PUBLICO) expect(`${t.nombre} ${t.autoria}`, t.id).not.toMatch(prohibidos);
  });

  it('se pueden copiar a «Mis temas» (el tema se valida como cualquier cifrado propio)', () => {
    for (const t of DOMINIO_PUBLICO) {
      const r = validateTune({ name: t.nombre, composer: 'Tradicional', key: t.key, mode: t.mode, chart: t.chart, tempo: t.tempo, style: t.style });
      expect(typeof r, t.id).not.toBe('string');
      if (typeof r !== 'string') expect(r.chart).toBe(t.chart);
    }
  });

  it('los ejercicios generados andan sobre los de 4/4 (los de 3/4 no los ofrecen)', () => {
    for (const t of DOMINIO_PUBLICO) {
      const c = parseChart(t.chart);
      if (c.meter) continue;
      for (const e of EJERCICIOS_TEMA) {
        const notes = generatorById(e.generator).run(c, concertRange('medio'));
        expect(notes.some((n) => n.pitch), `${t.id} ${e.id}`).toBe(true);
      }
    }
  });
});
