/**
 * Focos del mes. En vez de rotar todo cada día, se eligen al comienzo del mes un foco de técnica, uno de lenguaje y un
 * tema de repertorio, y se trabajan a fondo: cada foco es un recorrido de 4 semanas, con 3 tareas por semana que se
 * alternan (cada una se hace dos veces: la segunda, un poco más exigente).
 *
 * Los focos de técnica reutilizan los ejercicios de `practice.ts` (que ya traen su explicación y su pentagrama) y les
 * agregan lo que se busca esa semana. Los de lenguaje y el recorrido del repertorio son tareas nuevas; muchas llevan
 * a un ejercicio de Lecciones o al play-along.
 */
import { analyzePc, parseChord, prettyDegree } from '../theory/chords';
import { mod, parseNote, pc } from '../theory/notes';
import * as P from './practice';
import type { PracticeExercise } from './practice';

/** Una tarea del día. `link` admite {k} (tonalidad del día, concierto) y {rep} (el tema de repertorio elegido). */
export interface FocusTask extends PracticeExercise {
  link?: string;
  linkLabel?: string;
}

export interface FocusWeek {
  title: string;
  /** Qué se busca esa semana. */
  goal: string;
  /** Tres tareas que se alternan: sesión 1, 2 y 3 de la semana, y otra vez 1, 2 y 3. */
  tasks: FocusTask[];
}

export interface Focus {
  id: string;
  area: 'tecnica' | 'lenguaje';
  title: string;
  summary: string;
  weeks: FocusWeek[];
}

export const SESSIONS_PER_WEEK = 6;
export const WEEKS = 4;

/** Un ejercicio de `practice.ts` con lo que se busca esa semana (el resto de su explicación queda igual). */
const reuse = (ex: PracticeExercise, week: string): FocusTask => ({ ...ex, goal: `${week} ${ex.goal}` });

const task = (id: string, short: string, goal: string, steps: string[], more: Partial<FocusTask> = {}): FocusTask => ({ id, short, goal, steps, ...more });

// ---------------------------------------------------------------------------------------------------------------
// Técnica (reutiliza los ejercicios existentes)
// ---------------------------------------------------------------------------------------------------------------

const TECH_LONG_ARTIC: Focus = {
  id: 't-largas-artic',
  area: 'tecnica',
  title: 'Nota larga y articulación',
  summary: 'Un sonido abierto, parejo y afinado, y un ataque limpio: la base de todo lo demás.',
  weeks: [
    {
      title: 'Sonido y ataque',
      goal: 'Una nota que empieza sin golpe, se sostiene sin hincharse y termina sin cortarse.',
      tasks: [
        reuse(P.LONG_TONES_LOW, 'Esta semana: el sonido primero, sin apuro.'),
        reuse(P.SOFT_ATTACKS, 'Esta semana: que cada ataque salga sin ruido ni golpe.'),
        reuse(P.BREATH_FLOW, 'Esta semana: el aire es lo que sostiene la nota.'),
      ],
    },
    {
      title: 'Notas largas con dinámica y afinación',
      goal: 'Sostener la afinación y el color mientras cambia el volumen.',
      tasks: [
        reuse(P.LONG_TONES_DYNAMICS, 'Esta semana: ir de pp a ff sin que la nota suba ni baje.'),
        reuse(P.LONG_TONES_FOURTHS, 'Esta semana: cada cuarta afinada contra el afinador.'),
        reuse(P.TECH_ACCENT_LONG, 'Esta semana: atacar con claridad y sostener entera la nota.'),
      ],
    },
    {
      title: 'Articulación',
      goal: 'La lengua es siempre la misma: el aire sigue y la sílaba sólo corta.',
      tasks: [
        reuse(P.TONGUING_REPEATED, 'Esta semana: igualdad entre todas las notas de un grupo.'),
        reuse(P.TECH_DOTTED, 'Esta semana: ritmos con puntillo sin acortar la nota larga.'),
        reuse(P.TECH_SYNCOPATION, 'Esta semana: la nota larga de la síncopa no se hincha.'),
      ],
    },
    {
      title: 'Todo junto, en una escala',
      goal: 'Llevar el sonido y la articulación a una línea corrida.',
      tasks: [
        reuse(P.TECH_THIRDS, 'Esta semana: tocarla con tres articulaciones distintas (ligada, picada, mezcla) y elegir la más pareja.'),
        reuse(P.TECH_SOTTO_VOCE, 'Esta semana: la nota larga con sonido pleno y el arpegio casi susurrado.'),
        reuse(P.TECH_TRIPLETS, 'Esta semana: tresillos parejos, sin acentuar el primero.'),
      ],
    },
  ],
};

