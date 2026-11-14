import { techniqueAbc } from './techniqueAbc';

/**
 * Ejercicios de práctica (calentamiento y técnica) con explicación completa. En la pantalla Hoy cada uno se muestra como
 * una línea corta que se despliega. Los textos están pensados para la trompeta en Si♭; el pentagrama (ABC) se escribe
 * en altura escrita (la que lee el trompetista) y se transpone a concierto si el usuario elige esa vista.
 */
export interface PracticeExercise {
  id: string;
  /** La línea corta que se ve en el plan del día. */
  short: string;
  /** Para qué sirve. */
  goal: string;
  /** Paso a paso, en el orden en que se hace. */
  steps: string[];
  /** Consejos y errores frecuentes en la trompeta. */
  tips?: string[];
  /** Tempo de metrónomo sugerido. */
  bpm?: number;
  /** Duración orientativa, en minutos. */
  minutes?: number;
  /** Pentagrama en ABC (altura escrita para trompeta en Si♭). Una función recibe la tonalidad del día (concierto). */
  abc?: string | ((concertKey: string) => string);
  /** Lo que muestra el pentagrama, en una línea. */
  abcCaption?: string;
}

/** Un ítem del plan es una línea simple o un ejercicio con su explicación. */
export type PlanItem = string | PracticeExercise;

/** El ABC de un ejercicio, sea fijo o dependiente de la tonalidad del día. */
export const abcOf = (e: PracticeExercise, concertKey: string): string | undefined => (typeof e.abc === 'function' ? e.abc(concertKey) : e.abc);

const HEAD = (bpm: number) => `X:1\nM:4/4\nL:1/4\nQ:1/4=${bpm}\nK:C\n`;
const HEAD8 = (bpm: number) => `X:1\nM:4/4\nL:1/8\nQ:1/4=${bpm}\nK:C\n`;

export const LONG_TONES_LOW: PracticeExercise = {
  id: 'long-tones-low',
  short: 'Notas largas en el registro grave (F♯ a C escritos): sonido abierto y centrado.',
  goal: 'Un sonido abierto, centrado y parejo en el registro grave, donde más se nota si falta aire y apoyo.',
  bpm: 60,
  minutes: 8,
  steps: [
    'Antes de tocar, calentá la musculatura moviendo aire: soplá sin sonido como si empañaras un vidrio y después hacé vibrar los labios sin boquilla, suave, durante un minuto. La idea es despertar el labio con aire, no con presión.',
    'Controlá la postura: de pie, pies al ancho de los hombros y hombros sueltos (o sentado, erguido, sin apoyarte en el respaldo). La trompeta se sostiene con las manos, no con los labios. Respirá por la boca, hondo y sin ruido, sin levantar los hombros.',
    'Poné el metrónomo en 60 bpm. Empezá en C escrito y tocá: negra, negra, blanca, blanca, redonda. Respirá donde está el silencio, sin perder el pulso.',
    'Repetí el mismo patrón bajando de a semitono: B, B♭, A, A♭, G y F♯ escritos.',
    'Intentá que cada nota sea más hermosa y más centrada que la anterior. Sin crescendo ni diminuendo: el volumen queda parejo de principio a fin, en mezzo piano.',
    'Prestá atención al comienzo de cada nota: que nazca limpia, ya con su sonido, sin golpe de lengua ni "pop" y sin buscar la nota.',
    'Prestá atención a la afinación: abrí el Afinador de la app y mantené la aguja quieta cerca de 0 cents durante toda la nota, también al final de la redonda.',
  ],
  tips: [
    'Si sentís que tenés que apretar la boquilla contra los labios, probablemente falta aire: dejá la presión y mandá más aire, tibio y rápido.',
    'Las digitaciones con varios pistones (1-3 y 1-2-3, como el F♯ grave) tienen tendencias de afinación propias y cambian de una trompeta a otra: en muchas salen altas y se corrigen extendiendo la corredera del 3.º, pero en el extremo grave algunas salen bajas. Fijate qué hace la tuya con el Afinador en lugar de suponerlo.',
    'Descansá tanto como tocaste. Si se cansa la cara o el sonido se ensucia, es hora de parar y no de insistir.',
    'Grabate con el celular y escuchá la grabación: se oye mejor lo que está o no centrado.',
  ],
  abcCaption: 'El patrón sobre C y sobre B; seguí bajando de a semitono hasta F♯.',
  abc:
    HEAD(60) +
    '"^C" C C C2 | C2 z2 | C4 |\n' +
    '"^B" B, B, B,2 | B,2 z2 | B,4 |]\n',
};

