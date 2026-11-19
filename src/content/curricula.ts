/**
 * La currícula: un plan de tres años (seis semestres de seis meses) a la manera de una facultad. Cada mes es una
 * materia con un foco de lenguaje y uno de técnica (los mismos focos de Mi mes), sus correlativas (lo que conviene
 * haber aprobado antes) y un cierre con autoevaluación. Cada semestre termina con un mes de integración o de taller.
 * El orden sale del camino sugerido (`camino.ts`) y es criterio mío, no de una fuente: se cambia editando `PLAN`.
 */
import { focusById } from './focus';
import { stepOf } from './camino';

export type Kind = 'materia' | 'taller' | 'integracion';

export interface Materia {
  /** Número de mes en la currícula (1 a 36). */
  n: number;
  /** Semestre (1 a 6). */
  sem: number;
  kind: Kind;
  name: string;
  lang: string;
  tech: string;
  /** Qué se busca este mes, en una línea. */
  goal: string;
}

export const SEMESTERS: { sem: number; year: number; title: string; goal: string }[] = [
  { sem: 1, year: 1, title: 'Base', goal: 'Tríadas y swing: la unidad más simple de una línea, con el fraseo desde el principio.' },
  { sem: 2, year: 1, title: 'Acordes y conducción', goal: 'Los acordes de cuatro notas, los arpegios y los guide tones que unen un acorde con el siguiente.' },
  { sem: 3, year: 2, title: 'Vocabulario', goal: 'Intervalos, pentatónicas, blues, motivos y el ii–V–i menor: frases propias sobre acordes.' },
  { sem: 4, year: 2, title: 'Forma y fraseo', goal: 'Bebop, turnarounds, rhythm changes y 3/4: tocar sobre formas completas y aprender de las grabaciones.' },
  { sem: 5, year: 3, title: 'Ampliar la armonía', goal: 'Pares de tríadas, sustitución tritonal, desplazamiento y escalas simétricas.' },
  { sem: 6, year: 3, title: 'Avanzado y proyecto', goal: 'Side-slipping y Coltrane, y un cierre integrador de todo el recorrido.' },
];

const M = (n: number, sem: number, kind: Kind, name: string, lang: string, tech: string, goal: string): Materia => ({ n, sem, kind, name, lang, tech, goal });

