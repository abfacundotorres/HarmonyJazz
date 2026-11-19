/**
 * Progreso: qué se practicó, en qué tonalidades y qué toca repasar. Todo sale de dos datos que ya guarda la app:
 *  - `mastery`: el mejor tempo por ejercicio y tonalidad (lo que se marca con "Salió limpio");
 *  - `log`: los minutos de cada día (la sesión de Hoy);
 * más `seen`, que recuerda cuándo se marcó por última vez cada ejercicio y tonalidad y cuántas veces, para espaciar los repasos.
 */
import { CYCLE_OF_FOURTHS } from '../theory/chart';

export type Mastery = Record<string, Record<string, number>>;
/** Por ejercicio y tonalidad: día de la última marca (número de día) y cuántos días distintos se marcó. */
export type Seen = Record<string, Record<string, { d: number; n: number }>>;
export type Log = Record<string, { done: string[]; minutes: number }>;

/** Número de día de una fecha local (el mismo criterio que el plan de Hoy). */
export const dayNum = (d: Date = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
/** Número de día de un "AAAA-MM-DD", o null. */
export function dayOfIso(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[3]) < 1 || Number(m[3]) > 31) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
}
const dateOfDay = (n: number) => new Date(n * 86400000);

// ---------- repaso espaciado ----------

/** Días hasta el próximo repaso según cuántas veces se marcó: 2, 4, 9, 18 y 35. */
export const REVIEW_DAYS = [2, 4, 9, 18, 35];
export const intervalDays = (n: number) => REVIEW_DAYS[Math.min(Math.max(1, n), REVIEW_DAYS.length) - 1];

/** Anota una marca. Marcar dos veces el mismo día cuenta una sola vez (no adelanta el calendario de repasos). */
export function bumpSeen(seen: Seen, id: string, key: string, day: number): Seen {
  const cur = seen[id]?.[key];
  const n = cur && cur.d === day ? cur.n : (cur?.n ?? 0) + 1;
  return { ...seen, [id]: { ...(seen[id] ?? {}), [key]: { d: day, n } } };
}

export interface Due {
  id: string;
  key: string;
  /** Mejor tempo marcado. */
  bpm: number;
  /** Días desde la última marca. */
  ago: number;
  /** Cuántos días de retraso respecto del calendario (0 = justo hoy). */
  late: number;
  /** Se marcó antes de que la app llevara la cuenta de fechas: se supone una marca de hace 6 días. */
  undated: boolean;
}

/**
 * Lo que toca repasar hoy: cada ejercicio y tonalidad marcados cuyo plazo venció, el más atrasado (en proporción a su
 * plazo) primero. Las marcas viejas, sin fecha, se tratan como de hace 6 días: así aparecen enseguida pero sin
 * apurar a todas juntas.
 */
export function dueItems(mastery: Mastery, seen: Seen, today: number, limit = 200): Due[] {
  const out: (Due & { ratio: number })[] = [];
  for (const [id, keys] of Object.entries(mastery)) {
    for (const [key, bpm] of Object.entries(keys)) {
      if (key === 'todas' || !(bpm > 0)) continue;
      const s = seen[id]?.[key];
      const d = s ? s.d : today - 6;
      const n = s ? s.n : 1;
      const every = intervalDays(n);
      const ago = Math.max(0, today - d);
      if (ago < every) continue;
      out.push({ id, key, bpm, ago, late: ago - every, undated: !s, ratio: ago / every });
    }
  }
  out.sort((a, b) => b.ratio - a.ratio || a.id.localeCompare(b.id) || a.key.localeCompare(b.key));
  return out.slice(0, limit);
}

// ---------- identificar un ejercicio ----------

export type Item =
  | { kind: 'lesson'; lesson: string; idx: number }
  | { kind: 'scale'; scale: string; pattern: string }
  | { kind: 'lick'; id: string }
  | { kind: 'other'; id: string };

/** Los identificadores de `mastery`: "lección:n", "scale:escala:patrón" y "lick:id". */
export function parseItem(id: string): Item {
  const sc = /^scale:([\w-]+):([\w-]+)$/.exec(id);
  if (sc) return { kind: 'scale', scale: sc[1], pattern: sc[2] };
  const lk = /^lick:(.+)$/.exec(id);
  if (lk) return { kind: 'lick', id: lk[1] };
  const ls = /^([\w-]+):(\d+)$/.exec(id);
  if (ls) return { kind: 'lesson', lesson: ls[1], idx: Number(ls[2]) };
  return { kind: 'other', id };
}

// ---------- tonalidades ----------

/** Las 12 tonalidades (concierto) en el orden de práctica: ciclo de cuartas. */
export const KEY_ORDER = CYCLE_OF_FOURTHS;

/** Cuántos ejercicios tienen marca en cada tonalidad (sumando lecciones, escalas y frases). */
export function keyBalance(mastery: Mastery): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(KEY_ORDER.map((k) => [k, 0]));
  for (const keys of Object.values(mastery)) for (const [k, bpm] of Object.entries(keys)) if (bpm > 0 && k in out) out[k]++;
  return out;
}

/** Las tonalidades con menos marcas (todas las que empatan en el mínimo), en el orden de práctica. Vacío si todavía no hay marcas. */
export function weakestKeys(balance: Record<string, number>): string[] {
  const vals = KEY_ORDER.map((k) => balance[k] ?? 0);
  if (Math.max(...vals) === 0) return [];
  const min = Math.min(...vals);
  return KEY_ORDER.filter((k) => (balance[k] ?? 0) === min);
}

/** Matriz fila × tonalidad: de cada fila, cuántos de sus `total` ejercicios tienen marca en cada tonalidad. */
export function keyMatrix(mastery: Mastery, rows: { id: string; ids: string[] }[]): { id: string; total: number; counts: Record<string, number> }[] {
  return rows.map((r) => {
    const counts: Record<string, number> = Object.fromEntries(KEY_ORDER.map((k) => [k, 0]));
    for (const id of r.ids) for (const [k, bpm] of Object.entries(mastery[id] ?? {})) if (bpm > 0 && k in counts) counts[k]++;
    return { id: r.id, total: r.ids.length, counts };
  });
}

/** Fecha corta de un número de día: "3 nov". */
export function shortDate(day: number): string {
  const d = dateOfDay(day);
  return `${d.getUTCDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getUTCMonth()]}`;
}
