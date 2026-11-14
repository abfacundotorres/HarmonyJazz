/**
 * Cómo practicar cada tipo de ejercicio generado de las Lecciones. La línea y su desglose los genera la app; acá está el
 * método: qué hacer, en qué orden, qué escuchar y qué cuidar en la trompeta.
 */
export interface ExerciseGuide {
  /** Qué trabaja este ejercicio, en una o dos frases. */
  focus: string;
  /** Pasos específicos de este tipo de línea. */
  steps: string[];
  /** Qué escuchar para saber que está bien. */
  listen: string;
  /** Consejos de ejecución en la trompeta. */
  trumpet: string[];
}

/** Método común a todos los ejercicios: de lo lento y cantado a lo rápido y de memoria. */
export const COMMON_METHOD: string[] = [
  'Leé la línea sin tocar: cantala o solfeala con el nombre de las notas, mirando cómo cada nota se relaciona con el acorde.',
  'Tocala sin acompañamiento, despacio (más o menos a la mitad del tempo sugerido) y sin respirar de más: primero el camino, después la velocidad.',
  'Prendé el metrónomo sólo en 2 y 4 y tocala a ese tempo lento. Después poné el play-along y subí de a 8 bpm cuando salga limpia dos veces seguidas.',
  'Recorré las tonalidades de a una, empezando por las que más te cuestan: no pierdas tiempo en lo que sale fácil y trabajá lo difícil hasta dominarlo, como pedía Clarke. Cuando salga limpia a tempo, tocá "Salió limpio" para registrarlo.',
  'Al final tocala de memoria, sin mirar el pentagrama, y después usá la misma idea en una improvisación corta.',
];

