import { ejercicioTemaById } from '../content/ejerciciosTema';
import { LESSONS } from '../content/lessons';
import type { Lick } from '../content/licks';
import { PATTERNS, SCALE_GROUPS } from '../content/scaleStudy';
import { SCALES } from '../theory/scales';
import { parseItem } from '../state/progress';

export interface Described {
  /** Qué es (lección, escala o frase). */
  title: string;
  /** Qué ejercicio, patrón o detalle. */
  detail: string;
  /** Enlace a la pantalla con ese ejercicio en esa tonalidad (concierto). */
  href: (key: string) => string;
}

/** Nombre y enlace de un identificador de `mastery`, o null si ya no existe (una frase borrada, por ejemplo). */
export function describeItem(id: string, phrases: Pick<Lick, 'id' | 'name'>[], temas: { id: string; name: string }[] = []): Described | null {
  const it = parseItem(id);
  if (it.kind === 'tema') {
    const t = temas.find((x) => x.id === it.tema);
    const e = ejercicioTemaById(it.ex);
    return t && e ? { title: t.name, detail: e.titulo, href: (k) => `#/repertorio?t=${encodeURIComponent(t.id)}&ex=${e.id}&k=${k}` } : null;
  }
  if (it.kind === 'lesson') {
    const l = LESSONS.find((x) => x.id === it.lesson);
    const ex = l?.exercises[it.idx];
    return l && ex ? { title: l.title, detail: ex.label, href: (k) => `#/lecciones/${l.id}?k=${k}&ex=${it.idx}` } : null;
  }
  if (it.kind === 'scale') {
    const sc = SCALES[it.scale];
    const p = PATTERNS.find((x) => x.id === it.pattern);
    return sc && p ? { title: sc.name, detail: p.title, href: (k) => `#/escalas?e=${it.scale}&p=${it.pattern}&k=${k}` } : null;
  }
  if (it.kind === 'lick') {
    const f = phrases.find((x) => x.id === it.id);
    return f ? { title: f.name, detail: 'Frase', href: (k) => `#/vocabulario/${f.id}?k=${k}` } : null;
  }
  return null;
}

/** Filas de las matrices de tonalidades: una por lección y una por escala (en el orden de la pantalla Escalas). */
export const lessonRows = () => LESSONS.map((l) => ({ id: l.id, title: l.title, ids: l.exercises.map((_, i) => `${l.id}:${i}`) }));
export const scaleRows = () =>
  SCALE_GROUPS.flatMap((g) => g.scales.map((s) => ({ id: s, group: g.title, title: SCALES[s].name, ids: PATTERNS.map((p) => `scale:${s}:${p.id}`) })));

/** Id y nombre de las frases guardadas (ignora lo que no tenga la forma esperada). */
export const phraseNames = (list: unknown[] | undefined): { id: string; name: string }[] =>
  (list ?? []).flatMap((p) => {
    const x = p as { id?: unknown; name?: unknown } | null;
    return x && typeof x.id === 'string' && typeof x.name === 'string' ? [{ id: x.id, name: x.name }] : [];
  });

/** Sólo lo que se puede mostrar: se quitan las marcas de frases borradas o ejercicios que ya no existen. */
export const showable = <T extends { id: string }>(items: T[], phrases: Pick<Lick, 'id' | 'name'>[], temas: { id: string; name: string }[] = []): T[] =>
  items.filter((d) => describeItem(d.id, phrases, temas) !== null);
