/**
 * Los standards en la currícula. El objetivo de la app es aprender a tocar standards de jazz, así que cada semestre
 * agrega una exigencia nueva sobre el tema del mes: primero la forma y las fundamentales, después los guide tones,
 * el vocabulario, la forma entera de memoria, las sustituciones y por último el arreglo propio.
 *
 * La app no trae temas de terceros: cada mes sugiere una **forma incluida** para practicar lo que se estudia y, como
 * ejemplos, títulos de standards de ese tipo (sólo los nombres) para que cargues su cifrado de tu libro en
 * Play-along → Mis temas. El orden y los textos son criterio propio, sin revisión pedagógica.
 */
import { type FocusWeek, REPERTOIRE_WEEKS } from './focus';
import { task } from './focusShapes';
import { progressionById } from './progressions';

export interface Nivel {
  /** Semestre de la currícula (1 a 6). */
  nivel: number;
  /** Qué clase de standard conviene en este semestre. */
  tipo: string;
  /** Qué se busca con el tema este semestre. */
  meta: string;
  /** Títulos de standards de ese tipo, para cargar en Mis temas (sólo nombres). */
  ejemplos: string[];
}

export const NIVELES: Nivel[] = [
  { nivel: 1, tipo: 'Blues y ii–V–I simples', meta: 'Conocer la forma y apoyarte en las tríadas, con el swing firme.', ejemplos: ['Now’s the Time', 'Billie’s Bounce', 'Blue Monk'] },
  { nivel: 2, tipo: 'Standards con ii–V–I claros', meta: 'Conducir la línea por guide tones de un acorde al siguiente.', ejemplos: ['Autumn Leaves', 'Tune Up', 'Satin Doll'] },
  { nivel: 3, tipo: 'Menores y bossas', meta: 'Frases propias sobre acordes: pentatónicas, blues, motivos.', ejemplos: ['Blue Bossa', 'Summertime', 'Song for My Father'] },
  { nivel: 4, tipo: 'AABA y Rhythm changes', meta: 'Tocar la forma completa de memoria, con fraseo bebop.', ejemplos: ['Oleo', 'Anthropology', 'Cotton Tail'] },
  { nivel: 5, tipo: 'Standards de armonía rica', meta: 'Sustituciones, pares de tríadas y desplazamiento sobre cambios más densos.', ejemplos: ['All the Things You Are', 'Stella by Starlight', 'Body and Soul'] },
  { nivel: 6, tipo: 'Modales y cambios de Coltrane', meta: 'Un arreglo propio: introducción, final, estilo y una grabación terminada.', ejemplos: ['So What', 'Giant Steps', 'Have You Met Miss Jones?'] },
];
export const nivelDe = (n: number) => NIVELES.find((x) => x.nivel === n);

/** La forma incluida que se sugiere cada mes de la currícula (id de progresión). */
export const FORMAS: Record<number, string> = {
  1: 'ii-v-i', 2: 'blues-f', 3: 'ii-v-i-minor', 4: 'ii-v-i-12', 5: 'turnaround', 6: 'blues-f',
  7: 'cadena-mayor-menor', 8: 'turnaround', 9: 'aaba-subdominante', 10: 'ii-v-i-12', 11: 'blues-bird', 12: 'aaba-subdominante',
  13: 'blues-minor', 14: 'blues-minor', 15: 'blues-f', 16: 'bossa-mayor', 17: 'menor-modulante', 18: 'menor-aaba',
  19: 'blues-bird', 20: 'turnaround', 21: 'ballad', 22: 'rhythm', 23: 'vals-ii-v-i', 24: 'rhythm',
  25: 'aaba-subdominante', 26: 'tritone', 27: 'rhythm', 28: 'ii-v-semitonos', 29: 'ballad', 30: 'tritone',
  31: 'modal', 32: 'coltrane', 33: 'ballad', 34: 'blues-bb-rapido', 35: 'rhythm', 36: 'aaba-subdominante',
};
export const formaDe = (n: number) => FORMAS[n];
export const nombreForma = (n: number) => progressionById(FORMAS[n])?.name ?? '';