export const FLEX_HARMONICS: PracticeExercise = {
  id: 'flex-harmonics',
  short: 'Flexibilidad: armónicos 2-3-4-5-4-3-2 en cada posición, ligado.',
  goal: 'Cambiar de armónico con el aire y una mínima ayuda de la lengua, sin saltos intermedios ni presión, para que las notas encajen en su centro.',
  bpm: 60,
  minutes: 8,
  steps: [
    'Primero la posición abierta (sin pistones): los armónicos 2-3-4-5-4-3-2 suenan C-G-C-E-C-G-C escritos. Tocalos en blancas a 60 bpm, todo ligado: un solo golpe de lengua al principio y el resto lo hace el aire.',
    'Para subir, acelerá el aire y subí un poco la lengua hacia el paladar (como al decir "iii"); para bajar, aflojá el aire y bajá la lengua ("aaa"). La garganta queda abierta (la sílaba sólo marca dónde va la lengua), los labios casi no se mueven y no se aprieta la boquilla.',
    'Repetí la serie en cada posición, bajando de a semitono: 2 (B), 1 (B♭), 1-2 (A), 2-3 (A♭), 1-3 (G) y 1-2-3 (F♯). La digitación no cambia durante la serie: sólo cambia el armónico.',
    'Buscá que cada nota "encaje" en su centro, que no se oiga el armónico del medio al pasar de uno a otro y que el sonido no se cierre ni se achique al subir.',
    'Cuando la serie salga limpia dos veces seguidas, subí el metrónomo de a 8 bpm (68, 76, 84…). Si se ensucia, volvé al tempo anterior.',
  ],
  tips: [
    'Si se te cae un armónico, volvé a tocarlo como nota larga, escuchalo bien, y recién ahí repetí la serie.',
    'Calentá suave: la mayor parte del calentamiento va en piano o mezzo piano y el fuerte se deja para el final. Si sube la tensión de la cara, bajá el tempo o descansá.',
  ],
  abcCaption: 'Posición abierta y posición 2 (los números sobre las notas son los armónicos). Las demás posiciones repiten la forma.',
  abc:
    HEAD(60) +
    '"^abierta" "^2"(C2 "^3"G2 | "^4"c2 "^5"e2 | "^4"c2 "^3"G2 | "^2"C4) |\n' +
    '"^pistón 2" "^2"(B,2 "^3"^F2 | "^4"B2 "^5"^d2 | "^4"B2 "^3"^F2 | "^2"B,4) |]\n',
};

export const LIP_BENDING: PracticeExercise = {
  id: 'lip-bending',
  short: 'Bending: bajar y subir un semitono con el labio en cada nota larga.',
  goal: 'Sentir cuánto margen de afinación tiene el labio y controlarlo, para corregir la entonación y para los scoops y caídas del lenguaje jazzístico.',
  bpm: 60,
  minutes: 5,
  steps: [
    'Tocá una nota larga cómoda en el registro medio, por ejemplo G escrito (sin pistones), en redonda a 60 bpm, con sonido centrado.',
    'Sin mover los pistones, dejá bajar la nota un semitono: relajá apenas la tensión de los labios y dejá caer un poco la mandíbula, con el aire dirigido levemente hacia abajo y sin apretar más la boquilla. Después volvé a la altura original.',
    'Mirá el Afinador de la app: la aguja debería recorrer unos −100 cents en forma continua, sin escalones, y volver a 0.',
    'Si te sale con comodidad, hacelo hacia arriba: subí un semitono sin apretar la boquilla ni cerrar el sonido y volvé al centro.',
    'Repetí en otras notas largas, tanto abiertas como con pistones, y fijate en cuál se mueve más fácil y cuál es más dura.',
  ],
  tips: [
    'No se toca así en un solo: sirve para conocer tu margen y para que, cuando una nota salga baja o alta, la corrijas sin pensar.',
    'Si tu profesor te enseña otra forma de hacerlo, seguí la suya: la descripción física de la flexión varía según la escuela.',
    'Si para subir o bajar tenés que apretar, parar: el movimiento sale del labio y del aire, no de la presión.',
  ],
  abcCaption: 'La misma nota, sin tocar los pistones: bajar un semitono y volver; después subir un semitono y volver.',
  abc:
    HEAD(60) +
    '"^↓ ½ tono" G4 | "^↑ ½ tono" G4 |]\n',
};

// ---------------------------------------------------------------------------------------------------------------
// Calentamiento: serie 1
// ---------------------------------------------------------------------------------------------------------------

export const BUZZ_GLISSANDO: PracticeExercise = {
  id: 'buzz-glissando',
  short: 'Buzzing de boquilla: glissandos lentos de una octava, 2 min.',
  goal: 'Despertar los labios y coordinar el aire con la tensión del labio, sin el instrumento, para que el sonido salga fácil desde la primera nota.',
  minutes: 2,
  steps: [
    'Sacá la boquilla de la trompeta. Sostenela con los dedos, sin apretarla: tiene que apoyar apenas sobre los labios.',
    'Inhalá hondo y sin ruido. Hacé sonar un buzz estable en una altura media y cómoda, con los labios sueltos y mucho aire.',
    'Deslizá el buzz hacia arriba una octava, lentamente, como una sirena que sube. El aire se acelera un poco y los labios se tensan de a poco, sin que la boquilla apriete más.',
    'Volvé hacia abajo, lento, con la misma continuidad: sin escalones y sin cortar el sonido.',
    'Repetí durante dos minutos, en frases de un solo aire. Descansá entre frases y cuidá de no marear con la respiración.',
    'Al terminar, tocá una nota larga con la trompeta en el registro medio: tiene que salir más fácil que si hubieras empezado en frío.',
  ],
  tips: [
    'Si el buzz se corta o suena áspero, aflojá la presión de la boquilla y mandá más aire: es la causa más común.',
    'Buscá un sonido de zumbido parejo y claro, no un ruido fino y apretado.',
    'No hace falta que sea fuerte: se trata de calentar, no de rendir.',
  ],
};

