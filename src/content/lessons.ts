export interface LessonExercise {
  label: string;
  /** Generador de ejercicios o lick del vocabulario. */
  generator?: string;
  lick?: string;
  progression: string;
  /** Tempo sugerido para empezar. */
  tempo?: number;
}

export interface Lesson {
  id: string;
  title: string;
  area: 'Armonía' | 'Vocabulario' | 'Ritmo y fraseo' | 'Moderno';
  summary: string;
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
      { label: 'Frase: ii–V corto con enclosure', lick: 'enclosure-251', progression: 'ii-v-i-short', tempo: 140 },
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
      { label: 'Frase: bebop descendente en el V', lick: 'bebop-scale-251', progression: 'ii-v-i', tempo: 140 },
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
    body: [
      'En cambios rápidos no hay tiempo para escalas: una célula fija (1-2-3-5, 3-5-7-9, 5-3-2-1) aplicada a cada acorde produce líneas coherentes y te deja la mente libre para escuchar.',
      'Combiná células: subí con 1-2-3-5, bajá con 5-3-2-1, encadená la última nota de un acorde con la más cercana del siguiente.',
      'Cuando funcione, aplicalo sobre los cambios de Coltrane: el patrón es el mismo, sólo cambia la raíz cada dos tiempos.',
    ],
    exercises: [
      { label: '1-2-3-5 / 3-5-7-9 sobre ii–V–I por las 12', generator: 'digital', progression: 'ii-v-i-12', tempo: 120 },
      { label: 'Cambios de Coltrane', generator: 'digital', progression: 'coltrane', tempo: 110 },
      { label: 'Ciclo de terceras mayores (Giant Steps)', generator: 'digital', progression: 'giant', tempo: 120 },
    ],
    trumpet: ['Empezá ligado para pensar la digitación, después articulá cada nota: la coordinación lengua-dedos es el cuello de botella en la trompeta.'],
    listen: ['John Coltrane – "Giant Steps", "Countdown"', 'Freddie Hubbard – "Red Clay"'],
  },
  {
    id: 'minor-251',
    title: 'ii–V–i menor y el dominante alterado',
    area: 'Armonía',
    summary: 'Locria ♮2, alterada y menor melódica: tres modos de dos escalas menores melódicas. Un solo sistema.',
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
      { label: 'Frase: ii–V–i menor alterado', lick: 'minor-251', progression: 'ii-v-i-minor', tempo: 130 },
      { label: 'Pentatónica de ♭5 sobre el alterado', generator: 'pent', progression: 'ii-v-i-minor', tempo: 120 },
    ],
    trumpet: ['Las alteraciones en el registro medio-agudo (A♭, B♭, D♭ escritos) son notas de afinación delicada: verificalas con el afinador.'],
    listen: ['Woody Shaw – "Rosewood"', 'Lee Morgan – "Ceora" (escuchá las resoluciones)'],
  },
  {
    id: 'triad-pairs',
    title: 'Pares de tríadas',
    area: 'Moderno',
    summary: 'Dos tríadas sin notas comunes forman una escala de 6 notas con sonido abierto y moderno.',
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
    ],
    trumpet: ['Los saltos de 4ª y 6ª de las inversiones son ideales como flexibilidad: tocalo ligado primero.'],
    listen: ['Woody Shaw – "The Moontrane"', 'Randy Brecker – cualquier solo de los Brecker Brothers'],
  },
  {
    id: 'pentatonic',
    title: 'Superposición pentatónica',
    area: 'Moderno',
    summary: 'Una pentatónica mayor elegida sobre cada acorde: un sonido de cuartas, abierto, sin notas a evitar.',
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
    ],
    trumpet: ['Las cuartas son un desafío de flexibilidad. Usalas como ejercicio diario de lip slurs en el calentamiento.'],
    listen: ['Freddie Hubbard – "Maiden Voyage" (con Herbie Hancock)', 'Woody Shaw – "Stepping Stones"'],
  },
  {
    id: 'outside',
    title: 'Side-slipping: salir y volver',
    area: 'Moderno',
    summary: 'Tocar medio tono arriba o abajo del acorde a propósito, y resolver. Lo que importa es la vuelta.',
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
    ],
    trumpet: ['Afuera hay que tocar con la misma convicción: mismo sonido, misma articulación. Lo que suena equivocado es la duda.'],
    listen: ['Miles Davis – "So What"', 'Woody Shaw – "Little Red\'s Fantasy"'],
  },
  {
    id: 'rhythm',
    title: 'Desplazamiento rítmico y fraseo',
    area: 'Ritmo y fraseo',
    summary: 'La misma idea empezada una corchea más tarde es otra frase. El swing está en dónde cae el acento.',
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
      { label: 'Frase: anticipación de la resolución', lick: 'anticipation-251', progression: 'ii-v-i-short', tempo: 150 },
    ],
    trumpet: ['El doodle tonguing ("doo-dl") es la herramienta para el bebop rápido: practicalo lento sobre una sola nota con el metrónomo en 2 y 4.'],
    listen: ['Clifford Brown – "Cherokee"', 'Lee Morgan – "Moanin\'" (Art Blakey)'],
  },
  {
    id: 'blues',
    title: 'Blues: vocabulario y blue notes',
    area: 'Vocabulario',
    summary: 'La ♭3 sobre un acorde mayor, la nota que cambia de función entre I7 y IV7, y el blues de Bird.',
    body: [
      'La ♭3 del I (A♭ sobre F7) es la 7ª del IV (B♭7): por eso suena tan natural. Resbalar de ♭3 a 3 es la blue note más usada.',
      'El Bird blues reemplaza los compases estáticos por ii–V descendentes. Tocá guide tones ahí antes de intentar frases.',
    ],
    exercises: [
      { label: 'Frase: la blue note que resbala', lick: 'blues-blue-note', progression: 'blues-f', tempo: 140 },
      { label: 'Guide tones en el Bird blues', generator: 'guide', progression: 'blues-bird', tempo: 140 },
      { label: 'Arpegios en el blues de F', generator: 'arp', progression: 'blues-f', tempo: 150 },
    ],
    trumpet: ['Medias válvulas y glissandos de labio para las blue notes: no todo es altura exacta.'],
    listen: ['Freddie Hubbard – "Birdlike"', 'Clark Terry – "Mumbles"'],
  },
  {
    id: 'subs',
    title: 'Sustitución tritonal, backdoor y Coltrane',
    area: 'Armonía',
    summary: 'Cambiar el V sin cambiar la resolución: D♭7 por G7, B♭7 (backdoor), o un ciclo de terceras mayores.',
    body: [
      'D♭7 y G7 comparten la 3ª y la 7ª (F y C♭/B): por eso uno reemplaza al otro. La línea puede tocar la sustitución aunque el piano toque el original, y viceversa.',
      'El backdoor (Fm7 – B♭7 – Cmaj7) resuelve por tono ascendente desde la ♭7: suena a final de balada.',
      'Los cambios de Coltrane dividen la octava en tres terceras mayores. Practicalos primero con guide tones y 1-2-3-5.',
    ],
    exercises: [
      { label: 'Guide tones en sustitución tritonal', generator: 'guide', progression: 'tritone', tempo: 120 },
      { label: '1-2-3-5 en cambios de Coltrane', generator: 'digital', progression: 'coltrane', tempo: 110 },
      { label: 'Frase: ii–V–I bebop con ♭9 y ♭13', lick: 'bebop-251', progression: 'ii-v-i', tempo: 140 },
    ],
    trumpet: ['En ciclos rápidos el registro debe quedar compacto: elegí la inversión que minimiza saltos, no la que te sale.'],
    listen: ['John Coltrane – "Countdown"', 'Woody Shaw – "In a Capricornian Way"'],
  },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
