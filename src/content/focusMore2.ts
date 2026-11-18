/**
 * Otra tanda de focos para elegir al empezar el mes. Técnica (reutilizan los ejercicios de `practice.ts`): dinámica y
 * control del aire, digitación y velocidad, boquilla y buzzing, escalas y colores del jazz. Lenguaje: escalas bebop,
 * cambios de Coltrane, Rhythm changes, ii–V–i menor y dominantes con tensiones, escalas simétricas, turnarounds,
 * swing y articulación, aprender de grabaciones y vals y 6/8.
 *
 * Las tablas que citan los textos (`BEBOP_FACTS`, `COLTRANE_FACTS`, `BRIDGE_FACTS`, `MINOR_FACTS`, `SYMMETRIC_FACTS`,
 * `TURNAROUND_FACTS`) se comprueban en los tests contra la teoría.
 */
import type { Focus, FocusTask } from './focus';
import { lesson, PA, task, temaWeek } from './focusShapes';
import * as P from './practice';
import type { PracticeExercise } from './practice';

const reuse = (ex: PracticeExercise, week: string): FocusTask => ({ ...ex, goal: `${week} ${ex.goal}` });

// ---------------------------------------------------------------------------------------------------------------
// Tablas (verificadas en los tests)
// ---------------------------------------------------------------------------------------------------------------

