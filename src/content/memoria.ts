/**
 * Modo de memoria del Play-along y del atril: para tocar un tema sin leer la grilla (el paso «de memoria a tempo» de Mi
 * repertorio). Oculta los acordes de la grilla —no el número de compás, la sección ni la marca del compás que suena—, así sabés
 * dónde estás pero no qué viene. Funciones puras; el dibujo está en `ui/components/ChordInfo.tsx`.
 */
export type MemoriaModo = 'off' | 'pistas' | 'oculto' | 'gradual';
/** Cuánto de la grilla se ve en este momento. */
export type MemoriaNivel = 'todo' | 'pistas' | 'nada';

export const MEMORIA_MODOS: { id: MemoriaModo; label: string; texto: string }[] = [
  { id: 'off', label: 'Visible', texto: 'La grilla completa.' },
  { id: 'pistas', label: 'Comienzos', texto: 'Sólo se ve el primer compás de cada parte (y el primero del tema): el resto lo tenés que saber.' },
  { id: 'oculto', label: 'Oculto', texto: 'Ninguna grilla de acordes. Se ve el compás que suena, pero no su acorde. «Mirar» te deja comprobar.' },
  { id: 'gradual', label: 'De a poco', texto: 'La primera vuelta con todo a la vista, la segunda sólo con los comienzos y de la tercera en adelante, sin acordes.' },
];

export const isMemoriaModo = (x: unknown): x is MemoriaModo => MEMORIA_MODOS.some((m) => m.id === x);

/** Nivel de la grilla según el modo y la vuelta (`chorus`: 0 es la primera; −1 si no suena). */
export function memoriaNivel(modo: MemoriaModo, chorus: number): MemoriaNivel {
  if (modo === 'off') return 'todo';
  if (modo === 'pistas') return 'pistas';
  if (modo === 'oculto') return 'nada';
  // gradual: parado se ve todo (para mirar lo que se va a tocar)
  if (chorus < 1) return 'todo';
  return chorus === 1 ? 'pistas' : 'nada';
}

/**
 * Qué compases se ven (índices de la grilla escrita). `starts`: dónde empieza cada parte (sección). Sin partes marcadas, la
 * grilla se parte cada 4 compases.
 */
export function compasesVisibles(nivel: MemoriaNivel, n: number, starts: ReadonlySet<number> | readonly number[] = []): boolean[] {
  if (nivel === 'todo') return Array.from({ length: n }, () => true);
  if (nivel === 'nada') return Array.from({ length: n }, () => false);
  const s = new Set(starts);
  s.add(0);
  const parts = s.size > 1;
  return Array.from({ length: n }, (_, i) => (parts ? s.has(i) : i % 4 === 0));
}

/** El siguiente modo de la lista (para el botón del atril, que los recorre de a uno). */
export function siguienteModo(m: MemoriaModo): MemoriaModo {
  const i = MEMORIA_MODOS.findIndex((x) => x.id === m);
  return MEMORIA_MODOS[(i + 1) % MEMORIA_MODOS.length].id;
}