const TECH_FLEX: Focus = {
  id: 't-flexibilidad',
  area: 'tecnica',
  title: 'Flexibilidad y ligaduras',
  summary: 'Moverse entre armónicos y entre pistones sin presión y sin cortar el aire.',
  weeks: [
    {
      title: 'Armónicos',
      goal: 'Cambiar de armónico con el aire y el labio, sin apretar.',
      tasks: [
        reuse(P.BUZZ_GLISSANDO, 'Esta semana: el glissando parejo es la base de las ligaduras.'),
        reuse(P.FLEX_HARMONICS, 'Esta semana: lento y suave, la mitad del tempo que creas poder.'),
        reuse(P.LIP_SLURS_POSITIONS, 'Esta semana: pocas posiciones, bien hechas.'),
      ],
    },
    {
      title: 'Más rápido, igual de suave',
      goal: 'Subir la velocidad sin subir la presión.',
      tasks: [
        reuse(P.LIP_SLURS_TRIPLETS, 'Esta semana: si se aprieta, bajá el tempo.'),
        reuse(P.INTERVAL_SLURS, 'Esta semana: octavas y saltos, con el aire constante.'),
        reuse(P.LIP_BENDING, 'Esta semana: flexibilidad fina del labio, sin mover la mandíbula de más.'),
      ],
    },
    {
      title: 'Ligaduras con pistones',
      goal: 'Dedos y aire sincronizados: la nota cambia sin golpe.',
      tasks: [
        reuse(P.SLURRED_SCALE, 'Esta semana: un solo aire de principio a fin.'),
        reuse(P.TECH_VALVE_SLURS, 'Esta semana: que se oiga cada nota, sin arrastres.'),
        reuse(P.TECH_CHROM_LOOP, 'Esta semana: muy suave, muchas vueltas en un aire.'),
      ],
    },
    {
      title: 'Intervalos y precisión',
      goal: 'Llegar a la nota correcta a la primera.',
      tasks: [
        reuse(P.TECH_INTERVALS, 'Esta semana: oír la nota antes de tocarla.'),
        reuse(P.INTERVAL_SLURS, 'Esta semana: octavas ligadas con la afinación exacta.'),
        reuse(P.TECH_VALVE_SLURS, 'Esta semana: más rápido que en la semana 3, con la misma limpieza.'),
      ],
    },
  ],
};

const TECH_SCALES: Focus = {
  id: 't-escalas-arpegios',
  area: 'tecnica',
  title: 'Escalas y arpegios limpios',
  summary: 'Dedos y lengua sincronizados, con la misma limpieza en las doce tonalidades.',
  weeks: [
    {
      title: 'Base diatónica',
      goal: 'Escala mayor y su arpegio, sin tropiezos.',
      tasks: [
        reuse(P.SLURRED_SCALE, 'Esta semana: sin prisa y sin errores.'),
        reuse(P.TECH_THIRDS, 'Esta semana: a negra = 100 y sin tropezar.'),
        reuse(P.TECH_SEVENTHS, 'Esta semana: cada arpegio completo antes de pasar al siguiente.'),
      ],
    },
    {
      title: 'Otras escalas del jazz',
      goal: 'Menor melódica, blues y bebop como parte de la mano.',
      tasks: [
        reuse(P.TECH_MELODIC_MINOR, 'Esta semana: oír cómo cambia el color respecto de la mayor.'),
        reuse(P.TECH_BLUES, 'Esta semana: con swing, no recto.'),
        reuse(P.TECH_BEBOP, 'Esta semana: la nota de paso cae siempre en el contratiempo.'),
      ],
    },
    {
      title: 'Cromatismo y velocidad',
      goal: 'Tocar rápido sin perder la limpieza.',
      tasks: [
        reuse(P.TECH_CHROMATIC, 'Esta semana: el metrónomo en 2 y 4, siempre.'),
        reuse(P.TECH_TRIPLETS, 'Esta semana: tresillos parejos hasta negra = 100.'),
        reuse(P.TECH_DIM7, 'Esta semana: el arpegio disminuido en las cuatro posiciones.'),
      ],
    },
    {
      title: 'Resistencia y cierre',
      goal: 'Aguantar un rato largo sin perder el sonido.',
      tasks: [
        reuse(P.TECH_ENDURANCE, 'Esta semana: muy suave, en un solo aire.'),
        reuse(P.TECH_CLOSINGS, 'Esta semana: terminar cada frase con la nota final sostenida.'),
        reuse(P.TECH_SEVENTHS, 'Esta semana: repasá todas las tonalidades de la semana 1 más rápido.'),
      ],
    },
  ],
};