export const PLAN: Materia[] = [
  // ---------- 1.er semestre: Base ----------
  M(1, 1, 'materia', 'Tríadas mayores', 'l-triadas-mayores', 't-largas-artic', 'Tocar las tríadas mayores sobre los acordes con un sonido firme.'),
  M(2, 1, 'materia', 'Swing y articulación', 'l-swing-articulacion', 't-ritmo-precision', 'Que el tiempo y la articulación suenen a jazz desde el principio.'),
  M(3, 1, 'materia', 'Tríadas menores', 'l-triadas-menores', 't-boquilla-buzzing', 'Sumar las tríadas menores para cubrir los acordes menores.'),
  M(4, 1, 'materia', 'Tríadas mayores y menores', 'l-triadas-mayor-menor', 't-flexibilidad', 'Pasar de una tríada a otra según el acorde, sin pensar.'),
  M(5, 1, 'materia', 'Células 1-2-3-5', 'l-celulas-1235', 't-dinamica-aire', 'La primera frase corta construida sobre el acorde.'),
  M(6, 1, 'integracion', 'Integración I: tríadas con swing', 'l-triadas-mayor-menor', 't-largas-artic', 'Juntar lo del semestre: tríadas y células con swing sobre un ii–V–I.'),
  // ---------- 2.º semestre: Acordes y conducción ----------
  M(7, 2, 'materia', 'Acordes de cuatro notas', 'l-acordes-7', 't-escalas-arpegios', 'Los acordes de cuatro notas (maj7, m7, 7, m7♭5) de memoria.'),
  M(8, 2, 'materia', 'Arpegios de séptima', 'l-arpegios', 't-arpegios-saltos', 'Arpegiar la séptima en las 12 tonalidades.'),
  M(9, 2, 'materia', 'Guide tones', 'l-guide-tones', 't-flexibilidad', 'Conectar la 3ª y la 7ª de un acorde con el siguiente.'),
  M(10, 2, 'materia', 'La escala de cada acorde', 'l-escala-del-acorde', 't-digitacion-velocidad', 'Saber qué escala suena sobre cada acorde y tocarla.'),
  M(11, 2, 'materia', 'Aproximaciones y enclosures', 'l-aproximaciones', 't-ritmo-precision', 'Aproximar por semitono a las notas del acorde.'),
  M(12, 2, 'integracion', 'Integración II: conducción de voces', 'l-guide-tones', 't-dinamica-aire', 'Una línea con guide tones, arpegios y aproximaciones sobre un ii–V–I.'),
  // ---------- 3.er semestre: Vocabulario ----------
  M(13, 3, 'materia', 'Intervalos: terceras, cuartas y saltos', 'l-intervalos', 't-arpegios-saltos', 'Romper el orden de la escala con intervalos.'),
  M(14, 3, 'materia', 'Pentatónicas sobre acordes', 'l-pentatonicas', 't-digitacion-velocidad', 'Usar la pentatónica como recorte de la escala del acorde.'),
  M(15, 3, 'materia', 'Lenguaje de blues', 'l-blues', 't-colores-jazz', 'Frases de blues con las notas de color.'),
  M(16, 3, 'materia', 'Motivos y desarrollo', 'l-motivos', 't-dinamica-aire', 'Tomar una idea corta y desarrollarla.'),
  M(17, 3, 'materia', 'ii–V–i menor', 'l-ii-v-i-menor', 't-escalas-arpegios', 'El ii–V–i menor con sus escalas y tensiones.'),
  M(18, 3, 'integracion', 'Integración III: tu vocabulario', 'l-motivos', 't-flexibilidad', 'Frases propias de cada tipo sobre una forma corta.'),
  // ---------- 4.º semestre: Forma y fraseo ----------
  M(19, 4, 'materia', 'Escalas bebop', 'l-escalas-bebop', 't-digitacion-velocidad', 'La nota de paso bebop para caer en las notas del acorde.'),
  M(20, 4, 'materia', 'Turnarounds', 'l-turnarounds', 't-ritmo-precision', 'Los cambios que cierran una forma, con guide tones.'),
  M(21, 4, 'taller', 'Taller de grabaciones', 'l-aprender-de-grabaciones', 't-largas-artic', 'Transcribir un pasaje y tocarlo con el audio.'),
  M(22, 4, 'materia', 'Rhythm changes', 'l-rhythm-changes', 't-registro-resistencia', 'La forma de Rhythm changes con su puente en cadena.'),
  M(23, 4, 'materia', 'Improvisar en 3/4 y 6/8', 'l-vals-seis-octavos', 't-ritmo-precision', 'El mismo lenguaje en compases ternarios.'),
  M(24, 4, 'integracion', 'Integración IV: una forma completa', 'l-rhythm-changes', 't-colores-jazz', 'Improvisar dos chorus sobre una forma completa con lo del año.'),
  // ---------- 5.º semestre: Ampliar la armonía ----------
  M(25, 5, 'materia', 'Pares de tríadas', 'l-triad-pairs', 't-arpegios-saltos', 'Dos tríadas sobre un acorde para sonar abierto.'),
  M(26, 5, 'materia', 'Sustitución tritonal', 'l-sustitucion-tritonal', 't-colores-jazz', 'Reemplazar un dominante por su sustituto.'),
  M(27, 5, 'materia', 'Desplazamiento rítmico', 'l-desplazamiento', 't-ritmo-precision', 'Mover una frase de lugar en el compás.'),
  M(28, 5, 'materia', 'Escalas simétricas', 'l-escalas-simetricas', 't-colores-jazz', 'Disminuida y tonos enteros sobre dominantes.'),
  M(29, 5, 'taller', 'Taller de grabaciones II', 'l-aprender-de-grabaciones', 't-dinamica-aire', 'Una segunda transcripción, con análisis de lo que usó.'),
  M(30, 5, 'integracion', 'Integración V: armonía ampliada', 'l-sustitucion-tritonal', 't-registro-resistencia', 'Usar lo del semestre sobre un tema propio.'),
  // ---------- 6.º semestre: Avanzado y proyecto ----------
  M(31, 6, 'materia', 'Side-slipping', 'l-side-slipping', 't-flexibilidad', 'Salir un semitono de la armonía y volver.'),
  M(32, 6, 'materia', 'Cambios de Coltrane', 'l-cambios-coltrane', 't-digitacion-velocidad', 'Los cambios de Coltrane con tríadas y guide tones.'),
  M(33, 6, 'taller', 'Taller de grabaciones III', 'l-aprender-de-grabaciones', 't-largas-artic', 'Una transcripción más, ahora con tu propia variación.'),
  M(34, 6, 'integracion', 'Integración VI: swing y fraseo maduro', 'l-swing-articulacion', 't-boquilla-buzzing', 'Volver al tiempo y la articulación con todo lo aprendido.'),
  M(35, 6, 'integracion', 'Integración VII: bebop a fondo', 'l-escalas-bebop', 't-colores-jazz', 'Bebop con exigencia de tempo y limpieza.'),
  M(36, 6, 'integracion', 'Proyecto final', 'l-guide-tones', 't-registro-resistencia', 'Un tema completo, grabado, con todo lo que trabajaste.'),
];

