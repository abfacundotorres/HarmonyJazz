import { CYCLE_OF_FOURTHS } from '../theory/chart';
import { LESSONS } from './lessons';
import type { Lick } from './licks';
import * as P from './practice';
import type { PlanItem } from './practice';
import { PATTERNS, type Suggestion } from './scaleStudy';
import { SCALES } from '../theory/scales';
import { PROGRESSIONS } from './progressions';

export interface PlanBlock {
  id: string;
  title: string;
  detail: PlanItem[];
  /** Ruta de la app a la que lleva el bloque. */
  link?: string;
  linkLabel?: string;
}

export interface DailyPlan {
  date: string;
  /** Si el plan es el del mes: en qué semana y sesión va. */
  month?: { week: number; session: number };
  /** Tonalidad del día (concierto). */
  key: string;
  blocks: PlanBlock[];
}

export const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const TUNES = PROGRESSIONS.filter((p) => ['Formas', 'Blues', 'Avanzado'].includes(p.category));

/** Tonalidad del día: recorre el ciclo de cuartas, una por día. */
export function keyOfDay(d: Date) {
  return CYCLE_OF_FOURTHS[dayNumber(d) % 12];
}

/** Tema de la semana. */
export function tuneOfWeek(d: Date) {
  return TUNES[Math.floor(dayNumber(d) / 7) % TUNES.length];
}

export const WARMUPS: PlanItem[][] = [
  [P.BUZZ_GLISSANDO, P.LONG_TONES_DYNAMICS, P.LIP_SLURS_POSITIONS],
  [P.LONG_TONES_LOW, P.FLEX_HARMONICS, P.LIP_BENDING],
  [P.BUZZ_PHRASE, P.LONG_TONES_FOURTHS, P.LIP_SLURS_TRIPLETS],
  [P.BREATH_FLOW, P.SOFT_ATTACKS, P.HIGH_SOFT],
  [P.TONGUING_REPEATED, P.SLURRED_SCALE, P.INTERVAL_SLURS],
];

const TECHNIQUE: PlanItem[] = P.TECHNIQUE_EXERCISES;

/**
 * Plan de rotación (cuando no hay foco del mes): tres bloques, sin reparto de minutos. Calentamiento, un solo foco del
 * día (rota entre técnica, escala, armonía y vocabulario) y el tema de la semana.
 */
export function buildPlan(d: Date, focusLessonId?: string, phrases: Lick[] = [], scale?: Suggestion): DailyPlan {
  const n = dayNumber(d);
  const key = keyOfDay(d);
  const tune = tuneOfWeek(d);
  const lesson = LESSONS.find((l) => l.id === focusLessonId) ?? LESSONS[Math.floor(n / 12) % LESSONS.length];
  const lick = phrases.length ? phrases[Math.floor(n / 4) % phrases.length] : null;
  const warm = WARMUPS[n % WARMUPS.length];

  const tech: PlanBlock = {
    id: 'tech',
    title: 'Técnica en la tonalidad del día',
    detail: [TECHNIQUE[Math.floor(n / 4) % TECHNIQUE.length], 'Metrónomo sólo en 2 y 4 desde el principio: el swing se practica también en la técnica.'],
    link: `#/playalong?p=ii-v-i&k=${key}&m=1`,
    linkLabel: 'Metrónomo en 2 y 4',
  };
  const scaleBlock: PlanBlock | null = scale
    ? {
        id: 'scale',
        title: `Escala del día: ${SCALES[scale.scale].name}`,
        detail: [
          `Hoy: ${PATTERNS.find((p) => p.id === scale.pattern)!.title.toLowerCase()}, en la tonalidad que sigue en tu ciclo. Es la combinación de escala, patrón y tonalidad que menos trabajaste.`,
          'Cuando salga limpia a tempo, marcala en la pantalla de Escalas: la app guarda tu mejor tempo y te propone la próxima.',
        ],
        link: `#/escalas?e=${scale.scale}&p=${scale.pattern}&k=${scale.key}`,
        linkLabel: 'Estudiar la escala',
      }
    : null;
  const lessonBlock: PlanBlock = {
    id: 'lesson',
    title: `Armonía aplicada: ${lesson.title}`,
    detail: [
      lesson.summary,
      'Hacé el primer ejercicio en la tonalidad del día y marcá la tonalidad como dominada cuando salga limpio a tempo.',
    ],
    link: `#/lecciones/${lesson.id}?k=${key}&ex=0`,
    linkLabel: 'Ir a la lección',
  };
  const lickBlock: PlanBlock | null = lick
    ? {
        id: 'lick',
        title: `Vocabulario: ${lick.name}`,
        detail: [
          lick.idea || 'Una de tus frases del día.',
          'Aprendela en la tonalidad del día, después recorré el ciclo de cuartas. Tocala cambiando la rítmica y el final.',
        ],
        link: `#/vocabulario/${lick.id}?k=${key}`,
        linkLabel: 'Abrir la frase',
      }
    : null;
  // un solo foco por día, rotando
  const focuses = [tech, scaleBlock, lessonBlock, lickBlock].filter((b): b is PlanBlock => b !== null);
  const focus = focuses[n % focuses.length];

  const blocks: PlanBlock[] = [
    { id: 'warm', title: 'Calentamiento y sonido', detail: warm, link: '#/escucha', linkLabel: 'Abrir afinador' },
    focus,
    {
      id: 'tune',
      title: `Tema de la semana: ${tune.name}`,
      detail: [
        '1 chorus de guide tones, 1 de arpegios, después improvisá con el reto de guide tones activado.',
        tune.listen?.length ? `Escuchá: ${tune.listen.join('; ')}.` : tune.notes,
      ],
      link: `#/playalong?p=${tune.id}`,
      linkLabel: 'Abrir play-along',
    },
  ];
  return { date: isoDate(d), key, blocks };
}
