import { describe, expect, it } from 'vitest';
import { clampPage, clampZoom, escala, esImagen, esPdf, MAX_LIBRO_BYTES, rotar, stepZoom, tipoDeArchivo, ZOOM_MAX, ZOOM_MIN, zoomPaginaCompleta } from './view';

describe('zoom', () => {
  it('se mantiene dentro de los límites y no acepta valores raros', () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom(99)).toBe(ZOOM_MAX);
    expect(clampZoom(1.234)).toBe(1.23);
    expect(clampZoom(NaN)).toBe(1);
    expect(clampZoom(Infinity)).toBe(1);
  });
  it('los pasos suben y bajan y se detienen en los extremos', () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.8);
    let z = 1;
    for (let i = 0; i < 30; i++) z = stepZoom(z, 1);
    expect(z).toBe(ZOOM_MAX);
    for (let i = 0; i < 60; i++) z = stepZoom(z, -1);
    expect(z).toBe(ZOOM_MIN);
  });
  it('página completa: una página alta en un recuadro bajo se achica; una ancha no pasa de 1', () => {
    expect(zoomPaginaCompleta(600, 800, 400, 400)).toBe(0.75); // a lo ancho mide 533 de alto y el recuadro 400: 0,5 / 0,667 = 0,75
    expect(zoomPaginaCompleta(800, 400, 400, 800)).toBe(1); // baja: ya entra a lo ancho
    expect(zoomPaginaCompleta(0, 800, 400, 400)).toBe(1);
  });
});

describe('páginas y giro', () => {
  it('la página queda entre 1 y el total', () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(99, 10)).toBe(10);
    expect(clampPage(4.6, 10)).toBe(5);
    expect(clampPage(NaN, 10)).toBe(1);
    expect(clampPage(3, 0)).toBe(1);
  });
  it('gira de a 90 grados y vuelve a 0', () => {
    expect([0, 90, 180, 270].map(rotar)).toEqual([90, 180, 270, 0]);
    expect(rotar(-90)).toBe(0);
    expect(rotar(45)).toBe(180); // un valor suelto se lleva al múltiplo más cercano antes de girar
  });
});

describe('escala de dibujo', () => {
  it('a zoom 1 la página ocupa el ancho del recuadro', () => {
    expect(escala(1, 600, 800, 300, 1)).toBeCloseTo(0.5);
    expect(escala(2, 600, 800, 300, 1)).toBeCloseTo(1);
  });
  it('no pasa del tope de píxeles del lienzo', () => {
    const e = escala(5, 600, 800, 400, 3, 16_000_000);
    expect(600 * e * 3 * (800 * e * 3)).toBeLessThanOrEqual(16_000_001);
    expect(e).toBeLessThan((5 * 400) / 600);
  });
});

describe('archivos', () => {
  it('reconoce PDF e imágenes por tipo o por extensión', () => {
    expect(esPdf('application/pdf', 'x')).toBe(true);
    expect(esPdf('', 'Libro.PDF')).toBe(true);
    expect(esImagen('image/png', 'x')).toBe(true);
    expect(esImagen('', 'foto.JPG')).toBe(true);
    expect(esImagen('text/plain', 'a.txt')).toBe(false);
  });
  it('dice qué es o por qué no se abre', () => {
    expect(tipoDeArchivo({ type: 'application/pdf', name: 'a.pdf', size: 10 })).toBe('pdf');
    expect(tipoDeArchivo({ type: '', name: 'a.jpg', size: 10 })).toBe('imagen');
    expect(tipoDeArchivo({ type: 'text/plain', name: 'a.txt', size: 10 })).toMatch(/Elegí un PDF/);
    expect(tipoDeArchivo({ type: 'application/pdf', name: 'a.pdf', size: 0 })).toMatch(/vacío/);
    expect(tipoDeArchivo({ type: 'application/pdf', name: 'a.pdf', size: MAX_LIBRO_BYTES + 1 })).toMatch(/máximo/);
  });
});