export const byN = (n: number) => PLAN.find((m) => m.n === n);

/** Correlativas de una materia: las materias anteriores donde se trabaja lo que conviene tener antes de su foco de lenguaje y de técnica. */
export function correlativas(m: Materia): Materia[] {
  const need = new Set([...(stepOf(m.lang)?.after ?? []), ...(stepOf(m.tech)?.after ?? [])]);
  const out = new Map<string, Materia>();
  for (const x of PLAN) {
    if (x.n >= m.n) break;
    if (x.kind === 'materia' && (need.has(x.lang) || need.has(x.tech)) && !out.has(x.lang + x.tech)) out.set(x.lang + x.tech, x);
  }
  // las que cubren cada requisito: la primera materia que lo trabaja
  const firsts = [...need].flatMap((id) => {
    const f = PLAN.find((x) => x.n < m.n && x.kind === 'materia' && (x.lang === id || x.tech === id));
    return f ? [f] : [];
  });
  return [...new Set(firsts)].sort((a, b) => a.n - b.n);
}

/** Estado de la currícula: las materias aprobadas y la que está en curso. */
export interface Progress {
  aprobadas: number[];
  actual: number | null;
  /** Criterios de cierre tildados por materia. */
  checks: Record<string, number[]>;
}
export const EMPTY: Progress = { aprobadas: [], actual: null, checks: {} };

/** La próxima materia: la primera que no está aprobada. */
export const siguiente = (p: Progress): Materia | null => PLAN.find((m) => !p.aprobadas.includes(m.n)) ?? null;

/** ¿Faltan correlativas por aprobar? */
export const faltan = (m: Materia, p: Progress): Materia[] => correlativas(m).filter((c) => !p.aprobadas.includes(c.n));

// ---------- cierre con autoevaluación ----------

