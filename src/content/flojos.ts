/**
 * Compases flojos y bucle por sección. «Flojos» son los compases que se te traban en un tema: se marcan, se guardan por tema y
 * se trabajan de a un tramo en bucle antes de volver a tocar todo. Las secciones (A, B…) salen de la grilla escrita del tema.
 * Funciones puras; la pantalla está en el Play-along.
 */
import type { DocLayout } from './chartDoc';

/** Por tema, los compases flojos (índices de la grilla escrita, ordenados y sin repetir). */
export type Flojos = Record<string, number[]>;

/** Agrega el compás si no estaba y lo quita si estaba. */
export function alternarFloja(lista: readonly number[] | undefined, compas: number): number[] {
  const s = new Set(lista ?? []);
  if (s.has(compas)) s.delete(compas);
  else s.add(compas);
  return [...s].sort((a, b) => a - b);
}

/** Los compases flojos juntos, en tramos seguidos: [2,3,4,9] → [[2,4],[9,9]]. */
export function tramosFlojos(lista: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const n of [...new Set(lista)].sort((a, b) => a - b)) {
    const ult = out[out.length - 1];
    if (ult && n === ult[1] + 1) ult[1] = n;
    else out.push([n, n]);
  }
  return out;
}

/** Los flojos que siguen existiendo si el tema se acortó (se descartan los que quedaron fuera de la grilla). */
export const flojosDentro = (lista: readonly number[], compases: number): number[] => lista.filter((n) => n >= 0 && n < compases);

/** Lo que suena de un tramo de la grilla escrita: de su primera aparición hasta donde sigue corrido (índices de lo que se toca). */
export function sonados(desde: number, hasta: number, orden?: readonly number[]): [number, number] | null {
  if (!orden) return [desde, hasta];
  const a = orden.indexOf(desde);
  if (a < 0) return null;
  let b = a;
  while (b + 1 < orden.length && orden[b + 1] === orden[b] + 1 && orden[b + 1] <= hasta) b++;
  return [a, b];
}

export interface Seccion {
  nombre: string;
  /** Compases de la grilla escrita. */
  desde: number;
  hasta: number;
}

/** Las secciones marcadas en la grilla (A, B…), cada una hasta donde empieza la siguiente. Vacío si hay menos de dos. */
export function secciones(layout: DocLayout | null | undefined): Seccion[] {
  if (!layout) return [];
  const out: Seccion[] = [];
  layout.bars.forEach((b, i) => {
    if (b.section && b.section !== out[out.length - 1]?.nombre) out.push({ nombre: b.section, desde: i, hasta: layout.bars.length - 1 });
  });
  out.forEach((s, k) => {
    if (out[k + 1]) s.hasta = out[k + 1].desde - 1;
  });
  return out.length >= 2 ? out : [];
}

/** El tramo que sigue después de `actual` (o el primero), para recorrer los flojos de a uno. */
export function tramoSiguiente(tramos: readonly [number, number][], actual: [number, number] | null): [number, number] | null {
  if (!tramos.length) return null;
  if (!actual) return tramos[0];
  const i = tramos.findIndex((t) => t[0] === actual[0] && t[1] === actual[1]);
  return tramos[(i + 1) % tramos.length];
}
