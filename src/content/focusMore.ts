/**
 * Más focos de lenguaje con consignas de estudio: pares de tríadas, intervalos (terceras, cuartas y saltos),
 * pentatónicas, blues, sustitución tritonal, la escala de cada acorde, motivos, side-slipping y desplazamiento rítmico.
 * Mismo molde que los demás: cuatro semanas, tres consignas por semana, y la última aplicada al tema del mes.
 *
 * Las tablas que citan los textos (`PAIR_FACTS`, `QUARTAL_FACTS`, `PENT_FACTS`, `CHORD_SCALE_FACTS`, `TRITONE_FACTS`,
 * `SLIP_FACTS`) se comprueban contra la teoría en los tests.
 */
import { degreesOver, lesson, PA, task, temaWeek } from './focusShapes';
import type { Focus } from './focus';

// ---------------------------------------------------------------------------------------------------------------
// Tablas (verificadas en los tests; todas en Do)
// ---------------------------------------------------------------------------------------------------------------

/** Pares de tríadas mayores (sin notas comunes) para cada acorde del ii–V–I. */
export const PAIR_FACTS: { chord: string; a: { root: string; degrees: string }; b: { root: string; degrees: string }; scale: string }[] = [
  { chord: 'Dm7', a: { root: 'F', degrees: '♭3-5-♭7' }, b: { root: 'G', degrees: '11-13-1' }, scale: 'Re dórico' },
  { chord: 'G7', a: { root: 'G', degrees: '1-3-5' }, b: { root: 'F', degrees: '♭7-9-11' }, scale: 'Sol mixolidio' },
  { chord: 'Cmaj7', a: { root: 'C', degrees: '1-3-5' }, b: { root: 'D', degrees: '9-♯11-13' }, scale: 'Do lidio' },
];

/** Cuartas apiladas (cuatro notas) que caben en cada acorde, y los grados que son. */
export const QUARTAL_FACTS: { chord: string; start: string; notes: string; degrees: string; semis: number[] }[] = [
  { chord: 'Dm7', start: 'D', notes: 'Re-Sol-Do-Fa', degrees: '1-11-♭7-♭3', semis: [0, 5, 10, 15] },
  { chord: 'G7', start: 'B', notes: 'Si-Mi-La-Re', degrees: '3-13-9-5', semis: [4, 9, 14, 19] },
  { chord: 'Cmaj7', start: 'E', notes: 'Mi-La-Re-Sol', degrees: '3-13-9-5', semis: [4, 9, 14, 19] },
];

/** Pentatónicas que caben en cada acorde: raíz, tipo y los grados que son sobre el acorde. */
export const PENT_FACTS: { chord: string; root: string; kind: 'majorPent' | 'minorPent'; name: string; degrees: string; semis: number[] }[] = [
  { chord: 'Cmaj7', root: 'C', kind: 'majorPent', name: 'Do mayor', degrees: '1-9-3-5-13', semis: [0, 2, 4, 7, 9] },
  { chord: 'Cmaj7', root: 'G', kind: 'majorPent', name: 'Sol mayor', degrees: '5-13-7-9-3', semis: [0, 2, 4, 7, 9] },
  { chord: 'Dm7', root: 'D', kind: 'minorPent', name: 'Re menor', degrees: '1-♭3-11-5-♭7', semis: [0, 3, 5, 7, 10] },
  { chord: 'Dm7', root: 'C', kind: 'majorPent', name: 'Do mayor', degrees: '♭7-1-9-11-5', semis: [0, 2, 4, 7, 9] },
  { chord: 'G7', root: 'G', kind: 'majorPent', name: 'Sol mayor', degrees: '1-9-3-5-13', semis: [0, 2, 4, 7, 9] },
  { chord: 'G7', root: 'D', kind: 'minorPent', name: 'Re menor', degrees: '5-♭7-1-9-11', semis: [0, 3, 5, 7, 10] },
];