// ---------- el recorrido de 4 semanas del tema, según el semestre ----------

const L = { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' };
const LK = { link: '#/playalong?p={rep}&k={k}', linkLabel: 'Abrir el tema en la tonalidad del día' };

interface Semana {
  title: string;
  goal: (name: string) => string;
  tarea: ReturnType<typeof task>;
}

/** Por semestre, una tarea propia en cada una de las 4 semanas; el resto de la semana sigue con las tareas generales del tema. */
const POR_NIVEL: Record<number, Semana[]> = {
  1: [
    { title: 'La forma en el papel', goal: (n) => `Dibujar la forma de «${n}» y saber qué hace cada sección.`, tarea: task('rep1-forma', 'Dibujá la forma: secciones, compases y dónde están los ii–V–I.', 'Ver la estructura antes de tocar.', ['Copiá la grilla a mano, una sección por renglón.', 'Marcá los ii–V–I con un arco.', 'Cantá la fundamental de cada compás con el play-along.'], L) },
    { title: 'Tríadas sobre la forma', goal: () => 'Tocar la tríada correcta sobre cada acorde.', tarea: task('rep1-triadas', 'Una tríada por acorde, en negras, a medio tempo.', 'Apoyar la línea en las notas del acorde.', ['Con el play-along, tocá la tríada de cada acorde ascendente.', 'Alterná ascendente y descendente.', 'Subí al tempo del tema sin perder el swing.'], L) },
    { title: 'La melodía simple', goal: () => 'Tocar la melodía en notas largas del acorde, antes de la melodía real.', tarea: task('rep1-esqueleto', 'El esqueleto de la melodía: una nota larga por compás.', 'Entender hacia dónde va la melodía.', ['Elegí la nota del acorde más cercana a la melodía en cada compás.', 'Tocala en redondas con el play-along.', 'Después agregá una nota de paso entre dos redondas.'], L) },
    { title: 'Un chorus con tríadas', goal: () => 'Improvisar un chorus entero con tríadas y swing.', tarea: task('rep1-chorus', 'Improvisá un chorus con tríadas y grabalo.', 'Aguantar la forma de principio a fin.', ['Un chorus sólo con tríadas, con ritmo propio.', 'Grabalo con «Grabar solo».', 'Escuchá: ¿suena el swing y se oyen los cambios?'], L) },
  ],
  2: [
    { title: 'Guide tones del tema', goal: (n) => `Escribir y tocar la línea de guide tones de «${n}».`, tarea: task('rep2-guide', 'Escribí la línea de guide tones del tema y tocala en blancas.', 'El esqueleto armónico en una sola línea.', ['Anotá la 3ª o la 7ª de cada acorde con la regla de la nota más cercana.', 'Tocala a medio tempo con el play-along.', 'Repetila en otra tonalidad.'], L) },
    { title: 'Arpegios sobre la forma', goal: () => 'Arpegiar cada acorde con la séptima.', tarea: task('rep2-arpegios', 'Un arpegio de cuatro notas por acorde, ascendente y descendente.', 'Tocar las notas que definen cada acorde.', ['Arpegio de cada acorde en corcheas, a tempo medio.', 'Empezá cada arpegio desde la 3ª o la 7ª.', 'Cerrá el chorus con la fundamental.'], L) },
    { title: 'Melodía y conducción', goal: () => 'Tocar la melodía y unirla con los guide tones.', tarea: task('rep2-melodia', 'La melodía de memoria y, en el compás de descanso, la línea de guide tones.', 'Que la melodía y el esqueleto convivan.', ['Tocá la melodía hasta donde descansa.', 'En ese silencio, resolvé con el guide tone del acorde que sigue.', 'Probalo en toda la forma.'], L) },
    { title: 'Línea con aproximaciones', goal: () => 'Improvisar con guide tones y aproximaciones.', tarea: task('rep2-aprox', 'Un chorus: guide tone en el tiempo 1, aproximaciones en el resto.', 'Una regla que sostiene la libertad.', ['Caé en la 3ª o 7ª en el primer tiempo de cada acorde.', 'Aproximá desde un semitono antes.', 'Grabalo y contá cuántas veces caíste bien.'], L) },
  ],
  3: [
    { title: 'Dónde va cada recurso', goal: (n) => `Hacer un mapa de «${n}»: qué escala o pentatónica va en cada acorde.`, tarea: task('rep3-mapa', 'Anotá encima de cada acorde la pentatónica o la escala que usarías.', 'Elegir antes de tocar.', ['Escribí la escala del acorde en cada compás.', 'Marcá dónde la pentatónica funciona mejor.', 'Tocá el mapa con el play-along.'], L) },
    { title: 'Parafrasear la melodía', goal: () => 'Variar la melodía sin perder su perfil.', tarea: task('rep3-parafrasear', 'Tocá la melodía cambiando el ritmo de dos compases por vuelta.', 'Pasar de repetir la melodía a hacerla tuya.', ['Mantené las notas fuertes y movés el ritmo.', 'Agregá una nota de paso o una aproximación.', 'Marcá cuál versión suena mejor.'], L) },
    { title: 'Un motivo por sección', goal: () => 'Desarrollar un motivo en cada sección de la forma.', tarea: task('rep3-motivo', 'Un motivo por sección: repetilo, transportalo y variá el ritmo.', 'Frases con memoria.', ['Inventá un motivo de tres notas.', 'Repetilo sobre el acorde siguiente.', 'Cerrá la sección con una frase más larga.'], L) },
    { title: 'Dos chorus con vocabulario', goal: () => 'Improvisar dos chorus con frases de blues, pentatónicas y motivos.', tarea: task('rep3-chorus', 'Dos chorus grabados, mezclando pentatónicas, blues y motivos.', 'Ver qué recursos salen solos.', ['Primer chorus: con el mapa a la vista.', 'Segundo chorus: sin mirarlo.', 'Escuchá y anotá qué recurso usaste más.'], L) },
  ],
  4: [
    { title: 'La forma sin grilla', goal: (n) => `Tocar «${n}» de memoria, sin mirar la grilla.`, tarea: task('rep4-memoria', 'Seguí la forma sin mirar la grilla, nombrando cada acorde.', 'Que la forma sea tuya.', ['Mirá la grilla una vez y tapala.', 'Tocá las fundamentales sin mirar, a medio tempo.', 'Subí al tempo del tema y repetilo sin parar.'], L) },
    { title: 'Turnarounds y finales', goal: () => 'Resolver los turnarounds y el final con guide tones.', tarea: task('rep4-turnaround', 'Un turnaround propio para cerrar cada sección.', 'Cerrar bien las frases entre secciones.', ['Elegí los guide tones del turnaround.', 'Armá dos compases que lleven al primer acorde.', 'Probalo al final de cada chorus.'], L) },
    { title: 'Fraseo bebop', goal: () => 'Caer en tiempo fuerte sobre las notas del acorde con la nota de paso.', tarea: task('rep4-bebop', 'Un chorus en corcheas con la escala bebop y caídas en tiempo fuerte.', 'El fraseo continuo del bebop.', ['Escala bebop del acorde en corcheas, sin cortar.', 'Caé en la 3ª, 5ª o 7ª en los tiempos 1 y 3.', 'Grabalo a tempo medio.'], L) },
    { title: 'El tema a tempo', goal: () => 'Melodía, dos chorus y melodía, a tempo y sin parar.', tarea: task('rep4-completo', 'Tocá el tema entero a su tempo: melodía, dos chorus, melodía.', 'Tocar como en un concierto.', ['Sin parar aunque te equivoques.', 'Grabalo.', 'Escuchá y marcá dos cosas para mejorar.'], L) },
  ],
  5: [
    { title: 'Dónde sustituir', goal: (n) => `Encontrar en «${n}» los dominantes que se pueden sustituir.`, tarea: task('rep5-sustituir', 'Marcá los dominantes y escribí su sustituto tritonal.', 'Ver el tema con más opciones.', ['Subrayá los dominantes de la forma.', 'Escribí el sustituto (a un tritono) al lado.', 'Tocá los guide tones con la sustitución.'], L) },
    { title: 'Pares de tríadas', goal: () => 'Usar un par de tríadas sobre un acorde.', tarea: task('rep5-pares', 'Un par de tríadas sobre un dominante y un menor del tema.', 'Un sonido abierto sobre el acorde.', ['Elegí un par para el dominante.', 'Alterná las dos tríadas en corcheas.', 'Resolvé al acorde que sigue con un guide tone.'], L) },
    { title: 'Desplazar una frase', goal: () => 'Mover una frase un tiempo y medio tiempo.', tarea: task('rep5-desplazar', 'Una frase de dos compases, desplazada cada vez que vuelve.', 'Frases que no caen siempre en el mismo lugar.', ['Tocá una frase de dos compases.', 'Repetila medio tiempo corrida.', 'Volvé a caer en el tiempo fuerte.'], LK) },
    { title: 'Un chorus con una sustitución', goal: () => 'Improvisar con una sustitución a la vista.', tarea: task('rep5-chorus', 'Un chorus con al menos una sustitución tritonal y un par de tríadas.', 'Usar el recurso dentro de una frase.', ['Elegí un lugar para cada recurso.', 'Tocá el chorus y grabalo.', 'Escuchá si suenan como parte de la frase.'], L) },
  ],
  6: [
    { title: 'El arreglo', goal: (n) => `Armar una introducción, un final y la forma de «${n}».`, tarea: task('rep6-arreglo', 'Escribí una introducción de dos compases y un final.', 'Que el tema tenga principio y fin tuyos.', ['Inventá una introducción sobre los últimos dos acordes.', 'Pensá un final: pedal, tag o ritardando.', 'Tocalos con el play-along.'], L) },
    { title: 'Salir y volver', goal: () => 'Usar side-slipping en un solo lugar del chorus y volver.', tarea: task('rep6-afuera', 'Un solo lugar del chorus tocado un semitono afuera, y la vuelta.', 'Que lo de afuera sea intencional.', ['Elegí un acorde de la forma.', 'Tocá la frase un semitono arriba o abajo.', 'Volvé con un guide tone claro.'], L) },
    { title: 'Otro estilo, otra tonalidad', goal: () => 'Llevar el tema a otra tonalidad y a otro estilo.', tarea: task('rep6-estilo', 'El tema en la tonalidad del día y en bossa o balada.', 'Entenderlo por dentro.', ['Cambiá la tonalidad con el play-along.', 'Cambiá el estilo y adaptá el fraseo.', 'Anotá qué tuvo que cambiar en tu manera de tocar.'], LK) },
    { title: 'La grabación final', goal: () => 'Una grabación terminada del tema, con todo lo que trabajaste.', tarea: task('rep6-final', 'Melodía, tres chorus y melodía, grabado de principio a fin.', 'Cerrar el recorrido con algo que se pueda escuchar.', ['Grabá varias tomas completas.', 'Elegí la mejor y escuchala sin la trompeta en la mano.', 'Anotá los recursos que usaste y los que te faltan.'], L) },
  ],
};

/** El recorrido de repertorio: el general, o el del semestre (una tarea propia por semana más dos del recorrido general). */
export function repertoireWeeks(name: string, nivel?: number): FocusWeek[] {
  const base = REPERTOIRE_WEEKS(name);
  const lvl = nivel ? POR_NIVEL[nivel] : undefined;
  if (!lvl) return base;
  return base.map((w, i) => ({
    title: lvl[i].title,
    goal: lvl[i].goal(name),
    tasks: [lvl[i].tarea, w.tasks[1], w.tasks[2]],
  }));
}