/** Escalas bebop: la escala, su raíz y sus notas (en Do o Sol). */
export const BEBOP_FACTS: { chord: string; root: string; scale: string; name: string; notes: string[]; passing: string }[] = [
  { chord: 'G7', root: 'G', scale: 'bebopDominant', name: 'Sol bebop dominante', notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F', 'F♯'], passing: 'F♯ (la 7ª mayor, entre la ♭7 y la fundamental)' },
  { chord: 'Cmaj7', root: 'C', scale: 'bebopMajor', name: 'Do bebop mayor', notes: ['C', 'D', 'E', 'F', 'G', 'G♯', 'A', 'B'], passing: 'G♯ (la ♯5, entre la 5ª y la 6ª)' },
];

/** Los cambios de Coltrane de la app: centros tonales a una tercera mayor de distancia y su dominante. */
export const COLTRANE_FACTS = {
  centers: ['C', 'A♭', 'E'],
  dominants: [
    { dominant: 'E♭7', target: 'A♭' },
    { dominant: 'B7', target: 'E' },
    { dominant: 'G7', target: 'C' },
  ],
};

/** El puente de Rhythm changes (en B♭): un ciclo de dominantes, cada uno la quinta del siguiente. */
export const BRIDGE_FACTS = { chords: ['D7', 'G7', 'C7', 'F7'], roots: ['D', 'G', 'C', 'F'] };

/** ii–V–i menor en Do: la escala de cada acorde y la tríada de ♭II sobre el dominante. */
export const MINOR_FACTS = {
  scales: [
    { chord: 'Dm7♭5', root: 'D', scale: 'locrian2', name: 'Re locrio ♮2', notes: ['D', 'E', 'F', 'G', 'A♭', 'B♭', 'C'] },
    { chord: 'G7alt', root: 'G', scale: 'altered', name: 'Sol alterado', notes: ['G', 'A♭', 'B♭', 'B', 'D♭', 'E♭', 'F'] },
    { chord: 'Cm', root: 'C', scale: 'melodicMinor', name: 'Do menor melódica', notes: ['C', 'D', 'E♭', 'F', 'G', 'A', 'B'] },
  ],
  /** Tríada de D♭ mayor sobre G7: D♭ = ♯11 (♭5), F = ♭7, A♭ = ♭9. */
  bIITriad: { chord: 'G7', root: 'D♭', degrees: '♯11-♭7-♭9' },
};

/** Simétricas sobre un dominante en Do: la 7ª disminuida desde la 3ª, y las escalas. */
export const SYMMETRIC_FACTS = {
  dim7: { chord: 'G7', root: 'B', degrees: '3-5-♭7-♭9', notes: 'Si-Re-Fa-La♭' },
  halfWhole: { root: 'G', scale: 'halfWhole', name: 'Sol disminuida semitono-tono', notes: ['G', 'A♭', 'B♭', 'B', 'D♭', 'D', 'E', 'F'] },
  wholeTone: { root: 'G', scale: 'wholeTone', name: 'Sol tonos enteros', notes: ['G', 'A', 'B', 'D♭', 'E♭', 'F'] },
};

/** Turnaround I–vi–ii–V en Do: las fundamentales (clases de altura). */
export const TURNAROUND_FACTS = { chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'], roots: ['C', 'A', 'D', 'G'] };

// ---------------------------------------------------------------------------------------------------------------
// Técnica
// ---------------------------------------------------------------------------------------------------------------

const TECH_DINAMICA: Focus = {
  id: 't-dinamica-aire',
  area: 'tecnica',
  title: 'Dinámica y control del aire',
  summary: 'Un volumen que se mueve sin que la afinación ni el timbre se muevan: soporte, ataques suaves y frases largas.',
  weeks: [
    {
      title: 'Aire y soporte',
      goal: 'Un flujo de aire parejo que sostiene la nota sin esfuerzo en el cuello.',
      tasks: [
        reuse(P.BREATH_FLOW, 'Esta semana: el aire es lo que sostiene la nota.'),
        reuse(P.LONG_TONES_LOW, 'Esta semana: el sonido primero, sin apuro.'),
        reuse(P.SOFT_ATTACKS, 'Esta semana: que cada ataque salga sin ruido ni golpe.'),
      ],
    },
    {
      title: 'Dinámica',
      goal: 'Cambiar de volumen sin cambiar de afinación.',
      tasks: [
        reuse(P.LONG_TONES_DYNAMICS, 'Esta semana: ir de pp a ff sin que la nota suba ni baje.'),
        reuse(P.TECH_ACCENT_LONG, 'Esta semana: atacar con claridad y sostener entera la nota.'),
        reuse(P.HIGH_SOFT, 'Esta semana: suave y afinado en el agudo.'),
      ],
    },
    {
      title: 'Suave y largo',
      goal: 'Sostener el control cuando el pasaje es largo y silencioso.',
      tasks: [
        reuse(P.TECH_SOTTO_VOCE, 'Esta semana: la nota larga con sonido pleno y el arpegio casi susurrado.'),
        reuse(P.TECH_ENDURANCE, 'Esta semana: muy suave, en un solo aire.'),
        reuse(P.TECH_CHROM_LOOP, 'Esta semana: muy suave, en un solo aire.'),
      ],
    },
    {
      title: 'Frases',
      goal: 'Llevar el control del aire a frases con forma.',
      tasks: [
        reuse(P.BUZZ_PHRASE, 'Esta semana: la frase completa con la boquilla sola.'),
        reuse(P.TECH_CLOSINGS, 'Esta semana: terminar cada frase con la nota final sostenida.'),
        reuse(P.LONG_TONES_FOURTHS, 'Esta semana: cada cuarta afinada contra el afinador.'),
      ],
    },
  ],
};

const TECH_DEDOS: Focus = {
  id: 't-digitacion-velocidad',
  area: 'tecnica',
  title: 'Digitación y velocidad',
  summary: 'Dedos parejos y relajados que llegan a tempos más altos sin tensión: escalas, terceras, arpegios y cromática.',
  weeks: [
    {
      title: 'Base lenta y limpia',
      goal: 'Que cada nota salga limpia antes de subir el tempo.',
      tasks: [
        reuse(P.SLURRED_SCALE, 'Esta semana: sin prisa y sin errores.'),
        reuse(P.TECH_THIRDS, 'Esta semana: a negra = 100 y sin tropezar.'),
        reuse(P.TECH_SEVENTHS, 'Esta semana: cada arpegio completo antes de pasar al siguiente.'),
      ],
    },
    {
      title: 'Cromática y tresillos',
      goal: 'Dedos parejos en pasajes que no son de escala.',
      tasks: [
        reuse(P.TECH_CHROMATIC, 'Esta semana: el metrónomo en 2 y 4, siempre.'),
        reuse(P.TECH_TRIPLETS, 'Esta semana: tresillos parejos hasta negra = 100.'),
        reuse(P.TECH_VALVE_SLURS, 'Esta semana: la nota cambia sin golpe, dedos y aire a la vez.'),
      ],
    },
    {
      title: 'Arpegios y escalas del jazz',
      goal: 'Llevar la velocidad a las formas que más se usan al improvisar.',
      tasks: [
        reuse(P.TECH_DIM7, 'Esta semana: el arpegio disminuido en las cuatro posiciones.'),
        reuse(P.TECH_MELODIC_MINOR, 'Esta semana: oír cómo cambia el color respecto de la mayor.'),
        reuse(P.TECH_BEBOP, 'Esta semana: la nota de paso cae siempre en el contratiempo.'),
      ],
    },
    {
      title: 'Subir el tempo con control',
      goal: 'Más rápido sin tensión: si se aprieta, se baja el tempo.',
      tasks: [
        reuse(P.TECH_THIRDS, 'Esta semana: subí 4 bpm sólo si sale parejo.'),
        reuse(P.TECH_TRIPLETS, 'Esta semana: tresillos a un tempo más alto, sin acentuar.'),
        reuse(P.TECH_ENDURANCE, 'Esta semana: la resistencia también es dedos relajados.'),
      ],
    },
  ],
};

const TECH_BOQUILLA: Focus = {
  id: 't-boquilla-buzzing',
  area: 'tecnica',
  title: 'Boquilla y buzzing',
  summary: 'Trabajar la vibración del labio con la boquilla sola: glissandos, frases y flexibilidad entre armónicos.',
  weeks: [
    {
      title: 'Buzzing lento',
      goal: 'Un zumbido centrado y parejo con la boquilla sola.',
      tasks: [
        reuse(P.BUZZ_GLISSANDO, 'Esta semana: el glissando parejo es la base de todo.'),
        reuse(P.BREATH_FLOW, 'Esta semana: aire constante, sin presión.'),
        reuse(P.LONG_TONES_LOW, 'Esta semana: pasá del buzzing a la trompeta sin cambiar el sonido.'),
      ],
    },
    {
      title: 'Frases con la boquilla',
      goal: 'Que la boquilla cante una melodía.',
      tasks: [
        reuse(P.BUZZ_PHRASE, 'Esta semana: elegí una frase corta y repetila en tres tonalidades.'),
        reuse(P.BUZZ_GLISSANDO, 'Esta semana: glissandos de una octava sin escalones.'),
        reuse(P.LIP_BENDING, 'Esta semana: flexibilidad fina del labio.'),
      ],
    },
    {
      title: 'Armónicos',
      goal: 'Cambiar de armónico con el aire y el labio, sin apretar.',
      tasks: [
        reuse(P.FLEX_HARMONICS, 'Esta semana: lento y suave, la mitad del tempo que creas poder.'),
        reuse(P.LIP_SLURS_POSITIONS, 'Esta semana: pocas posiciones, bien hechas.'),
        reuse(P.LIP_BENDING, 'Esta semana: bajar y subir un semitono sin mover la mandíbula.'),
      ],
    },
    {
      title: 'Más rápido, igual de suave',
      goal: 'Subir la velocidad sin subir la presión.',
      tasks: [
        reuse(P.LIP_SLURS_TRIPLETS, 'Esta semana: si se aprieta, bajá el tempo.'),
        reuse(P.INTERVAL_SLURS, 'Esta semana: octavas y saltos, con el aire constante.'),
        reuse(P.BUZZ_PHRASE, 'Esta semana: una frase de tu transcripción, con la boquilla sola.'),
      ],
    },
  ],
};

const TECH_COLORES: Focus = {
  id: 't-colores-jazz',
  area: 'tecnica',
  title: 'Escalas y colores del jazz',
  summary: 'Las escalas que más se usan en jazz (menor melódica, blues, bebop, disminuida) tocadas con soltura y con swing.',
  weeks: [
    {
      title: 'Menor melódica y blues',
      goal: 'Dos escalas que cambian el color de lo que tocás.',
      tasks: [
        reuse(P.TECH_MELODIC_MINOR, 'Esta semana: oír cómo cambia el color respecto de la mayor.'),
        reuse(P.TECH_BLUES, 'Esta semana: con swing, no recto.'),
        reuse(P.TECH_THIRDS, 'Esta semana: la escala mayor en terceras como comparación.'),
      ],
    },
    {
      title: 'Bebop',
      goal: 'La nota de paso cae en el contratiempo y el acorde en el tiempo.',
      tasks: [
        reuse(P.TECH_BEBOP, 'Esta semana: la nota de paso cae siempre en el contratiempo.'),
        reuse(P.TECH_SEVENTHS, 'Esta semana: los arpegios de séptima como esqueleto de la escala bebop.'),
        reuse(P.TECH_CLOSINGS, 'Esta semana: terminar cada frase con la nota final sostenida.'),
      ],
    },
    {
      title: 'Disminuida y cromática',
      goal: 'Formas simétricas y cromáticas con control.',
      tasks: [
        reuse(P.TECH_DIM7, 'Esta semana: el arpegio disminuido en las cuatro posiciones.'),
        reuse(P.TECH_CHROMATIC, 'Esta semana: el metrónomo en 2 y 4, siempre.'),
        reuse(P.TECH_TRIPLETS, 'Esta semana: tresillos parejos, sin acentuar el primero.'),
      ],
    },
    {
      title: 'Con ritmo',
      goal: 'Llevar las escalas a un ritmo de jazz.',
      tasks: [
        reuse(P.TECH_SYNCOPATION, 'Esta semana: la nota larga de la síncopa no se hincha.'),
        reuse(P.TECH_DOTTED, 'Esta semana: ritmos con puntillo sin acortar la nota larga.'),
        reuse(P.TECH_BLUES, 'Esta semana: blues con síncopa y swing.'),
      ],
    },
  ],
};

export const MORE_TECH_FOCI: Focus[] = [TECH_DINAMICA, TECH_DEDOS, TECH_BOQUILLA, TECH_COLORES];

// ---------------------------------------------------------------------------------------------------------------
// Lenguaje
// ---------------------------------------------------------------------------------------------------------------

const minorScales = MINOR_FACTS.scales.map((s) => `${s.chord}: ${s.name} (${s.notes.join(' ')})`).join('; ');

const LANG_BEBOP: Focus = {
  id: 'l-escalas-bebop',
  area: 'lenguaje',
  title: 'Escalas bebop',
  summary: 'La escala con una nota de paso cromática para que las notas del acorde caigan en los tiempos fuertes: dominante y mayor.',
  weeks: [
    {
      title: 'La escala y su nota de paso',
      goal: 'Tener las dos escalas bebop en los dedos y saber dónde está la nota de paso.',
      tasks: [
        task(
          'foco-beb-escala',
          'Escala bebop dominante: subí y bajá dos octavas, con swing.',
          'Que la escala de ocho notas salga sola.',
          [
            `La escala (en Sol): ${BEBOP_FACTS[0].notes.join(' ')}.`,
            'Con el metrónomo en 80, tocala bajando desde la fundamental, en corcheas: las notas del acorde caen en los tiempos.',
            `Marcá la nota de paso: ${BEBOP_FACTS[0].passing}.`,
          ],
          { bpm: 80, minutes: 6 },
        ),
        task(
          'foco-beb-mayor',
          'Escala bebop mayor: subí y bajá dos octavas, con swing.',
          'Tener la escala sobre el acorde de tónica.',
          [
            `La escala (en Do): ${BEBOP_FACTS[1].notes.join(' ')}.`,
            'Con el metrónomo en 80, tocala bajando desde la fundamental, en corcheas.',
            `Marcá la nota de paso: ${BEBOP_FACTS[1].passing}.`,
          ],
          { bpm: 80, minutes: 6 },
        ),
        task(
          'foco-beb-oido',
          'Cantá la escala bebop y notá cómo la nota de paso se oye como un cromatismo.',
          'Que el oído reconozca la nota de paso.',
          [
            'Cantá (o silbá) la escala dominante bajando, despacio.',
            'Tocala y comprobá la afinación con el afinador.',
            'Cantá sólo las notas del acorde y después la escala completa.',
          ],
          { minutes: 5, link: '#/escucha', linkLabel: 'Abrir afinador' },
        ),
      ],
    },
    {
      title: 'Los tiempos fuertes',
      goal: 'Que el acorde caiga en los tiempos y la nota de paso en los contratiempos.',
      tasks: [
        lesson(
          'foco-beb-lesson1',
          'Bebop descendente sobre ii–V–I por las 12.',
          'La escala bebop de dominante aplicada en las doce tonalidades.',
          [
            'Tocá el ejercicio lento.',
            'Notá que las notas del acorde caen en los tiempos.',
            'Subí el tempo de a 4 bpm.',
          ],
          'bebop-scales',
          0,
        ),
        task(
          'foco-beb-empezar',
          'Empezá la escala en cada nota del acorde (1, 3, 5, ♭7) y seguí bajando.',
          'Que la escala no empiece siempre en la fundamental.',
          [
            'Sobre G7, empezá la bajada en la ♭7 (F), después en la 5ª (D), en la 3ª (B) y en la fundamental.',
            'Fijate que en todos los casos las notas del acorde caen en los tiempos.',
            'Hacelo en otras dos tonalidades.',
          ],
          PA,
        ),
        task(
          'foco-beb-cambio',
          'Cambiá de dirección en medio de la escala sin perder el tiempo.',
          'Poder invertir la línea sin romper la regla.',
          [
            'Bajá la escala bebop y, a mitad, subí un arpegio del acorde.',
            'Volvé a bajar por la escala.',
            'Comprobá que las notas del acorde siguen cayendo en los tiempos.',
          ],
          PA,
        ),
      ],
    },
    {
      title: 'En progresiones',
      goal: 'Usar la escala bebop sobre progresiones conocidas.',
      tasks: [
        lesson(
          'foco-beb-blues',
          'Bebop en el blues de F.',
          'La escala bebop en un blues.',
          [
            'Tocá el ejercicio despacio.',
            'Subí de a 4 bpm.',
            'Marcá la tonalidad cuando salga limpia.',
          ],
          'bebop-scales',
          1,
        ),
        lesson(
          'foco-beb-cadena',
          'Bebop en la cadena mayor–menor.',
          'La escala bebop cambiando de modo.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Notá cuándo usás la escala dominante y cuándo la mayor.',
            'Subí de a 4 bpm.',
          ],
          'bebop-scales',
          2,
        ),
        lesson(
          'foco-beb-turnaround',
          'Bebop en el turnaround.',
          'La escala bebop en cuatro compases.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Cantá la línea.',
            'Subí de a 4 bpm.',
          ],
          'bebop-scales',
          3,
        ),
      ],
    },
    temaWeek('beb', 'Escalas bebop', 'la escala bebop de cada acorde'),
  ],
};