export const LONG_TONES_DYNAMICS: PracticeExercise = {
  id: 'long-tones-dynamics',
  short: 'Notas largas pp → ff → pp en el registro medio, con afinador.',
  goal: 'Controlar la dinámica sin que cambie el timbre ni la afinación: crecer y decrecer con el aire, manteniendo el sonido centrado.',
  bpm: 60,
  minutes: 8,
  steps: [
    'Elegí una nota cómoda del registro medio (por ejemplo G escrito, sin pistones) y abrí el Afinador de la app.',
    'Con el metrónomo en 60, tocá la nota en pianissimo durante 4 tiempos: tiene que ser suave pero firme, sin que se afine ni se quiebre.',
    'Hacé un crescendo parejo durante 8 tiempos hasta el fortissimo y volvé a pianissimo en otros 8 tiempos, de un solo aire.',
    'Mientras cambia el volumen, la aguja del afinador debería quedarse cerca de 0 cents: en general los fuertes tienden a salir altos y los suaves bajos; corregilo con el aire y el labio, no moviendo la trompeta.',
    'Escuchá que el timbre sea el mismo en todo el trayecto: que no se abra de más ni se vuelva áspero en el fuerte, ni pierda centro en el suave.',
    'Repetí en otras notas del registro medio, subiendo y bajando de a semitono.',
  ],
  tips: [
    'En el pianissimo, no cierres la garganta: más suave no es menos aire, es un aire más lento y controlado.',
    'En el fortissimo, no empujes la boquilla contra los labios: abrí la garganta y dejá que el aire haga el trabajo.',
    'Si al crecer el sonido salta de armónico o se corta, bajá la intensidad máxima y repetí: la meta es el control, no el volumen.',
  ],
  abcCaption: 'Una nota larga que crece de pp a ff y vuelve a pp (en la práctica, cada tramo dura más de un compás).',
  abc: HEAD(60) + '!pp! !<(! G4 | !<)! !ff! !>(! G4 | !>)! !pp! G4 |]\n',
};

export const LIP_SLURS_POSITIONS: PracticeExercise = {
  id: 'lip-slurs-positions',
  short: 'Lip slurs por armónicos en las 7 posiciones (0, 2, 1, 12, 23, 13, 123), lento.',
  goal: 'Mover el aire y la lengua con suavidad entre armónicos vecinos en todas las digitaciones, para ganar flexibilidad sin tensión.',
  bpm: 60,
  minutes: 7,
  steps: [
    'Posición abierta (0): ligá C - G - C (armónicos 2-3-4) en negras a 60 bpm, un solo aire: ataque suave en la primera nota y el resto de la serie ligado.',
    'Subí el aire y la lengua hacia el paladar ("iii") para subir; aflojá el aire y bajá la lengua ("aaa") para bajar. La garganta queda abierta (la sílaba sólo marca dónde va la lengua) y casi no se mueve el labio.',
    'Repetí con la digitación 2 (la serie suena un semitono más grave), después con 1, 1-2, 2-3, 1-3 y 1-2-3: de más aguda a más grave.',
    'Cada vez que cambia la digitación, empezá con una nota larga, escuchala bien y recién después hacé la serie.',
    'Cuidá que no se oiga ninguna nota intermedia: el pasaje entre armónicos tiene que ser limpio.',
    'Mantené el tempo lento y el volumen suave (piano o mezzo piano): la velocidad llega sola cuando el movimiento sale sin esfuerzo.',
  ],
  tips: [
    'En 1-3 y 1-2-3 todos los armónicos salen altos: extendé un poco la corredera del 3.º mientras hacés la serie.',
    'Los lip slurs son exigentes: hacelos después de las notas largas y el buzz, no en frío, y no insistas en el agudo.',
    'Si una posición se resiste, volvé a la abierta y buscá la sensación que tenías ahí.',
    'Descansá si se fatiga la comisura de los labios: es señal de que se está apretando en vez de soplar.',
  ],
  abcCaption: 'La serie en la posición abierta; se repite en cada digitación bajando de a semitono.',
  abc: HEAD(60) + '(C G c G | C4) |]\n',
};

// ---------------------------------------------------------------------------------------------------------------
// Calentamiento: serie 3
// ---------------------------------------------------------------------------------------------------------------

export const BUZZ_PHRASE: PracticeExercise = {
  id: 'buzz-phrase',
  short: 'Buzzing de boquilla imitando una frase de un solo que estés transcribiendo.',
  goal: 'Fraseo y oído: reproducir con los labios la altura, el ritmo y la articulación de una frase de un solista, antes de pasarla a la trompeta.',
  minutes: 5,
  steps: [
    'Elegí 2 o 4 compases de la transcripción que tengas entre manos (Transcribir, con el loop y la velocidad reducida).',
    'Escuchá la frase varias veces y cantala (o tarareala) hasta saberla de memoria con su ritmo y su swing.',
    'Sin la trompeta, con sólo la boquilla, hacé sonar la frase con el buzz: seguí la dirección de las notas y el ritmo, aunque la altura no sea exacta al principio.',
    'Afiná poco a poco: tocá la frase con el disco a velocidad lenta y fijate si las notas del buzz coinciden con las del solista.',
    'Cuando salga con la boquilla, pasala a la trompeta, a la misma velocidad y con la misma articulación.',
    'Dejá que el fraseo guíe: dónde respira, dónde acentúa, dónde deja espacio.',
  ],
  tips: [
    'La boquilla muestra enseguida si realmente tenés la frase en el oído: si no sale, hay que volver a cantar.',
    'Mantené la presión baja y el aire alto: es un ejercicio de oído y de aire, no de fuerza.',
  ],
};

