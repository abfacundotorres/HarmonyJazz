import { describe, expect, it } from 'vitest';
import { cerrar, cuenta, dondeFallo, MARGEN_MS, nota, retoNuevo, ventanaNueva } from './retoGuideTones';

describe('reto de guide tones', () => {
  it('la ventana dura lo que dura el acorde más un margen', () => {
    // un compás de 4/4 (8 corcheas = 4 negras) a 120 bpm = 2000 ms
    expect(ventanaNueva(0, 1000, 8, 120).hasta).toBe(1000 + 2000 + MARGEN_MS);
    // un acorde de una negra (2 corcheas) a 60 bpm = 1000 ms
    expect(ventanaNueva(1, 0, 2, 60).hasta).toBe(1000 + MARGEN_MS);
  });

  it('un guide tone dentro del acorde es un acierto, aunque antes se haya tocado otra nota; cuenta una sola vez', () => {
    let r = retoNuevo(2);
    const v = ventanaNueva(0, 0, 8, 120);
    r = nota(r, v, 100, 'C', false);
    r = nota(r, v, 600, 'G', true);
    r = nota(r, v, 900, 'B', true); // ya juzgado
    r = cerrar(r, v);
    expect(r.estados).toEqual(['acierto', 'pendiente']);
    expect(r.notas[0]).toBe('G');
  });

  it('tocar sólo otras notas es un fallo (con la última tocada) y no tocar nada es un silencio', () => {
    let r = retoNuevo(3);
    const a = ventanaNueva(0, 0, 8, 120);
    r = nota(r, a, 200, 'D', false);
    r = nota(r, a, 400, 'F', false);
    r = cerrar(r, a);
    r = cerrar(r, ventanaNueva(1, 2000, 8, 120));
    expect(r.estados).toEqual(['fallo', 'silencio', 'pendiente']);
    expect(r.notas[0]).toBe('F');
    expect(cuenta(r)).toEqual({ aciertos: 0, fallos: 1, silencios: 1, porcentaje: 0 });
  });

  it('una nota fuera de la ventana no cuenta', () => {
    let r = retoNuevo(1);
    const v = ventanaNueva(0, 0, 2, 120); // 500 ms + margen
    r = nota(r, v, 700, 'G', true);
    expect(r.estados).toEqual(['pendiente']);
    r = cerrar(r, v);
    expect(r.estados).toEqual(['silencio']);
  });

  it('el porcentaje cuenta aciertos sobre los acordes en que se tocó algo, y dice dónde se falló', () => {
    let r = retoNuevo(4);
    for (const [i, guide] of [[0, true], [1, false], [2, true], [3, false]] as const) {
      const v = ventanaNueva(i, i * 2000, 8, 120);
      r = nota(r, v, i * 2000 + 100, guide ? 'G' : 'B♭', guide);
      r = cerrar(r, v);
    }
    expect(cuenta(r)).toMatchObject({ aciertos: 2, fallos: 2, porcentaje: 50 });
    const et = [1, 2, 3, 4].map((c) => ({ compas: c, acorde: `A${c}` }));
    expect(dondeFallo(r, et)).toEqual(['compás 2 (A2: tocaste B♭)', 'compás 4 (A4: tocaste B♭)']);
  });

  it('fuera de rango o sin ventana no rompe nada', () => {
    const r = retoNuevo(1);
    expect(nota(r, null, 0, 'C', true)).toBe(r);
    expect(cerrar(r, null)).toBe(r);
    expect(cerrar(r, ventanaNueva(5, 0, 2, 120)).estados).toEqual(['pendiente']);
  });
});
