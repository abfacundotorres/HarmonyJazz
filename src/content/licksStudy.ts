import type { Lick } from './licks';

/** Una idea musical dentro de la frase. Los números son posiciones entre las notas que suenan (1 = la primera). */
export interface LickIdea {
  name: string;
  from: number;
  to: number;
  /** Qué hace la idea. */
  text: string;
  /** Por qué funciona. */
  why: string;
}

export interface LickStudy {
  ideas: LickIdea[];
  /** Por qué funciona la frase en conjunto (se suman datos medidos sobre la frase). */
  why: string[];
  /** Ejercicios propios de esta frase. */
  exercises: string[];
  /** Consejos de trompeta. */
  trumpet: string[];
}

export const LICK_STUDY: Record<string, LickStudy> = {
  'bebop-251': {
    ideas: [
      {
        name: 'Arpegio de Dm9 y regreso',
        from: 1,
        to: 7,
        text: 'Sube por el arpegio de Dm7 (D F A C), llega a la 9ª (E) y vuelve por D y C.',
        why: 'Todas las notas son del acorde salvo la E (la 9ª), y termina en C, la ♭7: la nota que está por bajar un semitono.',
      },
      {
        name: 'Arpegio de G7 con ♭9 y ♭13',
        from: 8,
        to: 15,
        text: 'B D F es el arpegio de G7 (3ª, 5ª, ♭7); después A♭ (♭9), G, F, E♭ (♭13) y D.',
        why: 'La B llega justo después de la C: ♭7 del ii → 3ª del V, por semitono. Las dos tensiones (A♭ y E♭) resuelven bajando: A♭ → G y E♭ → D.',
      },
      {
        name: 'Llegada a la 3ª de C',
        from: 16,
        to: 20,
        text: 'Aterriza en E (3ª de Cmaj7) y baja por D, B y G; la A final (13ª) deja la frase abierta.',
        why: 'La D (5ª del V) sube un tono a la E: se llega a la 3ª del acorde de resolución por grado conjunto, la nota que más lo identifica.',
      },
    ],
    why: [
      'El esqueleto son los guide tones: C (♭7 de Dm7) → B (3ª de G7) → E (3ª de Cmaj7). Si tocás sólo esas tres notas ya se oye la armonía.',
      'Las tensiones (9ª, ♭9, ♭13) no están "sueltas": cada una resuelve a una nota del acorde en la corchea o el tiempo siguiente.',
    ],
    exercises: [
      'Tocá sólo los guide tones de la frase (las notas marcadas GT) en redondas y escuchá cómo suena el ii–V–I desnudo.',
      'Reemplazá el compás 2 por el arpegio de G7 sin tensiones (B D F G) y comparalo: ¿qué aportan A♭ y E♭?',
      'Tocá la idea del V sobre otro ii–V–I (por ejemplo el de F) sin partitura, sólo pensando en grados: 3, 5, ♭7, ♭9, 1, ♭7, ♭13, 5.',
    ],
    trumpet: ['Los saltos de arpegio piden flexibilidad: ligá el compás 2 primero y recién después articulá. El A♭ agudo es una tensión: no lo fuerces, dejalo sonar.'],
  },

  'enclosure-251': {
    ideas: [
      {
        name: 'Tríada de Am sobre Dm7',
        from: 1,
        to: 4,
        text: 'A C E (tríada de La menor) y un paso a la D: sobre Dm7 dan la 5ª, la ♭7 y la 9ª.',
        why: 'Una tríada "prestada" suena a acorde de cuatro notas sin tocar la fundamental: es una forma rápida de dibujar el ii.',
      },
      {
        name: 'G7 hacia abajo',
        from: 5,
        to: 6,
        text: 'B y G: la 3ª y la fundamental del V.',
        why: 'La B es la 3ª de G7 y cae justo en el primer tiempo del acorde: el cambio de ii a V se oye en el momento exacto.',
      },
      {
        name: 'Enclosure a la 3ª de C',
        from: 7,
        to: 9,
        text: 'F (arriba) y D♯ (abajo) rodean la E, la 3ª de Cmaj7, antes de tocarla.',
        why: 'Rodear una nota la hace sentir más importante: la tensión dura una corchea y la resolución es clara. La D♯ es también la ♭13 de G7 (E♭), por eso suena "adentro".',
      },
      {
        name: 'Cmaj7 hacia arriba',
        from: 10,
        to: 14,
        text: 'G B D C A: arpegio de Cmaj7 con la 9ª y la 13ª.',
        why: 'Después de resolver, la frase se relaja con notas seguras del acorde.',
      },
    ],
    why: [
      'El enclosure ocupa dos corcheas (la nota de arriba y la de abajo) y su objetivo cae en un tiempo fuerte: no es un adorno suelto, es una forma de llegar.',
      'El ii dura sólo dos tiempos: la frase ya está en la 3ª de G7 cuando llega el V.',
    ],
    exercises: [
      'Tocá el enclosure solo (F, D♯ → E) a distintos objetivos: la 3ª, la 5ª y la 7ª de Cmaj7.',
      'Probá el enclosure al revés: primero la nota de abajo (D♯) y después la de arriba (F), y escuchá la diferencia.',
      'Armá un enclosure para la 3ª de cada acorde del ciclo de cuartas (ii–V–I por las 12 del Play-along).',
    ],
    trumpet: ['Las dos notas del enclosure son cromáticas: usá digitaciones alternativas si una nota queda desafinada y revisalo con el afinador.'],
  },

  'minor-251': {
    ideas: [
      {
        name: 'Dø con la 9ª natural',
        from: 1,
        to: 7,
        text: 'F A♭ C (arpegio del semidisminuido) con la E, la 9ª natural, y vuelta por D, C y A♭.',
        why: 'El semidisminuido de un ii–V menor es el modo VI de la menor melódica de F: tiene la 9ª natural (locria ♮2), por eso la E suena bien.',
      },
      {
        name: 'G7alt completo',
        from: 8,
        to: 15,
        text: 'B E♭ D♭ B B♭ A♭ G F: la 3ª y todas las alteraciones (♭13, ♯11, ♯9, ♭9), la fundamental y la ♭7.',
        why: 'G7alt es el modo VII de la menor melódica de A♭: toda la frase sale de esa escala. Las alteraciones bajan una a una hacia la fundamental.',
      },
      {
        name: 'Cm6 con enclosure final',
        from: 16,
        to: 23,
        text: 'E♭ G A C (arpegio de Cm6), D y B rodean la C, y se baja a la G.',
        why: 'La menor melódica de C da la 6ª (A) y la 7ª mayor (B): los dos colores del acorde de resolución. La F (♭7 de G7) baja a la E♭ (♭3 de Cm6).',
      },
    ],
    why: [
      'Los tres acordes salen de tres menores melódicas: F, A♭ y C. No hay que pensar tres escalas distintas, sino un solo sonido que se desplaza.',
      'En los tiempos fuertes del V aparecen la 3ª, la ♯11, la ♯9 y la fundamental: las tensiones se mueven por grado conjunto hacia notas más estables.',
    ],
    exercises: [
      'Tocá la menor melódica de F, de A♭ y de C, una después de otra, en negras: son las tres escalas de la frase.',
      'Tocá sólo el compás 2 repitiéndolo, sin pausa, hasta que las alteraciones salgan sin pensar.',
      'Reemplazá el compás 2 por el arpegio de G7 sin alteraciones y oí lo que se pierde.',
    ],
    trumpet: ['Las alteraciones son notas cromáticas y de afinación delicada: verificalas con el afinador y pensá la dirección (bajan) antes de tocar.'],
  },

  'bebop-scale-251': {
    ideas: [
      {
        name: 'Dm7 descendente',
        from: 1,
        to: 4,
        text: 'D C A F: la fundamental, la ♭7, la 5ª y la ♭3 bajando.',
        why: 'Cuatro notas del acorde en cuatro corcheas: el oído entiende Dm7 enseguida.',
      },
      {
        name: 'Aproximación y subida',
        from: 5,
        to: 8,
        text: 'La E (9ª) se apoya sobre la F desde abajo y la línea sube por F A C.',
        why: 'Una nota de paso a medio tono de una nota del acorde (E → F) suena a movimiento, no a error.',
      },
      {
        name: 'Escala bebop dominante',
        from: 9,
        to: 16,
        text: 'D C B A G F♯ F E sobre G7: la escala mixolidia con una nota de paso (F♯).',
        why: 'Con la F♯ agregada, la 5ª (D), la 3ª (B), la fundamental (G) y la ♭7 (F) caen exactamente en los cuatro tiempos del compás.',
      },
      {
        name: 'Cmaj7 y cierre',
        from: 17,
        to: 23,
        text: 'G B D C B G y la nota larga E: arpegio de Cmaj7 con la 9ª y vuelta.',
        why: 'La E del final del compás 2 es la 13ª de G7 y se sostiene hasta el compás siguiente, donde es la 3ª de Cmaj7.',
      },
    ],
    why: [
      'La escala bebop dominante agrega una nota de paso (la 7ª mayor) a la mixolidia: ocho notas en lugar de siete. Así, bajando en corcheas desde una nota del acorde, las notas del acorde siempre quedan en los tiempos.',
      'Sin la F♯, la escala bajaría D C B A G F E D y la E (13ª) caería en el cuarto tiempo en lugar de la ♭7.',
    ],
    exercises: [
      'Tocá la escala bebop dominante de G (G A B C D E F F♯) subiendo y bajando, empezando desde cada nota del acorde (G, B, D, F).',
      'Tocala empezando desde la ♭7 (F) y notá qué nota queda en cada tiempo.',
      'Hacé lo mismo sobre C7, F7 y B♭7 (ciclo de cuartas): la regla es idéntica en cualquier dominante.',
    ],
    trumpet: ['En corcheas descendentes rápidas la lengua no alcanza: ligá de a dos y articulá sólo los tiempos fuertes. La nota de paso (F♯) va muy ligera.'],
  },

  'blues-blue-note': {
    ideas: [
      {
        name: 'La nota azul que resbala',
        from: 1,
        to: 7,
        text: 'C, A♭ → A (♭3 que resbala a la 3ª), C, D, C, A: bajada y subida sobre F7.',
        why: 'La A♭ choca con la A de F7 y se resuelve en ella: ese roce ♭3 → 3 es el sonido del blues.',
      },
      {
        name: 'Una nota, dos funciones',
        from: 8,
        to: 14,
        text: 'La A♭ sostenida es ahora la ♭7 de B♭7; después F D F A♭ G F.',
        why: 'Entre F7 y B♭7 la misma nota cambia de papel: de nota azul a ♭7 del acorde. Por eso el paso I7 → IV7 suena tan natural.',
      },
      {
        name: 'Descenso mixolidio',
        from: 15,
        to: 20,
        text: 'A G F E♭ D C: la escala mixolidia de F bajando.',
        why: 'Notas seguras del acorde (3ª, 9ª, fundamental, ♭7, 13ª, 5ª) para descansar después de las notas azules.',
      },
      {
        name: 'Cierre',
        from: 21,
        to: 21,
        text: 'F, la fundamental.',
        why: 'Un salto de cuarta hacia arriba cierra la frase con el sonido más estable.',
      },
    ],
    why: [
      'En el blues, la ♭3 sobre un acorde dominante no es un error: choca con la 3ª y se resuelve. Funciona como una pequeña "disonancia con permiso".',
      'La frase alterna notas azules con notas del acorde: la tensión siempre se resuelve en el tiempo siguiente.',
    ],
    exercises: [
      'Tocá sólo el resbalón (A♭ → A) con un portamento de labio y con dos notas separadas: ¿cuál suena más a blues?',
      'Buscá la ♭3 sobre B♭7 (D♭) y la ♭3 sobre C7 (E♭): el resbalón existe sobre cualquier dominante.',
      'Inventá tu propia respuesta de dos compases usando sólo F, A♭, A, C y E♭ (fundamental, ♭3, 3ª, 5ª y ♭7 de F7).',
    ],
    trumpet: ['El resbalón se hace con el labio y las válvulas a medias: no hay una altura "exacta". Escuchá cómo lo hacen en grabaciones y copialo de oído.'],
  },

  'anticipation-251': {
    ideas: [
      {
        name: 'Arpegio de Dm7 desde la ♭3',
        from: 1,
        to: 3,
        text: 'F A C: el arpegio de Dm7 sin la fundamental.',
        why: 'Tres notas bastan para decir el ii: la ♭3, la 5ª y la ♭7.',
      },
      {
        name: 'G7 y anticipación',
        from: 4,
        to: 6,
        text: 'B G E: la 3ª, la fundamental y la 13ª de G7. La E se sostiene hasta el compás siguiente.',
        why: 'La E es la 13ª de G7, pero llega con una corchea de adelanto y se vuelve la 3ª de Cmaj7: se anticipa el acorde antes del cambio.',
      },
      {
        name: 'Cmaj7 hacia arriba',
        from: 7,
        to: 10,
        text: 'G B D C: arpegio de Cmaj7 con la 9ª y la fundamental.',
        why: 'La E sostenida ocupa el primer tiempo del compás: el arpegio arranca recién en el segundo, así que la frase "respira" sobre la nota larga.',
      },
    ],
    why: [
      'Anticipar significa tocar la nota del próximo acorde un poco antes del cambio. Rompe la "cuadratura" de los compases y es una de las marcas del swing.',
      'La nota larga cruza la línea de compás: en la partitura aparece ligada y hay que sostenerla, no volver a atacarla.',
    ],
    exercises: [
      'Tocá la frase sin la anticipación (resolviendo en el 1 del compás 2) y después con ella: oí la diferencia de movimiento.',
      'Anticipá otros cambios de acorde de la forma de un standard: la nota objetivo se adelanta una corchea.',
      'Anticipá una negra entera en lugar de una corchea: ¿a partir de qué punto deja de sonar natural?',
    ],
    trumpet: ['Atacá la nota anticipada con un acento suave y ligala sin volver a articular al cruzar el compás: el sonido tiene que seguir de largo.'],
  },

  'arp-3579': {
    ideas: [
      {
        name: 'Dm9 sin la fundamental',
        from: 1,
        to: 6,
        text: 'F A C E D C: el arpegio 3-5-7-9 de Dm7 y regreso hasta la ♭7.',
        why: 'F A C E es un Fmaj7: sobre Dm7 suena a Dm9 sin tocar la fundamental, una forma de sonar "adentro" y moderna a la vez.',
      },
      {
        name: 'G7: 3-5-7 y vuelta',
        from: 7,
        to: 13,
        text: 'B D F D B G F: sube por el arpegio de G7 (una tríada disminuida de B) y baja hasta la ♭7.',
        why: 'B D F es una tríada disminuida: sobre G7 define el acorde con sólo las tres notas que lo distinguen (3ª, 5ª y ♭7).',
      },
      {
        name: 'Cmaj9 sin la fundamental',
        from: 14,
        to: 20,
        text: 'E G B D B G E: el arpegio 3-5-7-9 de Cmaj7 y regreso a la 3ª.',
        why: 'E G B D es un Em7: sobre Cmaj7 suena a Cmaj9.',
      },
    ],
    why: [
      'Cada compás arranca en la 3ª (o la ♭3) del acorde. Las 7ªes bajan por semitono a las 3ªs siguientes: C → B y F → E.',
      'La frase usa casi sólo notas del acorde: es la base sobre la que después se agregan aproximaciones y tensiones.',
    ],
    exercises: [
      'Tocá los arpegios 3-5-7-9 de los cuatro acordes del turnaround (Cmaj7, A7, Dm7, G7) uno por compás.',
      'Hacelo en el ciclo de cuartas (ii–V–I por las 12 del Play-along) con el generador "Arpegio desde la 3ª".',
      'Variá el orden: 3-7-5-9, 9-7-5-3, 5-3-7-9. El conocimiento del arpegio es el mismo; la melodía cambia.',
    ],
    trumpet: ['Los saltos de tercera en corcheas exigen coordinar digitación y lengua: empezá ligado y sumá la articulación cuando el movimiento sea parejo.'],
  },

  'penta-alt': {
    ideas: [
      {
        name: 'Dø: arpegio de ♭3 a la 1',
        from: 1,
        to: 8,
        text: 'F A♭ C D C A♭ F D: el arpegio del semidisminuido (con la fundamental) sube y baja.',
        why: 'Define el acorde con claridad antes de pasar a las tensiones del V.',
      },
      {
        name: 'Pentatónica de D♭ sobre G7alt',
        from: 9,
        to: 15,
        text: 'B♭ D♭ E♭ F E♭ D♭ B♭: sobre G7 son ♯9, ♯11, ♭13, ♭7 y la vuelta por ♭13, ♯11, ♯9.',
        why: 'La pentatónica mayor de D♭ (D♭ E♭ F A♭ B♭) contiene las cuatro alteraciones de G7alt (♭9, ♯9, ♯11, ♭13) y la ♭7: con cinco notas se obtiene el sonido de la escala alterada.',
      },
      {
        name: 'La 3ª como llave de resolución',
        from: 16,
        to: 16,
        text: 'La B natural, la 3ª de G7.',
        why: 'Es la única nota del compás 2 que define el acorde como dominante: sube un semitono a la C de Cm6.',
      },
      {
        name: 'Cm6: arpegio y descenso',
        from: 17,
        to: 24,
        text: 'C E♭ D C A G E♭ C: el arpegio de Cm6 con la 9ª y el descenso final.',
        why: 'Después de tanta tensión, la frase se instala en notas del acorde (fundamental, ♭3, 6ª, 5ª).',
      },
    ],
    why: [
      'Sobre el V alterado casi todas las notas son tensiones: suenan "afuera" pero ordenadas, porque pertenecen a una pentatónica. Las únicas notas del acorde son la ♭7 (F) en medio del compás y la 3ª (B) al final.',
      'La B natural es lo que "ancla" la frase: sin ella el V pierde su identidad de dominante.',
    ],
    exercises: [
      'Tocá la pentatónica mayor de D♭ sobre un G pedal (o con el acorde G7alt del play-along) y escuchá el color de cada nota.',
      'Hacé lo mismo con la pentatónica de la ♭5 de cada dominante: C7 → G♭, F7 → B, B♭7 → E.',
      'Terminá el compás 2 en la ♭9 (A♭) en lugar de la 3ª y resolvé a G (la 5ª de Cm6): ¿qué cambia?',
    ],
    trumpet: ['El registro agudo de esta frase pide apoyo de aire: tocala primero una octava más grave y subí después.'],
  },

  backdoor: {
    ideas: [
      {
        name: 'Fm7 desde la ♭3',
        from: 1,
        to: 7,
        text: 'A♭ C E♭ F E♭ C A♭: el arpegio de Fm7 sube hasta la fundamental y vuelve.',
        why: 'Define el acorde del IV menor con claridad: ♭3, 5ª, ♭7, 1.',
      },
      {
        name: 'B♭7♯11 y la nota E',
        from: 8,
        to: 15,
        text: 'F D F A♭ B♭ A♭ G E: el arpegio de B♭7 con la 13ª (G) y la ♯11 (E) al final.',
        why: 'El acorde B♭7 con ♯11 usa la escala lidia dominante: la E es una tensión característica y no un error.',
      },
      {
        name: 'La E conecta los dos acordes',
        from: 16,
        to: 23,
        text: 'E G B D C B G E: la E (que era ♯11) pasa a ser la 3ª de Cmaj7 y sigue el arpegio.',
        why: 'La nota E no se mueve: cambia de función. Es el truco que hace que el backdoor suene suave.',
      },
    ],
    why: [
      'El ii–V "por la puerta de atrás" (iv menor – ♭VII7 – I) resuelve a la tónica bajando un tono desde el B♭7, en vez de subir una cuarta desde el G7. Suena más suave, casi como un cierre de balada.',
      'La E es la ♯11 de B♭7 y la 3ª de Cmaj7: no se mueve, así que la resolución es continua.',
    ],
    exercises: [
      'Tocá la escala lidia dominante de B♭ (B♭ C D E F G A♭) y notá la ♯11 (E): es la nota que une los dos acordes.',
      'Cambiá el ♭VII7 por un V7 normal (G7) y comparalas: ¿cuál suena más "final" y cuál más "suave"?',
      'Hacé el backdoor en otras tonalidades: en F el ♭VII7 es E♭7 y el IV menor es B♭m7.',
    ],
    trumpet: ['Las notas lentas de un backdoor se prestan al vibrato: probá un vibrato suave en la E larga del compás 3.'],
  },

  'tritone-chrom': {
    ideas: [
      {
        name: 'Dm7 desde la ♭3',
        from: 1,
        to: 7,
        text: 'F A C D C A F: el arpegio de Dm7 sube a la fundamental y vuelve a la F.',
        why: 'Termina en la F, la ♭3 de Dm7: una nota que no se va a mover.',
      },
      {
        name: 'D♭7: la F es la 3ª',
        from: 8,
        to: 15,
        text: 'F A♭ B D♭ B A♭ F E♭: el arpegio de D♭7 (con la B como C♭, la ♭7) y la E♭ (9ª) al final.',
        why: 'D♭7 es el dominante a un tritono de G7: comparten la F y la B. La F pasa de ♭3 de Dm7 a 3ª de D♭7 sin moverse.',
      },
      {
        name: 'Resolución a la 3ª de C',
        from: 16,
        to: 24,
        text: 'E G B D C B A G E: Cmaj7 con la 9ª, la 7ª y la 13ª.',
        why: 'La E♭ (9ª de D♭7) sube un semitono a la E (3ª de Cmaj7). Junto con la F de arriba forma un enclosure sobre la E.',
      },
    ],
    why: [
      'La sustitución tritonal reemplaza el V7 por un acorde que comparte su 3ª y su 7ª (las dos notas más importantes): G7 → D♭7. El oído acepta el cambio porque el esqueleto no cambia.',
      'En el bajo aparece una línea cromática D → D♭ → C: es el sonido típico de una sustitución tritonal.',
    ],
    exercises: [
      'Tocá sólo la F y la B/C♭ sobre G7 y sobre D♭7: son las mismas dos notas con funciones intercambiadas.',
      'Hacé la sustitución tritonal sobre otros ii–V–I: el dominante a un tritono de F7 es B7, y el de B♭7 es E7.',
      'Tocá la misma frase del compás 2 sobre G7 y escuchá la diferencia con D♭7.',
    ],
    trumpet: ['Hay varias alteraciones cromáticas seguidas: tocá primero lento con el afinador y fijate en la afinación de la A♭ y la D♭.'],
  },

  'minor-blues-4': {
    ideas: [
      {
        name: 'Escala de blues descendente',
        from: 1,
        to: 7,
        text: 'C B♭ G G♭ F E♭ C: la escala de blues de Do menor bajando desde la fundamental.',
        why: 'La escala de blues menor es la pentatónica menor más la ♭5 (G♭). Bajando, la G♭ es una nota de paso entre G y F.',
      },
      {
        name: 'Respuesta con el arpegio de Cm',
        from: 8,
        to: 11,
        text: 'E♭ G B♭ C: sube por el arpegio de Cm7 después de una pausa.',
        why: 'La pausa separa "pregunta" y "respuesta": en el blues es tan importante lo que no se toca.',
      },
      {
        name: 'Variación sobre E♭ C B♭',
        from: 12,
        to: 19,
        text: 'E♭ C B♭ C E♭ C B♭ G: el mismo motivo tres veces con ligeros cambios.',
        why: 'Repetir una idea con variaciones es la forma más simple de armar un coro de blues convincente.',
      },
      {
        name: 'Descenso en negras',
        from: 20,
        to: 23,
        text: 'G♭ F E♭ C: baja con negras, otra vez con la ♭5 de paso.',
        why: 'Cambia el ritmo (negras después de corcheas) para cerrar el compás 4 con más peso.',
      },
    ],
    why: [
      'La ♭5 (G♭) se usa de paso: baja a la F y nunca se queda. Si se sostiene, suena a error.',
      'Todas las otras notas son de la pentatónica menor de Do: C E♭ F G B♭, suena bien sobre cualquier acorde del blues menor.',
    ],
    exercises: [
      'Tocá la escala de blues menor (C E♭ F G♭ G B♭ C) subiendo y bajando en corcheas, empezando desde cada nota.',
      'Hacé "pregunta y respuesta": tocá un compás, dejá un compás de silencio, y respondé con otra idea.',
      'Transportá la frase a otra tonalidad menor (por ejemplo F menor) y tocala sobre los primeros compases de un blues menor.',
    ],
    trumpet: ['Las notas azules se pueden ensuciar con el labio (bends hacia abajo). Probá la G♭ con un pequeño glissando.'],
  },

  'fourths-dorian': {
    ideas: [
      {
        name: 'Cuartas ascendentes',
        from: 1,
        to: 4,
        text: 'D G C F: cuatro notas, cada una a una cuarta justa de la anterior.',
        why: 'Las cuartas apiladas no definen un acorde mayor ni menor: suenan abiertas y modales.',
      },
      {
        name: 'Descenso por la escala',
        from: 5,
        to: 8,
        text: 'E D C A: baja por grado conjunto y un salto.',
        why: 'Después de los saltos de cuarta, se descansa con notas conjuntas: contraste de movimiento.',
      },
      {
        name: 'Pentatónica de Re menor',
        from: 9,
        to: 15,
        text: 'G A C D C A G: la pentatónica menor (D F G A C) subiendo y bajando.',
        why: 'La pentatónica no tiene la tercera mayor ni la sexta, así que no contradice nada del acorde.',
      },
      {
        name: 'Cuartas sobre E',
        from: 16,
        to: 23,
        text: 'E A D G F D A E: cuartas ascendentes desde la 9ª y regreso.',
        why: 'Empezar las cuartas en otra nota (la 9ª) cambia el color sin cambiar el acorde: es el truco de las "cuartas desplazadas".',
      },
      {
        name: 'Final',
        from: 24,
        to: 24,
        text: 'D, la fundamental.',
        why: 'Un solo compás de silencio y una nota larga: la frase termina en el acorde.',
      },
    ],
    why: [
      'En un acorde modal sin cambios de armonía, el interés tiene que venir de la forma de la melodía: cuartas, pentatónicas y contrastes entre saltos y grados conjuntos.',
      'No hay una resolución que buscar: todas las notas pertenecen al dórico de Re (con la B natural opcional).',
    ],
    exercises: [
      'Tocá las cuartas justas en todas las notas de la escala dórica (D–G, E–A, F–B♭…) subiendo en cuartas desde cada una.',
      'Combiná una pentatónica y un grupo de cuartas en un solo coro sobre el tema modal del Play-along.',
      'Probá empezar las cuartas desde la 5ª (A) y desde la 11ª (G).',
    ],
    trumpet: ['Las cuartas ascendentes son un buen ejercicio de flexibilidad: ligalas despacio y buscá que las notas encajen sin "golpear" la lengua.'],
  },

  'turnaround-bb': {
    ideas: [
      {
        name: 'B♭maj7: arpegio ascendente',
        from: 1,
        to: 4,
        text: 'F A B♭ D: la 5ª, la 7ª, la fundamental y la 3ª.',
        why: 'Arranca por la 5ª y no por la fundamental: la línea queda centrada en el registro medio y empieza con una nota estable.',
      },
      {
        name: 'G7♭9: descenso',
        from: 5,
        to: 8,
        text: 'F D B A♭: la ♭7, la 5ª, la 3ª y la ♭9 bajando.',
        why: 'La ♭9 (A♭) es la tensión característica del V7 hacia un acorde menor, y baja un semitono a la G del acorde siguiente.',
      },
      {
        name: 'Cm7: arpegio ascendente',
        from: 9,
        to: 12,
        text: 'G B♭ C E♭: la 5ª, la ♭7, la fundamental y la ♭3.',
        why: 'La misma forma que en B♭maj7: subir desde la 5ª.',
      },
      {
        name: 'F7: descenso',
        from: 13,
        to: 16,
        text: 'C A F E♭: la 5ª, la 3ª, la fundamental y la ♭7 bajando.',
        why: 'La E♭ (♭7 de F7) baja un semitono a la D (3ª de B♭maj7): el guide tone resuelve.',
      },
      {
        name: 'B♭maj7: llegada y descenso',
        from: 17,
        to: 25,
        text: 'D F A C D C A F D: arpegio con la 9ª y regreso a la 3ª.',
        why: 'Instalada en la tónica, la frase se relaja: notas del acorde y la 9ª.',
      },
    ],
    why: [
      'El turnaround I–VI–ii–V mueve el acorde cada dos tiempos: no hay tiempo para escalas, así que se usan arpegios cortos de cuatro notas, uno por acorde.',
      'Los finales de cada grupo bajan por semitono a una nota del acorde siguiente: A♭ → G y E♭ → D.',
    ],
    exercises: [
      'Tocá sólo los arpegios de cuatro notas de cada acorde en negras y después en corcheas.',
      'Aplicalos a los dos primeros compases de unos rhythm changes (el Play-along "Rhythm changes en B♭").',
      'Probá la misma idea en otra tonalidad del ciclo de cuartas: E♭, A♭, D♭.',
    ],
    trumpet: ['Cada acorde cambia en dos tiempos: practicá la frase con el metrónomo en 2 y 4 y respirá siempre en el mismo lugar (antes del compás 3).'],
  },
};