const CIERRE: Record<string, string[]> = {
  'l-triadas-mayores': ['Toco las tríadas mayores de memoria en las 12 tonalidades.', 'Las uso sobre un acorde mayor de un ii–V–I sin buscar la nota.', 'Suenan parejas y con el mismo peso a tempo medio.'],
  'l-swing-articulacion': ['Mi corchea con swing se mantiene pareja con el metrónomo en 2 y 4.', 'Acentúo contratiempos y acabo las frases sin apurar.', 'Me grabo y reconozco el swing al escucharme.'],
  'l-triadas-menores': ['Toco las tríadas menores de memoria en las 12 tonalidades.', 'Las uso sobre un acorde menor sin buscar la nota.', 'Las conecto con una tríada mayor por la nota más cercana.'],
  'l-triadas-mayor-menor': ['Elijo la tríada correcta al leer el cifrado, a primera vista.', 'Paso de una a otra en un ii–V–I sin cortar la frase.', 'Lo toco en al menos 6 tonalidades a tempo medio.'],
  'l-celulas-1235': ['Toco las dos células en las 12 tonalidades.', 'Las encadeno sobre un ii–V–I con ritmo propio.', 'Cierro la frase en una nota larga del acorde.'],
  'l-acordes-7': ['Toco maj7, m7, 7 y m7♭5 de memoria, desde cualquier nota.', 'Nombro las notas de cada uno sin contar.', 'Los reconozco al oído (pantalla Oído) con un 80 % o más.'],
  'l-arpegios': ['Arpegio ascendente y descendente de los cuatro acordes en las 12 tonalidades.', 'Los toco sobre una forma con el play-along.', 'Empiezo el arpegio desde la 3ª o la 7ª, no solo desde la fundamental.'],
  'l-guide-tones': ['Toco la línea de guide tones de un ii–V–I en las 12 tonalidades.', 'Los conecto por el semitono o el tono más cercano.', 'Identifico la 3ª y la 7ª al oído (dictado) con un 80 % o más.'],
  'l-escala-del-acorde': ['Nombro la escala de cada acorde del ii–V–I mayor y menor.', 'Toco cada una ida y vuelta a tempo medio.', 'Improviso con ella en un chorus sin salirme de la armonía.'],
  'l-aproximaciones': ['Toco aproximaciones por arriba, por abajo y doble a cada nota del acorde.', 'Las uso en un chorus cayendo en tiempo fuerte.', 'Me suenan naturales, no como un ejercicio.'],
  'l-intervalos': ['Toco terceras y cuartas sobre el acorde sin perderme.', 'Hago saltos amplios sin cortar el sonido.', 'Armo una frase con un salto y un cierre claro.'],
  'l-pentatonicas': ['Elijo la pentatónica de cada acorde.', 'Toco una pentatónica con ritmo propio sobre la forma.', 'Distingo cuándo suena "adentro" y cuándo tensa.'],
  'l-blues': ['Toco frases de blues con las notas de color sobre el blues de jazz.', 'Alterno frases cortas y largas con espacio.', 'Me grabo un chorus y suena a blues.'],
  'l-motivos': ['Desarrollo un motivo de 3 maneras (repetir, transponer, variar el ritmo).', 'Lo sostengo durante un chorus completo.', 'Cierro el desarrollo con una frase resolutiva.'],
  'l-ii-v-i-menor': ['Toco el ii–V–i menor en las 12 tonalidades con sus escalas.', 'Resuelvo sobre el acorde menor con la 3ª o la 5ª.', 'Uso al menos dos tensiones sobre el dominante.'],
  'l-escalas-bebop': ['Toco las escalas bebop dominante y mayor en las 12 tonalidades.', 'Caigo en tiempo fuerte sobre las notas del arpegio.', 'Las integro a una frase propia a tempo medio.'],
  'l-turnarounds': ['Toco los guide tones de un turnaround I–vi–ii–V.', 'Armo una frase propia sobre el turnaround.', 'Lo uso al final de una forma sin perder el pulso.'],
  'l-aprender-de-grabaciones': ['Transcribí un pasaje de 4 compases.', 'Lo toco junto con el audio, a tempo y con la misma articulación.', 'Lo analicé (guide tones, aproximaciones, ritmo) y lo uso en otra tonalidad.'],
  'l-rhythm-changes': ['Toco la forma de memoria con el play-along.', 'Improviso dos chorus sin perder la forma.', 'Resuelvo el puente en cadena con guide tones.'],
  'l-vals-seis-octavos': ['Siento el pulso en 3 y en 6/8 sin contar.', 'Improviso un chorus en 3/4.', 'Mis frases usan el compás, no son del 4/4 "forzadas".'],
  'l-triad-pairs': ['Toco los pares de tríadas sobre un dominante y un menor.', 'Uso un par en un chorus sin perder la armonía.', 'Reconozco el sonido abierto que dan.'],
  'l-sustitucion-tritonal': ['Encuentro el dominante sustituto de cualquier dominante.', 'Toco guide tones con la sustitución.', 'La uso en un ii–V–I sin que se oiga forzada.'],
  'l-desplazamiento': ['Muevo una frase un tiempo y medio tiempo.', 'La repito desplazada de forma que suene intencional.', 'Vuelvo a caer en el tiempo fuerte.'],
  'l-escalas-simetricas': ['Toco la disminuida y la de tonos enteros desde cualquier nota.', 'Las uso sobre un dominante alterado.', 'Resuelvo a la tónica con claridad.'],
  'l-side-slipping': ['Salgo un semitono arriba o abajo de la armonía y vuelvo.', 'Lo hago con ritmo claro, sin perder el pulso.', 'Lo uso solo en momentos elegidos de un chorus.'],
  'l-cambios-coltrane': ['Toco la célula de Coltrane en varias tonalidades.', 'Mantengo la tríada y los guide tones a tempo medio.', 'Uso los cambios de Coltrane sobre un ii–V–I en un chorus.'],
};

const INTEGRACION = ['Toco un chorus completo sobre una forma usando lo del semestre.', 'Me grabo, escucho y anoto dos cosas para mejorar.', 'Las dos cosas anotadas las trabajé al menos dos sesiones.'];
const PROYECTO = ['Elegí un tema (o una forma) y lo toco completo con el play-along.', 'Grabé tres chorus y elegí el mejor.', 'Escuché la grabación y puedo decir qué recursos del recorrido usé y cuáles me faltan.'];

/** Criterios de cierre de una materia: los del foco de lenguaje, uno de técnica, y los de integración o proyecto en esos meses. */
export function cierre(m: Materia): string[] {
  const tec = `La técnica del mes (${focusById(m.tech)?.title ?? m.tech}) sale limpia a tempo cómodo.`;
  if (m.n === 36) return [...PROYECTO, tec];
  if (m.kind === 'integracion') return [...INTEGRACION, tec];
  return [...(CIERRE[m.lang] ?? []), tec];
}