export const LONG_TONES_FOURTHS: PracticeExercise = {
  id: 'long-tones-fourths',
  short: 'Notas largas en cuartas (C-F-B♭...) con afinador.',
  goal: 'Entrenar el oído de intervalos y el cambio de digitación y de armónico con un sonido sostenido y afinado, siguiendo el ciclo de cuartas que usa la app.',
  bpm: 60,
  minutes: 8,
  steps: [
    'Abrí el Afinador de la app. Tocá C escrito en redonda a 60 bpm, con el sonido centrado y la aguja cerca de 0 cents.',
    'Sin cortar la respiración más de lo necesario, pasá a F (una cuarta arriba), también en redonda. Escuchá el intervalo antes de tocarlo: cantalo mentalmente.',
    'Seguí con B♭, E♭, A♭, D♭, G♭, B, E, A, D y G, completando el ciclo de cuartas. Cuando una nota se pase del registro cómodo, bajala una octava.',
    'Prestá atención a que la afinación de cada nota no dependa de la anterior: ajustá con el labio y la corredera apenas empieza, no después.',
    'Al cambiar de nota, el ataque tiene que ser limpio y del mismo volumen que el resto.',
    'Si te sentís cómodo, repetí el ciclo en negras ligadas, nota a nota, sin cortar el aire.',
  ],
  tips: [
    'Este ciclo es el mismo orden de la tonalidad del día en la app: tocar sus notas largas te prepara para las escalas del día.',
    'Cuando una nota salga mal afinada, no la corrijas apretando: pensá si hay que ajustar la corredera del pistón.',
  ],
  abcCaption: 'Las primeras cuatro notas del ciclo de cuartas (escritas); seguí con el resto.',
  abc: HEAD(60) + 'C4 | F4 | _B4 | _e4 |]\n',
};

export const LIP_SLURS_TRIPLETS: PracticeExercise = {
  id: 'lip-slurs-triplets',
  short: 'Lip slurs en tresillos, rápido y suave, sin presión.',
  goal: 'Ganar velocidad de cambio entre armónicos sin perder suavidad: que el movimiento rápido salga del aire y la lengua, no de la presión.',
  bpm: 60,
  minutes: 5,
  steps: [
    'Retomá la serie de la posición abierta (C-G-C) pero en tresillos de corchea a 60 bpm, todo ligado.',
    'Pensá en una sola dirección: arriba y abajo con un movimiento continuo de aire, sin "saltar" de un armónico a otro.',
    'Si se apretaran los labios, bajá el tempo hasta que el movimiento vuelva a ser suave y recién entonces acelerá.',
    'Subí el metrónomo de a 4 bpm cuando salga limpio dos veces seguidas. No pases de 80 si hay tensión.',
    'Repetí en las posiciones 2 y 1 con el mismo cuidado.',
  ],
  tips: [
    'La velocidad sin presión se logra con aire constante. Si sentís que te apoyás en la boquilla para acelerar, parar y volver al tempo lento.',
    'Escuchá que los tres sonidos del tresillo estén parejos en volumen y en afinación.',
  ],
  abcCaption: 'Tresillos de corchea ligados en la posición abierta (C-G-c).',
  abc: HEAD8(60) + '(3CGc (3cGC (3CGc (3cGC |]\n',
};

// ---------------------------------------------------------------------------------------------------------------
// Calentamiento: series nuevas
// ---------------------------------------------------------------------------------------------------------------

export const BREATH_FLOW: PracticeExercise = {
  id: 'breath-flow',
  short: 'Respiración y aire: inhalar 4 tiempos, exhalar 8 tiempos, sin instrumento.',
  goal: 'Controlar el flujo de aire: inhalar profundo y rápido, exhalar parejo y lento, que es la base de cualquier nota larga o frase.',
  bpm: 60,
  minutes: 3,
  steps: [
    'De pie, con los hombros sueltos y el pecho abierto. Poné el metrónomo en 60.',
    'Inhalá durante 4 tiempos por la boca, sin levantar los hombros: el aire llena la parte baja del torso, sin forzar.',
    'Exhalá durante 8 tiempos soplando un hilo parejo, como si quisieras mover una hoja de papel sostenida frente a la boca sin que se caiga.',
    'Repetí con inhalación de 4 y exhalación de 12, y después de 16. Si te quedás sin aire antes de tiempo, no fuerces: quedate en lo que podés sostener parejo.',
    'Ahora hacelo con la trompeta: inhalá en 4 tiempos y tocá una nota larga en redonda, buscando que el sonido dure lo mismo que el aire.',
  ],
  tips: [
    'No se trata de llenarse al máximo: una inhalación cómoda y completa rinde más que una exagerada.',
    'Si te mareás, parar, respirar normal y volver a empezar con menos repeticiones.',
  ],
};

