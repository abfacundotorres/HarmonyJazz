import { CYCLE_OF_FOURTHS } from '../theory/chart';
import { LESSONS } from './lessons';
import type { Lick } from './licks';
import { FLEX_HARMONICS, LIP_BENDING, LONG_TONES_LOW, PlanItem } from './practice';
import { PROGRESSIONS } from './progressions';

export interface PlanBlock {
  id: string;
  title: string;
  minutes: number;
  detail: PlanItem[];
  /** Ruta de la app a la que lleva el bloque. */
  link?: string;
  linkLabel?: string;
}

export interface DailyPlan {
  date: string;
  /** Tonalidad del día (concierto). */
  key: string;
  blocks: PlanBlock[];
}

const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
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

const WARMUPS: PlanItem[][] = [
  ['Buzzing de boquilla: glissandos lentos de una octava, 2 min.', 'Notas largas pp → ff → pp en el registro medio, con afinador.', 'Lip slurs por armónicos en las 7 posiciones (0, 2, 1, 12, 23, 13, 123), lento.'],
  [LONG_TONES_LOW, FLEX_HARMONICS, LIP_BENDING],
  ['Buzzing de boquilla imitando una frase de un solo que estés transcribiendo.', 'Notas largas en cuartas (C-F-B♭...) con afinador.', 'Lip slurs en tresillos, rápido y suave, sin presión.'],
];

const TECHNIQUE = [
  'Escala mayor de la tonalidad del día en terceras, dos octavas, corcheas a negra = 120.',
  'Escala menor melódica de la tonalidad del día en todo el registro, con patrón 1-2-3-5.',
  'Arpegios de 7ª diatónicos de la tonalidad del día, ascendentes y descendentes.',
  'Escala cromática de dos octavas con doodle tonguing, metrónomo en 2 y 4.',
  'Intervalos crecientes desde la tónica (2ª, 3ª, 4ª...) para precisión de ataque.',
];

export function buildPlan(d: Date, totalMinutes: number, focusLessonId?: string, phrases: Lick[] = []): DailyPlan {
  const n = dayNumber(d);
  const key = keyOfDay(d);
  const tune = tuneOfWeek(d);
  const lesson = LESSONS.find((l) => l.id === focusLessonId) ?? LESSONS[Math.floor(n / 3) % LESSONS.length];
  const lick = phrases.length ? phrases[n % phrases.length] : null;
  const warm = WARMUPS[n % WARMUPS.length];

  // reparto proporcional
  const w = { warm: 0.15, tech: 0.12, lesson: 0.25, lick: 0.15, tune: 0.23, free: 0.1 };
  const m = (x: number) => Math.max(3, Math.round((totalMinutes * x) / 5) * 5 || 3);

  const blocks: PlanBlock[] = [
    {
      id: 'warm',
      title: 'Calentamiento y sonido',
      minutes: m(w.warm),
      detail: warm,
      link: '#/escucha',
      linkLabel: 'Abrir afinador',
    },
    {
      id: 'tech',
      title: 'Técnica en la tonalidad del día',
      minutes: m(w.tech),
      detail: [TECHNIQUE[n % TECHNIQUE.length], 'Metrónomo sólo en 2 y 4 desde el principio: el swing se practica también en la técnica.'],
      link: `#/playalong?p=ii-v-i&k=${key}&m=1`,
      linkLabel: 'Metrónomo en 2 y 4',
    },
    {
      id: 'lesson',
      title: `Armonía aplicada: ${lesson.title}`,
      minutes: m(w.lesson),
      detail: [
        lesson.summary,
        'Hacé el primer ejercicio en la tonalidad del día y marcá la tonalidad como dominada cuando salga limpio a tempo.',
      ],
      link: `#/lecciones/${lesson.id}?k=${key}`,
      linkLabel: 'Ir a la lección',
    },
    lick
      ? {
          id: 'lick',
          title: `Vocabulario: ${lick.name}`,
          minutes: m(w.lick),
          detail: [
            lick.idea || 'Una de tus frases del día.',
            'Aprendela en la tonalidad del día, después recorré el ciclo de cuartas. Tocala cambiando la rítmica y el final.',
          ],
          link: `#/vocabulario/${lick.id}?k=${key}`,
          linkLabel: 'Abrir la frase',
        }
      : {
          id: 'lick',
          title: 'Vocabulario: cargá una frase',
          minutes: m(w.lick),
          detail: [
            'Elegí una frase de un solo que te guste (de un disco o de un libro tuyo), cargala en la sección Vocabulario y aprendela en la tonalidad del día.',
          ],
          link: '#/vocabulario',
          linkLabel: 'Ir a Vocabulario',
        },
    {
      id: 'tune',
      title: `Tema de la semana: ${tune.name}`,
      minutes: m(w.tune),
      detail: [
        '1 chorus de guide tones, 1 de arpegios, después improvisá con el reto de guide tones activado.',
        tune.listen?.length ? `Escuchá: ${tune.listen.join('; ')}.` : tune.notes,
      ],
      link: `#/playalong?p=${tune.id}`,
      linkLabel: 'Abrir play-along',
    },
    {
      id: 'free',
      title: 'Improvisación libre y grabación',
      minutes: m(w.free),
      detail: [
        'Grabá un par de choruses sobre el tema de la semana. Escuchá sin el instrumento en la mano: ¿se escuchan los cambios? ¿hay espacio?',
        'Transcripción: 4 compases de un solo de referencia, primero cantados, después en la trompeta.',
      ],
    },
  ];
  return { date: isoDate(d), key, blocks };
}
