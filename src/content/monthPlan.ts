/**
 * Plan del mes: un foco de técnica, uno de lenguaje y un tema de repertorio, elegidos al empezar el mes, y la hora
 * diaria repartida entre ellos. Cada día toca una tarea de cada foco según cuántas sesiones se llevan practicadas.
 */
import { dayOfIso, type Log } from '../state/progress';
import { FOCI, focusById, type FocusTask, type FocusWeek, REPERTOIRE_WEEKS, SESSIONS_PER_WEEK, WEEKS } from './focus';
import { type DailyPlan, fitMinutes, isoDate, keyOfDay, type PlanBlock, WARMUPS } from './plan';
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

/** Sesión del plan en que se está hoy (1 = la primera): los días desde el comienzo en que se tildó algo, más hoy. */
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

/** Reparto de la hora: calentamiento, técnica, lenguaje, repertorio y libre. */
const SHARE = { warm: 0.17, tech: 0.25, lang: 0.25, rep: 0.25, free: 0.08 };
const mins = (total: number, x: number) => Math.max(3, Math.round((total * x) / 5) * 5 || 3);

const SECOND = 'Segunda vez esta semana: repetí la tarea y subí un poco la exigencia (4 bpm más, o un semitono más de registro) sin perder la limpieza.';

function areaBlock(id: string, label: string, title: string, week: FocusWeek, pick: Pick, minutes: number, key: string, rep: string): PlanBlock {
  const task: FocusTask = week.tasks[pick.index];
  return {
    id,
    title: `${label}: ${title}`,
    minutes,
    detail: [`Semana ${pick.week + 1} de ${WEEKS} · ${week.title}. ${week.goal}`, ...(pick.pass === 2 ? [SECOND] : []), task],
    link: resolveLink(task.link, key, rep),
    linkLabel: task.linkLabel,
  };
}

/** El plan de un día con el foco del mes. `repName` es el nombre del tema de repertorio. */
export function buildMonthPlan(d: Date, totalMinutes: number, mp: MonthPlan, session: number, repName: string): DailyPlan {
  const tech = focusById(mp.tech)!;
  const lang = focusById(mp.lang)!;
  const pick = pickFor(session);
  const key = keyOfDay(d);
  const rep = REPERTOIRE_WEEKS(repName);
  const warm = WARMUPS[(session - 1) % WARMUPS.length];
  const blocks: PlanBlock[] = [
    { id: 'warm', title: 'Calentamiento y sonido', minutes: mins(totalMinutes, SHARE.warm), detail: warm, link: '#/escucha', linkLabel: 'Abrir afinador' },
    areaBlock('tech', 'Técnica', tech.title, tech.weeks[pick.week], pick, mins(totalMinutes, SHARE.tech), key, mp.rep),
    areaBlock('lang', 'Lenguaje', lang.title, lang.weeks[pick.week], pick, mins(totalMinutes, SHARE.lang), key, mp.rep),
    areaBlock('rep', 'Repertorio', repName, rep[pick.week], pick, mins(totalMinutes, SHARE.rep), key, mp.rep),
    {
      id: 'free',
      title: 'Libre y grabación',
      minutes: mins(totalMinutes, SHARE.free),
      detail: [
        'Tocá lo que quieras sobre el tema del mes con el play-along, sin una regla. Si podés, grabalo.',
        'Anotá en una línea qué avanzó hoy y qué vas a repetir mañana.',
      ],
      link: `#/playalong?p=${encodeURIComponent(mp.rep)}`,
      linkLabel: 'Abrir el tema',
    },
  ];
  fitMinutes(blocks, totalMinutes, (b) => totalMinutes * SHARE[b.id as keyof typeof SHARE]);
  return { date: isoDate(d), key, blocks, month: { week: pick.week, session } };
}

/** Los ocho focos y las tres tareas de cada semana, en una sola lista (para revisar el catálogo). */
export const allFocusTasks = () => FOCI.flatMap((f) => f.weeks.flatMap((w) => w.tasks));