export const SOFT_ATTACKS: PracticeExercise = {
  id: 'soft-attacks',
  short: 'Ataques suaves: la misma nota con "tu", "du" y "hu", sin golpe.',
  goal: 'Lograr un comienzo de nota limpio y uniforme con distintas articulaciones, desde la más suave hasta la más precisa.',
  bpm: 60,
  minutes: 5,
  steps: [
    'Elegí una nota cómoda del registro medio (por ejemplo G escrito, sin pistones) y poné el metrónomo en 60.',
    'Tocá cuatro negras con la sílaba "tu": la lengua toca apenas detrás de los dientes superiores, como para pronunciar una "t" suave, y se retira enseguida.',
    'Repetí con "du": todavía más suave, la lengua casi no interrumpe el aire. Buscá una nota que "nazca" sola.',
    'Repetí con "hu" (ataque con aire, sin lengua) en una nota larga, para sentir cómo sale el sonido sólo con el soplo.',
    'Alterná las tres articulaciones intentando que suenen igual de limpias y con el mismo volumen y afinación.',
    'Grabate y escuchá si el comienzo de las notas es parejo: ninguno debería sonar a golpe ni a pop.',
  ],
  tips: [
    'El aire va primero y la lengua sólo marca: si la lengua empuja, la nota sale dura.',
    'Un buen ataque suave se oye como una pronunciación casi invisible.',
  ],
  abcCaption: 'Cuatro negras con cada sílaba, en la misma nota.',
  abc: HEAD(60) + '"^tu" G G G G | "^du" G G G G | "^hu" G4 |]\n',
};

export const HIGH_SOFT: PracticeExercise = {
  id: 'high-soft',
  short: 'Registro agudo: notas largas suaves, subiendo de a semitono hasta donde sea cómodo.',
  goal: 'Ir ampliando el registro agudo con sonido relajado y suave, sin presión, para ganar resistencia y flexibilidad.',
  bpm: 60,
  minutes: 5,
  steps: [
    'Empezá en una nota que te salga cómoda en el agudo (por ejemplo E5 escrito) en redonda a 60 bpm, en mezzo piano.',
    'Subí de a semitono, una nota por compás, descansando un compás completo entre una y otra.',
    'Cuidá el aire rápido y la lengua alta ("iii"), sin apretar la boquilla contra los labios.',
    'Cuando una nota cueste, no la fuerces: quedate dos notas por debajo, tocá en el registro cómodo y volvé a intentarlo otro día.',
    'Termina siempre con una nota larga en el registro medio para relajar.',
  ],
  tips: [
    'Hacelo después de calentar bien y limitá el tiempo: pocos minutos de agudo suave todos los días rinden más que insistir una sola vez. Si el labio se cansa, parar.',
    'Si los labios se hinchan o se entumecen, parar y descansar.',
  ],
  abcCaption: 'Ejemplo: E5, F5, F♯5, G5 en redondas (siempre suaves, con descanso entre notas).',
  abc: HEAD(60) + 'e4 | f4 | ^f4 | g4 |]\n',
};

export const TONGUING_REPEATED: PracticeExercise = {
  id: 'tonguing-repeated',
  short: 'Articulación: notas repetidas en negras, corcheas, tresillos y semicorcheas.',
  goal: 'Una articulación pareja, liviana y precisa en distintas velocidades, sin que el aire se corte ni la nota pierda sonido.',
  bpm: 60,
  minutes: 6,
  steps: [
    'Elegí una nota cómoda (por ejemplo G escrito) y poné el metrónomo en 60.',
    'Tocá cuatro negras con "tu", cuatro corcheas, cuatro tresillos y cuatro semicorcheas, sin respirar entre figuras.',
    'Mantené el aire constante y la lengua liviana: la lengua toca la "t" y se retira, el aire no se detiene.',
    'Buscá que cada nota suene igual: el mismo volumen, la misma duración y la misma afinación.',
    'Subí el metrónomo de a 4 bpm cuando el ciclo salga limpio. Si las notas se vuelven duras o se pierden, volvé al tempo anterior.',
    'Para las semicorcheas más rápidas probá el doble picado ("tu-ku"), con el mismo aire.',
  ],
  tips: [
    'Si la articulación suena "apretada", hay demasiada lengua y poco aire.',
    'Escuchá el pulso del metrónomo: la articulación va con él y no corriendo detrás.',
  ],
  abcCaption: 'Negras, corcheas, tresillos y semicorcheas sobre una misma nota.',
  abc: HEAD8(60) + 'G2 G2 G2 G2 | GGGG GGGG | (3GGG (3GGG (3GGG (3GGG | G/G/G/G/ G/G/G/G/ G/G/G/G/ G/G/G/G/ |]\n',
};

export const SLURRED_SCALE: PracticeExercise = {
  id: 'slurred-scale',
  short: 'Escala mayor ligada, lenta: una nota por pulso, un solo aire.',
  goal: 'Ligar notas por digitación, sin romper el aire, con un sonido parejo y una afinación estable en toda la escala.',
  bpm: 60,
  minutes: 5,
  steps: [
    'Elegí una escala conocida (por ejemplo C mayor escrito) y poné el metrónomo en 60.',
    'Tocá la escala ascendente en negras, ligadas, con un solo aire: ataque suave en la primera nota y de ahí en más sólo cambian los dedos.',
    'Movés los dedos al mismo tiempo y con rapidez: que no haya "tropiezos" ni notas intermedias entre una y otra.',
    'El sonido tiene que ser parejo de la primera a la última nota. Prestá atención a las notas que suenan más cortas o apagadas.',
    'Bajá la escala con el mismo cuidado y terminá en una nota larga para controlar el final.',
    'Repetí en otras tonalidades siguiendo el ciclo de cuartas.',
  ],
  tips: [
    'La mayoría de los problemas de ligado vienen de dedos desparejos: practicá solo la digitación, sin sonido, para que los dedos se muevan a la vez.',
    'Si el aire se corta, respirá en la nota que corresponde (cada 4 o 8 notas) y seguí sin perder el pulso.',
  ],
  abcCaption: 'Escala de C mayor escrita, ligada en negras (una octava, subiendo y bajando).',
  abc: HEAD(60) + '(C D E F | G A B c | c B A G | F E D C) |]\n',
};

