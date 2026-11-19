/**
 * El camino sugerido: en qué orden conviene trabajar los focos del mes. Cada foco tiene una etapa y lo que conviene
 * tener antes (`after`), con la lógica de un currículo: primero la base (sonido, tríadas), después los acordes y la
 * conducción de voces (guide tones), después el vocabulario (pentatónicas, blues, bebop) y al final lo que se apoya en
 * todo lo anterior (pares de tríadas, sustitución tritonal, Coltrane). Es una sugerencia: se puede elegir cualquier foco.
 */
import { FOCI, type Focus } from './focus';

export interface Step {
  id: string;
  /** Etapa dentro de su área (1 es la base). */
  stage: number;
  /** Focos que conviene tener antes. */
  after: string[];
  /** Por qué va en este lugar. */
  why: string;
}

export const STAGE_TITLES: Record<Focus['area'], string[]> = {
  tecnica: ['Sonido', 'Control', 'Escalas y ritmo', 'Saltos y color', 'Resistencia'],
  lenguaje: ['Base', 'Acordes', 'Conducción', 'Vocabulario', 'Ampliar', 'Avanzado'],
};

/** El orden del camino: la lista misma ya es la secuencia sugerida, de la base a lo avanzado. */
export const PATH: Step[] = [
  // ---------- técnica ----------
  { id: 't-largas-artic', stage: 1, after: [], why: 'El sonido y el ataque son la base de todo lo demás.' },
  { id: 't-boquilla-buzzing', stage: 1, after: [], why: 'La embocadura y el aire se afinan mejor con la boquilla sola, antes de sumar velocidad.' },
  { id: 't-flexibilidad', stage: 2, after: ['t-largas-artic'], why: 'Las ligaduras y los armónicos piden un sonido ya estable.' },
  { id: 't-dinamica-aire', stage: 2, after: ['t-largas-artic'], why: 'El control del aire se construye sobre la nota larga.' },
  { id: 't-ritmo-precision', stage: 2, after: ['t-largas-artic'], why: 'El ataque limpio permite trabajar ritmos, síncopas y tresillos con precisión.' },
  { id: 't-escalas-arpegios', stage: 3, after: ['t-flexibilidad'], why: 'Escalas y arpegios limpios necesitan ligaduras y digitación parejas.' },
  { id: 't-digitacion-velocidad', stage: 3, after: ['t-escalas-arpegios'], why: 'La velocidad se agrega recién cuando la escala sale limpia a tempo lento.' },
  { id: 't-arpegios-saltos', stage: 4, after: ['t-escalas-arpegios', 't-flexibilidad'], why: 'Los saltos amplios usan la flexibilidad y los arpegios ya trabajados.' },
  { id: 't-colores-jazz', stage: 4, after: ['t-escalas-arpegios'], why: 'Las escalas del jazz (bebop, alteradas, simétricas) parten de las escalas básicas.' },
  { id: 't-registro-resistencia', stage: 5, after: ['t-flexibilidad', 't-dinamica-aire'], why: 'El registro agudo se apoya en flexibilidad y control del aire.' },

  // ---------- lenguaje ----------
  { id: 'l-triadas-mayores', stage: 1, after: [], why: 'Las tríadas mayores son la unidad más simple con la que se arma una línea sobre un acorde.' },
  { id: 'l-swing-articulacion', stage: 1, after: [], why: 'El tiempo y la articulación de swing van desde el principio: todo lo que sigue se toca con ese fraseo.' },
  { id: 'l-triadas-menores', stage: 1, after: ['l-triadas-mayores'], why: 'Se suman a las mayores para cubrir los acordes menores.' },
  { id: 'l-triadas-mayor-menor', stage: 2, after: ['l-triadas-mayores', 'l-triadas-menores'], why: 'Pasar de una a otra por acorde es el primer paso hacia tocar sobre cambios.' },
  { id: 'l-celulas-1235', stage: 2, after: ['l-triadas-mayores'], why: 'Las células 1-2-3-5 son la primera frase corta construida sobre el acorde.' },
  { id: 'l-acordes-7', stage: 2, after: ['l-triadas-mayor-menor'], why: 'Los acordes de cuatro notas completan la armonía del jazz (maj7, m7, 7, m7♭5).' },
  { id: 'l-arpegios', stage: 3, after: ['l-acordes-7'], why: 'Arpegiar la séptima es tocar con las notas que definen el acorde.' },
  { id: 'l-guide-tones', stage: 3, after: ['l-acordes-7'], why: 'La 3ª y la 7ª dicen qué acorde es y se conectan de uno a otro: la base de la conducción de voces.' },
  { id: 'l-aproximaciones', stage: 3, after: ['l-arpegios', 'l-guide-tones'], why: 'Se aproxima desde un semitono a las notas del acorde, que ya tenés que conocer.' },
  { id: 'l-escala-del-acorde', stage: 3, after: ['l-acordes-7'], why: 'Cada acorde tiene su escala; hace falta conocer los acordes para elegirla.' },
  { id: 'l-intervalos', stage: 3, after: ['l-triadas-mayor-menor'], why: 'Terceras, cuartas y saltos rompen el orden de la escala y del arpegio.' },
  { id: 'l-pentatonicas', stage: 4, after: ['l-escala-del-acorde'], why: 'Las pentatónicas son un recorte de la escala del acorde.' },
  { id: 'l-blues', stage: 4, after: ['l-pentatonicas'], why: 'El lenguaje de blues usa la pentatónica y las notas de color.' },
  { id: 'l-motivos', stage: 4, after: ['l-celulas-1235', 'l-guide-tones'], why: 'Desarrollar un motivo exige tener células y una línea de guide tones donde apoyarlo.' },
  { id: 'l-escalas-bebop', stage: 4, after: ['l-escala-del-acorde', 'l-arpegios', 'l-aproximaciones'], why: 'La bebop suma una nota de paso a la escala del acorde, para caer en tiempo fuerte sobre las notas del arpegio.' },
  { id: 'l-ii-v-i-menor', stage: 4, after: ['l-acordes-7', 'l-escala-del-acorde'], why: 'El ii–V–i menor combina acordes de cuatro notas y escalas del acorde distintas de las mayores.' },
  { id: 'l-turnarounds', stage: 4, after: ['l-guide-tones'], why: 'Se conectan con guide tones por los cambios que cierran una forma.' },
  { id: 'l-aprender-de-grabaciones', stage: 4, after: ['l-swing-articulacion', 'l-guide-tones'], why: 'Transcribir rinde cuando ya reconocés los acordes, los guide tones y el fraseo.' },
  { id: 'l-triad-pairs', stage: 5, after: ['l-triadas-mayor-menor', 'l-escala-del-acorde'], why: 'Dos tríadas sobre un acorde: se apoyan en las tríadas y en saber qué escala suena.' },
  { id: 'l-sustitucion-tritonal', stage: 5, after: ['l-guide-tones', 'l-escala-del-acorde'], why: 'Se reemplaza un dominante por otro: hay que tener claros sus guide tones.' },
  { id: 'l-desplazamiento', stage: 5, after: ['l-motivos', 'l-swing-articulacion'], why: 'Mover una frase de lugar en el compás requiere frases propias y un tiempo firme.' },
  { id: 'l-rhythm-changes', stage: 5, after: ['l-turnarounds', 'l-guide-tones'], why: 'La forma junta turnarounds y cadenas de ii–V sobre guide tones.' },
  { id: 'l-vals-seis-octavos', stage: 5, after: ['l-swing-articulacion', 'l-guide-tones'], why: 'Es el mismo lenguaje en otro compás: conviene tenerlo en 4/4 primero.' },
  { id: 'l-escalas-simetricas', stage: 6, after: ['l-escala-del-acorde', 'l-sustitucion-tritonal'], why: 'Son escalas de tensión para dominantes; se entienden desde la sustitución tritonal.' },
  { id: 'l-side-slipping', stage: 6, after: ['l-pentatonicas', 'l-aproximaciones'], why: 'Salir un semitono de la armonía y volver solo suena bien si el "adentro" ya es firme.' },
  { id: 'l-cambios-coltrane', stage: 6, after: ['l-guide-tones', 'l-triad-pairs', 'l-sustitucion-tritonal'], why: 'Mezclan centros tonales a distancia de tercera mayor, sobre tríadas y guide tones muy seguros.' },
];