const LANG_COLTRANE: Focus = {
  id: 'l-cambios-coltrane',
  area: 'lenguaje',
  title: 'Cambios de Coltrane',
  summary: 'Tres centros tonales a una tercera mayor de distancia, cada uno con su dominante: aprender el mapa y tocarlo con células.',
  weeks: [
    {
      title: 'El mapa',
      goal: 'Saber qué centros tonales hay y cómo se llega a cada uno.',
      tasks: [
        task(
          'foco-col-mapa',
          'Escribí los tres centros tonales y el dominante que lleva a cada uno.',
          'Entender la forma antes de tocarla.',
          [
            `Los centros (en Do): ${COLTRANE_FACTS.centers.join(', ')}: cada uno una tercera mayor del anterior.`,
            `Cada centro tiene su dominante: ${COLTRANE_FACTS.dominants.map((x) => `${x.dominant} → ${x.target}`).join('; ')}.`,
            'Tocá la fundamental de cada acorde de la progresión en redondas con el play-along.',
          ],
          { link: '#/playalong?p=coltrane&k={k}', linkLabel: 'Abrir los cambios de Coltrane', minutes: 6 },
        ),
        task(
          'foco-col-notas',
          'Tocá la 3ª de cada acorde en redondas, siguiendo la progresión.',
          'Oír el esqueleto.',
          [
            'Con el play-along lento, tocá la 3ª de cada acorde como nota larga.',
            'Elegí siempre la nota más cercana a la anterior.',
            'Cantá la línea que resulta.',
          ],
          { link: '#/playalong?p=coltrane&k={k}', linkLabel: 'Abrir los cambios de Coltrane', minutes: 6 },
        ),
        task(
          'foco-col-oido',
          'Escuchá la progresión y marcá con un golpe cada cambio de centro tonal.',
          'Reconocer de oído los saltos de tercera mayor.',
          [
            'Con el play-along, golpeá con el dedo cada vez que cambia el centro tonal.',
            'Cantá la fundamental de cada centro.',
            'Probalo sin mirar la grilla.',
          ],
          { link: '#/playalong?p=coltrane&k={k}', linkLabel: 'Abrir los cambios de Coltrane', minutes: 5 },
        ),
      ],
    },
    {
      title: 'Células sobre los cambios',
      goal: 'Una célula fija que viaja por cada acorde evita pensar escalas a tempo rápido.',
      tasks: [
        lesson(
          'foco-col-lesson1',
          '1-2-3-5 sobre los cambios de Coltrane.',
          'Aplicar la célula 1-2-3-5 sobre cada acorde.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala muy lento.',
            'Con el play-along a medio tempo.',
            'Subí de a 4 bpm.',
          ],
          'digital',
          1,
        ),
        lesson(
          'foco-col-lesson2',
          '3-5-7-9 en los cambios de Coltrane.',
          'Arpegios desde la 3ª sobre cada acorde.',
          [
            'Tocá el ejercicio lento.',
            'Seguí con la conducción: la nota siguiente es la más cercana.',
            'Subí de a 4 bpm.',
          ],
          'arpeggios',
          2,
        ),
        task(
          'foco-col-un-centro',
          'Practicá un solo centro tonal (por ejemplo Do) con su ii–V–I y con la célula 1-2-3-5.',
          'Dominar una pieza antes de unir las tres.',
          [
            'Tocá el ii–V–I de Do a tempo lento con la célula 1-2-3-5.',
            'Pasá al centro siguiente sin parar y fijate dónde se traba.',
            'Repetí hasta que las tres piezas salgan.',
          ],
          { link: '#/playalong?p=coltrane&k={k}', linkLabel: 'Abrir los cambios de Coltrane' },
        ),
      ],
    },
    {
      title: 'Subir el tempo',
      goal: 'Tocar los tres centros a un tempo creciente.',
      tasks: [
        task(
          'foco-col-tempo',
          'Los tres centros con la célula 1-2-3-5, subiendo 4 bpm sólo cuando sale limpio.',
          'Llegar a tempos más rápidos sin perder claridad.',
          [
            'Empezá a negra = 70 con la célula 1-2-3-5 sobre cada acorde.',
            'Subí 4 bpm cada dos pasadas limpias.',
            'Anotá el tempo al que se ensucia: ese es tu techo de hoy.',
          ],
          { link: '#/playalong?p=coltrane&k={k}', linkLabel: 'Abrir los cambios de Coltrane', bpm: 70 },
        ),
        task(
          'foco-col-escala',
          'Elegí la escala de cada acorde y compará con la célula.',
          'Decidir qué usar a cada tempo.',
          [
            'Tocá la escala del acorde en cada compás, en corcheas.',
            'Repetí con la célula 1-2-3-5.',
            'Anotá qué te sale mejor a cada tempo.',
          ],
          { link: '#/playalong?p=coltrane&k={k}', linkLabel: 'Abrir los cambios de Coltrane' },
        ),
        task(
          'foco-col-frase',
          'Una frase de dos compases que cruce un cambio de centro tonal sin parar.',
          'Que el salto de centro no corte la línea.',
          [
            'Tocá una frase que termine en la 3ª del acorde siguiente.',
            'Seguí sin pausa en el nuevo centro con la misma célula.',
            'Repetí en otros dos cambios de centro.',
          ],
          { link: '#/playalong?p=coltrane&k={k}', linkLabel: 'Abrir los cambios de Coltrane' },
        ),
      ],
    },
    temaWeek('col', 'Cambios de Coltrane', 'una célula'),
  ],
};

