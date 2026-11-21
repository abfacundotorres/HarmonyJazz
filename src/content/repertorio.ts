/**
 * Mi repertorio: la escalera de avance de cada standard (o forma) que estás aprendiendo. El objetivo de la app es tocar
 * standards: cada tema tiene siete pasos, de saber la forma a tenerlo grabado, con la fecha en que lo tocaste por última
 * vez para avisar cuándo repasarlo. Núcleo puro; la pantalla está en `ui/pages/Repertorio.tsx`.
 */

export interface Paso {
  id: string;
  titulo: string;
  /** Cómo se comprueba que está logrado. */
  ayuda: string;
}

export const PASOS: Paso[] = [
  { id: 'forma', titulo: 'La forma', ayuda: 'Decís las secciones y la cantidad de compases sin mirar, y seguís la grilla con el play-along.' },
  { id: 'raices', titulo: 'Fundamentales', ayuda: 'Tocás la fundamental de cada acorde de memoria a tempo medio.' },
  { id: 'guide', titulo: 'Guide tones', ayuda: 'Tocás la línea de 3ªs y 7ªs de todo el tema a tempo medio.' },
  { id: 'melodia', titulo: 'La melodía', ayuda: 'Tocás la melodía de memoria, y en otra tonalidad.' },
  { id: 'improvisar', titulo: 'Improvisar con una idea', ayuda: 'Un chorus con una idea desarrollada, apoyándote en los guide tones.' },
  { id: 'memoria', titulo: 'De memoria, a tempo', ayuda: 'Toda la forma sin la grilla, al tempo del tema y sin parar.' },
  { id: 'grabado', titulo: 'Grabado completo', ayuda: 'Melodía, un chorus y melodía, grabado de principio a fin.' },
];

/** Posición del paso «Grabado completo» en la escalera. */
export const PASO_GRABADO = PASOS.findIndex((p) => p.id === 'grabado');

/** Avance de un tema: pasos logrados (por posición), día de la última vez que se tocó y día en que se empezó. */
export interface Avance {
  hechos: number[];
  ultimo: number;
  inicio: number;
}
export type Repertorio = Record<string, Avance>;

export const logrados = (a?: Avance) => a?.hechos.length ?? 0;
export const completo = (a?: Avance) => logrados(a) >= PASOS.length;
/** Primer paso que falta, o null si está completo. */
export function siguientePaso(a?: Avance): number | null {
  const i = PASOS.findIndex((_, k) => !a?.hechos.includes(k));
  return i >= 0 ? i : null;
}

const base = (a: Avance | undefined, day: number): Avance => a ?? { hechos: [], ultimo: 0, inicio: day };

/** Tilda o destilda un paso. Al tildarlo cuenta como tocado ese día. */
export function marcar(rep: Repertorio, id: string, paso: number, day: number): Repertorio {
  if (paso < 0 || paso >= PASOS.length) return rep;
  const a = base(rep[id], day);
  const ya = a.hechos.includes(paso);
  const hechos = ya ? a.hechos.filter((x) => x !== paso) : [...a.hechos, paso].sort((x, y) => x - y);
  return { ...rep, [id]: { ...a, hechos, ultimo: ya ? a.ultimo : day } };
}

/** «Lo toqué hoy»: anota el día de la última vez. */
export function tocado(rep: Repertorio, id: string, day: number): Repertorio {
  const a = base(rep[id], day);
  return { ...rep, [id]: { ...a, ultimo: day } };
}

export interface Pendiente {
  id: string;
  /** Días desde la última vez que se tocó. */
  dias: number;
  /** Paso que sigue (null si está completo). */
  paso: number | null;
}

/** Cada cuántos días conviene volver a tocar un tema: una semana si todavía se aprende, tres si ya está completo. */
export const UMBRAL = { aprendiendo: 7, completo: 21 };

/** Temas empezados que hace tiempo no se tocan, el más atrasado primero. */
export function repasoRepertorio(rep: Repertorio, ids: readonly string[], today: number): Pendiente[] {
  const out: Pendiente[] = [];
  for (const id of ids) {
    const a = rep[id];
    if (!a || a.ultimo <= 0) continue;
    const dias = Math.max(0, today - a.ultimo);
    if (dias >= (completo(a) ? UMBRAL.completo : UMBRAL.aprendiendo)) out.push({ id, dias, paso: siguientePaso(a) });
  }
  return out.sort((x, y) => y.dias - x.dias || x.id.localeCompare(y.id));
}