export const INTERVAL_SLURS: PracticeExercise = {
  id: 'interval-slurs',
  short: 'Intervalos ligados: octavas y saltos amplios, suaves y sin tensión.',
  goal: 'Ensanchar la flexibilidad entre armónicos separados, con aire constante, para que los saltos grandes salgan sin esfuerzo.',
  bpm: 60,
  minutes: 5,
  steps: [
    'Poné el metrónomo en 60. Empezá con octavas ligadas: C-c, D-d, E-e, F-f (escritas), una por compás en blancas.',
    'La lengua y el aire hacen el salto. Pensá en la nota de llegada antes de moverte: cantala mentalmente.',
    'Ataque suave en la primera nota; la segunda nace de un cambio de aire y de la posición de la lengua.',
    'Escuchá que el sonido de llegada sea del mismo volumen y de la misma calidad que el de partida.',
    'Después probá saltos de quinta y de cuarta (C-G, C-F), también ligados.',
    'Si salta o se quiebra, bajá el tempo y buscá primero el sonido de la nota de llegada en nota larga.',
  ],
  tips: [
    'Un salto ligado es sobre todo un cambio de aire, no un golpe de labio.',
    'Si te cuesta, hacelo desde la nota aguda hacia abajo primero: suele ser más fácil de controlar.',
  ],
  abcCaption: 'Octavas ligadas en blancas, subiendo de a tono.',
  abc: HEAD(60) + '(C2 c2) (D2 d2) | (E2 e2) (F2 f2) |]\n',
};

// ---------------------------------------------------------------------------------------------------------------
// Técnica del día (el pentagrama sale en la tonalidad del día)
// ---------------------------------------------------------------------------------------------------------------

export const TECH_THIRDS: PracticeExercise = {
  id: 'tech-thirds',
  short: 'Escala mayor de la tonalidad del día en terceras, dos octavas, corcheas a negra = 120.',
  goal: 'Dominar el mapa de la escala con saltos de tercera, que es la base de arpegios y de muchas líneas de improvisación.',
  bpm: 120,
  minutes: 6,
  steps: [
    'Cantá la escala en voz alta con los nombres de las notas antes de tocarla. Tenela en la cabeza.',
    'Tocá la escala en terceras: 1-3, 2-4, 3-5, 4-6, 5-7, 6-8… hasta cubrir dos octavas (o hasta donde permita el registro), en corcheas.',
    'Empezá lento, a negra = 80, y subí de a 8 bpm hasta 120. Al subir, no aprietes: el sonido debe seguir parejo.',
    'Bajá la escala con el mismo patrón: 8-6, 7-5, 6-4… Cuidá que las dos notas de cada par estén afinadas entre sí.',
    'Con el metrónomo en 2 y 4: las corcheas se sienten swingueadas, no rectas. Al principio, tocá las corcheas rectas y después aplicá swing.',
    'Variá la articulación en cada vuelta: todo ligado, todo picado, y dos ligadas y dos picadas. Cada variante obliga a la lengua y a los dedos a coordinarse de otra forma.',
    'Cuando salga limpia, tocala de memoria, sin el pentagrama.',
  ],
  tips: [
    'Si una tonalidad te cuesta, fijate en cuáles son las notas alteradas de esa escala antes de empezar: pensarlo de antemano evita los errores.',
    'Prestá atención a los saltos entre registros: que la tercera no suene más fuerte ni más débil que las demás.',
  ],
  abcCaption: 'La escala mayor de la tonalidad del día, en terceras.',
  abc: (k) => techniqueAbc('thirds', k, 120),
};

export const TECH_MELODIC_MINOR: PracticeExercise = {
  id: 'tech-melodic-minor',
  short: 'Escala menor melódica de la tonalidad del día en todo el registro, con patrón 1-2-3-5.',
  goal: 'Conocer la escala menor melódica (de donde salen la lidia ♭7, la alterada y otras) y automatizar un patrón de improvisación muy usado.',
  bpm: 100,
  minutes: 6,
  steps: [
    'Armá la escala: es una menor con la 6ª y la 7ª mayores (1-2-♭3-4-5-6-7). Tocala una vez, despacio, subiendo y bajando, para fijar el sonido.',
    'Aplicá el patrón 1-2-3-5 sobre cada grado: 1-2-♭3-5, 2-♭3-4-6, ♭3-4-5-7… subiendo por la escala.',
    'Hacelo en corcheas, a negra = 100. Si es difícil, empezá a 72 y subí de a 8.',
    'Bajá con el patrón invertido (la nota más alta primero): 5-♭3-2-1, 6-4-♭3-2…',
    'Escuchá el sonido de cada grupo: el 1-2-3-5 es un acorde menor con un movimiento de grado conjunto; si lo oís, ya lo tenés.',
    'Cuando salga, probalo sobre un acorde menor en el play-along, sin pentagrama.',
  ],
  tips: [
    'La menor melódica es la misma escala subiendo y bajando (a diferencia de la clásica): no cambies las notas al bajar.',
    'Cantá el patrón antes de tocarlo: que el oído guíe a los dedos.',
  ],
  abcCaption: 'Menor melódica de la tonalidad del día con el patrón 1-2-3-5, subiendo y bajando.',
  abc: (k) => techniqueAbc('melodicMinor1235', k, 100),
};