/** Pasos para aprender una frase, con el tempo de la propia frase. */
export function learningSteps(l: Lick): string[] {
  const t = l.tempo ?? 120;
  const slow = Math.max(40, Math.round((t * 0.5) / 2) * 2);
  const mid = Math.round((t * 0.7) / 2) * 2;
  return [
    'Escuchala sin tocar: activá "Oír la línea" y cantá los grados (3, 5, ♭7…) mientras suena. Repetí tres veces.',
    'Tocá sólo el esqueleto: las notas marcadas GT (guide tones) en redondas, con el acompañamiento. Tiene que sonar como una melodía.',
    `Primera idea sola, bien lenta (♩ = ${slow}), con el metrónomo en 2 y 4. Repetí hasta que salga tres veces seguidas sin errores.`,
    'Segunda idea sola, igual de lenta. Después unila a la primera sin frenar entre ellas.',
    `Sumá las ideas que faltan y tocá la frase completa a ♩ = ${mid}. Grabate y escuchá si el swing y las articulaciones se parecen a "Oír la línea".`,
    `Subí el tempo de a 8 o 10 bpm hasta ♩ = ${t}. Cuando salga limpia dos veces seguidas, marcá "✓ Salió limpio".`,
    'Pasala a otra tonalidad siguiendo el ciclo de cuartas (C, F, B♭, E♭…): una tonalidad por día alcanza. El progreso se anota en los puntos verdes.',
    'Tocala de memoria, sin partitura, mirando sólo los acordes. Si te trabás, volvé al paso 2.',
  ];
}

/** Ejercicios generales aplicables a cualquier frase. */
export const COMMON_EXERCISES: string[] = [
  'Ritmo: tocala con swing fuerte y después recta (swing al 50 %, en "Más") y notá qué notas ganan o pierden peso.',
  'Desplazamiento: empezala una corchea más tarde (en el "y"): mismas notas, otros acentos.',
  'Cambiá el final: terminá en otra nota del último acorde (la 5ª o la 9ª en vez de la 3ª) y escuchá cómo cambia el cierre.',
  'Octava: tocala una octava más grave o más aguda si tu registro lo permite.',
  'Variante propia: cambiá dos notas por otras con la misma función (mirá la tabla nota por nota) y tocala.',
  'En un solo: usala sobre el primer ii–V–I de un standard en el Play-along e improvisá el resto.',
];
