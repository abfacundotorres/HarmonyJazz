/**
 * Mi repertorio: la escalera de avance de cada standard (o forma) que estás aprendiendo. El objetivo de la app es tocar
 * standards: cada tema tiene siete pasos, de saber la forma a tenerlo grabado, con la fecha en que lo tocaste por última
 * vez para avisar cuándo repasarlo. Cada paso puede llevar además el **tempo** al que salió y las **tonalidades** en que se tocó
 * («la melodía, en otra tonalidad»; «de memoria, al tempo del tema»). Núcleo puro; la pantalla está en `ui/pages/Repertorio.tsx`.
 */
import { CONCERT_KEYS } from '../theory/chart';

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

/** Lo que se anota de un paso: a qué tempo salió y en qué tonalidades (en concierto). */
export interface Detalle {
  bpm?: number;
  keys: string[];
}
/** Tempos que se aceptan. */
export const BPM = { min: 40, max: 320 };

/** Avance de un tema: pasos logrados (por posición), día de la última vez que se tocó, día en que se empezó y el detalle de cada paso. */
export interface Avance {
  hechos: number[];
  ultimo: number;
  inicio: number;
  /** Por posición del paso. Sólo los pasos con algo anotado. */
  detalle?: Record<number, Detalle>;
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

/** El detalle de un paso (vacío si no se anotó nada). */
export const detalleDe = (a: Avance | undefined, paso: number): Detalle => ({ keys: [], ...a?.detalle?.[paso] });

const sinVacios = (d: Record<number, Detalle>): Record<number, Detalle> | undefined => {
  const out: Record<number, Detalle> = {};
  for (const [k, v] of Object.entries(d)) if (v.bpm !== undefined || v.keys.length) out[Number(k)] = v;
  return Object.keys(out).length ? out : undefined;
};

function conDetalle(rep: Repertorio, id: string, paso: number, day: number, f: (d: Detalle) => Detalle): Repertorio {
  if (!Number.isInteger(paso) || paso < 0 || paso >= PASOS.length) return rep;
  const a = base(rep[id], day);
  const detalle = sinVacios({ ...a.detalle, [paso]: f(detalleDe(a, paso)) });
  // anotar algo en un paso cuenta como haber tocado el tema ese día
  const nuevo: Avance = { hechos: a.hechos, ultimo: day, inicio: a.inicio };
  if (detalle) nuevo.detalle = detalle;
  return { ...rep, [id]: nuevo };
}

/** Anota el tempo al que salió un paso (se lleva a 40–320; null lo borra). */
export function fijarBpm(rep: Repertorio, id: string, paso: number, bpm: number | null, day: number): Repertorio {
  const v = bpm === null || !Number.isFinite(bpm) ? undefined : Math.min(BPM.max, Math.max(BPM.min, Math.round(bpm)));
  return conDetalle(rep, id, paso, day, (d) => ({ keys: d.keys, ...(v !== undefined ? { bpm: v } : {}) }));
}

/** Marca o desmarca una tonalidad (en concierto) en un paso; quedan en el orden de las doce tonalidades. */
export function alternarTonalidad(rep: Repertorio, id: string, paso: number, key: string, day: number): Repertorio {
  if (!CONCERT_KEYS.includes(key)) return rep;
  return conDetalle(rep, id, paso, day, (d) => {
    const ya = d.keys.includes(key);
    const keys = CONCERT_KEYS.filter((k) => (k === key ? !ya : d.keys.includes(k)));
    return { ...d, keys };
  });
}

/**
 * Deja un paso logrado y anota con qué tempo y en qué tonalidad salió (por ejemplo, desde la toma completa). Si ya estaba logrado no lo
 * desmarca; el tempo anotado es el mayor entre el que había y el nuevo.
 */
export function logrado(rep: Repertorio, id: string, paso: number, day: number, datos: { bpm?: number; key?: string } = {}): Repertorio {
  if (paso < 0 || paso >= PASOS.length) return rep;
  let r = rep[id]?.hechos.includes(paso) ? tocado(rep, id, day) : marcar(rep, id, paso, day);
  if (datos.bpm !== undefined && Number.isFinite(datos.bpm)) r = fijarBpm(r, id, paso, Math.max(datos.bpm, detalleDe(r[id], paso).bpm ?? 0), day);
  if (datos.key && !detalleDe(r[id], paso).keys.includes(datos.key)) r = alternarTonalidad(r, id, paso, datos.key, day);
  return r;
}

/** Lo mejor que se anotó de un tema: el mayor tempo y todas las tonalidades en que se tocó algún paso. */
export function resumenAvance(a: Avance | undefined): { mejorBpm: number | null; tonalidades: string[] } {
  const bpms = Object.values(a?.detalle ?? {}).flatMap((d) => (d.bpm !== undefined ? [d.bpm] : []));
  const keys = new Set(Object.values(a?.detalle ?? {}).flatMap((d) => d.keys));
  return { mejorBpm: bpms.length ? Math.max(...bpms) : null, tonalidades: CONCERT_KEYS.filter((k) => keys.has(k)) };
}

/** ¿El tempo anotado llega al del tema? */
export const llegoAlTempo = (bpm: number | undefined, tempoTema: number): boolean => bpm !== undefined && bpm >= tempoTema;

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

/** Dónde está un tema: sin empezar (ningún paso y nunca tocado), aprendiendo o terminado (los siete pasos). */
export type EstadoTema = 'sin' | 'aprendiendo' | 'terminado';
export function estadoTema(a: Avance | undefined): EstadoTema {
  if (completo(a)) return 'terminado';
  return logrados(a) === 0 && !(a && a.ultimo > 0) ? 'sin' : 'aprendiendo';
}

const RANGO: Record<EstadoTema, number> = { aprendiendo: 1, sin: 2, terminado: 3 };

/** Orden de la lista de temas: el que está en estudio, los que se están aprendiendo, los que no se empezaron y los terminados (estable dentro de cada grupo). */
export function ordenarTemas<T extends { id: string }>(temas: readonly T[], rep: Repertorio, enEstudio?: string): T[] {
  const rango = (t: T) => (t.id === enEstudio ? 0 : RANGO[estadoTema(rep[t.id])]);
  return temas.map((t, i) => ({ t, i })).sort((x, y) => rango(x.t) - rango(y.t) || x.i - y.i).map((x) => x.t);
}