const TECH_HIGH: Focus = {
  id: 't-registro-resistencia',
  area: 'tecnica',
  title: 'Registro agudo y resistencia',
  summary: 'Llegar arriba con aire y sin presión, y aguantar toda la sesión.',
  weeks: [
    {
      title: 'Aire y registro grave',
      goal: 'Un sonido lleno abajo es lo que después sostiene el agudo.',
      tasks: [
        reuse(P.BREATH_FLOW, 'Esta semana: aire constante, sin hombros.'),
        reuse(P.LONG_TONES_LOW, 'Esta semana: las notas graves, con cuerpo.'),
        reuse(P.BUZZ_GLISSANDO, 'Esta semana: glissando a la boquilla, hasta donde llegue suave.'),
      ],
    },
    {
      title: 'Subir de a poco',
      goal: 'Ganar un semitono por vez, sin forzar.',
      tasks: [
        reuse(P.HIGH_SOFT, 'Esta semana: pocos minutos, siempre suave y con descanso.'),
        reuse(P.INTERVAL_SLURS, 'Esta semana: el salto hacia arriba con el mismo aire.'),
        reuse(P.FLEX_HARMONICS, 'Esta semana: armónicos agudos sólo si salen sin presión.'),
      ],
    },
    {
      title: 'Resistencia',
      goal: 'Mantener la calidad cuando pasa el tiempo.',
      tasks: [
        reuse(P.TECH_ENDURANCE, 'Esta semana: muy suave, el sonido manda.'),
        reuse(P.TECH_CHROM_LOOP, 'Esta semana: pocas notas, muchas veces, sin tensión.'),
        reuse(P.LONG_TONES_DYNAMICS, 'Esta semana: el pianissimo agudo es lo más difícil: cuidalo.'),
      ],
    },
    {
      title: 'En una frase',
      goal: 'Usar el registro dentro de la música.',
      tasks: [
        reuse(P.TECH_INTERVALS, 'Esta semana: intervalos grandes con el ataque limpio.'),
        reuse(P.TECH_CLOSINGS, 'Esta semana: frases que llegan arriba y se acomodan.'),
        reuse(P.HIGH_SOFT, 'Esta semana: la nota más alta de la semana 2, en la mitad del tiempo de descanso.'),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------------------------------------------
// Lenguaje
// ---------------------------------------------------------------------------------------------------------------

/** Qué tríadas mayores contiene cada acorde y qué grados son (se verifica con un test contra la teoría). */
export const TRIAD_FACTS: { chord: string; triads: { root: string; degrees: string }[] }[] = [
  { chord: 'Cmaj7', triads: [{ root: 'C', degrees: '1-3-5' }, { root: 'G', degrees: '5-7-9' }] },
  { chord: 'Dm7', triads: [{ root: 'F', degrees: '♭3-5-♭7' }, { root: 'C', degrees: '♭7-9-11' }] },
  { chord: 'G7', triads: [{ root: 'G', degrees: '1-3-5' }, { root: 'F', degrees: '♭7-9-11' }] },
];

/** Grados (como se muestran) de la tríada mayor de raíz `root` sobre el acorde `chord`. */
export function triadDegrees(chord: string, root: string): string {
  const c = parseChord(chord);
  const r = pc(parseNote(root));
  return [0, 4, 7].map((i) => prettyDegree(analyzePc(c, mod(r + i, 12)).degree)).join('-');
}

const triadList = TRIAD_FACTS.map((f) => `${f.chord}: ${f.triads.map((t) => `${t.root} mayor (${t.degrees})`).join(' y ')}`);

const LANG_TRIADS: Focus = {
  id: 'l-triadas-mayores',
  area: 'lenguaje',
  title: 'Tríadas mayores',
  summary: 'La tríada mayor como ladrillo: en las doce tonalidades, dentro de cada acorde y en frases.',
  weeks: [
    {
      title: 'La tríada en los doce tonos',
      goal: 'Que la forma 1-3-5 y sus inversiones salgan solas en cualquier tonalidad.',
      tasks: [
        reuse(P.TECH_TRIADS, 'Esta semana: la tonalidad del día, en tres posiciones.'),
        task(
          'foco-tri-ciclo',
          'Tríada mayor de las doce tonalidades en el ciclo de cuartas (C, F, B♭, E♭…), una por compás.',
          'Encadenar las doce tríadas sin pensar en cada una.',
          [
            'Con el metrónomo en 70, tocá la tríada en posición fundamental, subiendo y bajando, en negras.',
            'Pasá a la siguiente del ciclo de cuartas sin parar: C, F, B♭, E♭, A♭, D♭, G♭, B, E, A, D, G.',
            'Si una tonalidad se traba, anotala: es la que vas a repetir mañana.',
            'Segunda vez: empezá cada tríada en una inversión distinta.',
          ],
          { bpm: 70, minutes: 6 },
        ),
        task(
          'foco-tri-oido',
          'Cantá la tríada y tocala: la nota se oye antes de salir.',
          'Que el oído guíe a los dedos.',
          [
            'Cantá (o silbá) 1-3-5 de la tonalidad del día, despacio y afinado.',
            'Tocala en la trompeta y compará: la afinación cantada y tocada tiene que coincidir.',
            'Cantá la tríada y, sin tocar, nombrá la inversión que vas a tocar; después tocala.',
            'Repetí en tres tonalidades más.',
          ],
          { minutes: 5 },
        ),
      ],
    },
    {
      title: 'Las tríadas que ya están dentro de cada acorde',
      goal: 'Reconocer qué tríadas mayores caben en un maj7, un m7 y un dominante, y qué color da cada una.',
      tasks: [
        task(
          'foco-tri-mapa',
          'En el ii–V–I de la tonalidad del día, tocá cada tríada de la tabla como nota larga y escuchá su color.',
          'Ver qué tríadas viven dentro de cada acorde.',
          [
            `La tabla (en Do, se traduce a tu tonalidad al practicar): ${triadList.join('; ')}.`,
            'Con el play-along, tocá la primera tríada de cada acorde en redondas y escuchá cómo suena sobre el acorde.',
            'Repetí con la segunda tríada de cada acorde: cambia el color, no las notas del acorde.',
            'Anotá cuál te gustó más sobre cada acorde.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
        task(
          'foco-tri-negras',
          'Tríadas de la tabla en negras, subiendo y bajando, sobre cada acorde del ii–V–I.',
          'Cambiar de tríada al cambiar de acorde, sin perder el pulso.',
          [
            'En el play-along a negra = 80, tocá la tríada sobre cada acorde: una vez subiendo y una bajando.',
            'En el cambio de acorde, buscá la nota más cercana de la tríada nueva (no saltes).',
            'Probá con la otra tríada de cada acorde.',
            'Subí a negra = 96 sólo si no se ensucia.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I', bpm: 80 },
        ),
        task(
          'foco-tri-inversiones',
          'Elegí una tríada por acorde y tocala en corcheas arrancando en distinta nota (inversión).',
          'Que la tríada sea una línea, no un salto de tres notas.',
          [
            'Sobre cada acorde elegí una tríada de la tabla.',
            'Tocala en corcheas, subiendo y bajando, empezando por la 3ª de la tríada.',
            'Repetí empezando por la 5ª, y después por la fundamental.',
            'Unilas: una vuelta por el ii–V–I sin parar.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
      ],
    },
    {
      title: 'Frases con tríadas',
      goal: 'Construir frases de tres y cuatro notas con las tríadas, con ritmo.',
      tasks: [
        task(
          'foco-tri-cells',
          'Tres células con la tríada: 1-3-5-3, 5-3-1-3 y 3-5-1-5, en corcheas, sobre un solo acorde.',
          'Tener tres formas de decir la tríada.',
          [
            'Sobre un acorde mayor (play-along en un solo acorde o el ii–V–I), tocá 1-3-5-3 repetido, en corcheas.',
            'Cambiá a 5-3-1-3 y a 3-5-1-5: mismas notas, otra dirección.',
            'Inventá una cuarta célula tuya con las mismas tres notas.',
            'Tocalas sobre el acorde siguiente, con la tríada que corresponde.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I', bpm: 90 },
        ),
        task(
          'foco-tri-lesson',
          'El ejercicio de pares de tríadas sobre ii–V–I de Lecciones.',
          'Ver dos tríadas juntas: el paso siguiente de usar tríadas.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio sin el play-along.',
            'Después con el play-along a medio tempo, y subí de a 4 bpm.',
            'Marcá la tonalidad como dominada sólo cuando salga limpia dos veces seguidas.',
          ],
          { link: '#/lecciones/triad-pairs?k={k}&ex=1', linkLabel: 'Abrir el ejercicio' },
        ),
        task(
          'foco-tri-ritmo',
          'La misma tríada con tres ritmos: corcheas, síncopa y tresillo.',
          'Que la tríada tenga ritmo: lo que la hace sonar a frase.',
          [
            'Sobre un acorde, tocá 1-3-5 en corcheas parejas.',
            'Repetí con la síncopa: corchea-negra-corchea.',
            'Repetí en tresillos: 1-3-5 como un solo grupo.',
            'Combiná dos ritmos en una misma frase de dos compases.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
      ],
    },
    {
      title: 'Tríadas en el tema',
      goal: 'Usarlas de verdad en el tema del mes.',
      tasks: [
        task(
          'foco-tri-tema1',
          'En el tema del mes, marcá en la grilla una tríada para cada acorde y tocalas en redondas.',
          'Ver la grilla del tema como un mapa de tríadas.',
          [
            'Abrí el tema y, para cada acorde, elegí una tríada de la tabla (la que más te guste).',
            'Con el play-along a medio tempo, tocá la tríada elegida en redondas, acorde por acorde.',
            'Anotá los acordes donde no encontraste una tríada que te guste: son los difíciles.',
          ],
          { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' },
        ),
        task(
          'foco-tri-tema2',
          'Un chorus del tema usando sólo tríadas, con ritmos distintos.',
          'Improvisar con pocas notas y mucho ritmo.',
          [
            'Tocá un chorus entero usando sólo las tríadas que elegiste, sin otras notas.',
            'Variá el ritmo: no repitas el mismo en dos compases seguidos.',
            'Dejá al menos un compás de silencio por frase.',
          ],
          { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' },
        ),
        task(
          'foco-tri-tema3',
          'Grabá un chorus con tríadas y escuchá: ¿se oyen los cambios de acorde?',
          'Comprobar de oído que las tríadas dicen la armonía.',
          [
            'En el play-along, activá "Grabar solo" y tocá un chorus con tríadas.',
            'Escuchalo sin la trompeta en la mano: ¿se oyen los cambios?',
            'Anotá una cosa que repetirías y una que cambiarías.',
          ],
          { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' },
        ),
      ],
    },
  ],
};

/** Tarea que lleva a un ejercicio de una lección. */
const lesson = (id: string, short: string, goal: string, steps: string[], lessonId: string, ex: number): FocusTask =>
  task(id, short, goal, steps, { link: `#/lecciones/${lessonId}?k={k}&ex=${ex}`, linkLabel: 'Abrir el ejercicio' });

const PLAY_ALONG = { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' };

const LANG_GUIDE: Focus = {
  id: 'l-guide-tones',
  area: 'lenguaje',
  title: 'Guide tones (3ª y 7ª)',
  summary: 'La 3ª y la 7ª dicen el acorde: hacerlos sonar en lugar de recorrer notas.',
  weeks: [
    {
      title: 'Oírlos y tocarlos en redondas',
      goal: 'Reconocer la 3ª y la 7ª de cada acorde.',
      tasks: [
        lesson('foco-gt-1', 'Guide tones en redondas sobre Rhythm changes, a medio tempo.', 'Línea de guide tones, una nota por acorde.', ['Tocá el ejercicio en redondas, sin adornos.', 'Cantá la línea antes de tocarla.', 'Con el play-along a medio tempo.'], 'guide-tones', 0),
        task('foco-gt-2', 'Buscá la 3ª y la 7ª de cada acorde del ii–V–I de la tonalidad del día.', 'Saber dónde están sin pensar.', ['Escribí los tres acordes del ii–V–I del día.', 'Marcá la 3ª y la 7ª de cada uno.', 'Tocalos en redondas con el play-along: 3ª, 7ª, 3ª, 7ª.', 'Fijate que la 7ª del acorde baja medio tono a la 3ª del siguiente.'], PLAY_ALONG),
        lesson('foco-gt-3', 'Guide tones en el Bird blues, en redondas.', 'La misma idea sobre otra forma.', ['Tocá el ejercicio a medio tempo.', 'Seguí con la conducción: la nota siguiente es la más cercana.', 'Subí de a 4 bpm.'], 'guide-tones', 2),
      ],
    },
    {
      title: 'Blancas: 3ª → 7ª → 3ª',
      goal: 'Más movimiento con la misma estructura.',
      tasks: [
        lesson('foco-gt-4', '3ª → 7ª → 3ª en blancas, en la cadena mayor–menor.', 'Dos notas por acorde.', ['Tocá el ejercicio a medio tempo.', 'Escuchá cómo la línea baja por grado conjunto.', 'Con el play-along.'], 'guide-tones', 1),
        lesson('foco-gt-5', 'Guide tones en blancas sobre el blues de F.', 'Aplicarlo al blues.', ['Tocá el ejercicio despacio.', 'Cantá la línea mientras suena el play-along.', 'Subí el tempo de a 4.'], 'guide-tones', 3),
        task('foco-gt-6', 'Inventá tu propia línea de guide tones en el ii–V–I: dos notas por compás.', 'Elegir el orden y la octava.', ['Elegí con qué nota empezar (3ª o 7ª).', 'Tocá dos notas por acorde, bajando por grado conjunto.', 'Cambiá la octava de una nota y escuchá la diferencia.', 'Repetí en otra tonalidad.'], PLAY_ALONG),
      ],
    },
    {
      title: 'Ritmo libre sobre guide tones',
      goal: 'Que los guide tones sean el esqueleto de una frase.',
      tasks: [
        task('foco-gt-7', 'Tocá sólo los guide tones, pero con ritmos distintos en cada acorde.', 'Ritmo sobre un esqueleto fijo.', ['En el ii–V–I tocá 3ª y 7ª de cada acorde.', 'Cambiá el ritmo: negras, síncopa, tresillos.', 'Elegí un ritmo para cada acorde y unilos.'], PLAY_ALONG),
        task('foco-gt-8', 'Agregá una nota de paso entre cada par de guide tones.', 'Conectar dos notas con una tercera.', ['Tocá 3ª → nota de paso → 7ª.', 'La nota de paso es de la escala del acorde.', 'Probala ascendente y descendente.'], PLAY_ALONG),
        lesson('foco-gt-9', 'Guide tones en la menor con ii–V a la relativa.', 'Otro color: la menor.', ['Tocá el ejercicio lento.', 'Escuchá el cambio de modo.', 'Marcá la tonalidad cuando salga limpia.'], 'guide-tones', 4),
      ],
    },
    {
      title: 'Guide tones en el tema',
      goal: 'Ver el tema por su esqueleto.',
      tasks: [
        task('foco-gt-10', 'Tocá los guide tones del tema del mes en redondas.', 'Saber el esqueleto del tema.', ['Con el play-along a medio tempo, tocá la 3ª o la 7ª de cada acorde.', 'Elegí siempre la nota más cercana a la anterior.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
        task('foco-gt-11', 'Activá el reto de guide tones del play-along (micrófono) y probá llegar a la 3ª o la 7ª en cada cambio.', 'Comprobar que llegás.', ['Activá el micrófono y el reto en el play-along.', 'Improvisá libre pero cayendo en un guide tone en el tiempo 1 de cada acorde.', 'Mirá cuántos cambios acertaste.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
        task('foco-gt-12', 'Un chorus: guide tones en los tiempos fuertes y lo que quieras entre medio.', 'Libertad con una regla.', ['Una nota guía en el tiempo 1 de cada acorde.', 'Entre medio, escala o arpegio.', 'Grabalo y escuchá.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
      ],
    },
  ],
};

const LANG_ARP: Focus = {
  id: 'l-arpegios',
  area: 'lenguaje',
  title: 'Arpegios de séptima',
  summary: 'Los arpegios de 1-3-5-7 y su extensión a la 9ª como base de las líneas.',
  weeks: [
    {
      title: 'Arpegios 1-3-5-7',
      goal: 'Tocar el arpegio de cada acorde del ii–V–I.',
      tasks: [
        reuse(P.TECH_SEVENTHS, 'Esta semana: cada arpegio completo y limpio.'),
        task('foco-arp-2', 'El arpegio de cada acorde del ii–V–I del día, en negras, subiendo y bajando.', 'Cambiar de arpegio al cambiar de acorde.', ['Con el play-along a negra = 80, tocá 1-3-5-7 de cada acorde.', 'En el cambio, buscá la nota más cercana del arpegio siguiente.', 'Bajando: 7-5-3-1.'], PLAY_ALONG),
        task('foco-arp-3', 'Arpegios en corcheas, arrancando por la 3ª.', 'Salir del patrón fundamental.', ['Tocá 3-5-7-9 de cada acorde (el arpegio desde la 3ª).', 'Compará el color con 1-3-5-7.', 'Subí a negra = 100.'], PLAY_ALONG),
      ],
    },
    {
      title: '1-3-5-7-9',
      goal: 'Agregar la novena y usar el arpegio sobre la forma.',
      tasks: [
        lesson('foco-arp-4', '1-3-5-7-9 sobre ii–V–I por las 12.', 'Arpegio extendido en doce tonalidades.', ['Tocá el ejercicio a medio tempo.', 'Marcá las tonalidades que salgan limpias.'], 'arpeggios', 0),
        lesson('foco-arp-5', '3-5-7-9 en la cadena mayor–menor.', 'Cambiar de modo con arpegios.', ['Tocá el ejercicio lento.', 'Escuchá el cambio de color.'], 'arpeggios', 1),
        lesson('foco-arp-6', 'Arpegios desde la 3ª en el turnaround.', 'Aplicarlo a una forma de cuatro compases.', ['Tocá el ejercicio.', 'Cantá la línea.'], 'arpeggios', 4),
      ],
    },
    {
      title: 'Ritmo y dirección',
      goal: 'Que el arpegio no suene a ejercicio.',
      tasks: [
        task('foco-arp-7', 'Un arpegio por acorde, cada uno con un ritmo distinto.', 'Ritmo sobre arpegio.', ['Corcheas, tresillos y síncopa, uno por acorde.', 'Variá el ritmo cada vuelta.'], PLAY_ALONG),
        task('foco-arp-8', 'Arpegio ascendente y vuelta por la escala.', 'Combinar arpegio y escala.', ['Subí por el arpegio y bajá por la escala del acorde.', 'Probá al revés.', 'Cuidá la nota donde cambia de uno a otro.'], PLAY_ALONG),
        task('foco-arp-9', 'Empezá el arpegio en el contratiempo.', 'Cambiar el lugar de la frase.', ['Tocá el mismo arpegio empezando en el "y" del 1.', 'Probá en el "y" del 2.', 'Elegí el que más swing tenga.'], PLAY_ALONG),
      ],
    },
    {
      title: 'Arpegios en el tema',
      goal: 'Llevarlos al tema del mes.',
      tasks: [
        task('foco-arp-10', 'Tocá el arpegio de cada acorde del tema en redondas.', 'Mapa de arpegios del tema.', ['Con el play-along a medio tempo, 1-3-5-7 de cada acorde.', 'Anotá los acordes donde dudaste.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
        task('foco-arp-11', 'Un chorus con arpegios en negras y corcheas.', 'Pasar de ejercicio a frase.', ['Un arpegio por compás.', 'Variá el sentido y el ritmo.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
        task('foco-arp-12', 'Un chorus mezclando arpegios y escalas, grabado.', 'Elegir entre arpegio y escala.', ['Arpegio en el tiempo 1, escala entre medio.', 'Grabalo y escuchá.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
      ],
    },
  ],
};

const LANG_APPROACH: Focus = {
  id: 'l-aproximaciones',
  area: 'lenguaje',
  title: 'Aproximaciones y enclosures',
  summary: 'Llegar a una nota del acorde desde arriba y desde abajo, como lo hace el bebop.',
  weeks: [
    {
      title: 'Una nota por semitono',
      goal: 'La aproximación cromática simple.',
      tasks: [
        task('foco-apr-1', 'Una aproximación por semitono desde abajo a cada nota del acorde (en un solo acorde).', 'Aprender el gesto más simple.', ['Elegí un acorde mayor.', 'Tocá un semitono debajo de la 3ª y llegá a la 3ª.', 'Repetí con la fundamental, la 5ª y la 7ª.', 'Hacelo desde arriba.'], PLAY_ALONG),
        task('foco-apr-2', 'La misma aproximación en el ii–V–I, una nota por acorde.', 'Usarla en una progresión.', ['Elegí una nota de cada acorde.', 'Aproximala por semitono.', 'Subí el tempo de a 4.'], PLAY_ALONG),
        task('foco-apr-3', 'Elegí la aproximación y cantala antes de tocarla.', 'Que el oído la reconozca.', ['Cantá la nota de llegada.', 'Cantá la aproximación.', 'Tocala sobre el acorde y comprobá si coincide con lo que cantaste.'], PLAY_ALONG),
      ],
    },
    {
      title: 'Enclosures',
      goal: 'Rodear la nota de llegada, por arriba y por abajo.',
      tasks: [
        lesson('foco-apr-4', 'Enclosure a la 3ª: ii–V–I por las 12.', 'El enclosure más usado.', ['Leé "cómo está armada esta línea".', 'Tocala lenta, sin play-along.', 'Después con el play-along.'], 'enclosures', 0),
        lesson('foco-apr-5', 'Enclosure en el turnaround.', 'Cuatro compases con enclosures.', ['Tocá el ejercicio a medio tempo.', 'Subí el tempo de a 4.'], 'enclosures', 1),
        task('foco-apr-6', 'Armá tus propios enclosures: nota de arriba, nota de abajo y llegada.', 'Entender el gesto de adentro.', ['Elegí una nota de llegada.', 'Tocá un semitono arriba, un semitono abajo y la nota.', 'Probá con un tono arriba.'], PLAY_ALONG),
      ],
    },
    {
      title: 'Bebop',
      goal: 'Escalas bebop: aproximaciones dentro de la escala.',
      tasks: [
        lesson('foco-apr-7', 'Bebop descendente sobre ii–V–I por las 12.', 'La escala bebop de dominante.', ['Tocá el ejercicio lento.', 'Notá que las notas del acorde caen en los tiempos.'], 'bebop-scales', 0),
        lesson('foco-apr-8', 'Bebop en el blues de F.', 'Aplicarla al blues.', ['Tocá el ejercicio despacio.', 'Subí de a 4 bpm.'], 'bebop-scales', 1),
        task('foco-apr-9', 'Mezclá enclosures y bebop: un compás de cada uno.', 'Elegir entre dos herramientas.', ['Dos compases con enclosures.', 'Dos compases con la escala bebop.', 'Alterná cada dos compases y escuchá cuál suena más natural.'], PLAY_ALONG),
      ],
    },
    {
      title: 'Aproximaciones en el tema',
      goal: 'Llevar el gesto al tema.',
      tasks: [
        task('foco-apr-10', 'Elegí tres acordes del tema y aproximá la 3ª de cada uno.', 'Aplicar el gesto en lugares concretos.', ['Con el play-along a medio tempo, tocá la 3ª con aproximación.', 'Repetilo en tres acordes.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
        task('foco-apr-11', 'Un chorus con una aproximación al comienzo de cada frase.', 'Frases que empiezan con intención.', ['Cada frase arranca con una aproximación a una nota del acorde.', 'Variá la nota de llegada en cada frase para no repetirte.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
        task('foco-apr-12', 'Grabá un chorus con enclosures y escuchá si suenan naturales.', 'Comprobar de oído.', ['Grabá un chorus.', 'Escuchá: ¿se oye la llegada?', 'Anotá una cosa para mañana.'], { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' }),
      ],
    },
  ],
};

export const FOCI: Focus[] = [TECH_LONG_ARTIC, TECH_FLEX, TECH_SCALES, TECH_HIGH, LANG_TRIADS, LANG_GUIDE, LANG_ARP, LANG_APPROACH];
export const TECH_FOCI = FOCI.filter((f) => f.area === 'tecnica');
export const LANG_FOCI = FOCI.filter((f) => f.area === 'lenguaje');
export const focusById = (id: string): Focus | undefined => FOCI.find((f) => f.id === id);

// ---------------------------------------------------------------------------------------------------------------
// Repertorio: el mismo recorrido para cualquier tema
// ---------------------------------------------------------------------------------------------------------------

const REP_LINK = { link: '#/playalong?p={rep}', linkLabel: 'Abrir el tema' };

export const REPERTOIRE_WEEKS = (name: string): FocusWeek[] => [
  {
    title: 'Conocer la forma',
    goal: `Saber de memoria cómo está armado «${name}»: secciones, compases y acordes.`,
    tasks: [
      task('rep-forma', `Seguir la grilla de «${name}» con el play-along, sin tocar.`, 'Ver la forma antes de tocar.', ['Abrí el tema y mirá la grilla: ¿cuántas secciones y cuántos compases?', 'Con el play-along, seguí el compás que suena con el dedo, sin tocar.', 'Decí en voz alta el nombre de cada acorde un compás antes de que llegue.', 'Anotá dónde cambia la armonía de manera inesperada.'], REP_LINK),
      task('rep-raices', 'Las fundamentales de cada acorde en redondas, con el play-along a medio tempo.', 'Saber cuál es la nota base de cada compás.', ['Con el play-along a medio tempo, tocá sólo la fundamental de cada acorde.', 'Subí al tempo del tema cuando no te equivoques.', 'Probalo con los ojos cerrados en una sección.'], { ...REP_LINK, minutes: 8 }),
      task('rep-guide', 'Las 3ªs y 7ªs de cada acorde en blancas.', 'El esqueleto de la armonía.', ['Elegí la 3ª o la 7ª de cada acorde, siempre la más cercana a la anterior.', 'Tocá la línea a medio tempo con el play-along.', 'Subí de a 4 bpm.'], REP_LINK),
    ],
  },
  {
    title: 'La melodía',
    goal: `Tocar la melodía de «${name}» de memoria y en otra tonalidad.`,
    tasks: [
      task('rep-cantar', 'Cantá la melodía (o la que recuerdes) mientras suena el play-along.', 'La melodía tiene que estar en el oído antes que en los dedos.', ['Escuchá la melodía de una grabación tuya, dos veces.', 'Cantala con el play-along sin mirar la partitura.', 'Marcá dónde dudás.'], REP_LINK),
      task('rep-memoria', 'Tocá la melodía de memoria, frase por frase, con el play-along.', 'Pasar de cantarla a tocarla.', ['Empezá con la primera frase de memoria.', 'Agregá una frase por vuelta.', 'Si no tenés la melodía escrita, sacala de oído en Transcribir.'], { ...REP_LINK, link: '#/transcribir' , linkLabel: 'Abrir Transcribir' }),
      task('rep-otra-tonalidad', 'La melodía en otra tonalidad (la del día).', 'Entender la melodía por intervalos, no por teclas.', ['Elegí la tonalidad del día en el play-along.', 'Tocá la melodía de memoria en esa tonalidad.', 'Si te traba, volvé a la original y comparalo.'], { link: '#/playalong?p={rep}&k={k}', linkLabel: 'Abrir el tema en la tonalidad del día' }),
    ],
  },
  {
    title: 'Improvisar con una idea',
    goal: 'Improvisar sobre la forma con pocas ideas y bien desarrolladas.',
    tasks: [
      task('rep-idea', 'Una idea de dos o tres notas, repetida y variada en toda la forma.', 'Una idea es mejor que diez notas sueltas.', ['Inventá una idea de dos o tres notas.', 'Repetila sobre cada acorde: la misma forma, otras notas.', 'Cambiá el ritmo cada cuatro compases.'], REP_LINK),
      task('rep-pregunta', 'Pregunta y respuesta: dos compases de pregunta y dos de respuesta.', 'Frases con forma.', ['Tocá una frase de dos compases (la pregunta).', 'Respondé con otra que termine en una nota del acorde.', 'Dejá aire entre las dos.'], REP_LINK),
      task('rep-guide-libre', 'Improvisá con la regla: guide tone en el tiempo 1 de cada acorde.', 'Una regla que sostiene la libertad.', ['Caé en la 3ª o la 7ª en el primer tiempo de cada acorde.', 'Lo demás es libre.', 'Activá el reto de guide tones para comprobarlo.'], REP_LINK),
    ],
  },
  {
    title: 'Grabar y evaluar',
    goal: 'Escucharte y quedarte con lo que funciona.',
    tasks: [
      task('rep-grabar', 'Grabá dos choruses con el play-along y escuchalos sin la trompeta en la mano.', 'Escucharte como oyente.', ['Activá "Grabar solo" en el play-along y tocá dos choruses.', 'Escuchá la toma sin tocar: ¿se oyen los cambios? ¿hay espacio?', 'Anotá una cosa que cambiarías.'], REP_LINK),
      task('rep-transcribir', 'Transcribí cuatro compases de tu mejor toma.', 'Aprender de lo que salió bien.', ['Elegí los cuatro compases que más te gusten.', 'Guardá la toma en Transcribir y sacalos de oído.', 'Escribilos como frase en Vocabulario.'], { link: '#/transcribir', linkLabel: 'Abrir Transcribir' }),
      task('rep-completo', 'Tocá el tema completo: melodía, un chorus y melodía, sin parar y grabado.', 'Hacerlo entero, como en un concierto.', ['Melodía, un chorus improvisado y la melodía otra vez.', 'Sin parar aunque te equivoques.', 'Escuchalo y anotá lo que más avanzó este mes.'], REP_LINK),
    ],
  },
];