/** La escala de cada acorde del ii–V–I: raíz, escala y sus notas (en Do). */
export const CHORD_SCALE_FACTS: { chord: string; root: string; scale: string; name: string; notes: string[] }[] = [
  { chord: 'Dm7', root: 'D', scale: 'dorian', name: 'Re dórico', notes: ['D', 'E', 'F', 'G', 'A', 'B', 'C'] },
  { chord: 'G7', root: 'G', scale: 'mixolydian', name: 'Sol mixolidio', notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F'] },
  { chord: 'Cmaj7', root: 'C', scale: 'ionian', name: 'Do jónico', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  { chord: 'Cmaj7', root: 'C', scale: 'lydian', name: 'Do lidio', notes: ['C', 'D', 'E', 'F♯', 'G', 'A', 'B'] },
  { chord: 'G7', root: 'G', scale: 'altered', name: 'Sol alterado', notes: ['G', 'A♭', 'B♭', 'B', 'D♭', 'E♭', 'F'] },
  { chord: 'Dm7♭5', root: 'D', scale: 'locrian2', name: 'Re locrio ♮2', notes: ['D', 'E', 'F', 'G', 'A♭', 'B♭', 'C'] },
];

/** Sustitución tritonal: el dominante y su sustituto (un trítono más lejos) comparten la 3ª y la 7ª. */
export const TRITONE_FACTS = { dominant: 'G7', sub: 'D♭7', shared: ['B', 'F'] };

/** Side-slipping: tocar el acorde un semitono arriba y volver (no comparten ninguna nota). */
export const SLIP_FACTS = { chord: 'Dm7', slip: 'E♭m7' };

/** Las tres tríadas de cada acorde, como texto. */
const pairList = PAIR_FACTS.map((f) => `${f.chord}: ${f.a.root} mayor y ${f.b.root} mayor (${f.scale})`).join('; ');
const quartalList = QUARTAL_FACTS.map((f) => `${f.chord}: ${f.notes} (${f.degrees})`).join('; ');
const pentList = PENT_FACTS.map((f) => `${f.chord}: ${f.name} (${f.degrees})`).join('; ');
const scaleList = CHORD_SCALE_FACTS.slice(0, 3).map((f) => `${f.chord}: ${f.name}`).join('; ');

export { degreesOver };

// ---------------------------------------------------------------------------------------------------------------
// Pares de tríadas
// ---------------------------------------------------------------------------------------------------------------

const LANG_TRIAD_PAIRS: Focus = {
  id: 'l-triad-pairs',
  area: 'lenguaje',
  title: 'Pares de tríadas',
  summary: 'Dos tríadas sin notas comunes que dan una escala de seis notas con sonido abierto: armarlas, moverse entre ellas y usarlas en el ii–V–I.',
  weeks: [
    {
      title: 'Armar los pares',
      goal: 'Saber qué dos tríadas forman el par de cada acorde y por qué no tienen notas en común.',
      tasks: [
        task(
          'foco-tp-armar',
          'Armá el par de tríadas de un m7 (en Do: F mayor y G mayor sobre Dm7) y tocá cada tríada por separado.',
          'Ver el par como dos acordes simples y no como una escala difícil.',
          [
            'Sobre Dm7, nombrá las notas de las dos tríadas: F-A-C y G-B-D.',
            'Tocá cada una subiendo y bajando, en negras, en tres posiciones.',
            'Comprobá que no tienen ninguna nota en común: juntas dan seis notas distintas.',
          ],
          { minutes: 6 },
        ),
        task(
          'foco-tp-tabla',
          'Escribí y tocá la tabla de pares del ii–V–I: un par para cada acorde.',
          'Tener a mano qué par va con qué acorde.',
          [
            `La tabla (en Do, se traduce a tu tonalidad al practicar): ${pairList}.`,
            'Escribila a mano en tu tonalidad del día y tocá cada par, una tríada y después la otra.',
            'Verificá que en cada par las seis notas son las de la escala del acorde sin la nota que se evita.',
          ],
          { ...PA, minutes: 6 },
        ),
        task(
          'foco-tp-oido',
          'Cantá una tríada del par y respondé con la otra: oí qué abre el par.',
          'Reconocer de oído el sonido de dos tríadas juntas.',
          [
            'Cantá (o silbá) la primera tríada del par de Dm7 y tocá la segunda.',
            'Repetilo sobre el play-along en un solo acorde, alternando.',
            'Anotá si el par te suena "abierto" o "estable": ese carácter es lo que se busca.',
          ],
          { ...PA, minutes: 5 },
        ),
      ],
    },
    {
      title: 'Moverse entre las dos tríadas',
      goal: 'Pasar de una tríada a la otra con soltura, en cualquier dirección.',
      tasks: [
        task(
          'foco-tp-zigzag',
          'Zigzag: una tríada sube y la otra baja, en negras, sobre un solo acorde.',
          'Que el par se oiga como una sola línea.',
          [
            'Sobre Dm7, subí la tríada de F (F-A-C) y bajá la de G (G-D-B), sin parar.',
            'Invertí: subí la de G y bajá la de F.',
            'Con el metrónomo en 80, ocho compases seguidos sin cambiar de par.',
          ],
          { ...PA, bpm: 80 },
        ),
        task(
          'foco-tp-inversiones',
          'Inversiones: la 1ª inversión de una tríada y la 2ª de la otra, empezando por la nota más cercana.',
          'Evitar el salto de 7ª y que la línea sea continua.',
          [
            'Tocá la tríada de F en 1ª inversión (A-C-F) y seguí con la de G en 2ª (D-G-B).',
            'Empezá siempre por la nota más cercana a donde terminaste.',
            'Hacelo subiendo y bajando, y probalo en otras dos tonalidades.',
          ],
          PA,
        ),
        lesson(
          'foco-tp-lesson1',
          'El ejercicio de pares de tríadas sobre un acorde modal.',
          'Sostener un par durante varios compases sin cambiar la armonía.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio.',
            'Después con el play-along a medio tempo, y subí de a 4 bpm.',
            'Marcá la tonalidad como dominada sólo cuando salga limpia dos veces seguidas.',
          ],
          'triad-pairs',
          0,
        ),
      ],
    },
    {
      title: 'Los pares en el ii–V–I',
      goal: 'Cambiar de par con cada acorde sin perder la línea.',
      tasks: [
        task(
          'foco-tp-iivi',
          'Cambiá de par con cada acorde del ii–V–I lento, un compás por acorde.',
          'Seguir la armonía con los pares.',
          [
            'Con el play-along a negra = 80, tocá el par de cada acorde en zigzag: F/G, después G/F, después C/D.',
            'En el cambio de acorde, buscá la nota más cercana del par nuevo.',
            'Subí de a 4 bpm sólo si no se ensucia.',
          ],
          { ...PA, bpm: 80 },
        ),
        lesson(
          'foco-tp-lesson2',
          'El ejercicio de pares de tríadas sobre ii–V–I por las 12.',
          'Los pares en las doce tonalidades.',
          [
            'Abrí el ejercicio y tocalo a medio tempo con el play-along.',
            'Marcá las tonalidades que salgan limpias y repetí las que no.',
            'Subí el tempo de a 4 bpm.',
          ],
          'triad-pairs',
          1,
        ),
        task(
          'foco-tp-grupos',
          'Grupos de dos notas por tríada para romper la simetría del par.',
          'Que el par no suene a ejercicio.',
          [
            'Sobre un acorde, tocá dos notas de una tríada y dos de la otra, y repetí con otra elección.',
            'Variá el ritmo: corcheas, síncopa y una pausa.',
            'Inventá una frase de dos compases y repetila sobre el acorde siguiente con su par.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('tp', 'Pares de tríadas', 'un par de tríadas'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Intervalos
// ---------------------------------------------------------------------------------------------------------------

const LANG_INTERVALOS: Focus = {
  id: 'l-intervalos',
  area: 'lenguaje',
  title: 'Intervalos: terceras, cuartas y saltos',
  summary: 'Pensar la línea en intervalos y no sólo en escalas: terceras, cuartas apiladas y saltos amplios, en la tonalidad y sobre el ii–V–I.',
  weeks: [
    {
      title: 'Terceras',
      goal: 'Tocar y oír terceras mayores y menores dentro de la escala y sobre los acordes.',
      tasks: [
        task(
          'foco-int-escala',
          'Terceras diatónicas por la escala mayor del día: 1-3, 2-4, 3-5… subiendo y bajando.',
          'Que las terceras salgan solas y parejas.',
          [
            'Con el metrónomo en 80, tocá la escala en terceras subiendo: 1-3, 2-4, 3-5, 4-6…, en corcheas.',
            'Bajá de la misma forma y notá cuáles son terceras mayores (4 semitonos) y cuáles menores (3).',
            'Repetilo ligado de a dos notas y después picado.',
          ],
          { bpm: 80, minutes: 6 },
        ),
        task(
          'foco-int-apilar',
          'Apilá terceras desde cada grado de la escala (1-3-5-7) y nombrá el acorde que sale.',
          'Ver que un acorde es una pila de terceras.',
          [
            'Desde el 1º grado, tocá 1-3-5-7 con las notas de la escala (maj7).',
            'Hacelo desde el 2º (m7), el 3º (m7), el 4º (maj7), el 5º (7), el 6º (m7) y el 7º (m7♭5).',
            'Nombrá en voz alta el acorde antes de tocarlo.',
          ],
          { minutes: 6 },
        ),
        task(
          'foco-int-oido',
          'Cantá terceras mayores y menores y tocalas para comprobar.',
          'Reconocer de oído una tercera mayor y una menor.',
          [
            'Tocá una nota y cantá la tercera mayor (4 semitonos) arriba; después la menor (3).',
            'Tocá la nota cantada y comprobá la afinación con el afinador.',
            'Repetilo en cinco notas de partida distintas.',
          ],
          { minutes: 5, link: '#/escucha', linkLabel: 'Abrir afinador' },
        ),
      ],
    },
    {
      title: 'Cuartas',
      goal: 'Usar cuartas apiladas para un sonido abierto, sin sonar a arpegio.',
      tasks: [
        task(
          'foco-int-cuartas',
          'Cuartas apiladas sobre cada acorde del ii–V–I, subiendo y bajando.',
          'Ver qué cuatro notas en cuartas caben en cada acorde.',
          [
            `La tabla (en Do): ${quartalList}.`,
            'Con el play-along, tocá las cuatro notas de cada acorde en negras, subiendo y bajando.',
            'Notá que sobre Dm7 se empieza en la fundamental y sobre G7 y Cmaj7 en la 3ª.',
          ],
          PA,
        ),
        task(
          'foco-int-cuartas-escala',
          'Cuartas por la escala: 1-4, 2-5, 3-6… tocadas de a dos notas, subiendo.',
          'Oír la cuarta como intervalo melódico propio.',
          [
            'Con el metrónomo en 80, tocá 1-4, 2-5, 3-6, 4-7… con las notas de la escala del acorde.',
            'Bajá con el mismo patrón.',
            'Elegí dos de esas cuartas y usalas como inicio de una frase.',
          ],
          { ...PA, bpm: 80 },
        ),
        task(
          'foco-int-cuartas-frase',
          'Una frase de dos compases con cuartas, y su respuesta con terceras.',
          'Contrastar el sonido abierto de las cuartas con el cerrado de las terceras.',
          [
            'Tocá una frase de cuatro notas en cuartas sobre un acorde.',
            'Respondela con una frase de cuatro notas en terceras sobre el mismo acorde.',
            'Repetí el par sobre el acorde siguiente.',
          ],
          PA,
        ),
      ],
    },
    {
      title: 'Saltos amplios',
      goal: 'Usar sextas, séptimas y octavas con control de afinación, aire y ritmo.',
      tasks: [
        task(
          'foco-int-sextas',
          'Sextas y séptimas: saltos amplios sobre un acorde estático, ligados y suaves.',
          'Que el salto grande no se caiga ni se apriete.',
          [
            'Sobre un acorde, tocá una nota y saltá a la sexta (9 semitonos) por encima, ligado y piano.',
            'Repetí con la séptima y con la octava.',
            'Cantá el salto antes de tocarlo.',
          ],
          { ...PA, minutes: 6 },
        ),
        task(
          'foco-int-octavas',
          'Octavas y décimas: la misma nota en dos registros, con intención.',
          'Cambiar de registro sin cambiar de sonido.',
          [
            'Tocá una nota del acorde y la misma una octava arriba, ligado y después picado.',
            'Probá con la décima (octava más tercera) en lugar de la octava.',
            'Usá uno de esos saltos como inicio de una frase de dos compases.',
          ],
          PA,
        ),
        task(
          'foco-int-mezcla',
          'Una frase que mezcla grados conjuntos y un salto grande, sobre el ii–V–I.',
          'Que el salto sea un gesto dentro de la frase, no un ejercicio.',
          [
            'Tocá una frase de cuatro notas por grado conjunto y cerrala con un salto de sexta o más.',
            'Variá el ritmo y dejá una pausa antes del salto.',
            'Repetí la idea sobre cada acorde del ii–V–I.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('int', 'Intervalos', 'un intervalo (tercera, cuarta o salto)'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Pentatónicas
// ---------------------------------------------------------------------------------------------------------------

const LANG_PENTATONICAS: Focus = {
  id: 'l-pentatonicas',
  area: 'lenguaje',
  title: 'Pentatónicas sobre acordes',
  summary: 'Las pentatónicas mayor y menor en las doce tonalidades y cuál va con cada acorde para sonar moderno con pocas notas.',
  weeks: [
    {
      title: 'Las pentatónicas en los doce tonos',
      goal: 'Que la pentatónica mayor (1-2-3-5-6) y la menor (1-♭3-4-5-♭7) salgan solas.',
      tasks: [
        task(
          'foco-pen-mayor',
          'Pentatónica mayor de las doce tonalidades en el ciclo de cuartas, una por compás.',
          'Encadenar las doce pentatónicas mayores sin pensar en cada una.',
          [
            'Con el metrónomo en 80, tocá 1-2-3-5-6 subiendo y bajando, en corcheas.',
            'Pasá a la siguiente del ciclo de cuartas sin parar.',
            'Anotá las tonalidades que se traban.',
          ],
          { bpm: 80, minutes: 6 },
        ),
        task(
          'foco-pen-menor',
          'Pentatónica menor de las doce tonalidades en el ciclo de cuartas, una por compás.',
          'Lo mismo con la menor.',
          [
            'Con el metrónomo en 80, tocá 1-♭3-4-5-♭7 subiendo y bajando, en corcheas.',
            'Pasá a la siguiente del ciclo de cuartas sin parar.',
            'Notá que la pentatónica menor de La tiene las mismas notas que la mayor de Do.',
          ],
          { bpm: 80, minutes: 6 },
        ),
        task(
          'foco-pen-oido',
          'Cantá la pentatónica y tocala: la nota se oye antes de salir.',
          'Que el oído guíe a los dedos.',
          [
            'Cantá (o silbá) 1-2-3-5-6 de la tonalidad del día, despacio y afinado.',
            'Tocala y comprobá la afinación con el afinador.',
            'Cantá una nota cualquiera de la pentatónica y buscala en la trompeta.',
          ],
          { minutes: 5, link: '#/escucha', linkLabel: 'Abrir afinador' },
        ),
      ],
    },
    {
      title: 'Qué pentatónica va con cada acorde',
      goal: 'Elegir una pentatónica que dé un color claro sobre cada acorde del ii–V–I.',
      tasks: [
        task(
          'foco-pen-mapa',
          'En el ii–V–I, tocá cada pentatónica de la tabla como nota larga y escuchá su color.',
          'Ver qué pentatónicas viven dentro de cada acorde.',
          [
            `La tabla (en Do, se traduce a tu tonalidad al practicar): ${pentList}.`,
            'Con el play-along, tocá la primera pentatónica de cada acorde, subiendo y bajando.',
            'Repetí con la segunda y anotá cuál te gustó más sobre cada acorde.',
          ],
          PA,
        ),
        task(
          'foco-pen-iivi',
          'Una pentatónica por acorde del ii–V–I, en corcheas, sin parar.',
          'Cambiar de pentatónica al cambiar de acorde, sin perder el pulso.',
          [
            'En el play-along a negra = 80, tocá la pentatónica elegida sobre cada acorde.',
            'En el cambio de acorde, buscá la nota más cercana de la pentatónica nueva.',
            'Subí a negra = 96 sólo si no se ensucia.',
          ],
          { ...PA, bpm: 80 },
        ),
        lesson(
          'foco-pen-lesson1',
          'El ejercicio de pentatónicas en el ii–V–I de Lecciones.',
          'Las pentatónicas aplicadas al ii–V–I en las doce tonalidades.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio.',
            'Después con el play-along a medio tempo, y subí de a 4 bpm.',
            'Marcá las tonalidades que salgan limpias.',
          ],
          'pentatonic',
          3,
        ),
      ],
    },
    {
      title: 'Frases con pentatónicas',
      goal: 'Armar frases cortas con pocas notas y mucho ritmo.',
      tasks: [
        task(
          'foco-pen-cells',
          'Tres células de tres notas dentro de la pentatónica, repetidas y movidas por la escala.',
          'Tener fórmulas que suenen a frase.',
          [
            'Elegí tres notas de la pentatónica (por ejemplo 1-2-3) y tocalas en corcheas, repetidas.',
            'Movela por la pentatónica: 2-3-5, 3-5-6, 5-6-1.',
            'Inventá una célula propia y usala sobre dos acordes distintos.',
          ],
          PA,
        ),
        lesson(
          'foco-pen-lesson2',
          'El ejercicio de pentatónicas sobre el ii–V–I menor de Lecciones.',
          'Pentatónicas en una progresión menor.',
          [
            'Abrí el ejercicio y tocalo a medio tempo.',
            'Notá cómo cambia el color respecto del ii–V–I mayor.',
            'Marcá la tonalidad cuando salga limpia dos veces seguidas.',
          ],
          'pentatonic',
          0,
        ),
        task(
          'foco-pen-ritmo',
          'La misma pentatónica con tres ritmos: corcheas, síncopa y tresillo.',
          'Que la pentatónica tenga ritmo.',
          [
            'Sobre un acorde, tocá la pentatónica en corcheas parejas.',
            'Repetí con la síncopa: corchea-negra-corchea.',
            'Repetí en tresillos y combiná dos ritmos en una frase.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('pen', 'Pentatónicas', 'una pentatónica'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Blues
// ---------------------------------------------------------------------------------------------------------------

const LANG_BLUES: Focus = {
  id: 'l-blues',
  area: 'lenguaje',
  title: 'Lenguaje de blues',
  summary: 'La escala de blues, las notas azules y el diálogo de pregunta y respuesta: la base del lenguaje del jazz, sobre el blues de 12 compases.',
  weeks: [
    {
      title: 'La escala de blues',
      goal: 'Que 1-♭3-4-♭5-5-♭7 salga sola y se oiga la nota azul (la ♭5).',
      tasks: [
        task(
          'foco-blu-escala',
          'Escala de blues de la tonalidad del día, dos octavas, con swing.',
          'Tener la escala de seis notas en los dedos.',
          [
            'Con el metrónomo en 80, tocá 1-♭3-4-♭5-5-♭7 subiendo y bajando, en corcheas con swing.',
            'Repetila en dos octavas, sin cortar el aire.',
            'Repetí en otras tres tonalidades.',
          ],
          { bpm: 80, minutes: 6 },
        ),
        task(
          'foco-blu-azules',
          'Las notas azules (♭3, ♭5 y ♭7): tocalas largas y escuchá qué tienen de especial.',
          'Oír el roce de las notas azules contra el acorde.',
          [
            'Sobre un acorde de dominante, tocá la ♭3 como nota larga y escuchá el roce con la 3ª del acorde.',
            'Repetí con la ♭5 y con la ♭7.',
            'Probá bajar o subir la nota con el labio (un cuarto de tono) para acentuar el color.',
          ],
          { ...PA, minutes: 6 },
        ),
        task(
          'foco-blu-oido',
          'Cantá la escala de blues y tocala: la nota se oye antes de salir.',
          'Que el oído guíe a los dedos.',
          [
            'Cantá (o silbá) 1-♭3-4 de la tonalidad del día, despacio y afinado.',
            'Tocala y comprobá la afinación con el afinador.',
            'Cantá una frase corta de tres notas de la escala y tocala.',
          ],
          { minutes: 5, link: '#/escucha', linkLabel: 'Abrir afinador' },
        ),
      ],
    },
    {
      title: 'Frases de blues',
      goal: 'Armar frases cortas con pregunta y respuesta, con silencios.',
      tasks: [
        task(
          'foco-blu-llamada',
          'Pregunta y respuesta: una frase de un compás y su respuesta en el siguiente, sobre el blues de F.',
          'Que la frase dialogue consigo misma.',
          [
            'Tocá una frase de tres o cuatro notas de la escala de blues y dejá un silencio.',
            'Respondé con otra frase que parta de la misma nota y termine en otra.',
            'Repetí el par sobre los cuatro primeros compases del blues.',
          ],
          { link: '#/playalong?p=blues-f&k={k}', linkLabel: 'Abrir el blues de F' },
        ),
        task(
          'foco-blu-cells',
          'Motivo de tres notas (1-♭3-4) repetido y movido por la escala de blues.',
          'Tener una fórmula que suene a blues.',
          [
            'Tocá 1-♭3-4 en corcheas, repetido tres veces.',
            'Movelo: ♭3-4-♭5, 4-♭5-5 y 5-♭7-1.',
            'Inventá una variante con el ritmo cambiado.',
          ],
          { link: '#/playalong?p=blues-f&k={k}', linkLabel: 'Abrir el blues de F' },
        ),
        lesson(
          'foco-blu-lesson',
          'El ejercicio de pentatónicas sobre el blues menor de Lecciones.',
          'Aplicar la escala de blues y la pentatónica a un blues menor.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio.',
            'Después con el play-along a medio tempo, y subí de a 4 bpm.',
            'Marcá la tonalidad como dominada sólo cuando salga limpia dos veces seguidas.',
          ],
          'blues',
          3,
        ),
      ],
    },
    {
      title: 'Blues con armonía',
      goal: 'Seguir los cambios del blues con notas guía, arpegios y bebop.',
      tasks: [
        lesson(
          'foco-blu-gt',
          'Guide tones sobre el Bird blues, en redondas.',
          'Saber el esqueleto del blues con cambios.',
          [
            'Tocá el ejercicio en redondas, sin adornos.',
            'Cantá la línea antes de tocarla.',
            'Con el play-along a medio tempo.',
          ],
          'blues',
          0,
        ),
        lesson(
          'foco-blu-arp',
          'Arpegios sobre el blues de F.',
          'Que los arpegios sigan los acordes del blues.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Seguí con la conducción: la nota siguiente es la más cercana.',
            'Subí de a 4 bpm.',
          ],
          'blues',
          1,
        ),
        lesson(
          'foco-blu-bebop',
          'Escala bebop sobre el blues de F.',
          'La escala bebop en un blues.',
          [
            'Tocá el ejercicio despacio.',
            'Notá que las notas del acorde caen en los tiempos fuertes.',
            'Subí de a 4 bpm.',
          ],
          'blues',
          2,
        ),
      ],
    },
    temaWeek('blu', 'Blues', 'una frase de blues'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Sustitución tritonal
// ---------------------------------------------------------------------------------------------------------------

const LANG_TRITONO: Focus = {
  id: 'l-sustitucion-tritonal',
  area: 'lenguaje',
  title: 'Sustitución tritonal',
  summary: 'Cambiar el dominante por el acorde a un trítono (G7 por D♭7): por qué funciona, cómo se toca y cómo se usa en frases.',
  weeks: [
    {
      title: 'Por qué funciona',
      goal: 'Ver que G7 y D♭7 comparten la 3ª y la 7ª, y que el bajo baja por semitono.',
      tasks: [
        task(
          'foco-tri-notas',
          'Escribí las notas de G7 y de D♭7 y marcá las dos que comparten.',
          'Entender por qué un acorde puede ocupar el lugar del otro.',
          [
            'G7 = G-B-D-F y D♭7 = D♭-F-A♭-C♭ (la C♭ es la misma nota que B).',
            'Marcá las dos notas comunes: la 3ª de G7 (B) es la ♭7 de D♭7 (C♭) y la ♭7 de G7 (F) es la 3ª de D♭7.',
            'Tocá esas dos notas como nota larga sobre cada acorde y escuchá que siguen "funcionando".',
          ],
          { minutes: 6 },
        ),
        task(
          'foco-tri-bajo',
          'El bajo cromático: tocá Re–Re♭–Do (la fundamental de Dm7, de D♭7 y de Cmaj7) como línea.',
          'Oír la línea que justifica la sustitución.',
          [
            'Tocá la fundamental de cada acorde en redondas: D, D♭ y C.',
            'Escuchá el movimiento cromático descendente: es lo que hace sonar la sustitución.',
            'Repetí en otras dos tonalidades.',
          ],
          { link: '#/playalong?p=tritone&k={k}', linkLabel: 'Abrir el ii–V–I con sustitución', minutes: 5 },
        ),
        task(
          'foco-tri-oido',
          'Con el play-along, comparar el ii–V–I normal con el de sustitución tritonal.',
          'Oír la diferencia.',
          [
            'Tocá una nota larga (la 3ª de G7, B) sobre el ii–V–I normal y después sobre el de sustitución.',
            'Notá cómo la misma nota pasa de 3ª a ♭7.',
            'Anotá qué versión te suena más cerrada y cuál más abierta.',
          ],
          { link: '#/playalong?p=tritone&k={k}', linkLabel: 'Abrir el ii–V–I con sustitución', minutes: 5 },
        ),
      ],
    },
    {
      title: 'Tocarla',
      goal: 'Aplicar guide tones, arpegios y enclosures sobre el dominante sustituido.',
      tasks: [
        lesson(
          'foco-tri-guia',
          'Guide tones sobre la sustitución tritonal.',
          'Ver que las notas guía no cambian aunque cambie el acorde.',
          [
            'Tocá el ejercicio en redondas, sin adornos.',
            'Cantá la línea antes de tocarla.',
            'Con el play-along a medio tempo.',
          ],
          'subs',
          0,
        ),
        lesson(
          'foco-tri-arp',
          'Arpegios desde la 3ª sobre la sustitución tritonal.',
          'Que el arpegio siga el dominante sustituido.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Seguí con la conducción: la nota siguiente es la más cercana.',
            'Subí de a 4 bpm.',
          ],
          'subs',
          2,
        ),
        lesson(
          'foco-tri-enc',
          'Enclosures sobre la sustitución tritonal.',
          'Aproximar la 3ª del acorde sustituido.',
          [
            'Leé "cómo está armada esta línea" y tocala lenta, sin play-along.',
            'Después con el play-along a medio tempo.',
            'Subí el tempo de a 4 bpm.',
          ],
          'subs',
          3,
        ),
      ],
    },
    {
      title: 'En frases',
      goal: 'Usar la sustitución con la escala que le corresponde y en el sentido que quieras.',
      tasks: [
        task(
          'foco-tri-iivi',
          'Una frase sobre Dm7, D♭7 y Cmaj7 con una nota larga en cada cambio.',
          'Que la sustitución suene en una línea.',
          [
            'Con el play-along de la sustitución, tocá una frase de un compás por acorde.',
            'Cerrá cada frase en la 3ª del acorde siguiente.',
            'Repetí en dos tonalidades.',
          ],
          { link: '#/playalong?p=tritone&k={k}', linkLabel: 'Abrir el ii–V–I con sustitución' },
        ),
        task(
          'foco-tri-escala',
          'Tocá la escala lidia ♭7 de D♭ sobre el D♭7 (D♭-E♭-F-G-A♭-B♭-C♭).',
          'Tener la escala del acorde sustituto.',
          [
            'Tocá D♭ lidio ♭7, subiendo y bajando, sobre el acorde sustituido.',
            'Notá que es la misma escala que la menor melódica de A♭ (superlocria de G).',
            'Usala en una frase sobre el compás del D♭7.',
          ],
          { link: '#/playalong?p=tritone&k={k}', linkLabel: 'Abrir el ii–V–I con sustitución' },
        ),
        task(
          'foco-tri-alternar',
          'Un chorus alternando: un ii–V–I normal y otro con sustitución tritonal.',
          'Elegir de oído cuál usar.',
          [
            'Tocá un chorus del ii–V–I con el dominante normal.',
            'Tocá otro con el dominante sustituido y comparalos.',
            'Anotá cuál te gustó más y por qué.',
          ],
          { link: '#/playalong?p=tritone&k={k}', linkLabel: 'Abrir el ii–V–I con sustitución' },
        ),
      ],
    },
    temaWeek('tri', 'Sustitución tritonal', 'un dominante que se pueda sustituir'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// La escala de cada acorde
// ---------------------------------------------------------------------------------------------------------------

const LANG_MODOS: Focus = {
  id: 'l-escala-del-acorde',
  area: 'lenguaje',
  title: 'La escala de cada acorde (modos)',
  summary: 'Qué escala va con cada acorde del ii–V–I (dórica, mixolidia, jónica o lidia, alterada, locria ♮2) y cómo usarla en frases.',
  weeks: [
    {
      title: 'Dórica, mixolidia y jónica',
      goal: 'Tener la escala de cada acorde del ii–V–I en los dedos.',
      tasks: [
        task(
          'foco-mod-dor',
          'Escala dórica sobre el m7: subí y bajá dos octavas.',
          'Oír el color de la dórica (la 6ª mayor).',
          [
            'Sobre Dm7, tocá D-E-F-G-A-B-C subiendo y bajando, en corcheas.',
            'Notá que es la escala mayor de Do empezando en Re.',
            'Repetí en otras dos tonalidades.',
          ],
          PA,
        ),
        task(
          'foco-mod-mixo',
          'Escala mixolidia sobre el dominante: subí y bajá dos octavas.',
          'Oír el color de la mixolidia (la ♭7).',
          [
            'Sobre G7, tocá G-A-B-C-D-E-F subiendo y bajando, en corcheas.',
            'Notá que la nota C (4ª) pide resolver: es la nota a evitar como nota larga.',
            'Repetí en otras dos tonalidades.',
          ],
          PA,
        ),
        task(
          'foco-mod-ion',
          'Escala jónica sobre el maj7: subí y bajá dos octavas.',
          'Tener la escala de la tónica.',
          [
            'Sobre Cmaj7, tocá C-D-E-F-G-A-B subiendo y bajando, en corcheas.',
            'Notá que la F (4ª) es la nota a evitar como nota larga.',
            'Repetí en otras dos tonalidades.',
          ],
          PA,
        ),
      ],
    },
    {
      title: 'Lidia, alterada y locria ♮2',
      goal: 'Sumar los colores que cambian el sonido del acorde.',
      tasks: [
        task(
          'foco-mod-lid',
          'Lidia sobre el maj7: tocá la escala con la ♯4 (F♯ sobre Cmaj7).',
          'Oír la apertura de la lidia.',
          [
            'Sobre Cmaj7, tocá C-D-E-F♯-G-A-B subiendo y bajando.',
            'Escuchá cómo la ♯4 evita la 4ª que choca con la 3ª del acorde.',
            'Usala como nota larga y compará con la jónica.',
          ],
          PA,
        ),
        task(
          'foco-mod-alt',
          'Alterada sobre el dominante: la escala con ♭9, ♯9, ♯11 y ♭13.',
          'Tener el color tenso del dominante.',
          [
            'Sobre G7, tocá G-A♭-B♭-B-D♭-E♭-F (la menor melódica de A♭).',
            'Escuchá la tensión: todas las notas distintas de la mixolidia pesan.',
            'Resolvela a la 3ª del Cmaj7.',
          ],
          PA,
        ),
        task(
          'foco-mod-loc',
          'Locria ♮2 sobre el m7♭5 (la menor melódica de F sobre Dm7♭5).',
          'Tener la escala del acorde de ii de la menor.',
          [
            'Sobre Dm7♭5, tocá D-E-F-G-A♭-B♭-C subiendo y bajando.',
            'Notá que es la menor melódica de Fa empezando en Re.',
            'Usala en el ii–V–i menor.',
          ],
          { link: '#/playalong?p=ii-v-i-minor&k={k}', linkLabel: 'Abrir el ii–V–i menor' },
        ),
      ],
    },
    {
      title: 'En el ii–V–I',
      goal: 'Cambiar de escala con cada acorde sin perder la línea.',
      tasks: [
        task(
          'foco-mod-iivi',
          'La escala de cada acorde, un compás por acorde, subiendo y bajando.',
          'Seguir la armonía con las escalas.',
          [
            `La tabla (en Do): ${scaleList}.`,
            'Con el play-along a negra = 80, tocá la escala de cada acorde.',
            'En el cambio de acorde, buscá la nota más cercana.',
          ],
          { ...PA, bpm: 80 },
        ),
        task(
          'foco-mod-cambio',
          'Con las notas de Do mayor sobre los tres acordes, notá desde dónde arranca cada escala.',
          'Ver que dórica, mixolidia y jónica son la misma escala empezando en otra nota.',
          [
            'En el ii–V–I mayor las tres escalas (dórica, mixolidia y jónica) tienen las mismas siete notas: las de Do mayor.',
            'Tocá esas siete notas tres veces, empezando en Re sobre Dm7, en Sol sobre G7 y en Do sobre Cmaj7.',
            'Notá qué cambia: la nota de reposo (la fundamental del acorde) y la nota a evitar como nota larga.',
          ],
          PA,
        ),
        task(
          'foco-mod-frase',
          'Una frase de dos compases con la escala del acorde y una nota larga al final.',
          'Que la escala sea frase.',
          [
            'Tocá una frase de seis notas por grado conjunto sobre Dm7 y cerrala en una nota larga.',
            'Repetila sobre G7 y sobre Cmaj7 con su escala.',
            'Dejá un silencio entre las frases.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('mod', 'La escala del acorde', 'la escala de cada acorde'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Motivos
// ---------------------------------------------------------------------------------------------------------------

const LANG_MOTIVOS: Focus = {
  id: 'l-motivos',
  area: 'lenguaje',
  title: 'Motivos y desarrollo',
  summary: 'Inventar un motivo corto y desarrollarlo: repetir, mover, cambiar el ritmo, invertir. Menos notas y más sentido.',
  weeks: [
    {
      title: 'Un motivo corto',
      goal: 'Inventar y recordar un motivo de tres o cuatro notas.',
      tasks: [
        task(
          'foco-mot-crear',
          'Inventá un motivo de tres o cuatro notas con notas del acorde y tocalo sobre un solo acorde.',
          'Tener una idea propia, corta y fácil de recordar.',
          [
            'Elegí un acorde (por ejemplo Dm7) y tres o cuatro notas del acorde.',
            'Armá un ritmo simple (por ejemplo corchea-corchea-negra) y tocalo.',
            'Cantalo y tocalo de memoria, sin pensar en las notas.',
          ],
          { ...PA, minutes: 6 },
        ),
        task(
          'foco-mot-repetir',
          'Repetí el motivo cuatro veces seguidas, igual, sobre el mismo acorde.',
          'Ver que la repetición da identidad.',
          [
            'Tocá el motivo cuatro veces con el mismo ritmo y las mismas notas.',
            'Variá sólo el volumen: más fuerte, más suave.',
            'Escuchá en qué repetición el motivo empieza a sonar como una idea.',
          ],
          { ...PA, minutes: 5 },
        ),
        task(
          'foco-mot-silencio',
          'Motivo, silencio, motivo: dos compases con un compás de pausa en el medio.',
          'Usar el silencio como parte del motivo.',
          [
            'Tocá el motivo, dejá un compás de silencio y volvé a tocarlo.',
            'Probá con medio compás de silencio.',
            'Notá cómo el silencio hace que el motivo se oiga más.',
          ],
          PA,
        ),
      ],
    },
    {
      title: 'Desarrollarlo',
      goal: 'Transformar el motivo sin perderlo: moverlo, cambiar el ritmo, invertirlo.',
      tasks: [
        task(
          'foco-mot-secuencia',
          'Secuencia: tocá el motivo y repetilo un grado arriba, y otro más arriba, por la escala del acorde.',
          'Que el motivo recorra la escala.',
          [
            'Tocá el motivo y repetilo empezando un grado de la escala más arriba.',
            'Seguí subiendo un grado cada vez, tres veces.',
            'Hacelo bajando y comparalo.',
          ],
          PA,
        ),
        task(
          'foco-mot-ritmo',
          'Mismo motivo con ritmo distinto: corcheas, síncopa y tresillo.',
          'Cambiar el ritmo sin cambiar las notas.',
          [
            'Tocá el motivo en corcheas parejas.',
            'Repetilo con síncopa y después en tresillos.',
            'Elegí la versión que más te suene y usala como cierre.',
          ],
          PA,
        ),
        task(
          'foco-mot-invertir',
          'Inversión: tocá el motivo con las notas en dirección contraria.',
          'Ver el motivo desde el otro lado.',
          [
            'Si el motivo sube, tocalo bajando con los mismos intervalos.',
            'Alterná el original y la inversión en frases de dos compases.',
            'Escuchá si siguen sonando a la misma idea.',
          ],
          PA,
        ),
      ],
    },
    {
      title: 'El motivo sobre la armonía',
      goal: 'Adaptar el motivo a cada acorde del ii–V–I.',
      tasks: [
        task(
          'foco-mot-iivi',
          'El motivo sobre cada acorde del ii–V–I, adaptado a las notas de cada uno.',
          'Que el motivo siga la armonía.',
          [
            'Tocá el motivo sobre Dm7 con notas de Dm7.',
            'Repetilo sobre G7 y Cmaj7 adaptando las notas pero no el ritmo.',
            'Cerrá en una nota larga de Cmaj7.',
          ],
          PA,
        ),
        task(
          'foco-mot-pregunta',
          'Pregunta y respuesta: una frase con el motivo y otra que lo contesta.',
          'Que las frases dialoguen.',
          [
            'Tocá el motivo como pregunta (terminando en una nota abierta).',
            'Respondé con el motivo variado terminando en una nota de reposo.',
            'Repetí sobre el acorde siguiente.',
          ],
          PA,
        ),
        task(
          'foco-mot-climax',
          'Una frase de cuatro compases que crece: motivo, motivo más alto, motivo más largo, cierre.',
          'Dar forma a una frase.',
          [
            'Tocá el motivo, después una versión más alta y después una más larga.',
            'Cerrá con una nota larga y un silencio.',
            'Grabalo y escuchá si la frase crece.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('mot', 'Motivos', 'un motivo'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Side-slipping
// ---------------------------------------------------------------------------------------------------------------

const LANG_OUTSIDE: Focus = {
  id: 'l-side-slipping',
  area: 'lenguaje',
  title: 'Side-slipping (tocar «afuera»)',
  summary: 'Tocar un semitono arriba o abajo del acorde y volver «adentro»: tensión controlada, con el oído como guía.',
  weeks: [
    {
      title: 'Entender el desplazamiento',
      goal: 'Ver qué pasa al tocar un acorde un semitono arriba y al volver.',
      tasks: [
        task(
          'foco-out-semitono',
          'Tocá Dm7 y después E♭m7 (un semitono arriba): no comparten ninguna nota.',
          'Entender que «afuera» es la misma forma un semitono lejos.',
          [
            'Tocá el arpegio de Dm7 (D-F-A-C) y después el de E♭m7 (E♭-G♭-B♭-D♭).',
            'Notá que no comparten ninguna nota: por eso suena tan lejos.',
            'Volvé a Dm7 y escuchá cómo la vuelta resuelve.',
          ],
          { ...PA, minutes: 6 },
        ),
        task(
          'foco-out-vuelta',
          'Tocá una frase de cuatro notas en Dm7, repetila un semitono arriba y volvé a Dm7.',
          'La vuelta «adentro» es lo que hace que funcione.',
          [
            'Tocá una frase corta de cuatro notas del Dm7.',
            'Repetila exactamente un semitono más arriba.',
            'Volvé a la frase original y escuchá el alivio.',
          ],
          PA,
        ),
        task(
          'foco-out-oido',
          'Cantá una frase corta y cantala un semitono arriba: reconocé los dos «lugares».',
          'Que el oído guíe también las notas de afuera.',
          [
            'Cantá una frase de tres notas en la tonalidad.',
            'Cantala un semitono arriba y volvé a la original.',
            'Tocá las dos para comprobar la afinación.',
          ],
          { minutes: 5, link: '#/escucha', linkLabel: 'Abrir afinador' },
        ),
      ],
    },
    {
      title: 'Aplicarlo',
      goal: 'Usar el desplazamiento sobre acordes que se quedan o cambian.',
      tasks: [
        lesson(
          'foco-out-lesson1',
          'El ejercicio de side-slipping sobre un acorde modal.',
          'Practicarlo sobre un acorde que no cambia.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio.',
            'Después con el play-along a medio tempo.',
            'Marcá la tonalidad cuando salga limpia dos veces seguidas.',
          ],
          'outside',
          0,
        ),
        lesson(
          'foco-out-lesson2',
          'El ejercicio de side-slipping en la cadena mayor–menor.',
          'Practicarlo cuando el acorde cambia.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Notá dónde la línea sale y dónde vuelve.',
            'Subí de a 4 bpm.',
          ],
          'outside',
          1,
        ),
        lesson(
          'foco-out-lesson3',
          'El ejercicio de side-slipping en el ii–V–i menor.',
          'Practicarlo en una progresión menor.',
          [
            'Tocá el ejercicio despacio.',
            'Cantá la línea antes de tocarla.',
            'Subí el tempo de a 4 bpm.',
          ],
          'outside',
          3,
        ),
      ],
    },
    {
      title: 'Con control',
      goal: 'Usar el recurso con intención: poco, bien ubicado y con vuelta clara.',
      tasks: [
        task(
          'foco-out-poco',
          'Una frase por chorus que salga «afuera»: el resto, adentro.',
          'Que el recurso sea una sorpresa y no una costumbre.',
          [
            'Tocá un chorus del ii–V–I con una sola frase desplazada un semitono.',
            'Elegí dónde: al principio, en el medio o al final de la frase.',
            'Escuchá si la vuelta se oye clara.',
          ],
          PA,
        ),
        task(
          'foco-out-dominante',
          'Sobre el dominante, desplazá un semitono arriba y resolvé a la 3ª del acorde siguiente.',
          'Usarlo en el lugar donde más se escucha.',
          [
            'Sobre G7, tocá una frase en el arpegio de A♭7.',
            'Resolvé en la 3ª del Cmaj7 (E).',
            'Repetí en otras dos tonalidades.',
          ],
          PA,
        ),
        task(
          'foco-out-grabar',
          'Grabá un chorus con side-slipping y escuchá si la vuelta se entiende.',
          'Comprobar de oído.',
          [
            'Grabá un chorus con dos o tres frases desplazadas.',
            'Escuchá sin la trompeta en la mano.',
            'Anotá una cosa que repetirías y una que cambiarías.',
          ],
          PA,
        ),
      ],
    },
    temaWeek('out', 'Side-slipping', 'un lugar para desplazar un semitono'),
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Desplazamiento rítmico
// ---------------------------------------------------------------------------------------------------------------

const LANG_DESPLAZAMIENTO: Focus = {
  id: 'l-desplazamiento',
  area: 'lenguaje',
  title: 'Desplazamiento rítmico',
  summary: 'Mover una misma célula en el compás (una corchea antes o después) para que la misma idea suene nueva y con swing.',
  weeks: [
    {
      title: 'Sentir dónde cae el 1',
      goal: 'Tener firme el pulso para poder desplazar sin perderlo.',
      tasks: [
        task(
          'foco-des-cuenta',
          'Cantá el pulso en 2 y 4 con el metrónomo y tocá una escala sin perderlo.',
          'Sentir el contratiempo.',
          [
            'Poné el metrónomo en 2 y 4 y chasqueá los dedos con él.',
            'Tocá una escala en corcheas sin perder los chasquidos.',
            'Probá a tempo lento, medio y rápido.',
          ],
          { ...PA, bpm: 80, minutes: 6 },
        ),
        task(
          'foco-des-contra',
          'Tocá una célula de cuatro notas empezando en el pulso y después empezando en la corchea siguiente.',
          'Ver que la misma célula cambia de carácter.',
          [
            'Tocá 1-2-3-5 en cuatro corcheas, empezando en el tiempo 1.',
            'Repetí empezando en el "y" del tiempo 1.',
            'Escuchá qué cambia.',
          ],
          PA,
        ),
        task(
          'foco-des-cantar',
          'Cantá una célula de cuatro notas y chasqueá el pulso: la célula se desliza contra el pulso.',
          'Sentirlo antes de tocarlo.',
          [
            'Cantá 1-2-3-5 empezando en el pulso.',
            'Repetí empezando una corchea después.',
            'Tocá la célula desplazada de memoria.',
          ],
          { minutes: 5 },
        ),
      ],
    },
    {
      title: 'Mover la célula',
      goal: 'Desplazar una célula por el compás sin cambiar las notas.',
      tasks: [
        lesson(
          'foco-des-lesson1',
          'El ejercicio de 1-2-3-5 desplazado sobre ii–V–I por las 12.',
          'Aplicar la célula desplazada en las doce tonalidades.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio.',
            'Después con el play-along a medio tempo.',
            'Marcá las tonalidades que salgan limpias.',
          ],
          'rhythm',
          0,
        ),
        task(
          'foco-des-cada',
          'Desplazá la célula una corchea más cada vez: empieza en 1, en 1 y, en 2, en 2 y…',
          'Ver todas las posiciones de la misma célula.',
          [
            'Sobre un acorde, tocá la célula en el tiempo 1 y repetila una corchea más tarde cada vez.',
            'Seguí hasta que la célula vuelva a empezar en el tiempo 1.',
            'Hacelo con la célula 1-♭3-4-5 también.',
          ],
          PA,
        ),
        lesson(
          'foco-des-lesson2',
          'El ejercicio de desplazamiento en Rhythm changes.',
          'Desplazar sobre una forma conocida.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Notá dónde la célula cambia de lugar en el compás.',
            'Subí de a 4 bpm.',
          ],
          'rhythm',
          1,
        ),
      ],
    },
    {
      title: 'Con armonía',
      goal: 'Aplicar el desplazamiento a los cambios de acorde.',
      tasks: [
        task(
          'foco-des-iivi',
          'La misma célula desplazada sobre cada acorde del ii–V–I, un compás por acorde.',
          'Seguir la armonía con la célula en otro lugar.',
          [
            'Sobre Dm7, tocá la célula desplazada una corchea.',
            'Repetí sobre G7 y sobre Cmaj7 con la célula del acorde.',
            'Terminá en una nota larga.',
          ],
          PA,
        ),
        lesson(
          'foco-des-blues',
          'El ejercicio de desplazamiento en el blues de F.',
          'Desplazar sobre un blues.',
          [
            'Tocá el ejercicio despacio.',
            'Notá cómo el desplazamiento da swing a la frase.',
            'Subí de a 4 bpm.',
          ],
          'rhythm',
          2,
        ),
        lesson(
          'foco-des-lesson3',
          'El ejercicio de desplazamiento en la cadena mayor–menor.',
          'Desplazar cuando cambia el modo.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Notá cuándo el desplazamiento se nota más.',
            'Marcá la tonalidad cuando salga limpia.',
          ],
          'rhythm',
          3,
        ),
      ],
    },
    temaWeek('des', 'Desplazamiento', 'una célula para desplazar'),
  ],
};

export const MORE_LANG_FOCI: Focus[] = [
  LANG_TRIAD_PAIRS,
  LANG_INTERVALOS,
  LANG_PENTATONICAS,
  LANG_BLUES,
  LANG_TRITONO,
  LANG_MODOS,
  LANG_MOTIVOS,
  LANG_OUTSIDE,
  LANG_DESPLAZAMIENTO,
];
