/**
 * Más focos de lenguaje para elegir al empezar el mes: tríadas menores, tríadas mayores y menores juntas, acordes de
 * cuatro notas (maj7, m7, 7, m7♭5) y las células de cuatro notas 1-2-3-5 (mayor) y 1-♭3-4-5 (menor). Siguen el mismo
 * molde que los demás focos: cuatro semanas, tres tareas por semana, la última semana aplicada al tema del mes.
 *
 * Las tablas de acordes y de grados (`MINOR_TRIAD_FACTS`, `SEVENTH_FACTS`, `CELL_FACTS`) se comprueban contra la
 * teoría en los tests, así que lo que dicen los textos no depende de que alguien lo haya revisado a mano.
 */
import { analyzePc, parseChord, prettyDegree } from '../theory/chords';
import { mod, parseNote, pc } from '../theory/notes';
import { TRIAD_FACTS } from './focusFacts';
import type { Focus, FocusTask } from './focus';
import { ideaBars, SETS } from './ideas';
import { abcFromBars, tonicOf } from './shapeAbc';
import { EXAMPLES, exampleAbc } from './shapeExamples';

const task = (id: string, short: string, goal: string, steps: string[], more: Partial<FocusTask> = {}): FocusTask => ({ id, short, goal, steps, ...more });
const PA = { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' };
const REP = { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' };
const lesson = (id: string, short: string, goal: string, steps: string[], lessonId: string, ex: number): FocusTask =>
  task(id, short, goal, steps, { link: `#/lecciones/${lessonId}?k={k}&ex=${ex}`, linkLabel: 'Abrir el ejercicio' });

/** Grados (como se muestran) de las notas a `semis` semitonos de `root`, vistas desde el acorde `chord`. */
export function degreesOver(chord: string, root: string, semis: number[]): string {
  const c = parseChord(chord);
  const r = pc(parseNote(root));
  return semis.map((i) => prettyDegree(analyzePc(c, mod(r + i, 12)).degree)).join('-');
}

// ---------------------------------------------------------------------------------------------------------------
// Tablas (verificadas en los tests)
// ---------------------------------------------------------------------------------------------------------------

/** Qué tríadas menores contiene cada acorde del ii–V–I y qué grados son. */
export const MINOR_TRIAD_FACTS: { chord: string; triads: { root: string; degrees: string }[] }[] = [
  { chord: 'Cmaj7', triads: [{ root: 'E', degrees: '3-5-7' }, { root: 'A', degrees: '13-1-3' }] },
  { chord: 'Dm7', triads: [{ root: 'D', degrees: '1-♭3-5' }, { root: 'A', degrees: '5-♭7-9' }] },
  { chord: 'G7', triads: [{ root: 'D', degrees: '5-♭7-9' }, { root: 'G', degrees: '1-♭3-5' }] },
];

/** Los cuatro acordes de cuatro notas con la misma raíz (en Do): sus notas y su fórmula. */
export const SEVENTH_FACTS: { chord: string; name: string; formula: string; notes: string[]; semis: number[] }[] = [
  { chord: 'Cmaj7', name: 'maj7', formula: '1-3-5-7', notes: ['C', 'E', 'G', 'B'], semis: [0, 4, 7, 11] },
  { chord: 'Cm7', name: 'm7', formula: '1-♭3-5-♭7', notes: ['C', 'E♭', 'G', 'B♭'], semis: [0, 3, 7, 10] },
  { chord: 'C7', name: '7', formula: '1-3-5-♭7', notes: ['C', 'E', 'G', 'B♭'], semis: [0, 4, 7, 10] },
  { chord: 'Cm7b5', name: 'm7♭5', formula: '1-♭3-♭5-♭7', notes: ['C', 'E♭', 'G♭', 'B♭'], semis: [0, 3, 6, 10] },
];

/** Las dos células de cuatro notas y el acorde del ii–V–I donde cada una cae de forma natural. */
export const CELL_FACTS: { cell: string; chord: string; root: string; semis: number[]; degrees: string; notes: string }[] = [
  { cell: '1-2-3-5', chord: 'Cmaj7', root: 'C', semis: [0, 2, 4, 7], degrees: '1-9-3-5', notes: 'Do-Re-Mi-Sol' },
  { cell: '1-2-3-5', chord: 'G7', root: 'G', semis: [0, 2, 4, 7], degrees: '1-9-3-5', notes: 'Sol-La-Si-Re' },
  { cell: '1-♭3-4-5', chord: 'Dm7', root: 'D', semis: [0, 3, 5, 7], degrees: '1-♭3-11-5', notes: 'Re-Fa-Sol-La' },
];

const triadList = (facts: typeof MINOR_TRIAD_FACTS, q: string) => facts.map((f) => `${f.chord}: ${f.triads.map((t) => `${t.root} ${q} (${t.degrees})`).join(' y ')}`);

/** Semana de aplicación al tema del mes (la misma idea para todos los focos). */
const temaWeek = (p: string, que: string, queCorto: string): Focus['weeks'][number] => ({
  title: `${que} en el tema`,
  goal: `Usarlas de verdad en el tema del mes.`,
  tasks: [
    task(
      `foco-${p}-tema1`,
      `En el tema del mes, elegí ${queCorto} para cada acorde y tocalo en redondas.`,
      'Ver la grilla del tema como un mapa.',
      [
        'Abrí el tema y, para cada acorde, elegí una opción que te guste.',
        'Con el play-along a medio tempo, tocala en redondas, acorde por acorde.',
        'Anotá los acordes donde no encontraste ninguna: son los difíciles y los que hay que repetir.',
      ],
      REP,
    ),
    task(
      `foco-${p}-tema2`,
      `Un chorus del tema usando sólo ${queCorto}, con ritmos distintos.`,
      'Improvisar con pocas notas y mucho ritmo.',
      [
        'Tocá un chorus entero usando sólo lo que elegiste, sin otras notas.',
        'Variá el ritmo: no repitas el mismo en dos compases seguidos.',
        'Dejá al menos un compás de silencio por frase.',
      ],
      REP,
    ),
    task(
      `foco-${p}-tema3`,
      'Grabá un chorus y escuchá: ¿se oyen los cambios de acorde?',
      'Comprobar de oído que lo que tocás dice la armonía.',
      [
        'En el play-along, activá "Grabar solo" y tocá un chorus.',
        'Escuchalo sin la trompeta en la mano: ¿se oyen los cambios?',
        'Anotá una cosa que repetirías y una que cambiarías.',
      ],
      REP,
    ),
  ],
});

// ---------------------------------------------------------------------------------------------------------------
// Tríadas menores
// ---------------------------------------------------------------------------------------------------------------

const LANG_TRIADS_MENORES: Focus = {
  id: 'l-triadas-menores',
  area: 'lenguaje',
  title: 'Tríadas menores',
  summary: 'La tríada menor 1-♭3-5 en las doce tonalidades, dentro de cada acorde y en frases.',
  weeks: [
    {
      title: 'La tríada menor en los doce tonos',
      goal: 'Que la forma 1-♭3-5 y sus inversiones salgan solas en cualquier tonalidad.',
      tasks: [
        task(
          'foco-trm-ciclo',
          'Tríada menor de las doce tonalidades en el ciclo de cuartas, una por compás.',
          'Encadenar las doce tríadas menores sin pensar en cada una.',
          [
            'Con el metrónomo en 70, tocá la tríada menor en posición fundamental (1-♭3-5), subiendo y bajando, en negras.',
            'Pasá a la siguiente del ciclo de cuartas sin parar: Cm, Fm, B♭m, E♭m, A♭m, D♭m, G♭m, Bm, Em, Am, Dm, Gm.',
            'Si una tonalidad se traba, anotala: es la que vas a repetir mañana.',
            'Segunda vez: empezá cada tríada en una inversión distinta.',
          ],
          { bpm: 70, minutes: 6 },
        ),
        task(
          'foco-trm-tercera',
          'La misma raíz en mayor y en menor: tocá la tríada mayor y bajá la 3ª un semitono.',
          'Oír que lo único que cambia entre mayor y menor es la 3ª.',
          [
            'Tocá 1-3-5 de la tonalidad del día, despacio, y escuchá su color.',
            'Repetila bajando sólo la 3ª un semitono (1-♭3-5) y escuchá qué cambió.',
            'Alterná mayor y menor sin parar, una vuelta de cada una, en tres tonalidades.',
          ],
          { minutes: 5 },
        ),
        task(
          'foco-trm-oido',
          'Cantá la tríada menor y tocala: la nota se oye antes de salir.',
          'Que el oído guíe a los dedos.',
          [
            'Cantá (o silbá) 1-♭3-5 de la tonalidad del día, despacio y afinado.',
            'Tocala en la trompeta y compará: la afinación cantada y tocada tiene que coincidir.',
            'Cantá la tríada y, sin tocar, nombrá la inversión que vas a tocar; después tocala.',
            'Repetí en tres tonalidades más.',
          ],
          { minutes: 5 },
        ),
      ],
    },
    {
      title: 'Las tríadas menores que ya están dentro de cada acorde',
      goal: 'Reconocer qué tríadas menores caben en un maj7, un m7 y un dominante, y qué color da cada una.',
      tasks: [
        task(
          'foco-trm-mapa',
          'En el ii–V–I de la tonalidad del día, tocá cada tríada menor de la tabla como nota larga y escuchá su color.',
          'Ver qué tríadas menores viven dentro de cada acorde.',
          [
            `La tabla (en Do, se traduce a tu tonalidad al practicar): ${triadList(MINOR_TRIAD_FACTS, 'menor').join('; ')}.`,
            'Con el play-along, tocá la primera tríada de cada acorde en redondas y escuchá cómo suena sobre el acorde.',
            'Repetí con la segunda tríada de cada acorde: cambia el color, no las notas del acorde.',
            'Anotá cuál te gustó más sobre cada acorde.',
          ],
          PA,
        ),
        task(
          'foco-trm-negras',
          'Tríadas menores de la tabla en negras, subiendo y bajando, sobre cada acorde del ii–V–I.',
          'Cambiar de tríada al cambiar de acorde, sin perder el pulso.',
          [
            'En el play-along a negra = 80, tocá la tríada sobre cada acorde: una vez subiendo y una bajando.',
            'En el cambio de acorde, buscá la nota más cercana de la tríada nueva (no saltes).',
            'Probá con la otra tríada de cada acorde.',
            'Subí a negra = 96 sólo si no se ensucia.',
          ],
          { ...PA, bpm: 80 },
        ),
        task(
          'foco-trm-g7',
          'Sobre el G7, probá la tríada de Sol menor: la ♭3 de Sol es la ♯9 del acorde.',
          'Oír el color de blues de la tríada menor sobre un dominante.',
          [
            'En el play-along, dejá sonar el G7 y tocá Sol menor (G B♭ D) en redondas.',
            'Escuchá la nota B♭ contra la 3ª (B) del acorde: ese roce es el sonido de blues.',
            'Tocala en negras y resolvela a una tríada o nota del Cmaj7.',
          ],
          PA,
        ),
      ],
    },
    {
      title: 'Frases con tríadas menores',
      goal: 'Construir frases de tres y cuatro notas con las tríadas menores, con ritmo.',
      tasks: [
        task(
          'foco-trm-cells',
          'Tres células con la tríada menor: 1-♭3-5-♭3, 5-♭3-1-♭3 y ♭3-5-1-5, en corcheas, sobre un solo acorde.',
          'Tener tres formas de decir la tríada.',
          [
            'Sobre un acorde menor (play-along en un solo acorde o el Dm7 del ii–V–I), tocá 1-♭3-5-♭3 repetido, en corcheas.',
            'Cambiá a 5-♭3-1-♭3 y a ♭3-5-1-5: mismas notas, otra dirección.',
            'Inventá una cuarta célula tuya con las mismas tres notas.',
            'Tocalas sobre el acorde siguiente, con la tríada que corresponde.',
          ],
          { ...PA, bpm: 90 },
        ),
        lesson(
          'foco-trm-lesson',
          'El ejercicio de ii–V–i menor de Lecciones, marcando dónde cae una tríada menor.',
          'Ver las tríadas menores en una progresión menor.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio sin el play-along.',
            'Marcá con un lápiz o en la grilla una tríada menor para cada acorde y tocalas en negras.',
            'Marcá la tonalidad como dominada sólo cuando salga limpia dos veces seguidas.',
          ],
          'minor-251',
          0,
        ),
        task(
          'foco-trm-ritmo',
          'La misma tríada menor con tres ritmos: corcheas, síncopa y tresillo.',
          'Que la tríada tenga ritmo: lo que la hace sonar a frase.',
          [
            'Sobre un acorde, tocá 1-♭3-5 en corcheas parejas.',
            'Repetí con la síncopa: corchea-negra-corchea.',
            'Repetí en tresillos: 1-♭3-5 como un solo grupo.',
            'Combiná dos ritmos en una misma frase de dos compases.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('trm', 'Tríadas menores', 'una tríada menor'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Tríadas mayores y menores
// ---------------------------------------------------------------------------------------------------------------

const LANG_TRIADS_MAYOR_MENOR: Focus = {
  id: 'l-triadas-mayor-menor',
  area: 'lenguaje',
  title: 'Tríadas mayores y menores',
  summary: 'Las dos tríadas juntas: oír la diferencia, elegir la que va con cada acorde y alternarlas en frases.',
  weeks: [
    {
      title: 'Mayor y menor, lado a lado',
      goal: 'Reconocer y tocar las dos tríadas en cualquier tonalidad sin dudar cuál es cuál.',
      tasks: [
        task(
          'foco-trmm-ciclo',
          'Ciclo de cuartas alternando: tríada mayor, tríada menor, una por compás.',
          'Que las dos formas salgan solas en las doce tonalidades.',
          [
            'Con el metrónomo en 70, tocá la tríada mayor de Do y, en el compás siguiente, la menor de Do, en negras.',
            'Pasá a Fa y repetí: mayor, menor. Seguí por el ciclo: B♭, E♭, A♭, D♭, G♭, B, E, A, D, G.',
            'Anotá las tonalidades donde dudaste cuál tocar.',
            'Segunda vez: empezá cada tríada en una inversión distinta.',
          ],
          { bpm: 70, minutes: 6 },
        ),
        task(
          'foco-trmm-moneda',
          'Tirá una moneda: cara toca la tríada mayor, cruz la menor, desde una nota cualquiera.',
          'Elegir sin pensar y oír la diferencia antes de tocar.',
          [
            'Tirá la moneda y, antes de tocar, cantá la tríada que salió desde una nota que elijas.',
            'Tocala y comprobá la afinación con el afinador.',
            'Repetí diez veces, cambiando de nota de partida cada vez.',
          ],
          { minutes: 5, link: '#/escucha', linkLabel: 'Abrir afinador' },
        ),
        task(
          'foco-trmm-tercera',
          'La 3ª es la que cambia: tocá 1-3-5 y bajá sólo la 3ª, en tres tonalidades.',
          'Oír que mayor y menor sólo se diferencian en la 3ª.',
          [
            'Tocá 1-3-5 de la tonalidad del día, despacio, y escuchá su color.',
            'Repetila bajando la 3ª un semitono (1-♭3-5).',
            'Alterná sin parar, una vuelta de cada una, y probalo con la 3ª sostenida como nota larga.',
          ],
          { minutes: 5 },
        ),
      ],
    },
    {
      title: 'Elegir la tríada según el acorde',
      goal: 'Saber qué tríadas mayores y menores caben en un maj7, un m7 y un dominante.',
      tasks: [
        task(
          'foco-trmm-mapa',
          'En el ii–V–I de la tonalidad del día, tocá cada tríada de las dos tablas como nota larga y escuchá su color.',
          'Ver qué tríadas mayores y menores viven dentro de cada acorde.',
          [
            `Mayores (en Do): ${TRIAD_FACTS.map((f) => `${f.chord}: ${f.triads.map((t) => `${t.root} mayor (${t.degrees})`).join(' y ')}`).join('; ')}.`,
            `Menores (en Do): ${triadList(MINOR_TRIAD_FACTS, 'menor').join('; ')}.`,
            'Con el play-along, tocá en redondas una tríada mayor y una menor sobre cada acorde y escuchá qué aporta cada una.',
            'Anotá, para cada acorde, la que más te gustó.',
          ],
          PA,
        ),
        task(
          'foco-trmm-alternar',
          'Sobre cada acorde del ii–V–I, una tríada mayor y después una menor, en negras.',
          'Cambiar de color sobre el mismo acorde sin perder el pulso.',
          [
            'En el play-along a negra = 80, tocá una tríada mayor de la tabla subiendo y bajando.',
            'Sin parar, tocá una tríada menor de la tabla sobre el mismo acorde.',
            'En el cambio de acorde, buscá la nota más cercana de la tríada siguiente.',
            'Subí a negra = 96 sólo si no se ensucia.',
          ],
          { ...PA, bpm: 80 },
        ),
        task(
          'foco-trmm-oidoacorde',
          'Con el play-along sonando, decidí de oído cuál de las dos tríadas va mejor y tocá sólo esa.',
          'Que el oído elija y no la tabla.',
          [
            'Dejá sonar el ii–V–I y, en cada acorde, probá una tríada mayor y una menor de la tabla.',
            'Quedate con la que te suena más natural y tocala en corcheas.',
            'Repetilo con otra tonalidad y fijate si elegís lo mismo.',
          ],
          PA,
        ),
      ],
    },
    {
      title: 'Frases que alternan mayor y menor',
      goal: 'Construir frases cortas donde la 3ª cambia a mitad de camino.',
      tasks: [
        task(
          'foco-trmm-cells',
          'Una frase de dos compases: la primera mitad con tríada mayor, la segunda con la menor de la misma raíz.',
          'Usar el cambio de 3ª como recurso de frase.',
          [
            'Sobre un acorde estático, tocá 1-3-5-3 y 5-3-1-3 con la mayor, y 1-♭3-5-♭3 y 5-♭3-1-♭3 con la menor.',
            'Unilas en una frase de dos compases, sin parar entre una y otra.',
            'Invertí el orden: primero la menor y después la mayor.',
            'Probalo sobre un acorde dominante: la 3ª menor suena como blues.',
          ],
          { ...PA, bpm: 90 },
        ),
        lesson(
          'foco-trmm-lesson',
          'El ejercicio de pares de tríadas sobre ii–V–I de Lecciones.',
          'Ver dos tríadas juntas: el paso siguiente de usar tríadas.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio sin el play-along.',
            'Después con el play-along a medio tempo, y subí de a 4 bpm.',
            'Marcá la tonalidad como dominada sólo cuando salga limpia dos veces seguidas.',
          ],
          'triad-pairs',
          1,
        ),
        task(
          'foco-trmm-ritmo',
          'Mayor y menor con un mismo ritmo en la frase: corcheas, síncopa y tresillo.',
          'Que el cambio de color caiga en un lugar con sentido rítmico.',
          [
            'Elegí un ritmo (por ejemplo, corchea-negra-corchea) y tocá la tríada mayor con él.',
            'Repetí el mismo ritmo con la menor.',
            'Cambiá el ritmo en la segunda mitad de la frase y notá cuál queda mejor.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('trmm', 'Tríadas mayores y menores', 'una tríada (mayor o menor)'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Acordes de cuatro notas
// ---------------------------------------------------------------------------------------------------------------

const seventhList = SEVENTH_FACTS.map((f) => `${f.chord.replace('b5', '♭5')} = ${f.notes.join(' ')} (${f.formula})`);

const LANG_ACORDES_7: Focus = {
  id: 'l-acordes-7',
  area: 'lenguaje',
  title: 'Acordes de cuatro notas (maj7, m7, 7, m7♭5)',
  summary: 'Los arpegios 1-3-5-7 de las cuatro calidades en las doce tonalidades, en el ii–V–I y en el tema.',
  weeks: [
    {
      title: 'Las cuatro calidades en los doce tonos',
      goal: 'Que maj7, m7, 7 y m7♭5 salgan solos desde cualquier raíz, sabiendo qué nota cambia entre uno y otro.',
      tasks: [
        task(
          'foco-a7-familia',
          'Las cuatro calidades sobre la misma raíz, una tras otra, cambiando una nota por vez.',
          'Ver cómo se relacionan: de un acorde al siguiente sólo cambia una nota.',
          [
            `Tocá en negras, subiendo y bajando, con la tonalidad del día como raíz (en Do): ${seventhList.join('; ')}.`,
            'De Cmaj7 a C7 baja la 7ª un semitono; de C7 a Cm7 baja la 3ª; de Cm7 a Cm7♭5 baja la 5ª.',
            'Hacelo en tres tonalidades y nombrá en voz alta cada acorde antes de tocarlo.',
          ],
          { minutes: 6 },
        ),
        task(
          'foco-a7-ciclo',
          'Elegí una calidad y recorré las doce tonalidades en el ciclo de cuartas, un arpegio por compás.',
          'Encadenar las doce raíces sin pensar en cada una.',
          [
            'Con el metrónomo en 70, tocá el arpegio 1-3-5-7 subiendo y bajando, en negras, y pasá a la siguiente raíz del ciclo: C, F, B♭, E♭, A♭, D♭, G♭, B, E, A, D, G.',
            'Si una tonalidad se traba, anotala: es la que repetís mañana.',
            'Otro día elegí otra calidad: así se cubren las cuatro en una semana.',
          ],
          { bpm: 70, minutes: 6 },
        ),
        task(
          'foco-a7-oido',
          'Cantá el arpegio de cada calidad y tocalo: la nota se oye antes de salir.',
          'Que el oído guíe a los dedos y se reconozca el color de cada acorde.',
          [
            'Cantá (o silbá) 1-3-5-7 de un maj7, despacio y afinado, y tocalo para comparar.',
            'Repetí con m7, 7 y m7♭5: notá cómo cambia el color con la 3ª y la 7ª.',
            'Sin mirar, tocá uno de los cuatro al azar y decí qué calidad era.',
          ],
          { minutes: 5 },
        ),
      ],
    },
    {
      title: 'Los arpegios del ii–V–I',
      goal: 'Tocar los tres arpegios del ii–V–I (m7, 7, maj7) uno tras otro sin cortar la línea.',
      tasks: [
        task(
          'foco-a7-iivi',
          'Arpegio 1-3-5-7 de cada acorde del ii–V–I, un compás por acorde, subiendo y bajando.',
          'Que el arpegio siga al acorde que suena.',
          [
            'En el play-along a negra = 80, tocá el arpegio de cada acorde en negras.',
            'Alterná: subiendo en un acorde y bajando en el siguiente.',
            'Subí a negra = 96 sólo si no se ensucia.',
          ],
          { ...PA, bpm: 80 },
        ),
        task(
          'foco-a7-guia',
          'Terminá cada arpegio en la 7ª y bajala por semitono a la 3ª del acorde siguiente.',
          'Conectar los acordes con la línea guía 7ª → 3ª.',
          [
            'Tocá el arpegio de Dm7 hasta la 7ª (C) y bajá un semitono a la 3ª del G7 (B).',
            'Tocá el arpegio de G7 hasta su 7ª (F) y bajá a la 3ª del Cmaj7 (E).',
            'Unilos sin pausa y hacelo en tres tonalidades.',
          ],
          PA,
        ),
        lesson(
          'foco-a7-lesson1',
          '1-3-5-7-9 sobre ii–V–I por las 12, del ejercicio de Lecciones.',
          'Arpegio completo en doce tonalidades a tempo.',
          [
            'Abrí el ejercicio y tocalo a medio tempo con el play-along.',
            'Marcá las tonalidades que salgan limpias y repetí las que no.',
            'Subí el tempo de a 4 bpm.',
          ],
          'arpeggios',
          0,
        ),
      ],
    },
    {
      title: 'Más allá de la fundamental',
      goal: 'Empezar el arpegio desde cualquier nota y sumar el m7♭5 de la menor.',
      tasks: [
        task(
          'foco-a7-inversiones',
          'El mismo arpegio empezando en la 3ª, la 5ª y la 7ª, sobre un acorde que suena.',
          'Que el arpegio sea una línea y no siempre un ascenso desde la fundamental.',
          [
            'Sobre un acorde estático, tocá 1-3-5-7, después 3-5-7-1, 5-7-1-3 y 7-1-3-5.',
            'Bajando: 7-5-3-1, 5-3-1-7, etc.',
            'Inventá una frase de dos compases mezclando direcciones.',
          ],
          PA,
        ),
        lesson(
          'foco-a7-menor',
          'ii–V–i menor: arpegios del m7♭5, el dominante y el menor.',
          'Sumar el acorde m7♭5 al repertorio de arpegios.',
          [
            'Abrí el ejercicio y tocalo a medio tempo.',
            'Sobre el m7♭5, notá que la ♭5 es la nota que lo distingue del m7.',
            'Cantá la línea antes de tocarla.',
          ],
          'minor-251',
          0,
        ),
        task(
          'foco-a7-ritmo',
          'El mismo arpegio con tres ritmos: corcheas, síncopa y tresillo.',
          'Que el arpegio tenga ritmo: lo que lo hace sonar a frase.',
          [
            'Tocá 1-3-5-7 en corcheas parejas sobre un acorde.',
            'Repetí con la síncopa: corchea-negra-corchea.',
            'Repetí en tresillos: tres notas del arpegio y una pausa.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('a7', 'Arpegios de cuatro notas', 'el arpegio 1-3-5-7'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Células 1-2-3-5 y 1-♭3-4-5
// ---------------------------------------------------------------------------------------------------------------

const LANG_CELULAS: Focus = {
  id: 'l-celulas-1235',
  area: 'lenguaje',
  title: 'Células 1-2-3-5 (mayor) y 1-♭3-4-5 (menor)',
  summary: 'Dos células de cuatro notas que viajan por cualquier acorde: la mayor sobre maj7 y dominante, la menor sobre m7.',
  weeks: [
    {
      title: 'Las dos células en los doce tonos',
      goal: 'Que 1-2-3-5 y 1-♭3-4-5 salgan solas desde cualquier nota.',
      tasks: [
        task(
          'foco-cel-mayor',
          'Célula 1-2-3-5 de las doce tonalidades en el ciclo de cuartas, una por compás.',
          'Encadenar las doce células mayores sin pensar en cada una.',
          [
            'Con el metrónomo en 70, tocá 1-2-3-5 subiendo y 5-3-2-1 bajando (en Do: Do-Re-Mi-Sol y Sol-Mi-Re-Do), en negras.',
            'Pasá a la siguiente del ciclo de cuartas sin parar: C, F, B♭, E♭, A♭, D♭, G♭, B, E, A, D, G.',
            'Si una tonalidad se traba, anotala: es la que repetís mañana.',
          ],
          { bpm: 70, minutes: 6 },
        ),
        task(
          'foco-cel-menor',
          'Célula 1-♭3-4-5 de las doce tonalidades en el ciclo de cuartas, una por compás.',
          'Encadenar las doce células menores sin pensar en cada una.',
          [
            'Con el metrónomo en 70, tocá 1-♭3-4-5 subiendo y 5-4-♭3-1 bajando (en Do: Do-Mi♭-Fa-Sol), en negras.',
            'Pasá a la siguiente del ciclo de cuartas sin parar.',
            'Notá cómo la ♭3 y la 4ª hacen que suene a menor: es el color de un acorde m7.',
          ],
          { bpm: 70, minutes: 6 },
        ),
        task(
          'foco-cel-oido',
          'Cantá cada célula y tocala: la nota se oye antes de salir.',
          'Que el oído guíe a los dedos.',
          [
            'Cantá (o silbá) 1-2-3-5 de la tonalidad del día, despacio y afinado, y tocala para comparar.',
            'Repetí con 1-♭3-4-5.',
            'Cantá una de las dos sin decir cuál y tocala para comprobar si era la mayor o la menor.',
          ],
          { minutes: 5 },
        ),
      ],
    },
    {
      title: 'Cada célula sobre su acorde',
      goal: 'Usar 1-♭3-4-5 sobre el m7 y 1-2-3-5 sobre el dominante y el maj7 del ii–V–I.',
      tasks: [
        task(
          'foco-cel-mapa',
          'En el ii–V–I, tocá cada célula sobre su acorde como nota larga y escuchá cómo suena.',
          'Ver dónde cae cada célula.',
          [
            `La tabla (en Do): ${CELL_FACTS.map((f) => `${f.chord.replace('b5', '♭5')}: ${f.cell} (${f.notes}; vistos desde el acorde, ${f.degrees})`).join('; ')}.`,
            'Con el play-along, tocá la célula de cada acorde en negras, subiendo.',
            'Repetí bajando: 5-3-2-1 sobre el dominante y el maj7, y 5-4-♭3-1 sobre el m7.',
          ],
          PA,
        ),
        task(
          'foco-cel-conectar',
          'Una célula por compás en el ii–V–I, empezando cada una en la nota más cercana a donde terminaste.',
          'Que las células formen una línea y no tres ejercicios separados.',
          [
            'En el play-along a negra = 80, tocá 1-♭3-4-5 sobre el Dm7.',
            'Sobre el G7, empezá la célula 1-2-3-5 en la nota más cercana a la que terminaste.',
            'Hacé lo mismo sobre el Cmaj7. Si hace falta, invertí la dirección de la célula.',
            'Subí a negra = 96 sólo si no se ensucia.',
          ],
          { ...PA, bpm: 80 },
        ),
        lesson(
          'foco-cel-lesson',
          '1-2-3-5 / 3-5-7-9 sobre ii–V–I por las 12, del ejercicio de Lecciones.',
          'La célula aplicada en las doce tonalidades.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio sin el play-along.',
            'Después con el play-along a medio tempo, y subí de a 4 bpm.',
            'Marcá las tonalidades que salgan limpias.',
          ],
          'digital',
          0,
        ),
      ],
    },
    {
      title: 'Permutaciones y ritmo',
      goal: 'Tocar las notas de cada célula en otro orden y con otro ritmo, para que suene a frase.',
      tasks: [
        task(
          'foco-cel-rotar',
          'Rotá las células: 1-2-3-5, 2-3-5-1, 3-5-1-2, 5-1-2-3, y lo mismo con 1-♭3-4-5.',
          'Las mismas cuatro notas, cuatro puntos de partida.',
          [
            'Sobre un acorde estático, tocá 1-2-3-5 y empezá cada vuelta una nota más adelante: 2-3-5-1, 3-5-1-2, 5-1-2-3.',
            'Repetí con la célula menor: 1-♭3-4-5, ♭3-4-5-1, 4-5-1-♭3, 5-1-♭3-4.',
            'Elegí la rotación que más te guste y usala para empezar una frase.',
          ],
          PA,
        ),
        task(
          'foco-cel-ritmo',
          'La misma célula con tres ritmos: corcheas, síncopa y tresillo.',
          'Que la célula tenga ritmo: lo que la hace sonar a frase.',
          [
            'Tocá 1-2-3-5 en corcheas parejas sobre un acorde.',
            'Repetí con la síncopa: corchea-negra-corchea.',
            'Repetí en tresillos: tres notas de la célula y la cuarta como inicio del grupo siguiente.',
            'Hacelo también con 1-♭3-4-5.',
          ],
          PA,
        ),
        lesson(
          'foco-cel-menorlesson',
          'Digitales en la cadena mayor–menor, del ejercicio de Lecciones.',
          'Pasar de la célula mayor a la menor siguiendo los acordes.',
          [
            'Abrí el ejercicio y tocalo a medio tempo con el play-along.',
            'Notá cuándo usás la célula menor y cuándo la mayor.',
            'Subí el tempo de a 4 bpm.',
          ],
          'digital',
          3,
        ),
      ],
    },
    temaWeek('cel', 'Células', 'una célula (1-2-3-5 o 1-♭3-4-5)'),
  ],
};

/** Tareas con ideas de lenguaje: el material (`SETS`), la semilla que cambia las combinaciones y qué se destaca. */
const IDEAS: Record<string, { set: keyof typeof SETS; seed: number; what: string }> = {
  'foco-trm-mapa': { set: 'menores', seed: 0, what: 'tríadas menores del mapa' },
  'foco-trm-negras': { set: 'menores', seed: 1, what: 'tríadas menores en corcheas' },
  'foco-trm-g7': { set: 'menores', seed: 2, what: 'tríadas menores, con la de Sol menor sobre el dominante' },
  'foco-trm-cells': { set: 'menores', seed: 3, what: 'células de tríada menor' },
  'foco-trm-ritmo': { set: 'menores', seed: 4, what: 'tríadas menores con distintos ritmos' },
  'foco-trm-lesson': { set: 'menores', seed: 5, what: 'tríadas menores' },
  'foco-trmm-mapa': { set: 'mayoresMenores', seed: 0, what: 'las cuatro tríadas de cada acorde' },
  'foco-trmm-alternar': { set: 'mayoresMenores', seed: 1, what: 'tríadas mayores y menores alternadas' },
  'foco-trmm-oidoacorde': { set: 'mayoresMenores', seed: 2, what: 'tríadas mayores y menores' },
  'foco-trmm-cells': { set: 'mayoresMenores', seed: 3, what: 'frases que cambian de tríada' },
  'foco-trmm-ritmo': { set: 'mayoresMenores', seed: 4, what: 'tríadas con distintos ritmos' },
  'foco-trmm-lesson': { set: 'mayoresMenores', seed: 5, what: 'tríadas mayores y menores' },
  'foco-a7-iivi': { set: 'cuatroNotas', seed: 0, what: 'arpegios de cuatro notas' },
  'foco-a7-guia': { set: 'cuatroNotas', seed: 1, what: 'arpegios que terminan en la nota guía' },
  'foco-a7-lesson1': { set: 'cuatroNotas', seed: 2, what: 'arpegios desde la fundamental y desde la 3ª' },
  'foco-a7-inversiones': { set: 'cuatroNotas', seed: 3, what: 'arpegios en cualquier orden' },
  'foco-a7-ritmo': { set: 'cuatroNotas', seed: 4, what: 'arpegios con distintos ritmos' },
  'foco-a7-menor': { set: 'menorCuatroNotas', seed: 0, what: 'arpegios sobre el ii–V–i menor' },
  'foco-cel-mapa': { set: 'celulas', seed: 0, what: 'células sobre su acorde' },
  'foco-cel-conectar': { set: 'celulas', seed: 1, what: 'células conectadas' },
  'foco-cel-rotar': { set: 'celulas', seed: 2, what: 'células rotadas' },
  'foco-cel-ritmo': { set: 'celulas', seed: 3, what: 'células con distintos ritmos' },
  'foco-cel-menorlesson': { set: 'celulas', seed: 4, what: 'células mayores y menores' },
};
export const IDEAS_PER_TASK = 10;
/** Material de cada foco para las tareas que no tienen uno propio (ciclos, oído y tema). */
const FOCUS_SET: Record<string, { set: keyof typeof SETS; what: string }> = {
  'l-triadas-menores': { set: 'menores', what: 'tríadas menores' },
  'l-triadas-mayor-menor': { set: 'mayoresMenores', what: 'tríadas mayores y menores' },
  'l-acordes-7': { set: 'cuatroNotas', what: 'arpegios de cuatro notas' },
  'l-celulas-1235': { set: 'celulas', what: 'células de cuatro notas' },
};

/** A cada tarea con ejemplo se le agrega su pentagrama en la tonalidad del día. */
const withExamples = (f: Focus): Focus => ({
  ...f,
  weeks: f.weeks.map((w, wi) => ({
    ...w,
    tasks: w.tasks.map((t, ti) => {
      const ex = EXAMPLES[t.id] ? { abc: (k: string) => exampleAbc(t.id, k)!, abcCaption: EXAMPLES[t.id].caption } : {};
      const id = IDEAS[t.id] ?? { ...FOCUS_SET[f.id], seed: 6 + wi * 3 + ti };
      const ideas = id
        ? {
            ideas: {
              count: IDEAS_PER_TASK,
              caption: `${IDEAS_PER_TASK} ideas de tres compases sobre el ii–V–I: ${id.what}. Cada una arranca cerca de donde terminó la anterior y cierra en la 3ª o la 5ª del último acorde. Tocalas, cambialas y quedate con las que te suenen tuyas.`,
              abc: (k: string) => {
                const t0 = tonicOf(k);
                return abcFromBars(ideaBars(SETS[id.set](t0), IDEAS_PER_TASK, id.seed), t0, 80);
              },
            },
          }
        : {};
      return { ...t, ...ex, ...ideas };
    }),
  })),
});

export const SHAPE_LANG_FOCI: Focus[] = [LANG_TRIADS_MENORES, LANG_TRIADS_MAYOR_MENOR, LANG_ACORDES_7, LANG_CELULAS].map(withExamples);