const LANG_RHYTHM: Focus = {
  id: 'l-rhythm-changes',
  area: 'lenguaje',
  title: 'Rhythm changes (el puente en cadena)',
  summary: 'La forma de 32 compases AABA: el A con sus turnarounds y el puente como cadena de dominantes (D7 G7 C7 F7).',
  weeks: [
    {
      title: 'La forma',
      goal: 'Saber de memoria dónde está cada parte.',
      tasks: [
        task(
          'foco-rhy-forma',
          'Escribí la forma AABA y marcá el puente.',
          'Tener la forma en la cabeza antes de tocarla.',
          [
            'Son 32 compases: A (8), A (8), puente (8), A (8).',
            `El puente (en B♭) es un ciclo de dominantes: ${BRIDGE_FACTS.chords.join(' – ')}, dos compases cada uno.`,
            'Cantá la fundamental de cada acorde del puente con el play-along.',
          ],
          { link: '#/playalong?p=rhythm&k={k}', linkLabel: 'Abrir Rhythm changes', minutes: 6 },
        ),
        task(
          'foco-rhy-puente',
          'Tocá la fundamental de cada dominante del puente en redondas y fijate en la cadena.',
          'Ver que cada dominante es la quinta del siguiente.',
          [
            'D7 resuelve a G7, G7 a C7 y C7 a F7: cada una sube una cuarta.',
            'Con el play-along, tocá la fundamental de cada uno en redondas.',
            'Después la 3ª de cada uno.',
          ],
          { link: '#/playalong?p=rhythm&k={k}', linkLabel: 'Abrir Rhythm changes', minutes: 6 },
        ),
        task(
          'foco-rhy-oido',
          'Escuchá el A y el puente: ¿cuándo cambia el carácter?',
          'Reconocer de oído el puente.',
          [
            'Con el play-along, golpeá el dedo en cada compás del puente.',
            'Cantá la línea de bajo.',
            'Anotá en qué compás sentís que "vuelve a casa".',
          ],
          { link: '#/playalong?p=rhythm&k={k}', linkLabel: 'Abrir Rhythm changes', minutes: 5 },
        ),
      ],
    },
    {
      title: 'El A',
      goal: 'Moverse por los turnarounds del A con guide tones y arpegios.',
      tasks: [
        lesson(
          'foco-rhy-gt',
          'Guide tones sobre Rhythm changes, a medio tempo.',
          'El esqueleto de la forma.',
          [
            'Tocá el ejercicio en redondas, sin adornos.',
            'Cantá la línea antes de tocarla.',
            'Con el play-along a medio tempo.',
          ],
          'guide-tones',
          0,
        ),
        lesson(
          'foco-rhy-enc',
          'Enclosures sobre Rhythm changes.',
          'Aproximaciones en la forma.',
          [
            'Leé "cómo está armada esta línea" y tocala lenta, sin play-along.',
            'Después con el play-along.',
            'Subí el tempo de a 4 bpm.',
          ],
          'enclosures',
          2,
        ),
        lesson(
          'foco-rhy-dig',
          'Digitales sobre Rhythm changes.',
          'La célula 1-2-3-5 a tempo rápido.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Subí de a 4 bpm.',
            'Marcá la tonalidad cuando salga limpia.',
          ],
          'digital',
          4,
        ),
      ],
    },
    {
      title: 'El puente',
      goal: 'Tocar la cadena de dominantes con las notas guía y con frases.',
      tasks: [
        task(
          'foco-rhy-puente-gt',
          'En el puente, tocá la 3ª de cada dominante y bajá a la 7ª: la línea baja por semitono.',
          'Ver la línea guía de la cadena.',
          [
            'Sobre D7 tocá la 3ª (F♯) y la ♭7 (C).',
            'Esa ♭7 (C) baja un semitono a la 3ª de G7 (B). Seguí así por la cadena.',
            'Hacelo con el play-along a medio tempo.',
          ],
          { link: '#/playalong?p=rhythm&k={k}', linkLabel: 'Abrir Rhythm changes' },
        ),
        task(
          'foco-rhy-puente-arp',
          'Un arpegio de dominante por compás en el puente, subiendo y bajando.',
          'Seguir la cadena con arpegios.',
          [
            'Con el play-along, tocá el arpegio 1-3-5-♭7 de cada dominante.',
            'Alterná subiendo y bajando para que la línea sea continua.',
            'Subí de a 4 bpm sólo si no se ensucia.',
          ],
          { link: '#/playalong?p=rhythm&k={k}', linkLabel: 'Abrir Rhythm changes' },
        ),
        task(
          'foco-rhy-puente-frase',
          'Una frase de dos compases por dominante con una nota larga en el cambio.',
          'Que el puente sea música y no ejercicio.',
          [
            'Tocá una frase de seis notas sobre D7 y cerrala en una nota larga.',
            'Repetí sobre G7, C7 y F7.',
            'Dejá un silencio antes del cambio.',
          ],
          { link: '#/playalong?p=rhythm&k={k}', linkLabel: 'Abrir Rhythm changes' },
        ),
      ],
    },
    temaWeek('rhy', 'Rhythm changes', 'una frase'),
  ],
};

