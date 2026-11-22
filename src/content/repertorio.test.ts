import { describe, expect, it } from 'vitest';
import { alternarTonalidad, BPM, completo, detalleDe, fijarBpm, llegoAlTempo, logrado, logrados, marcar, PASOS, repasoRepertorio, resumenAvance, siguientePaso, tocado, UMBRAL } from './repertorio';

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

describe('tempo y tonalidades de cada paso', () => {
  it('anotar el tempo empieza el tema, lo cuenta como tocado y no marca el paso solo', () => {
    const r = fijarBpm({}, 'u:a', 5, 120, 100);
    expect(r['u:a']).toEqual({ hechos: [], ultimo: 100, inicio: 100, detalle: { 5: { bpm: 120, keys: [] } } });
    expect(detalleDe(r['u:a'], 5)).toEqual({ bpm: 120, keys: [] });
    expect(detalleDe(r['u:a'], 3)).toEqual({ keys: [] });
    expect(detalleDe(undefined, 0)).toEqual({ keys: [] });
  });
  it('el tempo se lleva a 40–320 y null lo borra (si no queda nada, el detalle desaparece)', () => {
    expect(detalleDe(fijarBpm({}, 'u:a', 1, 9999, 1)['u:a'], 1).bpm).toBe(BPM.max);
    expect(detalleDe(fijarBpm({}, 'u:a', 1, 5, 1)['u:a'], 1).bpm).toBe(BPM.min);
    expect(detalleDe(fijarBpm({}, 'u:a', 1, 120.6, 1)['u:a'], 1).bpm).toBe(121);
    const r = fijarBpm(fijarBpm({}, 'u:a', 1, 120, 1), 'u:a', 1, null, 2);
    expect(r['u:a'].detalle).toBeUndefined();
    expect(fijarBpm({}, 'u:a', 9, 120, 1)).toEqual({}); // un paso que no existe
  });
  it('las tonalidades se marcan y desmarcan, quedan en el orden de las doce y sólo valen las de concierto', () => {
    let r = alternarTonalidad({}, 'u:a', 3, 'G', 10);
    r = alternarTonalidad(r, 'u:a', 3, 'C', 11);
    r = alternarTonalidad(r, 'u:a', 3, 'Eb', 12);
    expect(detalleDe(r['u:a'], 3).keys).toEqual(['C', 'Eb', 'G']);
    r = alternarTonalidad(r, 'u:a', 3, 'Eb', 13);
    expect(detalleDe(r['u:a'], 3).keys).toEqual(['C', 'G']);
    expect(r['u:a'].ultimo).toBe(13);
    expect(alternarTonalidad(r, 'u:a', 3, 'H', 14)).toBe(r);
    expect(alternarTonalidad(r, 'u:a', 3, 'C#', 14)).toBe(r); // se usa Db
    r = alternarTonalidad(alternarTonalidad(r, 'u:a', 3, 'C', 15), 'u:a', 3, 'G', 16);
    expect(r['u:a'].detalle).toBeUndefined();
  });
  it('tildar y destildar un paso no pierde lo anotado', () => {
    let r = fijarBpm({}, 'u:a', 5, 140, 10);
    r = marcar(r, 'u:a', 5, 11);
    r = marcar(r, 'u:a', 5, 12);
    expect(detalleDe(r['u:a'], 5).bpm).toBe(140);
    expect(r['u:a'].hechos).toEqual([]);
  });
  it('«logrado» marca el paso con su tempo y tonalidad, no lo desmarca si ya estaba y se queda con el mayor tempo', () => {
    let r = logrado({}, 'u:a', 6, 50, { bpm: 120, key: 'F' });
    expect(r['u:a'].hechos).toEqual([6]);
    expect(detalleDe(r['u:a'], 6)).toEqual({ bpm: 120, keys: ['F'] });
    r = logrado(r, 'u:a', 6, 51, { bpm: 100, key: 'F' }); // ya estaba: no se desmarca, el tempo mayor se conserva
    expect(r['u:a'].hechos).toEqual([6]);
    expect(detalleDe(r['u:a'], 6)).toEqual({ bpm: 120, keys: ['F'] });
    r = logrado(r, 'u:a', 6, 52, { bpm: 140, key: 'Bb' });
    expect(detalleDe(r['u:a'], 6)).toEqual({ bpm: 140, keys: ['F', 'Bb'] }); // en el orden de las doce tonalidades
    expect(r['u:a'].ultimo).toBe(52);
    expect(logrado({}, 'u:a', 2, 5)['u:a']).toEqual({ hechos: [2], ultimo: 5, inicio: 5 }); // sin datos: como marcar
    expect(logrado({}, 'u:a', 9, 5, { bpm: 100 })).toEqual({});
  });
  it('el resumen junta el mayor tempo y las tonalidades de todos los pasos', () => {
    expect(resumenAvance(undefined)).toEqual({ mejorBpm: null, tonalidades: [] });
    let r = fijarBpm({}, 'u:a', 2, 100, 1);
    r = fijarBpm(r, 'u:a', 5, 150, 1);
    r = alternarTonalidad(r, 'u:a', 3, 'G', 1);
    r = alternarTonalidad(r, 'u:a', 5, 'C', 1);
    r = alternarTonalidad(r, 'u:a', 5, 'G', 1);
    expect(resumenAvance(r['u:a'])).toEqual({ mejorBpm: 150, tonalidades: ['C', 'G'] });
  });
  it('llegó al tempo del tema si el anotado es igual o mayor', () => {
    expect(llegoAlTempo(undefined, 120)).toBe(false);
    expect(llegoAlTempo(119, 120)).toBe(false);
    expect(llegoAlTempo(120, 120)).toBe(true);
    expect(llegoAlTempo(160, 120)).toBe(true);
  });
});
