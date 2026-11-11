export interface LessonExercise {
  label: string;
  /** Generador de ejercicios. */
  generator?: string;
  progression: string;
  /** Tempo sugerido para empezar. */
  tempo?: number;
}

export interface Lesson {
  id: string;
  title: string;
  area: 'Armonía' | 'Vocabulario' | 'Ritmo y fraseo' | 'Moderno';
  summary: string;
  /** Paso a paso para estudiarla (práctica progresiva). */
  steps: string[];
  /** Por qué funciona. */
  why: string[];
  /** Párrafos. "## " = subtítulo, "- " = viñeta, **negrita**. */
  body: string[];
  exercises: LessonExercise[];
  trumpet: string[];
  listen?: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'guide-tones',
    title: 'Guide tones y conducción de voces',
    area: 'Armonía',
    summary: 'La 3ª y la 7ª definen el acorde. Si tu línea las conecta, el cambio se escucha aunque toques sin acompañamiento.',
    steps: [
      'Buscá los guide tones de un ii–V–I: la 7ª de Dm7 (C) baja por semitono a la 3ª de G7 (B), y la 7ª de G7 (F) baja por semitono a la 3ª de Cmaj7 (E).',
      'Tocá la línea 3ª–7ª–3ª en redondas con el ejercicio "Línea de guide tones" y escuchá cómo suena con el acompañamiento.',
      'Pasá a blancas con "Guide tones en blancas (3 → 7 → 3)": dos notas por compás, la línea baja por grado conjunto.',
      'Cantá o silbá la línea mientras suena el play-along. Si la podés cantar, la tenés.',
      'Improvisá un chorus con una sola regla: caer en un guide tone en el primer tiempo de cada acorde; entre medio tocá lo que quieras.',
      'Activá el reto de guide tones del Play-along (con el micrófono) y anotá tu porcentaje. Subí el tempo cuando pase del 70 %.',
    ],
    why: [
      'La 3ª dice si el acorde es mayor o menor y la 7ª si es dominante o mayor: con esas dos notas el oído reconstruye el acorde.',
      'Las 7ªs bajan por semitono a la 3ª del acorde siguiente, así que la línea casi no se mueve: es fácil de cantar y de recordar.',
      'Una línea de guide tones es un esqueleto: cualquier frase que arranque o termine en ellas "dice" el cambio de acorde.',
    ],
    body: [
      'En un ii–V–I la 7ª de cada acorde baja por semitono a la 3ª del siguiente (C → B sobre Dm7 → G7, F → E sobre G7 → Cmaj7). Esa línea de dos voces es el esqueleto armónico de casi todo el repertorio de bebop.',
      '## Método',
      '- Tocá la línea de guide tones en redondas, sin adornos, hasta poder cantarla.',
      '- Después, blancas: 3 → 7 dentro de cada compás, resolviendo al siguiente.',
      '- Por último improvisá libremente, pero con la regla de **caer en un guide tone en el tiempo 1** de cada acorde.',
      'El reto de guide tones de la pantalla Play-along te escucha por el micrófono y cuenta cuántos cambios "aterrizaste".',
    ],
    exercises: [
      { label: 'Guide tones en Rhythm changes', generator: 'guide', progression: 'rhythm', tempo: 160 },
      { label: '3 → 7 → 3 en blancas, Autumn Leaves', generator: 'guide2', progression: 'autumn', tempo: 140 },
      { label: 'Guide tones en Bird blues', generator: 'guide', progression: 'blues-bird', tempo: 140 },
      { label: 'Guide tones en blancas, blues de F', generator: 'guide2', progression: 'blues-f', tempo: 140 },
      { label: 'Guide tones en Blue Bossa', generator: 'guide', progression: 'blue-bossa', tempo: 130 },
    ],
    trumpet: [
      'Tocalo en dos octavas: la de abajo te obliga a centrar el registro grave, la de arriba trabaja resistencia sin forzar.',
      'Usá las redondas como notas largas: afinación estable con el afinador abierto.',
    ],
    listen: ['Chet Baker – cualquier balada: es pura conducción de guide tones'],
  },
  {
    id: 'arpeggios',
    title: 'Arpegios extendidos y upper structures',
    area: 'Armonía',
    summary: 'Arpegiar desde la 3ª (3-5-7-9) suena a solista, no a bajista. Es la forma más rápida de que una línea "diga" el acorde.',
    steps: [
      'Tocá el arpegio de Dm7 (D F A C) y después el de Dm9 desde la 3ª (F A C E) en la tonalidad del día.',
      'Conectá los tres arpegios de un ii–V–I sin pausa: terminá cada uno en la 7ª y bajala por semitono a la 3ª del siguiente.',
      'Usá "Arpegio 1-3-5-7-9" a tempo lento y después "Arpegio desde la 3ª (3-5-7-9)".',
      'Variá el orden de las notas: 3–7–5–9, 9–7–5–3, 5–3–7–9. El arpegio es el mismo; la melodía cambia.',
      'Pasalos por el ciclo de cuartas con el generador en las 12 tonalidades.',
    ],
    why: [
      'El arpegio desde la 3ª (3-5-7-9) es un acorde distinto sin la fundamental: sobre Dm7 suena como Fmaj7, sobre G7 como Bø y sobre Cmaj7 como Em7.',
      'Con las notas del acorde en los tiempos fuertes la armonía se oye con claridad, aunque no suene el bajo.',
      'Si los arpegios salen sin pensar en las 12 tonalidades, la mano ya sabe dónde están las notas y la cabeza queda libre para escuchar.',
    ],
    body: [
      'El arpegio 3-5-7-9 de Dm7 (F A C E) es una tríada mayor de F con 7ª: superponer estructuras así es la base de la superposición armónica.',
      '## Relaciones útiles',
      '- m7: 3-5-7-9 = maj7 sobre la ♭3 (Dm9 → Fmaj7).',
      '- 7: 3-5-7-9 = m7♭5 sobre la 3 (G9 → Bø).',
      '- maj7: 3-5-7-9 = m7 sobre la 3 (Cmaj9 → Em7).',
      '- m7♭5: 3-5-7-9 = m(maj7) sobre la ♭3 (Dø9 → Fm(maj7)).',
      'Practicalos en todo el registro, no sólo en la octava cómoda. La meta es que la posición de cada arpegio en el instrumento no requiera pensar.',
    ],
    exercises: [
      { label: '1-3-5-7-9 sobre ii–V–I por las 12', generator: 'arp', progression: 'ii-v-i-12', tempo: 120 },
      { label: '3-5-7-9 en Autumn Leaves', generator: 'arp3', progression: 'autumn', tempo: 140 },
      { label: '3-5-7-9 en el ciclo de terceras mayores', generator: 'arp3', progression: 'giant', tempo: 110 },
      { label: 'Arpegios desde la 3ª en Blue Bossa', generator: 'arp3', progression: 'blue-bossa', tempo: 130 },
      { label: 'Arpegios desde la 3ª en el turnaround', generator: 'arp3', progression: 'turnaround', tempo: 130 },
    ],
    trumpet: [
      'Los arpegios rápidos dependen de la flexibilidad entre parciales: si un salto se "cae", trabajá ese par de notas como lip slur.',
      'Legato con lengua suave ("doo") en todas las notas, después articulá sólo los contratiempos.',
    ],
  },
  {
    id: 'enclosures',
    title: 'Enclosures (aproximaciones)',
    area: 'Vocabulario',
    summary: 'Rodear la nota objetivo desde arriba (escala) y abajo (cromática) antes de tocarla. El sonido más característico del bebop.',
    steps: [
      'Elegí una nota objetivo (la 3ª de un acorde) y tocala tres veces para fijarla.',
      'Armá el enclosure: una nota de la escala por encima, una cromática por debajo y el objetivo.',
      'Probá las cuatro variantes: arriba–abajo, abajo–arriba, dos cromáticas y la de cuatro notas.',
      'Aplicá un enclosure a la 3ª de cada acorde de un ii–V–I y después en las 12 tonalidades con el ejercicio.',
      'Cambiá el objetivo: la 7ª y la 9ª también se pueden rodear.',
      'Insertalo en una frase propia: el enclosure ocupa las dos corcheas anteriores al tiempo fuerte donde cae el objetivo.',
    ],
    why: [
      'Una nota que se acerca por los dos lados queda "enmarcada": el oído espera el objetivo y la llegada se siente definitiva.',
      'Las notas del enclosure son cromáticas, pero duran una corchea: la disonancia es breve y se resuelve en un tiempo fuerte.',
      'Funciona sobre cualquier acorde: sólo cambia la nota objetivo.',
    ],
    body: [
      'Un enclosure retrasa la llegada a una nota importante y la hace más fuerte. La variante más común: nota de la escala por arriba, cromática por abajo, objetivo.',
      '## Variantes para trabajar después',
      '- Cromática arriba + cromática abajo.',
      '- Doble: escala arriba, cromática arriba, cromática abajo, objetivo (4 notas).',
      '- Al revés: abajo primero, después arriba.',
      '- Con el objetivo en el tiempo 1: el enclosure empieza en el "y" del 3 del compás anterior.',
      'Elegí siempre el objetivo antes de tocar: 3ª, 7ª, 9ª. El enclosure sin objetivo claro suena a ornamento vacío.',
    ],
    exercises: [
      { label: 'Enclosure a la 3ª: ii–V–I por las 12', generator: 'enclosure', progression: 'ii-v-i-12', tempo: 120 },
      { label: 'Enclosure en el turnaround', generator: 'enclosure', progression: 'turnaround', tempo: 130 },
      { label: 'Enclosures en Rhythm changes', generator: 'enclosure', progression: 'rhythm', tempo: 160 },
      { label: 'Enclosures en Autumn Leaves', generator: 'enclosure', progression: 'autumn', tempo: 140 },
    ],
    trumpet: [
      'Las cromáticas en contratiempo, articuladas con lengua ligera, le dan el swing. Las notas objetivo, un poco más largas.',
      'Cuidá la afinación de las cromáticas con 1-2-3 y 1-3: usá la bomba de la 3ª o la 1ª.',
    ],
    listen: ['Clifford Brown – "Joy Spring"', 'Kenny Dorham – "Blue Bossa"'],
  },
  {
    id: 'bebop-scales',
    title: 'Escalas bebop',
    area: 'Vocabulario',
    summary: 'Una nota cromática de paso que hace caer las notas del acorde en los tiempos fuertes. Matemática del swing.',
    steps: [
      'Tocá la escala mixolidia de G en corcheas descendentes desde la 5ª (D C B A G F E D) y fijate qué nota cae en cada tiempo.',
      'Agregá la nota de paso, la 7ª mayor entre la fundamental y la ♭7 (D C B A G F♯ F E), y repetí: las notas del acorde pasan a caer en los tiempos.',
      'Empezá desde cada nota del acorde (fundamental, 3ª, 5ª y ♭7) y notá cómo cambia la posición de la nota de paso.',
      'Probá la escala bebop mayor (con la ♯5 de paso) sobre un acorde mayor.',
      'Aplicá el ejercicio a un ii–V–I por las 12 y después estudiá la frase "Escala bebop descendente en el V" del Vocabulario.',
    ],
    why: [
      'En corcheas, los tiempos son la 1.ª, 3.ª, 5.ª y 7.ª nota de la escala. Con la nota de paso, bajando desde la 5ª, esas posiciones son la 5ª, la 3ª, la fundamental y la ♭7: las cuatro notas del acorde.',
      'Sin la nota de paso, la escala de siete notas se desfasa al cruzar la octava y una tensión (la 13ª) cae donde debería haber una nota del acorde.',
      'La nota de paso es cromática y cae en un tiempo débil, por eso no se oye como un error.',
    ],
    body: [
      'La mixolidia tiene 7 notas: tocada en corcheas desde la fundamental, las notas del acorde se desplazan a los contratiempos al dar la vuelta. Agregar la 7ª mayor como nota de paso (entre la fundamental y la ♭7) lo corrige: 8 notas, 4 del acorde en los tiempos fuertes.',
      '## Reglas prácticas',
      '- Dominante: paso entre 1 y ♭7, descendente desde la fundamental, la 3ª, la 5ª o la 7ª.',
      '- Mayor: paso entre 5 y 6 (♯5).',
      '- Sobre el ii, pensá en el bebop dominante del V (Dm7 → G7 bebop).',
      '- Si cambiás de dirección, reiniciás la cuenta: los saltos y cambios de dirección te permiten reubicar las notas del acorde.',
    ],
    exercises: [
      { label: 'Bebop descendente: ii–V–I por las 12', generator: 'bebop', progression: 'ii-v-i-12', tempo: 120 },
      { label: 'Bebop en el blues de F', generator: 'bebop', progression: 'blues-f', tempo: 150 },
      { label: 'Bebop en Autumn Leaves', generator: 'bebop', progression: 'autumn', tempo: 140 },
      { label: 'Bebop en el turnaround', generator: 'bebop', progression: 'turnaround', tempo: 140 },
    ],
    trumpet: [
      'Practicalas también ascendentes desde la 3ª: el registro agudo con lengua liviana es donde más se nota la técnica.',
    ],
    listen: ['Charlie Parker – "Confirmation"', 'Fats Navarro – "Nostalgia"'],
  },
  {
    id: 'digital',
    title: 'Patrones digitales (1-2-3-5)',
    area: 'Vocabulario',
    summary: 'Células de cuatro notas que viajan por cualquier progresión. El lenguaje de Coltrane y la forma de sobrevivir a armonías rápidas.',
    steps: [
      'Tocá la célula 1-2-3-5 (D E F A sobre Dm7) y la célula 3-5-7-9 (F A C E).',
      'Unilas en un mismo compás: 1–9–3–5 y 3–5–7–9, como hace el ejercicio.',
      'Aplicalas a un ii–V–I lento: cada acorde arranca con la misma célula, empezando en la nota más cercana a donde terminaste.',
      'Subí el tempo con el ejercicio del ciclo de cuartas y después con "Cambios de Coltrane".',
      'Probá la célula al revés: 5–3–2–1.',
    ],
    why: [
      'Una célula fija se aprende una vez y se transporta a cualquier acorde: sirve cuando los acordes cambian rápido y no hay tiempo de pensar escalas.',
      '1-2-3-5 y 3-5-7-9 cubren las cuatro notas más importantes del acorde (fundamental, 3ª, 5ª y 7ª) más la 9ª.',
      'Es una forma clásica de estudiar los cambios de Giant Steps.',
    ],
    body: [
      'En cambios rápidos no hay tiempo para escalas: una célula fija (1-2-3-5, 3-5-7-9, 5-3-2-1) aplicada a cada acorde produce líneas coherentes y te deja la mente libre para escuchar.',
      'Combiná células: subí con 1-2-3-5, bajá con 5-3-2-1, encadená la última nota de un acorde con la más cercana del siguiente.',
      'Cuando funcione, aplicalo sobre los cambios de Coltrane: el patrón es el mismo, sólo cambia la raíz cada dos tiempos.',
    ],
    exercises: [
      { label: '1-2-3-5 / 3-5-7-9 sobre ii–V–I por las 12', generator: 'digital', progression: 'ii-v-i-12', tempo: 120 },
      { label: 'Cambios de Coltrane', generator: 'digital', progression: 'coltrane', tempo: 110 },
      { label: 'Ciclo de terceras mayores (Giant Steps)', generator: 'digital', progression: 'giant', tempo: 120 },
      { label: 'Digitales en Autumn Leaves', generator: 'digital', progression: 'autumn', tempo: 120 },
      { label: 'Digitales en Rhythm changes', generator: 'digital', progression: 'rhythm', tempo: 150 },
    ],
    trumpet: ['Empezá ligado para pensar la digitación, después articulá cada nota: la coordinación lengua-dedos es el cuello de botella en la trompeta.'],
    listen: ['John Coltrane – "Giant Steps", "Countdown"', 'Freddie Hubbard – "Red Clay"'],
  },
  {
    id: 'minor-251',
    title: 'ii–V–i menor y el dominante alterado',
    area: 'Armonía',
    summary: 'Locria ♮2, alterada y menor melódica: tres modos de dos escalas menores melódicas. Un solo sistema.',
    steps: [
      'Tocá la menor melódica de F, la de A♭ y la de C (una por compás) en negras.',
      'Relacionalas con los acordes: Dø es el modo VI de F menor melódica, G7alt es el modo VII de A♭ menor melódica y Cm6 es C menor melódica.',
      'Tocá la escala alterada de G (G A♭ B♭ C♭ D♭ E♭ F) y localizá la ♭9, la ♯9, la ♯11 y la ♭13.',
      'Probá los ejercicios de pares de tríadas y de pentatónicas sobre el ii–V–i menor.',
      'Estudiá las frases "ii–V–i menor alterado" y "Pentatónica sobre el V alterado" del Vocabulario.',
    ],
    why: [
      'Las tres escalas menores melódicas coinciden casi nota por nota con los tres acordes: no hay que pensar acorde por acorde, sino en un solo sonido que se desplaza.',
      'La 3ª del V (B) sube a la fundamental (C): la sensible resuelve. La ♭9 (A♭) baja a la 5ª del i (G).',
      'El V alterado es el acorde con más tensión del ii–V–i: la resolución al i es lo que le da sentido.',
    ],
    body: [
      'Dø = modo 6 de F menor melódica. G7alt = modo 7 de A♭ menor melódica. Cm6 = C menor melódica. Si dominás la menor melódica en las 12 tonalidades, el ii–V–i menor ya lo tenés.',
      '## Qué buscar en el V alterado',
      '- ♭9 (A♭) → baja a la 5ª del i (G).',
      '- ♯9 (B♭) → baja a la 6ª del i (A, en Cm6) o sube a la fundamental (C).',
      '- ♭13 → 9 del i (E♭ → D) o se mantiene como ♭3 del i.',
      '- La 3ª del V (B) sube a la fundamental (C): sensible.',
      'Escuchá cómo la tensión del alterado se resuelve por semitono: eso es lo que tiene que pasar en tu línea, no en la armonía.',
    ],
    exercises: [
      { label: 'Pares de tríadas sobre ii–V–i menor por las 12', generator: 'triads', progression: 'ii-v-i-minor-12', tempo: 110 },
      { label: 'Pentatónica de ♭5 sobre el alterado', generator: 'pent', progression: 'ii-v-i-minor', tempo: 120 },
      { label: 'Arpegios desde la 3ª en el ii–V–i menor', generator: 'arp3', progression: 'ii-v-i-minor-12', tempo: 120 },
      { label: 'Bebop en el ii–V–i menor', generator: 'bebop', progression: 'ii-v-i-minor', tempo: 120 },
    ],
    trumpet: ['Las alteraciones en el registro medio-agudo (A♭, B♭, D♭ escritos) son notas de afinación delicada: verificalas con el afinador.'],
    listen: ['Woody Shaw – "Rosewood"', 'Lee Morgan – "Ceora" (escuchá las resoluciones)'],
  },
  {
    id: 'triad-pairs',
    title: 'Pares de tríadas',
    area: 'Moderno',
    summary: 'Dos tríadas sin notas comunes forman una escala de 6 notas con sonido abierto y moderno.',
    steps: [
      'Elegí el par de tríadas del acorde: sobre Dm7, F mayor y G mayor.',
      'Tocá cada tríada por separado, subiendo y bajando, en las tres posiciones.',
      'Alterná en zigzag: una tríada sube y la otra baja.',
      'Tocá el par sobre un acorde estático durante ocho compases.',
      'Cambiá de par cuando cambia el acorde: primero un ii–V–I lento y después el ciclo de cuartas.',
    ],
    why: [
      'Dos tríadas sin notas en común forman una escala de seis notas con un sonido abierto y sin notas a evitar.',
      'Cada tríada suena como un acorde en sí misma: pasar de una a otra da sensación de movimiento sin cambiar la armonía.',
      'El patrón se puede desplazar rítmicamente sin perder el sonido.',
    ],
    body: [
      'Elegir dos tríadas adyacentes de la escala-acorde (F y G sobre Dm7; G♭ y A♭ sobre C7alt) da una sonoridad clara, sin "notas a evitar", y muy fácil de desplazar.',
      '## Cómo practicarlo',
      '- Alternando tríadas en zigzag, como en el ejercicio.',
      '- En inversiones: 1ª inversión de A, 2ª de B.',
      '- En grupos de 2 notas por tríada: rompe la simetría.',
      '- Superpuesto a un acorde estático (modal) durante 8 compases sin cambiar el par.',
    ],
    exercises: [
      { label: 'Pares de tríadas sobre modal', generator: 'triads', progression: 'modal', tempo: 170 },
      { label: 'Pares de tríadas en ii–V–I por las 12', generator: 'triads', progression: 'ii-v-i-12', tempo: 110 },
      { label: 'Pares de tríadas en Autumn Leaves', generator: 'triads', progression: 'autumn', tempo: 120 },
      { label: 'Pares de tríadas en el blues menor', generator: 'triads', progression: 'blues-minor', tempo: 140 },
    ],
    trumpet: ['Los saltos de 4ª y 6ª de las inversiones son ideales como flexibilidad: tocalo ligado primero.'],
    listen: ['Woody Shaw – "The Moontrane"', 'Randy Brecker – cualquier solo de los Brecker Brothers'],
  },
  {
    id: 'pentatonic',
    title: 'Superposición pentatónica',
    area: 'Moderno',
    summary: 'Una pentatónica mayor elegida sobre cada acorde: un sonido de cuartas, abierto, sin notas a evitar.',
    steps: [
      'Aprendé las pentatónicas mayores en las 12 tonalidades (una por día).',
      'Elegí la pentatónica de cada acorde: la de la ♭3 para un m7, la de la 5ª para un maj7, la de la ♭5 para un 7alt y la de la 2ª para un 7♯11.',
      'Tocala subiendo y bajando en grupos de tres notas.',
      'Aplicá el ejercicio sobre un ii–V–i menor y sobre un blues menor.',
      'Combinala con cuartas apiladas (frase "Cuartas sobre un acorde modal" del Vocabulario).',
    ],
    why: [
      'Las pentatónicas tienen sólo cinco notas y ninguna a evitar: suenan bien sobre el acorde para el que se eligen.',
      'Cada acorde tiene una pentatónica que contiene las tensiones que se buscan; la de la ♭5 sobre un 7alt contiene casi todas las alteraciones.',
      'El sonido de cuartas y quintas, típico del jazz moderno, sale solo.',
    ],
    body: [
      '## Elecciones',
      '- m7: pentatónica de la ♭3 (Dm7 → F pentatónica).',
      '- maj7: pentatónica de la 5 (Cmaj7 → G pentatónica: 5, 6, 7, 9, 3).',
      '- 7alt: pentatónica de la ♭5 (C7alt → G♭ pentatónica: ♯11, ♭13, ♭7, ♭9, ♯9).',
      '- 7♯11: pentatónica de la 2.',
      '- m7♭5: pentatónica de la ♭6.',
      'En contextos modales, combiná pentatónicas a distancia de semitono para salir y entrar (side-slipping).',
    ],
    exercises: [
      { label: 'Pentatónicas sobre ii–V–I menor por las 12', generator: 'pent', progression: 'ii-v-i-minor-12', tempo: 110 },
      { label: 'Pentatónicas sobre el blues menor', generator: 'pent', progression: 'blues-minor', tempo: 150 },
      { label: 'Pentatónicas en Blue Bossa', generator: 'pent', progression: 'blue-bossa', tempo: 130 },
      { label: 'Pentatónicas en el ii–V–I', generator: 'pent', progression: 'ii-v-i', tempo: 110 },
    ],
    trumpet: ['Las cuartas son un desafío de flexibilidad. Usalas como ejercicio diario de lip slurs en el calentamiento.'],
    listen: ['Freddie Hubbard – "Maiden Voyage" (con Herbie Hancock)', 'Woody Shaw – "Stepping Stones"'],
  },
  {
    id: 'outside',
    title: 'Side-slipping: salir y volver',
    area: 'Moderno',
    summary: 'Tocar medio tono arriba o abajo del acorde a propósito, y resolver. Lo que importa es la vuelta.',
    steps: [
      'Elegí un acorde (Dm7) y tocá su arpegio: eso es "adentro".',
      'Subí el mismo arpegio medio tono (E♭m7) y tocalo: eso es "afuera".',
      'Practicá la vuelta: terminá el arpegio de afuera y resolvé por semitono a una nota del acorde real.',
      'Alterná un compás adentro con uno que tenga medio compás afuera, con el ejercicio.',
      'Hacelo primero sobre un acorde modal y después sobre un ii–V–I.',
    ],
    why: [
      'El oído tolera la tensión si percibe cuándo termina: lo importante es la resolución.',
      'Medio tono arriba o abajo conserva la forma de la melodía: sólo la desplaza.',
      'Tocado con la misma convicción, "afuera" suena a decisión y no a error.',
    ],
    body: [
      'La tensión "afuera" sólo se escucha como intención si la resolución es inequívoca. Por eso el ejercicio alterna un compás adentro y uno con medio compás afuera.',
      '## Recursos',
      '- Medio tono arriba (E♭m sobre Dm): el más tenso y el más clásico.',
      '- Medio tono abajo (C♯m sobre Dm).',
      '- Repetir una célula transpuesta (secuencia) hasta que vuelva a entrar.',
      'Resolvé siempre por grado conjunto a una nota del acorde y en un tiempo fuerte.',
    ],
    exercises: [
      { label: 'Side-slipping sobre modal', generator: 'sideslip', progression: 'modal', tempo: 160 },
      { label: 'Side-slipping en Autumn Leaves', generator: 'sideslip', progression: 'autumn', tempo: 130 },
      { label: 'Side-slipping en el blues menor', generator: 'sideslip', progression: 'blues-minor', tempo: 140 },
      { label: 'Side-slipping en el ii–V–i menor', generator: 'sideslip', progression: 'ii-v-i-minor-12', tempo: 120 },
    ],
    trumpet: ['Afuera hay que tocar con la misma convicción: mismo sonido, misma articulación. Lo que suena equivocado es la duda.'],
    listen: ['Miles Davis – "So What"', 'Woody Shaw – "Little Red\'s Fantasy"'],
  },
  {
    id: 'rhythm',
    title: 'Desplazamiento rítmico y fraseo',
    area: 'Ritmo y fraseo',
    summary: 'La misma idea empezada una corchea más tarde es otra frase. El swing está en dónde cae el acento.',
    steps: [
      'Elegí una frase que ya sepas (por ejemplo una del Vocabulario).',
      'Tocala empezando en el "y" del tiempo 1: las mismas notas, otros acentos.',
      'Acentuá los contratiempos y ligá hacia el tiempo fuerte siguiente.',
      'Anticipá la resolución: la nota objetivo llega en el "y" del 4, una corchea antes del cambio.',
      'Grabate y compará con una grabación de referencia: el swing se aprende imitando.',
    ],
    why: [
      'El swing no es sólo el ritmo de las corcheas, sino dónde pone el acento el fraseo.',
      'Desplazar una frase cambia sus acentos sin cambiar sus notas: es una forma de multiplicar el vocabulario.',
      'Las anticipaciones rompen la "cuadratura" del compás y hacen que el solo respire.',
    ],
    body: [
      'El fraseo de jazz acentúa los contratiempos y "fantasmea" algunas notas en tiempo fuerte. Desplazar un patrón conocido una corchea te obliga a articular de otra manera.',
      '## Articulación de trompeta',
      '- Legato con "doo" en las corcheas; acento en el contratiempo antes de un cambio de dirección.',
      '- Notas fantasma ("dn") en las notas más graves de una línea descendente.',
      '- La corchea final de una frase corta y articulada ("dat").',
      '- Anticipaciones: la resolución llega en el "y" del 4 y se liga.',
      'Grabate y comparalo con una grabación de referencia: el swing se aprende por imitación, no por reglas.',
    ],
    exercises: [
      { label: '1-2-3-5 desplazado: ii–V–I por las 12', generator: 'displaced', progression: 'ii-v-i-12', tempo: 120 },
      { label: 'Desplazamiento en Rhythm changes', generator: 'displaced', progression: 'rhythm', tempo: 160 },
      { label: 'Desplazamiento en el blues de F', generator: 'displaced', progression: 'blues-f', tempo: 140 },
      { label: 'Desplazamiento en Autumn Leaves', generator: 'displaced', progression: 'autumn', tempo: 140 },
    ],
    trumpet: ['El doodle tonguing ("doo-dl") es la herramienta para el bebop rápido: practicalo lento sobre una sola nota con el metrónomo en 2 y 4.'],
    listen: ['Clifford Brown – "Cherokee"', 'Lee Morgan – "Moanin\'" (Art Blakey)'],
  },
  {
    id: 'blues',
    title: 'Blues: vocabulario y blue notes',
    area: 'Vocabulario',
    summary: 'La ♭3 sobre un acorde mayor, la nota que cambia de función entre I7 y IV7, y el blues de Bird.',
    steps: [
      'Tocá una pentatónica menor sobre un acorde de F7 y notá la ♭3 (A♭), que choca con la 3ª (A).',
      'Tocá el resbalón ♭3 → 3 sobre F7 y sobre B♭7.',
      'Aprendé la frase "Blues: la blue note que resbala" del Vocabulario.',
      'Tocá guide tones sobre el Bird blues.',
      'Improvisá un coro de blues repitiendo una idea con variaciones: pregunta, repetición y respuesta.',
    ],
    why: [
      'La ♭3 sobre un dominante choca con la 3ª y se resuelve en ella: esa fricción es el sonido del blues.',
      'La ♭3 de la tónica (A♭ sobre F7) es la ♭7 del IV (B♭7): una nota, dos funciones.',
      'El blues se construye repitiendo una idea con variaciones, no acumulando notas.',
    ],
    body: [
      'La ♭3 del I (A♭ sobre F7) es la 7ª del IV (B♭7): por eso suena tan natural. Resbalar de ♭3 a 3 es la blue note más usada.',
      'El Bird blues reemplaza los compases estáticos por ii–V descendentes. Tocá guide tones ahí antes de intentar frases.',
    ],
    exercises: [
      { label: 'Guide tones en el Bird blues', generator: 'guide', progression: 'blues-bird', tempo: 140 },
      { label: 'Arpegios en el blues de F', generator: 'arp', progression: 'blues-f', tempo: 150 },
      { label: 'Bebop en el blues de F', generator: 'bebop', progression: 'blues-f', tempo: 150 },
      { label: 'Pentatónicas en el blues menor', generator: 'pent', progression: 'blues-minor', tempo: 150 },
    ],
    trumpet: ['Medias válvulas y glissandos de labio para las blue notes: no todo es altura exacta.'],
    listen: ['Freddie Hubbard – "Birdlike"', 'Clark Terry – "Mumbles"'],
  },
  {
    id: 'subs',
    title: 'Sustitución tritonal, backdoor y Coltrane',
    area: 'Armonía',
    summary: 'Cambiar el V sin cambiar la resolución: D♭7 por G7, B♭7 (backdoor), o un ciclo de terceras mayores.',
    steps: [
      'Ubicá la 3ª y la 7ª de G7 (B y F) y las de D♭7 (F y C♭, que suena como B): son las mismas notas.',
      'Tocá el ii–V–I con G7 y después con D♭7 (sustitución tritonal).',
      'Estudiá el backdoor: Fm7 – B♭7 – Cmaj7.',
      'Probá los cambios de Coltrane con las células 1-2-3-5 a tempo lento.',
      'Estudiá las frases "Sustitución tritonal" y "Backdoor" del Vocabulario.',
    ],
    why: [
      'G7 y D♭7 comparten la 3ª y la 7ª con las funciones invertidas: el esqueleto armónico es el mismo.',
      'La raíz del bajo se mueve por semitono (D – D♭ – C): una línea cromática muy fluida.',
      'El backdoor resuelve a la tónica bajando un tono: suena más suave que el V7 normal.',
    ],
    body: [
      'D♭7 y G7 comparten la 3ª y la 7ª (F y C♭/B): por eso uno reemplaza al otro. La línea puede tocar la sustitución aunque el piano toque el original, y viceversa.',
      'El backdoor (Fm7 – B♭7 – Cmaj7) resuelve por tono ascendente desde la ♭7: suena a final de balada.',
      'Los cambios de Coltrane dividen la octava en tres terceras mayores. Practicalos primero con guide tones y 1-2-3-5.',
    ],
    exercises: [
      { label: 'Guide tones en sustitución tritonal', generator: 'guide', progression: 'tritone', tempo: 120 },
      { label: '1-2-3-5 en cambios de Coltrane', generator: 'digital', progression: 'coltrane', tempo: 110 },
      { label: 'Arpegios desde la 3ª en la sustitución tritonal', generator: 'arp3', progression: 'tritone', tempo: 120 },
      { label: 'Enclosures en la sustitución tritonal', generator: 'enclosure', progression: 'tritone', tempo: 120 },
    ],
    trumpet: ['En ciclos rápidos el registro debe quedar compacto: elegí la inversión que minimiza saltos, no la que te sale.'],
    listen: ['John Coltrane – "Countdown"', 'Woody Shaw – "In a Capricornian Way"'],
  },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
