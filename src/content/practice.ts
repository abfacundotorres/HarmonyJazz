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
  /** Pentagrama en ABC (altura escrita para trompeta en Si♭). */
  abc?: string;
  /** Lo que muestra el pentagrama, en una línea. */
  abcCaption?: string;
}

/** Un ítem del plan es una línea simple o un ejercicio con su explicación. */
export type PlanItem = string | PracticeExercise;

const HEAD = (bpm: number) => `X:1\nM:4/4\nL:1/4\nQ:1/4=${bpm}\nK:C\n`;

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
    'En el grave las posiciones con varios pistones (como el F♯ con 1-2-3) suelen salir altas: compensá con la corredera del 3.º (o del 1.º) y con el labio, y confirmalo en el afinador en lugar de suponerlo.',
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
    'Para subir, acelerá el aire y subí un poco la lengua hacia el paladar (como al decir "iii"); para bajar, aflojá el aire y bajá la lengua ("aaa"). Los labios casi no se mueven y no se aprieta la boquilla.',
    'Repetí la serie en cada posición, bajando de a semitono: 2 (B), 1 (B♭), 1-2 (A), 2-3 (A♭), 1-3 (G) y 1-2-3 (F♯). La digitación no cambia durante la serie: sólo cambia el armónico.',
    'Buscá que cada nota "encaje" en su centro, que no se oiga el armónico del medio al pasar de uno a otro y que el sonido no se cierre ni se achique al subir.',
    'Cuando la serie salga limpia dos veces seguidas, subí el metrónomo de a 8 bpm (68, 76, 84…). Si se ensucia, volvé al tempo anterior.',
  ],
  tips: [
    'Si se te cae un armónico, volvé a tocarlo como nota larga, escuchalo bien, y recién ahí repetí la serie.',
    'Mejor suave y fácil que fuerte y apretado: si sube la tensión de la cara, bajá el tempo o descansá.',
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
    'Sin mover los pistones, bajá la nota un semitono con el labio: aflojá un poco la tensión del labio y dejá caer apenas la mandíbula, siempre con el mismo aire. Después volvé a la altura original.',
    'Mirá el Afinador de la app: la aguja debería recorrer unos −100 cents en forma continua, sin escalones, y volver a 0.',
    'Si te sale con comodidad, hacelo hacia arriba: subí un semitono sin apretar la boquilla ni cerrar el sonido y volvé al centro.',
    'Repetí en otras notas largas, tanto abiertas como con pistones, y fijate en cuál se mueve más fácil y cuál es más dura.',
  ],
  tips: [
    'No se toca así en un solo: sirve para conocer tu margen y para que, cuando una nota salga baja o alta, la corrijas sin pensar.',
    'Si para subir o bajar tenés que apretar, parar: el movimiento sale del labio y del aire, no de la presión.',
  ],
  abcCaption: 'La misma nota, sin tocar los pistones: bajar un semitono y volver; después subir un semitono y volver.',
  abc:
    HEAD(60) +
    '"^↓ ½ tono" G4 | "^↑ ½ tono" G4 |]\n',
};
