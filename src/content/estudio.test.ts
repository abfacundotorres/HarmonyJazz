import { describe, expect, it } from 'vitest';
import { PROGRESSIONS } from './progressions';
import { ETAPAS, FUENTES, idEnMisTemas, normalizarTitulo, siguienteSugerido, temasDeEtapa, TEMAS_ESTUDIO } from './estudio';

describe('estudio', () => {
  it('no repite temas ni deja etapas vacías, y cada tema cita listas que existen', () => {
    const nombres = TEMAS_ESTUDIO.map((t) => normalizarTitulo(t.titulo));
    expect(new Set(nombres).size).toBe(nombres.length);
    const fuentes = new Set<string>(FUENTES.map((f) => f.id));
    for (const t of TEMAS_ESTUDIO) {
      expect(t.fuentes.length).toBeGreaterThan(0);
      expect(t.fuentes.every((f) => fuentes.has(f))).toBe(true);
      expect(new Set(t.fuentes).size).toBe(t.fuentes.length);
      expect(t.q).toMatch(/^[a-z0-9 ]+$/);
    }
    for (const e of ETAPAS) expect(temasDeEtapa(e.n).length).toBeGreaterThan(0);
    // las etapas van en orden en la lista
    const etapas = TEMAS_ESTUDIO.map((t) => t.etapa);
    expect(etapas).toEqual([...etapas].sort());
  });

  it('el consenso de listas está donde se espera', () => {
    const f = (t: string) => TEMAS_ESTUDIO.find((x) => x.titulo === t)?.fuentes.length;
    expect(f('Autumn Leaves')).toBe(4);
    expect(f('Blue Bossa')).toBe(4);
    expect(f('So What')).toBe(3);
    expect(f('C-Jam Blues')).toBe(1);
  });

  it('normaliza títulos con acentos, artículos, guiones y paréntesis', () => {
    expect(normalizarTitulo('Girl From Ipanema, The')).toBe(normalizarTitulo('The Girl from Ipanema'));
    expect(normalizarTitulo('C-Jam Blues')).toBe('c jam blues');
    expect(normalizarTitulo('Black Orpheus (Manhã de Carnaval)')).toBe('black orpheus');
    expect(normalizarTitulo('Take the “A” Train')).toBe('take train');
  });

  it('reconoce lo que ya está en Mis temas, por título o alias', () => {
    const tunes = [{ id: 'u:abcd', name: 'autumn leaves' }, { id: 'u:efgh', name: 'Manhã de Carnaval' }, { id: 'u:ijkl', name: 'C Jam Blues' }];
    const por = (t: string) => idEnMisTemas(TEMAS_ESTUDIO.find((x) => x.titulo === t)!, tunes);
    expect(por('Autumn Leaves')).toBe('u:abcd');
    expect(por('Black Orpheus')).toBe('u:efgh');
    expect(por('C-Jam Blues')).toBe('u:ijkl');
    expect(por('Blue Bossa')).toBeNull();
  });

  it('el siguiente sugerido salta lo que ya está y termina en null', () => {
    expect(siguienteSugerido([])?.titulo).toBe(TEMAS_ESTUDIO[0].titulo);
    const todos = TEMAS_ESTUDIO.map((t, i) => ({ id: `u:t${i}xx`, name: t.titulo }));
    expect(siguienteSugerido(todos)).toBeNull();
    expect(siguienteSugerido(todos.slice(1))?.titulo).toBe(TEMAS_ESTUDIO[0].titulo);
    expect(siguienteSugerido(todos.filter((_, i) => i !== 5))?.titulo).toBe(TEMAS_ESTUDIO[5].titulo);
  });

  it('no mezcla progresiones propias de la app (esas no son estos temas)', () => {
    const propios = new Set(PROGRESSIONS.map((p) => normalizarTitulo(p.name)));
    expect(TEMAS_ESTUDIO.some((t) => propios.has(normalizarTitulo(t.titulo)))).toBe(false);
  });
});
