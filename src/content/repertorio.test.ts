import { describe, expect, it } from 'vitest';
import { completo, logrados, marcar, PASOS, repasoRepertorio, siguientePaso, tocado, UMBRAL } from './repertorio';

describe('mi repertorio', () => {
  it('son siete pasos únicos, de la forma al grabado', () => {
    expect(PASOS).toHaveLength(7);
    expect(new Set(PASOS.map((p) => p.id)).size).toBe(7);
    expect(PASOS[0].id).toBe('forma');
    expect(PASOS.at(-1)!.id).toBe('grabado');
    for (const p of PASOS) expect(p.ayuda.length).toBeGreaterThan(30);
  });

  it('marcar un paso empieza el tema, lo anota como tocado y se puede deshacer sin perder la fecha', () => {
    let r = marcar({}, 'u:a', 0, 100);
    expect(r['u:a']).toEqual({ hechos: [0], ultimo: 100, inicio: 100 });
    r = marcar(r, 'u:a', 2, 105);
    expect(r['u:a']).toEqual({ hechos: [0, 2], ultimo: 105, inicio: 100 });
    r = marcar(r, 'u:a', 2, 110); // destildar no cuenta como tocarlo
    expect(r['u:a']).toEqual({ hechos: [0], ultimo: 105, inicio: 100 });
    expect(marcar(r, 'u:a', 9, 111)).toBe(r);
    expect(marcar(r, 'u:a', -1, 111)).toBe(r);
  });

  it('el siguiente paso es el primero que falta y al completar los siete no queda ninguno', () => {
    expect(siguientePaso(undefined)).toBe(0);
    let r = marcar({}, 'x', 0, 1);
    r = marcar(r, 'x', 1, 1);
    r = marcar(r, 'x', 3, 1);
    expect(siguientePaso(r.x)).toBe(2);
    for (let i = 0; i < 7; i++) if (!r.x.hechos.includes(i)) r = marcar(r, 'x', i, 2);
    expect(logrados(r.x)).toBe(7);
    expect(completo(r.x)).toBe(true);
    expect(siguientePaso(r.x)).toBeNull();
  });

  it('«lo toqué hoy» anota el día sin tocar los pasos', () => {
    const r = tocado({}, 'x', 50);
    expect(r.x).toEqual({ hechos: [], ultimo: 50, inicio: 50 });
    expect(tocado(r, 'x', 60).x).toMatchObject({ ultimo: 60, inicio: 50 });
  });

  it('el repaso avisa a la semana si se aprende y a las tres semanas si está completo, lo más atrasado primero', () => {
    let r = marcar({}, 'a', 0, 90); // 10 días
    r = marcar(r, 'b', 0, 95); // 5 días: no
    r = tocado(r, 'c', 80); // 20 días
    r = marcar(r, 'd', 0, 70);
    for (let i = 1; i < 7; i++) r = marcar(r, 'd', i, 70); // completo, 30 días
    for (let i = 0; i < 7; i++) r = marcar(r, 'e', i, 85); // completo, 15 días: no
    const p = repasoRepertorio(r, ['a', 'b', 'c', 'd', 'e', 'sin-datos'], 100);
    expect(p.map((x) => x.id)).toEqual(['d', 'c', 'a']);
    expect(p[0]).toMatchObject({ dias: 30, paso: null });
    expect(p[1]).toMatchObject({ dias: 20, paso: 0 });
    expect(UMBRAL.aprendiendo).toBe(7);
    // los temas que ya no están en la lista no avisan
    expect(repasoRepertorio(r, ['b'], 100)).toEqual([]);
  });
});
