import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { gradoDelCentro, mapaArmonico, rangoCompases } from './mapaArmonico';

const mapa = (txt: string, tonica?: { pc: number; menor: boolean }, orden?: number[]) => mapaArmonico(parseChart(txt), { tonica, orden });
const tipos = (txt: string) => mapa(txt).hallazgos.map((h) => h.tipo);

describe('mapaArmonico', () => {
  it('reconoce un ii–V–I mayor con sus compases y su centro', () => {
    const m = mapa('Dm7 | G7 | Cmaj7 | Cmaj7');
    expect(m.hallazgos).toHaveLength(1);
    const h = m.hallazgos[0];
    expect(h.tipo).toBe('iiVI');
    expect([h.desde, h.hasta]).toEqual([0, 2]);
    expect(h.centro).toBe(0);
    expect(h.titulo).toContain('ii–V–I mayor en C');
  });

  it('reconoce un ii–V–i menor', () => {
    const m = mapa('Dm7b5 | G7b9 | Cm7 |');
    expect(m.hallazgos[0].tipo).toBe('iiVi');
    expect(m.hallazgos[0].centroMenor).toBe(true);
  });

  it('un ii–V que no llega se marca como tal y dice a dónde apuntaba', () => {
    const m = mapa('Dm7 | G7 | Ebmaj7 |');
    expect(m.hallazgos[0].tipo).toBe('iiV');
    expect(m.hallazgos[0].titulo).toContain('ii–V hacia C');
  });

  it('reconoce el ii–V–I con sustitución tritonal', () => {
    const m = mapa('Dm7 | Db7 | Cmaj7 |');
    expect(m.hallazgos[0].tipo).toBe('iiVI');
    expect(m.hallazgos[0].detalle).toContain('tritonal');
  });

  it('un dominante suelto que resuelve es un V–I; con tritono, sustitución tritonal', () => {
    expect(tipos('Cmaj7 | D7 | Gmaj7 |')).toContain('VI');
    expect(tipos('Cmaj7 | Db7 | Cmaj7 |')).toContain('tritono');
  });

  it('une una cadena de dominantes en un solo patrón', () => {
    const m = mapa('A7 | D7 | G7 | Cmaj7 |');
    const h = m.hallazgos.find((x) => x.tipo === 'cadena');
    expect(h).toBeTruthy();
    expect(h?.acordes).toEqual(['A7', 'D7', 'G7', 'Cmaj7']);
    expect([h?.desde, h?.hasta]).toEqual([0, 3]);
  });

  it('reconoce los turnarounds I–vi–ii–V y iii–VI7–ii–V, y que vuelve al I', () => {
    const a = mapa('Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 |').hallazgos;
    expect(a).toHaveLength(1);
    expect(a[0].tipo).toBe('turnaround');
    expect(a[0].acordes).toHaveLength(5);
    expect(a[0].titulo).toContain('I–vi–ii–V');
    const b = mapa('Em7 | A7 | Dm7 | G7 |').hallazgos;
    expect(b[0].titulo).toContain('iii–VI7–ii–V');
    expect(mapa('Cmaj7 | A7 | Dm7 | G7 |').hallazgos[0].titulo).toContain('I–VI7–ii–V');
    expect(mapa('Cmaj7 | Ebdim7 | Dm7 | G7 |').hallazgos[0].titulo).toContain('♭iii°');
  });

  it('reconoce la puerta de atrás', () => {
    expect(tipos('Fm7 | Bb7 | Cmaj7 |')).toEqual(['puerta']);
    expect(tipos('Bb7 | Cmaj7 |')).toEqual(['puerta']);
  });

  it('reconoce un disminuido de paso', () => {
    const h = mapa('Cmaj7 | C#dim7 | Dm7 |').hallazgos.find((x) => x.tipo === 'disminuido');
    expect(h?.titulo).toContain('C♯dim7');
  });

  it('no inventa patrones donde no hay', () => {
    expect(mapa('Cmaj7 | Fmaj7 | Cmaj7 |').hallazgos).toEqual([]);
    expect(mapa('Cm7 | Cm7 | Fm7 | Fm7 |').hallazgos).toEqual([]);
  });

  it('no cuenta dos veces un acorde repetido', () => {
    const h = mapa('Dm7 | Dm7 | G7 | G7 | Cmaj7').hallazgos;
    expect(h).toHaveLength(1);
    expect([h[0].desde, h[0].hasta]).toEqual([0, 4]);
  });

  it('estima la tonalidad general, y respeta la que se indique', () => {
    const m = mapa('Dm7 | G7 | Cmaj7 | Am7 | Dm7 | G7 | Cmaj7');
    expect(m.tonica).toMatchObject({ pc: 0, menor: false, nombre: 'C', estimada: true });
    const dada = mapa('Dm7 | G7 | Cmaj7', { pc: 7, menor: false });
    expect(dada.tonica).toMatchObject({ nombre: 'G', estimada: false });
    expect(mapa('Dm7b5 | G7 | Cm6 | Cm6').tonica).toMatchObject({ nombre: 'Cm', menor: true });
  });

  it('arma los centros tonales y junta los consecutivos iguales', () => {
    const m = mapa('Dm7 | G7 | Cmaj7 | Gm7 | C7 | Fmaj7 | Fmaj7 | Gm7 | C7 | Fmaj7 |');
    expect(m.centros.map((c) => c.nombre)).toEqual(['C', 'F']);
    expect(m.centros[1].desde).toBe(3);
    expect(m.tonica && gradoDelCentro(m.centros[1], m.tonica)).toBeTruthy();
  });

  it('con repeticiones usa los compases escritos y no repite lo ya visto', () => {
    // escrito: 0 Dm7 · 1 G7 · 2 Cmaj7 (se toca 2 veces) → compases tocados 0..5
    const chart = parseChart('Dm7 | G7 | Cmaj7 | Dm7 | G7 | Cmaj7');
    const m = mapaArmonico(chart, { orden: [0, 1, 2, 0, 1, 2] });
    expect(m.hallazgos).toHaveLength(1);
    expect(m.compases).toBe(3);
    expect(m.compasesCubiertos).toBe(3);
  });

  it('funciona en 3/4 y mide cuánto cubre', () => {
    const m = mapaArmonico(parseChart('@3/4 Dm7 | G7 | Cmaj7 | Fmaj7'));
    expect(m.compases).toBe(4);
    expect(m.compasesCubiertos).toBe(3);
  });

  it('no falla con cifrados mínimos', () => {
    expect(mapa('C').hallazgos).toEqual([]);
    expect(mapa('C').tonica).toBeTruthy();
  });

  it('formatea los rangos', () => {
    expect(rangoCompases(2, 2)).toBe('compás 3');
    expect(rangoCompases(0, 3)).toBe('compases 1–4');
  });
});

describe('tonalidad de un blues', () => {
  it('con casi todo dominantes, la tónica es el primer acorde', () => {
    const m = mapa('F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 | C7');
    expect(m.tonica).toMatchObject({ nombre: 'F', menor: false, estimada: true });
  });
});