export const GUIDES: Record<string, ExerciseGuide> = {
  guide: {
    focus: 'Una nota por acorde: la 3ª o la 7ª. Es el esqueleto de la armonía: si tu línea conecta bien estas notas, se oyen los cambios.',
    steps: [
      'Tocá cada nota en redonda (o durante todo lo que dura el acorde) y escuchá cómo suena sobre ese acorde: la 3ª le da el color (mayor o menor) y la 7ª la tensión.',
      'Fijate en el movimiento de una nota a la siguiente: suele ser por semitono o por grado conjunto. Esa conducción de voces es lo que hay que oír.',
      'Cantá la línea con el acompañamiento y recién después tocala en la trompeta.',
    ],
    listen: 'Que cada nota "diga" el acorde: si te detenés en ella con el acompañamiento, suena a su lugar y no a una nota cualquiera.',
    trumpet: [
      'Con notas largas, cuidá el sonido centrado y la afinación: cada nota larga se oye entera.',
      'Respirá entre acordes, nunca en medio de una nota.',
    ],
  },
  guide2: {
    focus: 'Dos guide tones por compás (3ª y 7ª), la línea desciende por grado conjunto y resuelve en la 3ª del acorde siguiente.',
    steps: [
      'Tocá la 3ª del primer acorde y bajá a su 7ª, en blancas. Escuchá cómo la 7ª se inclina hacia la 3ª del acorde que sigue.',
      'Cantá la línea mientras suena el acompañamiento. Si la cantás, la tenés.',
      'Después de la primera vuelta, probá cambiar el ritmo (negra con puntillo y corchea, por ejemplo) sin cambiar las notas.',
    ],
    listen: 'La resolución de la 7ª a la 3ª del acorde siguiente: ese movimiento es el que sostiene la armonía.',
    trumpet: [
      'Ligá con suavidad el paso entre las dos notas de cada compás; que no haya salto de volumen.',
      'En las notas largas, cuidá el vibrato: que aparezca sólo al final de la nota, si querés.',
    ],
  },
  arp: {
    focus: 'Arpegios 1-3-5-7-9-7-5-3 sobre cada acorde: conocer el acorde en todo el registro y tocarlo sin pensar.',
    steps: [
      'Antes de tocar, nombrá las cinco notas del acorde en voz alta. Si dudás de una, buscala y cantala.',
      'Tocá cada arpegio como un solo gesto de aire: ligado al principio, con un ataque suave y claro.',
      'Cuando salga limpio, articulá las corcheas con swing y ajustá la intensidad: las notas del acorde más importantes (3ª y 7ª) pueden sonar un poco más.',
      'Llevá el último compás del acorde hacia la primera nota del siguiente: la línea tiene que conectar, no reiniciar.',
    ],
    listen: 'Que el arpegio suene a su acorde: si lo cantás encima del acompañamiento, tiene que encajar sin chocar.',
    trumpet: [
      'Los saltos de tercera son fáciles de desafinar: escuchá antes de tocar y corregí con el labio.',
      'Si la 9ª cuesta en tu registro, tocala una octava abajo y volvé.',
    ],
  },
  arp3: {
    focus: 'Arpegios desde la 3ª: sonar "adentro" sin marcar la fundamental, como un solista y no como un bajista.',
    steps: [
      'Tocá 3-5-7-9 y notá que el resultado es el arpegio de un acorde más: sobre Dm7, la 3ª es F, así que 3-5-7-9 da Fmaj7.',
      'Probá alternar el sentido (subiendo y bajando) como indica el ejercicio, y escuchá cómo cambia la dirección de la línea.',
      'Practicá el empalme entre acordes: la última nota de un arpegio tiene que estar cerca de la primera del siguiente.',
    ],
    listen: 'El color de cada arpegio sobre el acorde: la 9ª y la 7ª se oyen más modernas que la fundamental.',
    trumpet: [
      'Dejá un poco de aire entre frases para que respire la línea.',
      'Si te trabás en el cambio de registro, tocá sólo los dos primeros tiempos hasta que salgan fáciles.',
    ],
  },
  digital: {
    focus: 'Células de cuatro notas (1-2-3-5 y 3-5-7-9) que se transportan sobre cualquier acorde: el vocabulario de Coltrane.',
    steps: [
      'Aprendé las dos células sobre un solo acorde, en las 12 tonalidades, hasta que salgan sin pensar.',
      'Después pasalas por una progresión y observá cuál te toca en cada acorde: cada célula arranca de la nota que está más cerca.',
      'Cambiá el ritmo (tresillos, silencios) sin cambiar las notas.',
    ],
    listen: 'La misma célula suena distinta sobre cada acorde: escuchá cómo el 1-2-3-5 es mayor o menor según el acorde.',
    trumpet: [
      'Articulá todas las notas iguales y con aire constante; que la velocidad salga sin esfuerzo.',
      'Si una célula se tropieza, tocala sola despacio y repetí hasta que se automatice.',
    ],
  },
  enclosure: {
    focus: 'Rodear la nota objetivo: una nota por arriba, una cromática por debajo y después la nota objetivo.',
    steps: [
      'Tocá el enclosure sobre un solo acorde: nota de la escala arriba, cromática abajo y la 3ª. Sentí cómo la tensión se resuelve en la 3ª.',
      'Cantá el esquema "arriba, abajo, objetivo" y escuchá la resolución en la nota del acorde.',
      'Aplicalo a otras notas objetivo (5ª, 7ª) y variá el orden de las aproximaciones.',
    ],
    listen: 'La resolución: el oído espera que la última nota caiga en una nota del acorde; si cae, la aproximación funciona.',
    trumpet: [
      'Las aproximaciones son rápidas pero ligeras: que no suenen más fuertes que la nota objetivo.',
      'La nota objetivo cae en el tiempo y se toca con peso, un poco más larga.',
    ],
  },
  bebop: {
    focus: 'Escala bebop con la nota de paso cromática: las notas del acorde caen en los tiempos fuertes.',
    steps: [
      'Tocá la escala con las corcheas parejas y fijate cuáles caen en tiempo: son notas del acorde.',
      'Empezá en la nota del acorde que prefieras (no siempre la fundamental) y seguí la dirección de la escala.',
      'Aplicá swing y acentuá suavemente los tiempos.',
    ],
    listen: 'El peso de las notas del acorde en los tiempos: la línea suena "adentro" aunque pase por cromatismos.',
    trumpet: [
      'Mantené un aire constante y articulá liviano; no tocar "aplastado".',
      'Al bajar, evitá acelerar: la línea tiene que seguir el pulso.',
    ],
  },
  triads: {
    focus: 'Pares de tríadas: dos tríadas sin notas en común que juntas dan una escala hexatónica, para un sonido moderno y compacto.',
    steps: [
      'Armá las dos tríadas sobre un acorde y tocalas por separado, escuchando el color de cada una sobre el acorde.',
      'Tocalas en zigzag: una sube y la otra baja, cada una empezando en la nota más cercana a donde estabas.',
      'Después pasalas por la progresión del ejercicio y fijate cuál par corresponde a cada acorde.',
    ],
    listen: 'El color de cada tríada contra el acorde: algunas suenan "adentro" y otras traen tensión.',
    trumpet: [
      'Los saltos entre tríadas necesitan aire y ataques limpios; practicalos lento.',
      'Cuidá la afinación de las notas aguda y grave de cada tríada.',
    ],
  },
  pent: {
    focus: 'Pentatónicas elegidas para cada acorde: un color más abierto y moderno con muy pocas notas.',
    steps: [
      'Tocá la pentatónica elegida sobre el acorde y escuchá cómo suena: algunas notas son del acorde y otras tensiones.',
      'Practicá en ambos sentidos (subiendo y bajando) como indica el ejercicio.',
      'Variá el ritmo y los saltos: en pentatónicas los intervalos amplios son parte del sonido.',
    ],
    listen: 'La diferencia de color entre la pentatónica y la escala completa: más abierta, menos "de libro".',
    trumpet: [
      'Los saltos de cuarta y de tercera requieren aire constante y labio flexible.',
      'Mantené las notas largas con centro; el sonido es lo que da carácter a estas líneas.',
    ],
  },
  sideslip: {
    focus: 'Side-slipping: salir medio tono "afuera" y volver al acorde real. La tensión sólo funciona si la resolución es clara.',
    steps: [
      'Tocá el arpegio del acorde (adentro) y después medio tono arriba (afuera), y volvé al acorde con claridad.',
      'Escuchá el contraste: lo importante es que el regreso se note.',
      'Probalo a velocidad lenta hasta que el pasaje a "afuera" y la vuelta salgan sin tropiezos.',
    ],
    listen: 'La tensión del "afuera" y la sensación de alivio al volver: si no se siente el alivio, falta claridad en la vuelta.',
    trumpet: [
      'La afinación tiene que ser precisa también "afuera": son notas intencionales, no errores.',
      'Tocá el regreso con peso, un poco más fuerte y largo.',
    ],
  },
  displaced: {
    focus: 'Desplazamiento rítmico: el mismo patrón digital empezando en el contratiempo, que cambia por completo dónde caen los acentos.',
    steps: [
      'Tocá primero el patrón sin desplazar, para fijar las notas.',
      'Ahora con la corchea de silencio al principio: las mismas notas pero con los acentos en otro lugar.',
      'Contá en voz alta "1 y 2 y…" mientras tocás para no perder el pulso.',
    ],
    listen: 'Cómo el mismo patrón "suena distinto" sin cambiar las notas: sólo cambia dónde se apoya.',
    trumpet: [
      'No acentúes de más: el desplazamiento se oye por la ubicación, no por la fuerza.',
      'Respirá donde cae el silencio.',
    ],
  },
};