const LANG_MENOR: Focus = {
  id: 'l-ii-v-i-menor',
  area: 'lenguaje',
  title: 'ii–V–i menor y dominante con tensiones',
  summary: 'El ii–V–i menor completo: la escala de cada acorde, el dominante alterado y la tríada de ♭II.',
  weeks: [
    {
      title: 'La escala de cada acorde',
      goal: 'Tener las escalas del ii–V–i menor en los dedos.',
      tasks: [
        task(
          'foco-men-escalas',
          'Escala de cada acorde del ii–V–i menor, un compás por acorde.',
          'Seguir la armonía con las escalas.',
          [
            `La tabla (en Do): ${minorScales}.`,
            'Con el play-along a negra = 80, tocá la escala de cada acorde subiendo y bajando.',
            'En el cambio, buscá la nota más cercana.',
          ],
          { link: '#/playalong?p=ii-v-i-minor&k={k}', linkLabel: 'Abrir el ii–V–i menor', bpm: 80 },
        ),
        task(
          'foco-men-m7b5',
          'El arpegio del m7♭5 (D-F-A♭-C) y su diferencia con el m7.',
          'Oír la ♭5 que distingue al acorde.',
          [
            'Tocá D-F-A♭-C subiendo y bajando, en negras.',
            'Tocá Dm7 (D-F-A-C) y compará: sólo cambia la quinta.',
            'Resolvé a la 3ª del G7.',
          ],
          { link: '#/playalong?p=ii-v-i-minor&k={k}', linkLabel: 'Abrir el ii–V–i menor' },
        ),
        task(
          'foco-men-oido',
          'Cantá la ♭5 del m7♭5 y la ♭9 del dominante: son las dos notas que "tuercen" el acorde.',
          'Oír las tensiones.',
          [
            'Cantá la ♭5 (A♭) sobre Dm7♭5 y tocala.',
            'Cantá la ♭9 (A♭) sobre G7 y tocala: es la misma nota con otra función.',
            'Resolvé la ♭9 a la fundamental (G) o a la 5ª del acorde siguiente.',
          ],
          { link: '#/playalong?p=ii-v-i-minor&k={k}', linkLabel: 'Abrir el ii–V–i menor' },
        ),
      ],
    },
    {
      title: 'El dominante con tensiones',
      goal: 'Usar ♭9, ♯9, ♯11 y ♭13 sobre el dominante antes de resolver.',
      tasks: [
        task(
          'foco-men-alt',
          'La escala alterada sobre G7: G-A♭-B♭-B-D♭-E♭-F, y su resolución.',
          'Tener el color más tenso del dominante.',
          [
            'Tocá la escala subiendo y bajando sobre G7.',
            'Notá que son las notas de la menor melódica de A♭.',
            'Resolvela a la 3ª o la 5ª del Cm.',
          ],
          { link: '#/playalong?p=ii-v-i-minor&k={k}', linkLabel: 'Abrir el ii–V–i menor' },
        ),
        task(
          'foco-men-triada',
          `La tríada de D♭ mayor sobre G7 (${MINOR_FACTS.bIITriad.degrees}): una estructura simple para sonar «alterado».`,
          'Tocar el color alterado con una forma sencilla.',
          [
            'Sobre G7, tocá D♭-F-A♭ subiendo y bajando, en negras.',
            `Esas notas son la ♯11 (la ♭5), la ♭7 y la ♭9 del G7: ${MINOR_FACTS.bIITriad.degrees}.`,
            'Resolvé a la 3ª del Cm (E♭).',
          ],
          { link: '#/playalong?p=ii-v-i-minor&k={k}', linkLabel: 'Abrir el ii–V–i menor' },
        ),
        lesson(
          'foco-men-lesson1',
          'La pentatónica de ♭5 sobre el alterado.',
          'Otra forma simple de tocar el dominante tenso.',
          [
            'Abrí el ejercicio, leé "cómo está armada esta línea" y tocala despacio.',
            'Después con el play-along a medio tempo.',
            'Marcá la tonalidad cuando salga limpia.',
          ],
          'minor-251',
          1,
        ),
      ],
    },
    {
      title: 'Líneas en el ii–V–i menor',
      goal: 'Frases completas con arpegios, bebop y pares de tríadas.',
      tasks: [
        lesson(
          'foco-men-lesson2',
          'Pares de tríadas sobre ii–V–i menor por las 12.',
          'Pares de tríadas en la menor.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Marcá las tonalidades que salgan limpias.',
            'Subí de a 4 bpm.',
          ],
          'minor-251',
          0,
        ),
        lesson(
          'foco-men-lesson3',
          'Arpegios desde la 3ª en el ii–V–i menor.',
          'Arpegios en la menor.',
          [
            'Tocá el ejercicio lento.',
            'Seguí con la conducción: la nota siguiente es la más cercana.',
            'Subí de a 4 bpm.',
          ],
          'minor-251',
          2,
        ),
        lesson(
          'foco-men-lesson4',
          'Bebop en el ii–V–i menor.',
          'La escala bebop en la menor.',
          [
            'Tocá el ejercicio despacio.',
            'Notá que las notas del acorde caen en los tiempos.',
            'Subí de a 4 bpm.',
          ],
          'minor-251',
          3,
        ),
      ],
    },
    temaWeek('men', 'ii–V–i menor', 'una línea sobre el dominante'),
  ],
};

