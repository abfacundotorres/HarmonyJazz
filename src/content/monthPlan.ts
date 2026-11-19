/**
 * Plan del mes: un foco de técnica, uno de lenguaje y un tema de repertorio, elegidos al empezar el mes, y la hora
 * diaria repartida entre ellos. Cada día toca una tarea de cada foco según cuántas sesiones se llevan practicadas.
 */
import { dayOfIso, type Log } from '../state/progress';
import { FOCI, focusById, type FocusTask, type FocusWeek, SESSIONS_PER_WEEK, WEEKS } from './focus';
import { repertoireWeeks } from './standards';
import { type DailyPlan, isoDate, keyOfDay, type PlanBlock, WARMUPS } from './plan';
import { PROGRESSIONS } from './progressions';

export interface MonthPlan {
  /** "AAAA-MM": el mes en el que se eligieron los focos. */
  month: string;
  tech: string;
  lang: string;
  /** Tema de repertorio: id de una progresión incluida o de un tema propio. */
  rep: string;
  /** Número de día en que se empezó (las sesiones se cuentan desde ahí). */
  startDay: number;
  /** Semestre de la currícula (1 a 6) si el mes sale de ella: el recorrido del tema se exige según el semestre. */
  nivel?: number;
}

export const EMPTY_MONTH: MonthPlan = { month: '', tech: '', lang: '', rep: '', startDay: 0 };

export const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const monthName = (m: string) => MONTH_NAMES[Number(m.slice(5, 7)) - 1] ?? m;

/** Nombre del tema de repertorio, de las progresiones incluidas o de los temas propios (null si ya no existe). */
export function repertoireName(id: string, tunes: { id: string; name: string }[]): string | null {
  return tunes.find((t) => t.id === id)?.name ?? PROGRESSIONS.find((p) => p.id === id)?.name ?? null;
}

/** ¿Hay un plan del mes vigente? Hace falta que sea de este mes y que los focos y el tema sigan existiendo. */
export function monthActive(mp: MonthPlan, d: Date, tunes: { id: string; name: string }[]): boolean {
  return mp.month === monthOf(d) && !!focusById(mp.tech) && !!focusById(mp.lang) && repertoireName(mp.rep, tunes) !== null;
}

/** Sesión del plan en que se está hoy (1 = la primera): los días desde el comienzo en que se abrió Hoy, más hoy. */
export function sessionNumber(log: Log, startDay: number, today: number): number {
  let n = 1;
  for (const [iso, v] of Object.entries(log)) {
    const d = dayOfIso(iso);
    if (d !== null && d >= startDay && d < today && v.done.length > 0) n++;
  }
  return n;
}

export interface Pick {
  /** Semana (0 a 3). Pasadas las 24 sesiones se repite la última. */
  week: number;
  /** Qué tarea de la semana (0 a 2) y si es la primera o la segunda vez que se hace. */
  index: number;
  pass: 1 | 2;
}
export function pickFor(session: number): Pick {
  const s = Math.max(1, session) - 1;
  const within = s % SESSIONS_PER_WEEK;
  return { week: Math.min(WEEKS - 1, Math.floor(s / SESSIONS_PER_WEEK)), index: within % 3, pass: within >= 3 ? 2 : 1 };
}

const resolveLink = (link: string | undefined, key: string, rep: string) => link?.replaceAll('{k}', key).replaceAll('{rep}', encodeURIComponent(rep));

/**
 * Qué foco toca en una sesión: técnica en las sesiones impares y lenguaje en las pares. Cada foco avanza una tarea por
 * vez que le toca (tres por semana, doce en el mes); pasadas las 24 sesiones se repite la última semana.
 */
export function focusPick(session: number): { area: 'tech' | 'lang'; pick: Pick } {
  const s = Math.max(1, session) - 1;
  const k = Math.floor(s / 2);
  return { area: s % 2 === 0 ? 'tech' : 'lang', pick: { week: Math.min(WEEKS - 1, Math.floor(k / 3)), index: k % 3, pass: 1 } };
}

const SECOND = 'Segunda vez esta semana: repetí la tarea y subí un poco la exigencia (4 bpm más, o un semitono más de registro) sin perder la limpieza.';

function areaBlock(id: string, label: string, title: string, week: FocusWeek, pick: Pick, key: string, rep: string): PlanBlock {
  const task: FocusTask = week.tasks[pick.index];
  return {
    id,
    title: `${label}: ${title}`,
    detail: [`Semana ${pick.week + 1} de ${WEEKS} · ${week.title}. ${week.goal}`, ...(pick.pass === 2 ? [SECOND] : []), task],
    link: resolveLink(task.link, key, rep),
    linkLabel: task.linkLabel,
  };
}

/**
 * El plan de un día con el foco del mes: tres bloques. Calentamiento, el foco del día (técnica o lenguaje, alternando) y
 * el tema de repertorio. `repName` es el nombre del tema.
 */
export function buildMonthPlan(d: Date, mp: MonthPlan, session: number, repName: string): DailyPlan {
  const key = keyOfDay(d);
  const { area, pick } = focusPick(session);
  const focus = focusById(area === 'tech' ? mp.tech : mp.lang)!;
  const rep = repertoireWeeks(repName, mp.nivel);
  const repPick = pickFor(session);
  const warm = WARMUPS[(session - 1) % WARMUPS.length];
  const blocks: PlanBlock[] = [
    { id: 'warm', title: 'Calentamiento y sonido', detail: warm, link: '#/escucha', linkLabel: 'Abrir afinador' },
    areaBlock(area, area === 'tech' ? 'Técnica' : 'Lenguaje', focus.title, focus.weeks[pick.week], pick, key, mp.rep),
    areaBlock('rep', 'Repertorio', repName, rep[repPick.week], repPick, key, mp.rep),
  ];
  return { date: isoDate(d), key, blocks, month: { week: pick.week, session } };
}

/** Los ocho focos y las tres tareas de cada semana, en una sola lista (para revisar el catálogo). */
export const allFocusTasks = () => FOCI.flatMap((f) => f.weeks.flatMap((w) => w.tasks));