export const TECH_SEVENTHS: PracticeExercise = {
  id: 'tech-sevenths',
  short: 'Arpegios de 7ª diatónicos de la tonalidad del día, ascendentes y descendentes.',
  goal: 'Conocer los siete acordes de cuatro notas de la tonalidad y poder tocarlos al instante, como base del vocabulario armónico.',
  bpm: 100,
  minutes: 7,
  steps: [
    'Antes de tocar, decí en voz alta los siete acordes de la tonalidad: Imaj7, iim7, iiim7, IVmaj7, V7, vim7, viiø.',
    'Tocá cada arpegio de abajo hacia arriba (1-3-5-7) y de vuelta (5-3-1) en corcheas, sobre cada grado de la escala.',
    'Prestá atención a la calidad de cada arpegio: el de V es dominante (con 7ª menor), el de vii es semidisminuido. Escuchá cómo cambia el color.',
    'Hacelo a negra = 100. Si hay un arpegio que se tropieza, aislalo y repetilo despacio.',
    'Con el metrónomo en 2 y 4 y las corcheas con swing.',
    'Variá la articulación en cada vuelta: todo ligado, todo picado, y dos ligadas y dos picadas.',
    'Cuando salgan, tocalos sobre el acorde correspondiente en el play-along.',
  ],
  tips: [
    'Conectá cada arpegio con el siguiente: la última nota del anterior suele estar cerca de la primera del siguiente.',
    'Si te cuesta recordar las calidades, usá el esquema: maj7, m7, m7, maj7, 7, m7, m7♭5.',
  ],
  abcCaption: 'Los arpegios de 7ª sobre cada grado de la escala mayor de la tonalidad del día (1-3-5-7-5-3-1).',
  abc: (k) => techniqueAbc('sevenths', k, 100),
};

export const TECH_CHROMATIC: PracticeExercise = {
  id: 'tech-chromatic',
  short: 'Escala cromática de dos octavas con doodle tonguing, metrónomo en 2 y 4.',
  goal: 'Coordinar dedos y lengua con velocidad, ligando la articulación al pulso swingueado del jazz.',
  bpm: 100,
  minutes: 6,
  steps: [
    'Tocá la escala cromática de dos octavas desde la tónica, ligada y lenta (a negra = 60) para fijar las digitaciones, subiendo y bajando.',
    'Ahora con articulación: "doodle tonguing" alterna sílabas como "du-gu-du-gu" (o "tu-ku", la de Arban). Probalo primero sólo con aire y sin trompeta, despacio, y siempre con el aire constante detrás.',
    'Con el metrónomo en 2 y 4 (como en el swing), a negra = 100. Tocá las corcheas con la sensación de swing: las que caen en contratiempo son más largas.',
    'Los dedos y la lengua deben ir juntos: si una nota llega antes o después, bajá el tempo.',
    'Subí de a 8 bpm cuando salga limpia.',
    'Terminá con una nota larga en la tónica.',
  ],
  tips: [
    'Si la articulación se vuelve dura, hay demasiada lengua: dejá que el aire haga la mayor parte del trabajo.',
    'Usá las digitaciones alternativas sólo si ayudan a la afinación.',
  ],
  abcCaption: 'Cromática de dos octavas en corcheas, desde la tónica de la tonalidad del día (con sostenidos subiendo y bemoles bajando).',
  abc: (k) => techniqueAbc('chromatic', k, 100),
};

export const TECH_INTERVALS: PracticeExercise = {
  id: 'tech-intervals',
  short: 'Intervalos crecientes desde la tónica (2ª, 3ª, 4ª...) para precisión de ataque.',
  goal: 'Escuchar y alcanzar cada intervalo con precisión de altura y de ataque, que es lo que permite tocar lo que se oye en la cabeza.',
  bpm: 80,
  minutes: 5,
  steps: [
    'Tocá la tónica y la segunda de la escala, alternándolas en negras: 1-2-1-2. Escuchá el intervalo antes de tocarlo.',
    'Seguí con 1-3-1-3, 1-4-1-4, y así hasta la octava, ampliando de a un grado.',
    'Ataques limpios en todas las notas y volumen parejo: que cada nota sea del mismo peso.',
    'Cantá o imaginá la nota de llegada antes de moverte; es la mejor forma de acertar a la primera.',
    'Después probá lo mismo en sentido descendente, desde la tónica de arriba.',
    'Cuando salgan, hacelos sin mirar el pentagrama y de memoria.',
  ],
  tips: [
    'Los saltos amplios se logran con aire más rápido, no con presión.',
    'Si un intervalo suena inestable, tocalo en nota larga para encontrar su centro y repetilo.',
  ],
  abcCaption: 'Intervalos crecientes desde la tónica de la tonalidad del día, hasta la octava.',
  abc: (k) => techniqueAbc('intervals', k, 80),
};