const LANG_SIMETRICAS: Focus = {
  id: 'l-escalas-simetricas',
  area: 'lenguaje',
  title: 'Escalas simétricas (disminuida y tonos enteros)',
  summary: 'La 7ª disminuida, la escala disminuida semitono-tono y la de tonos enteros sobre el dominante: formas que se repiten cada tres o cuatro semitonos.',
  weeks: [
    {
      title: 'La 7ª disminuida',
      goal: 'Tocar el arpegio disminuido sobre el dominante y entender por qué sirve.',
      tasks: [
        task(
          'foco-sim-dim7',
          `El arpegio de Si disminuido (${SYMMETRIC_FACTS.dim7.notes}) sobre G7: ${SYMMETRIC_FACTS.dim7.degrees}.`,
          'Ver el arpegio disminuido como un G7♭9 sin fundamental.',
          [
            `Tocá ${SYMMETRIC_FACTS.dim7.notes} subiendo y bajando sobre G7, en negras.`,
            `Son la 3ª, la 5ª, la ♭7 y la ♭9 del acorde: ${SYMMETRIC_FACTS.dim7.degrees}.`,
            'Resolvé a una nota de Cmaj7.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
        task(
          'foco-sim-cuatro',
          'Los cuatro arpegios disminuidos que existen: cada uno se repite cada tres semitonos.',
          'Ver la simetría.',
          [
            'Tocá el arpegio disminuido de Si y subilo una tercera menor: queda igual (con otro nombre).',
            'Hay sólo tres arpegios disminuidos distintos en las doce notas.',
            'Practicá los tres con el metrónomo en 70.',
          ],
          { bpm: 70, minutes: 6 },
        ),
        task(
          'foco-sim-oido',
          'Cantá el arpegio disminuido y tocalo: ¿qué sensación da?',
          'Reconocer el sonido del dominante con ♭9.',
          [
            'Cantá (o silbá) las cuatro notas del arpegio.',
            'Tocalas sobre el G7 del play-along.',
            'Anotá cómo suena: ¿tenso, inestable, listo para resolver?',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I', minutes: 5 },
        ),
      ],
    },
    {
      title: 'Disminuida semitono-tono',
      goal: 'La escala de ocho notas para el dominante con ♭9 y ♯9.',
      tasks: [
        task(
          'foco-sim-escala',
          'La escala disminuida semitono-tono sobre G7: G-A♭-B♭-B-D♭-D-E-F.',
          'Tener la escala en los dedos.',
          [
            'Tocala subiendo y bajando, alternando semitono y tono.',
            'Notá que se repite cada tres semitonos: empieza igual desde G, B♭, D♭ y E.',
            'Usala sobre el G7 del play-along.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
        task(
          'foco-sim-patron',
          'Un patrón de cuatro notas dentro de la escala, repetido tres semitonos más arriba.',
          'Aprovechar la simetría.',
          [
            'Tocá cuatro notas seguidas de la escala (por ejemplo G-A♭-B♭-B).',
            'Repetí el patrón empezando en B♭, después en D♭ y en E: es el mismo dibujo.',
            'Usalo como una frase de dos compases sobre el dominante.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
        task(
          'foco-sim-ritmo',
          'La misma escala con tres ritmos: corcheas, síncopa y tresillo.',
          'Que la escala tenga ritmo.',
          [
            'Tocá la escala en corcheas parejas.',
            'Repetí con la síncopa y después en tresillos.',
            'Combiná dos ritmos en una frase.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
      ],
    },
    {
      title: 'Tonos enteros',
      goal: 'La escala de seis notas para el dominante con ♯11 y ♯5.',
      tasks: [
        task(
          'foco-sim-tonos',
          'La escala de tonos enteros sobre G7: G-A-B-C♯-D♯-F.',
          'Oír el color flotante.',
          [
            'Tocá G-A-B-C♯-D♯-F subiendo y bajando, en negras.',
            'Todos los intervalos son de un tono: no hay una nota que "resuelva".',
            'Usala como nota larga sobre G7 y resolvé al Cmaj7.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
        task(
          'foco-sim-dos',
          'Sólo existen dos escalas de tonos enteros: tocalas y notá que no hay una tercera.',
          'Ver la simetría.',
          [
            'Tocá la de Sol (G-A-B-C♯-D♯-F) y la de Sol♭ (G♭-A♭-B♭-C-D-E).',
            'Notá que cada una usa seis de las doce notas y que entre las dos están todas.',
            'Practicá las dos en tres tonalidades.',
          ],
          { minutes: 6 },
        ),
        task(
          'foco-sim-elegir',
          'Sobre un mismo G7, tocá tres colores: mixolidia, disminuida y tonos enteros.',
          'Elegir el color del dominante.',
          [
            'Dejá sonar G7 con el play-along y tocá una frase con la mixolidia.',
            'Repetila con la disminuida y con la de tonos enteros.',
            'Anotá cuál te gustó más y por qué.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
      ],
    },
    temaWeek('sim', 'Escalas simétricas', 'un dominante donde usar una simétrica'),
  ],
};

const LANG_TURNAROUND: Focus = {
  id: 'l-turnarounds',
  area: 'lenguaje',
  title: 'Turnarounds (I–vi–ii–V)',
  summary: 'Los cuatro compases que cierran casi todas las formas: guide tones, arpegios y frases que vuelven a la tónica.',
  weeks: [
    {
      title: 'La cadena',
      goal: 'Saber qué acordes tiene y por qué se encadenan.',
      tasks: [
        task(
          'foco-tur-cadena',
          'Escribí el turnaround I–vi–ii–V y tocá la fundamental de cada acorde en redondas.',
          'Ver la cadena de cuartas.',
          [
            `En Do: ${TURNAROUND_FACTS.chords.join(' – ')}, un compás cada uno.`,
            'Del vi al ii y del ii al V cada fundamental sube una cuarta; el V vuelve al I.',
            'Tocá la fundamental de cada acorde con el play-along.',
          ],
          { link: '#/playalong?p=turnaround&k={k}', linkLabel: 'Abrir el turnaround', minutes: 6 },
        ),
        task(
          'foco-tur-3ras',
          'Tocá la 3ª de cada acorde del turnaround, eligiendo siempre la nota más cercana.',
          'Oír el esqueleto.',
          [
            'Con el play-along, tocá la 3ª de cada acorde como nota larga.',
            'Cantá la línea que resulta.',
            'Repetí con la 7ª.',
          ],
          { link: '#/playalong?p=turnaround&k={k}', linkLabel: 'Abrir el turnaround', minutes: 6 },
        ),
        task(
          'foco-tur-oido',
          'Escuchá la cadena y cantá la fundamental de cada acorde.',
          'Reconocer de oído el turnaround.',
          [
            'Con el play-along, cantá la fundamental de cada acorde.',
            'Golpeá el dedo en cada cambio.',
            'Probalo con los ojos cerrados.',
          ],
          { link: '#/playalong?p=turnaround&k={k}', linkLabel: 'Abrir el turnaround', minutes: 5 },
        ),
      ],
    },
    {
      title: 'Líneas sobre el turnaround',
      goal: 'Tocar cuatro compases seguidos con una idea.',
      tasks: [
        lesson(
          'foco-tur-lesson1',
          'Arpegios desde la 3ª en el turnaround.',
          'Arpegios en cuatro compases.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Cantá la línea.',
            'Subí de a 4 bpm.',
          ],
          'arpeggios',
          4,
        ),
        lesson(
          'foco-tur-lesson2',
          'Enclosure sobre el turnaround.',
          'Aproximar la 3ª en cada acorde.',
          [
            'Tocá el ejercicio a medio tempo.',
            'Subí el tempo de a 4 bpm.',
            'Marcá la tonalidad cuando salga limpia.',
          ],
          'enclosures',
          1,
        ),
        lesson(
          'foco-tur-lesson3',
          'Bebop sobre el turnaround.',
          'La escala bebop en cuatro compases.',
          [
            'Tocá el ejercicio despacio.',
            'Notá que las notas del acorde caen en los tiempos.',
            'Subí de a 4 bpm.',
          ],
          'bebop-scales',
          3,
        ),
      ],
    },
    {
      title: 'Variantes',
      goal: 'Cambiar el turnaround sin perder el rumbo.',
      tasks: [
        task(
          'foco-tur-sust',
          'Cambiá el V por su sustitución tritonal (D♭7 en lugar de G7) en el turnaround.',
          'Oír la variante.',
          [
            'Tocá el turnaround con el V normal.',
            'Tocalo otra vez con la sustitución tritonal en lugar de G7.',
            'Anotá qué cambia en la línea guía.',
          ],
          { link: '#/playalong?p=turnaround&k={k}', linkLabel: 'Abrir el turnaround' },
        ),
        task(
          'foco-tur-ritmo',
          'Un compás por acorde con un ritmo fijo (por ejemplo síncopa) en los cuatro.',
          'Que el ritmo una la frase.',
          [
            'Elegí un ritmo de un compás (corchea-negra-corchea y dos corcheas).',
            'Tocalo sobre cada acorde con las notas del acorde.',
            'Cerrá en una nota larga al volver a la tónica.',
          ],
          { link: '#/playalong?p=turnaround&k={k}', linkLabel: 'Abrir el turnaround' },
        ),
        task(
          'foco-tur-frase',
          'Una frase de cuatro compases con un principio, un desarrollo y un cierre.',
          'Que el turnaround sea música.',
          [
            'Compás 1: una idea corta. Compases 2 y 3: variala sobre los acordes nuevos.',
            'Compás 4: cerrá con una nota larga que resuelva en la tónica.',
            'Grabalo y escuchá si se entiende.',
          ],
          { link: '#/playalong?p=turnaround&k={k}', linkLabel: 'Abrir el turnaround' },
        ),
      ],
    },
    temaWeek('tur', 'Turnarounds', 'una línea para el turnaround'),
  ],
};

const LANG_SWING: Focus = {
  id: 'l-swing-articulacion',
  area: 'lenguaje',
  title: 'Swing y articulación jazzística',
  summary: 'Cómo se articulan las corcheas con swing: acentos en el contratiempo, notas fantasma y una lengua que no pesa.',
  weeks: [
    {
      title: 'El swing de las corcheas',
      goal: 'Que la corchea larga y la corta suenen como un tresillo sin escribirlo así.',
      tasks: [
        task(
          'foco-swi-tresillo',
          'Tocá una escala en tresillos y después en corcheas con swing: deben sonar igual.',
          'Sentir que el swing es un tresillo "flojo".',
          [
            'Con el metrónomo en 100, tocá la escala en tresillos de corchea.',
            'Repetila en corcheas, tocando la primera como las dos primeras de un tresillo y la segunda como la tercera.',
            'Comprobá que suenan casi igual.',
          ],
          { bpm: 100, minutes: 6 },
        ),
        task(
          'foco-swi-contra',
          'Acentuá los contratiempos (el "y") de una escala en corcheas, con el metrónomo en 2 y 4.',
          'Que el acento caiga en el lugar del jazz.',
          [
            'Con el metrónomo en 2 y 4, tocá la escala en corcheas con swing.',
            'Acentuá apenas las corcheas que caen entre los pulsos.',
            'Escuchá cómo el acento empuja hacia adelante.',
          ],
          { bpm: 90, minutes: 6 },
        ),
        task(
          'foco-swi-lengua',
          'Lengua suave: "du-da" en las corcheas, con la sílaba corta en el contratiempo.',
          'Una articulación que no pese.',
          [
            'Tocá una escala articulando "du-da-du-da": "du" en el pulso y "da" más suave en el contratiempo.',
            'Probalo ligando de a dos notas y picando sólo el contratiempo.',
            'Compará con tocar todo con la misma sílaba.',
          ],
          { minutes: 5 },
        ),
      ],
    },
    {
      title: 'Acentos y notas fantasma',
      goal: 'Dar relieve a una línea con acentos y notas casi mudas.',
      tasks: [
        task(
          'foco-swi-fantasma',
          'Notas fantasma: tocá una frase y dejá varias notas casi sin sonido, apenas insinuadas.',
          'Que no todas las notas pesen lo mismo.',
          [
            'Elegí una frase de ocho notas y tocala con todas iguales.',
            'Repetila con dos o tres notas casi mudas, sin parar el aire.',
            'Escuchá cómo la frase gana relieve.',
          ],
          { ...PA, minutes: 6 },
        ),
        task(
          'foco-swi-acentos',
          'Acentuá el contratiempo de una célula 1-2-3-5 y compará con acentuar el pulso.',
          'Ver cómo cambia el carácter.',
          [
            'Tocá 1-2-3-5 acentuando la 1ª y la 3ª.',
            'Repetí acentuando la 2ª y la 4ª.',
            'Elegí cuál suena más a jazz y por qué.',
          ],
          PA,
        ),
        task(
          'foco-swi-final',
          'Cierre de frase: terminá la frase con una nota corta y suave (como un "doo") en lugar de una larga.',
          'Variar los finales.',
          [
            'Tocá una frase que termine en una nota larga.',
            'Repetila terminando en una nota corta y suave justo antes del pulso.',
            'Alterná los dos finales en un chorus.',
          ],
          PA,
        ),
      ],
    },
    {
      title: 'Todo junto',
      goal: 'Aplicar el swing y la articulación a una línea con armonía.',
      tasks: [
        task(
          'foco-swi-iivi',
          'Una línea de ocho compases sobre el ii–V–I con swing, acentos y una nota fantasma por frase.',
          'Que la articulación sea parte de la frase.',
          [
            'Elegí una línea de la tarea de bebop o de arpegios.',
            'Tocala con el swing y los acentos de las tareas anteriores.',
            'Grabala y escuchá si suena a jazz.',
          ],
          PA,
        ),
        task(
          'foco-swi-tempos',
          'La misma línea a tres tempos: lento, medio y rápido, con el mismo swing.',
          'Que el swing se adapte al tempo.',
          [
            'Tocá la línea a negra = 80, 120 y 160.',
            'En el tempo rápido, el swing se aplana: dejá las corcheas casi parejas.',
            'Anotá en qué tempo el swing se siente más natural.',
          ],
          PA,
        ),
        task(
          'foco-swi-escuchar',
          'Escuchá un solo de tu disco preferido y marcá dónde acentúa el contratiempo.',
          'Reconocer la articulación en una grabación real.',
          [
            'Elegí un solo corto que te guste y escuchalo tres veces.',
            'Marcá con el dedo el contratiempo y notá dónde cae el acento.',
            'Imitá dos compases con tu trompeta.',
          ],
          { link: '#/transcribir', linkLabel: 'Abrir Transcribir' },
        ),
      ],
    },
    temaWeek('swi', 'Swing y articulación', 'una línea con swing'),
  ],
};

const LANG_GRABACIONES: Focus = {
  id: 'l-aprender-de-grabaciones',
  area: 'lenguaje',
  title: 'Aprender de grabaciones (transcribir)',
  summary: 'Elegir un solo corto de un disco tuyo, escucharlo despacio y aprender las frases que te gustan con la pantalla de Transcribir.',
  weeks: [
    {
      title: 'Elegir y escuchar',
      goal: 'Elegir un solo corto y escucharlo hasta poder cantarlo.',
      tasks: [
        task(
          'foco-gra-elegir',
          'Elegí un solo corto (de 8 a 16 compases) de un disco tuyo y cargalo en Transcribir.',
          'Tener el material.',
          [
            'Elegí un solo que te guste y que no sea demasiado rápido.',
            'Cargá el audio en la pantalla de Transcribir (el archivo queda sólo en tu navegador).',
            'Marcá el tramo que vas a aprender.',
          ],
          { link: '#/transcribir', linkLabel: 'Abrir Transcribir', minutes: 8 },
        ),
        task(
          'foco-gra-cantar',
          'Escuchá el tramo tres veces y cantalo sin mirar.',
          'Que el oído lo tenga antes que los dedos.',
          [
            'Escuchá el tramo completo tres veces.',
            'Cantalo (o silbalo) con el audio.',
            'Cantalo sin el audio y compará.',
          ],
          { link: '#/transcribir', linkLabel: 'Abrir Transcribir', minutes: 6 },
        ),
        task(
          'foco-gra-lento',
          'Bajá la velocidad al 50 % y repetí el tramo en loop.',
          'Poder oír cada nota.',
          [
            'En Transcribir, poné la velocidad al 50 % y activá el loop del tramo.',
            'Escuchalo cinco veces seguidas.',
            'Anotá las notas que ya reconocés.',
          ],
          { link: '#/transcribir', linkLabel: 'Abrir Transcribir', minutes: 6 },
        ),
      ],
    },
    {
      title: 'Sacar las notas',
      goal: 'Tocar el tramo nota por nota.',
      tasks: [
        task(
          'foco-gra-nota',
          'Sacá las primeras cuatro notas con la trompeta y comprobalas con el audio.',
          'Empezar de a poco.',
          [
            'Escuchá la primera frase en loop y buscá la primera nota en la trompeta.',
            'Seguí con las cuatro primeras notas y compará con el audio.',
            'Anotalas con su función sobre el acorde (3ª, 5ª, 9ª...).',
          ],
          { link: '#/transcribir', linkLabel: 'Abrir Transcribir' },
        ),
        task(
          'foco-gra-frase',
          'Sacá la frase entera y tocala sobre el audio al 70 %.',
          'Tocar con el solista.',
          [
            'Completá la frase y tocala sobre el audio.',
            'Ajustá el ritmo: el ritmo es la mitad de la frase.',
            'Subí la velocidad al 80 % y al 100 % cuando salga.',
          ],
          { link: '#/transcribir', linkLabel: 'Abrir Transcribir' },
        ),
        task(
          'foco-gra-funcion',
          'Analizá la frase: ¿qué notas del acorde usa y dónde cae?',
          'Entender qué hace que funcione.',
          [
            'Marcá, en cada nota, si es del acorde, una tensión o una nota de paso.',
            'Marcá en qué tiempo cae cada nota fuerte.',
            'Anotá lo que más te llame la atención.',
          ],
          { minutes: 6 },
        ),
      ],
    },
    {
      title: 'Hacerla tuya',
      goal: 'Usar lo aprendido en tus propias frases.',
      tasks: [
        task(
          'foco-gra-transponer',
          'Tocá la frase en otras tres tonalidades.',
          'Que no dependa de una tonalidad.',
          [
            'Tocá la frase en la tonalidad del día.',
            'Repetila una cuarta más arriba y una cuarta más abajo.',
            'Marcá dónde se traba.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
        task(
          'foco-gra-variar',
          'Variá la frase: cambiá el ritmo, la dirección o la última nota.',
          'Pasar de copiar a inventar.',
          [
            'Tocá la frase con otro ritmo.',
            'Tocala en la dirección contraria.',
            'Cambiá la última nota por otra del acorde.',
          ],
          { link: '#/playalong?p=ii-v-i&k={k}', linkLabel: 'Abrir el ii–V–I' },
        ),
        task(
          'foco-gra-guardar',
          'Guardá la frase en tu vocabulario para repasarla.',
          'Armar tu propio repertorio de frases.',
          [
            'Abrí Vocabulario y cargá la frase con tu nombre.',
            'Anotá en qué acorde la usás.',
            'Repasala una vez por semana.',
          ],
          { minutes: 5 },
        ),
      ],
    },
    temaWeek('gra', 'Frases transcriptas', 'una frase que aprendiste'),
  ],
};

const LANG_VALS: Focus = {
  id: 'l-vals-seis-octavos',
  area: 'lenguaje',
  title: 'Improvisar en 3/4 y 6/8',
  summary: 'Fraseo en compases ternarios: sentir el pulso de tres y el de seis octavos, y llenar el compás sin escribir en 4/4.',
  weeks: [
    {
      title: 'El pulso de tres',
      goal: 'Sentir el compás de 3/4 con la acentuación en el tiempo 1.',
      tasks: [
        task(
          'foco-val-contar',
          'Contá en voz alta "1-2-3" mientras tocás una escala en negras, acentuando el 1.',
          'Sentir el compás.',
          [
            'Con el metrónomo en 100, tocá una escala en negras contando "1-2-3".',
            'Acentuá el 1 de cada compás.',
            'Repetí en corcheas, contando "1 y 2 y 3 y".',
          ],
          { link: '#/playalong?p=vals-ii-v-i&k={k}', linkLabel: 'Abrir el vals', bpm: 100, minutes: 6 },
        ),
        task(
          'foco-val-notas',
          'Tocá la fundamental en el 1 de cada compás y llená el resto con notas del acorde.',
          'Dar firmeza al compás.',
          [
            'Con el play-along, tocá la fundamental en el 1.',
            'Llená los tiempos 2 y 3 con la 3ª y la 5ª.',
            'Cambiá el orden de las notas en cada compás.',
          ],
          { link: '#/playalong?p=vals-ii-v-i&k={k}', linkLabel: 'Abrir el vals', minutes: 6 },
        ),
        task(
          'foco-val-oido',
          'Escuchá el play-along y marcá el 1 con el pie.',
          'No perderse en el compás.',
          [
            'Con el play-along, marcá el 1 con el pie.',
            'Tocá una nota larga en el 1 de cada compás.',
            'Sumá una frase corta en los tiempos 2 y 3.',
          ],
          { link: '#/playalong?p=vals-ii-v-i&k={k}', linkLabel: 'Abrir el vals', minutes: 5 },
        ),
      ],
    },
    {
      title: 'Frases en tres',
      goal: 'Frases que cruzan el compás y no siempre empiezan en el 1.',
      tasks: [
        task(
          'foco-val-frase',
          'Frases de dos compases que arrancan en el tiempo 2 o 3 y cierran en el 1.',
          'Que la frase no sea cuadrada.',
          [
            'Tocá una frase de cuatro notas que empiece en el tiempo 3.',
            'Seguí por el compás siguiente y cerrá en el 1.',
            'Repetí con una frase que empiece en el 2.',
          ],
          { link: '#/playalong?p=vals-ii-v-i&k={k}', linkLabel: 'Abrir el vals' },
        ),
        task(
          'foco-val-dos',
          'Hemiola: tocá grupos de dos negras sobre el compás de tres (dos compases de 3/4 se oyen como tres de 2).',
          'Un recurso rítmico típico del vals.',
          [
            'Tocá dos compases de 3/4 acentuando cada dos negras (1 2 | 1 2 | 1 2).',
            'Volvé al acento normal al tercer compás.',
            'Hacelo sobre un acorde y después sobre el ii–V–I.',
          ],
          { link: '#/playalong?p=vals-ii-v-i&k={k}', linkLabel: 'Abrir el vals' },
        ),
        task(
          'foco-val-pausa',
          'Una frase por compás, con una pausa de una negra en medio.',
          'Usar el silencio dentro del compás de tres.',
          [
            'Tocá una frase de dos notas, pausa de una negra, y una nota más.',
            'Mové la pausa de lugar en cada compás.',
            'Escuchá cómo cambia la sensación del compás.',
          ],
          { link: '#/playalong?p=vals-ii-v-i&k={k}', linkLabel: 'Abrir el vals' },
        ),
      ],
    },
    {
      title: 'El 6/8',
      goal: 'Sentir dos pulsos de tres corcheas.',
      tasks: [
        task(
          'foco-val-seis',
          'Contá "1 2 3 4 5 6" acentuando el 1 y el 4, y tocá una escala en corcheas.',
          'Sentir los dos pulsos del 6/8.',
          [
            'Con el metrónomo en 60 (la negra con puntillo), contá "1 2 3 4 5 6".',
            'Tocá una escala en corcheas acentuando el 1 y el 4.',
            'Repetí con una frase de seis notas.',
          ],
          { link: '#/playalong?p=seis-octavos&k={k}', linkLabel: 'Abrir el 6/8', bpm: 60 },
        ),
        task(
          'foco-val-tres-dos',
          'Alterná el agrupamiento: 3+3 y 2+2+2 en un mismo compás de 6/8.',
          'Ver las dos caras del 6/8.',
          [
            'Tocá seis corcheas agrupadas de a tres (3+3).',
            'Repetí agrupadas de a dos (2+2+2): suena como un 3/4.',
            'Alterná un compás de cada una.',
          ],
          { link: '#/playalong?p=seis-octavos&k={k}', linkLabel: 'Abrir el 6/8' },
        ),
        task(
          'foco-val-ocho',
          'Una frase de ocho compases en 6/8 con motivo, variación y cierre.',
          'Dar forma a una frase.',
          [
            'Compases 1 y 2: un motivo de seis corcheas.',
            'Compases 3 a 6: variá el motivo moviéndolo sobre los acordes.',
            'Compases 7 y 8: cerrá con una nota larga.',
          ],
          { link: '#/playalong?p=seis-octavos&k={k}', linkLabel: 'Abrir el 6/8' },
        ),
      ],
    },
    temaWeek('val', 'Compases ternarios', 'una frase en tres o en seis octavos'),
  ],
};

export const MORE2_LANG_FOCI: Focus[] = [
  LANG_BEBOP,
  LANG_COLTRANE,
  LANG_RHYTHM,
  LANG_MENOR,
  LANG_SIMETRICAS,
  LANG_TURNAROUND,
  LANG_SWING,
  LANG_GRABACIONES,
  LANG_VALS,
];