const BY_ID = new Map(PATH.map((s) => [s.id, s]));
export const stepOf = (id: string) => BY_ID.get(id);

/** Lo que conviene tener antes de este foco y todavía no está marcado como trabajado. */
export function missingBefore(id: string, done: ReadonlySet<string>): string[] {
  return (BY_ID.get(id)?.after ?? []).filter((a) => !done.has(a));
}

/** El próximo foco del área: el primero del camino que no está trabajado y tiene su base. Si no hay ninguno, el primero sin trabajar. */
export function nextFocus(area: Focus['area'], done: ReadonlySet<string>): string | null {
  const ids = new Set(FOCI.filter((f) => f.area === area).map((f) => f.id));
  const open = PATH.filter((s) => ids.has(s.id) && !done.has(s.id));
  return (open.find((s) => missingBefore(s.id, done).length === 0) ?? open[0])?.id ?? null;
}

/** Los pasos de un área agrupados por etapa, en orden. */
export function stagesOf(area: Focus['area']): { stage: number; title: string; steps: Step[] }[] {
  const ids = new Set(FOCI.filter((f) => f.area === area).map((f) => f.id));
  const steps = PATH.filter((s) => ids.has(s.id));
  return STAGE_TITLES[area].map((title, i) => ({ stage: i + 1, title, steps: steps.filter((s) => s.stage === i + 1) })).filter((g) => g.steps.length > 0);
}