export const TECH_BLUES: PracticeExercise = {
  id: 'tech-blues',
  short: 'Escala de blues de la tonalidad del día, dos octavas, con swing.',
  goal: 'Conocer la escala de blues como material de color, con sus notas azules (♭3, ♭5, ♭7), y tocarla con la articulación del swing.',
  bpm: 100,
  minutes: 5,
  steps: [
    'Cantá la escala 1-♭3-4-♭5-5-♭7 y notá la nota "azul" (♭5), la que le da carácter.',
    'Tocala subiendo y bajando en corcheas, con sonido pleno y articulación suave, a negra = 100.',
    'Enfatizá las notas azules: dales más peso y, si querés, una pequeña inflexión con el labio.',
    'Con el metrónomo en 2 y 4 y las corcheas con swing: las notas en contratiempo un poco más largas.',
    'Probá frases cortas de tu invención con esas notas sobre un blues en el play-along.',
  ],
  tips: [
    'La escala de blues funciona mejor con espacios y repeticiones que como una carrera de notas.',
    'Escuchá cómo suena la ♭5: es tensión; no te quedes en ella, resolvela.',
  ],
  abcCaption: 'Escala de blues de la tonalidad del día, subiendo y bajando.',
  abc: (k) => techniqueAbc('blues', k, 100),
};

export const TECH_TRIADS: PracticeExercise = {
  id: 'tech-triads',
  short: 'Tríada de la tonalidad del día en posición fundamental y en inversiones.',
  goal: 'Ver una tríada en todo el registro: el mismo acorde en tres posiciones, que sirve para encadenar líneas y conectar acordes.',
  bpm: 100,
  minutes: 5,
  steps: [
    'Tocá la tríada mayor de la tonalidad en posición fundamental: 1-3-5, subiendo y bajando, en corcheas.',
    'Seguí con la primera inversión (empieza en la 3ª): 3-5-1-3, subiendo y bajando.',
    'Y con la segunda inversión (empieza en la 5ª): 5-1-3-5, también subiendo y bajando.',
    'Encadená las tres posiciones sin cortar, a negra = 100, con el sonido parejo.',
    'Escuchá cómo las tres posiciones suenan al mismo acorde pero con distinto color.',
    'Probá los mismos patrones sobre una tríada menor (♭3) y escuchá la diferencia.',
  ],
  tips: [
    'Cuidá los saltos entre registros: que las notas de las inversiones no suenen forzadas.',
    'Si una nota aguda cuesta, tocala primero suave y como nota larga.',
  ],
  abcCaption: 'Tríada de la tonalidad del día en posición fundamental, primera y segunda inversión.',
  abc: (k) => techniqueAbc('triads', k, 100),
};

export const TECH_BEBOP: PracticeExercise = {
  id: 'tech-bebop',
  short: 'Escala bebop dominante descendente: la tónica del día como acorde de dominante (7).',
  goal: 'Que las notas del acorde de dominante caigan en los tiempos fuertes, con una nota de paso (la 7ª mayor) que completa los ocho tiempos.',
  bpm: 100,
  minutes: 6,
  steps: [
    'Armá la escala sobre la tónica del día como si fuera un acorde de dominante (7): 1-2-3-4-5-6-♭7 más la 7ª mayor como nota de paso.',
    'Tocala descendiendo desde la octava: 1-7-♭7-6-5-4-3-2-1. Las notas del acorde (1, ♭7, 5, 3) caen en los tiempos.',
    'Empezá lento, a negra = 72, con las corcheas rectas, y cuidá que cada nota del acorde caiga justo con el pulso.',
    'Después aplicá swing y subí de a 8 bpm hasta 100.',
    'Probá empezar desde otras notas del acorde (la ♭7 o la 5ª): mientras las notas del acorde caigan en tiempo, la línea funciona.',
    'Tocalo sobre un acorde de dominante en el play-along.',
  ],
  tips: [
    'La nota de paso (7ª mayor) no se queda: pasa en contratiempo y resuelve a la tónica.',
    'Si perdés la regla de las notas del acorde en los tiempos, volvé a tocarla muy lento.',
  ],
  abcCaption: 'Escala bebop dominante descendente sobre la tónica de la tonalidad del día.',
  abc: (k) => techniqueAbc('bebopDown', k, 100),
};

export const WARMUP_EXERCISES: PracticeExercise[] = [
  BUZZ_GLISSANDO, LONG_TONES_DYNAMICS, LIP_SLURS_POSITIONS, LONG_TONES_LOW, FLEX_HARMONICS, LIP_BENDING, BUZZ_PHRASE, LONG_TONES_FOURTHS,
  LIP_SLURS_TRIPLETS, BREATH_FLOW, SOFT_ATTACKS, HIGH_SOFT, TONGUING_REPEATED, SLURRED_SCALE, INTERVAL_SLURS,
];
export const TECHNIQUE_EXERCISES: PracticeExercise[] = [
  TECH_THIRDS, TECH_MELODIC_MINOR, TECH_SEVENTHS, TECH_CHROMATIC, TECH_INTERVALS, TECH_BLUES, TECH_TRIADS, TECH_BEBOP,
];
