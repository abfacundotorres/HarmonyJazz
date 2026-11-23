/**
 * Qué estudiar y en qué orden. La lista sale de cuatro listas publicadas de standards «para saber» (se citan en Créditos): de ellas
 * sólo se toman los TÍTULOS y compositores —datos, no contenido— y cuántas listas coinciden en cada tema. No hay acordes ni melodías
 * de nadie: el cifrado lo cargás vos (Play-along → Mi colección o Mis temas).
 *
 * El ORDEN en etapas es criterio propio (de lo más simple a lo más exigente, por forma y armonía) y no sale de ninguna de las listas:
 * dos son alfabéticas y las otras dos no declaran un orden de estudio. Tampoco se revisó con un docente.
 */
export const FUENTES = [
  { id: 'ljs50', nombre: 'Learn Jazz Standards: 50 Must-Know Jazz Standards', url: 'https://www.learnjazzstandards.com/blog/50-jazz-standards-you-need-to-know/' },
  { id: 'ljs20', nombre: 'Learn Jazz Standards: 20 Easy Jazz Standards', url: 'https://www.learnjazzstandards.com/blog/20-easy-jazz-standards/' },
  { id: 'ja50', nombre: 'Jazzadvice: Top 50 Jazz Standards', url: 'https://www.jazzadvice.com/top-50-jazz-standards/' },
  { id: 'jf50', nombre: 'JazzFuel: 50 Essential Jazz Standards', url: 'https://jazzfuel.com/essential-jazz-standards/' },
] as const;
export type FuenteId = (typeof FUENTES)[number]['id'];

export interface TemaEstudio {
  titulo: string;
  autor: string;
  /** Listas que lo incluyen. */
  fuentes: FuenteId[];
  etapa: 1 | 2 | 3 | 4;
  /** Palabras (sin acentos ni signos) para buscarlo en la colección. */
  q: string;
  /** Otros nombres con que se lo conoce, para reconocerlo en Mis temas. */
  alias?: string[];
  /** Por qué va ahí (criterio propio), si hay algo concreto para decir. */
  nota?: string;
}

export const ETAPAS: { n: 1 | 2 | 3 | 4; titulo: string; texto: string }[] = [
  { n: 1, titulo: 'Blues y formas cortas', texto: 'Armonía simple o muy repetida y formas fáciles de retener: ahí se aprenden el ii–V–I, el blues y a no perderse en la forma.' },
  { n: 2, titulo: 'Los infaltables', texto: 'Baladas y temas de 32 compases con ii–V–I mayores y menores, y los que más aparecen en las listas. Con las etapas 1 y 2 ya tenés un repertorio de jam.' },
  { n: 3, titulo: 'Bebop y rhythm changes', texto: 'Melodías rápidas y formas que se reutilizan (rhythm changes, cambios de Parker): pide más técnica y oído que las anteriores.' },
  { n: 4, titulo: 'Armonía más exigente', texto: 'Cambios de centro tonal frecuentes y progresiones menos obvias. Mejor dejarlos para cuando las etapas anteriores salgan sin pensar.' },
];

const T = (etapa: TemaEstudio['etapa'], titulo: string, autor: string, fuentes: FuenteId[], q: string, extra: Pick<TemaEstudio, 'alias' | 'nota'> = {}): TemaEstudio => ({ titulo, autor, fuentes, etapa, q, ...extra });

export const TEMAS_ESTUDIO: TemaEstudio[] = [
  // 1 · blues y formas cortas
  T(1, 'C-Jam Blues', 'Duke Ellington', ['ljs20'], 'c jam blues', { nota: 'Blues de 12 compases con una melodía de dos notas.' }),
  T(1, 'Blue Monk', 'Thelonious Monk', ['ljs20'], 'blue monk', { nota: 'Blues de 12 compases.' }),
  T(1, 'Billie’s Bounce', 'Charlie Parker', ['ljs50', 'ja50'], 'billie bounce', { nota: 'El blues de bebop: la referencia para los demás blues.' }),
  T(1, 'Mr. P.C.', 'John Coltrane', ['ljs20', 'ja50'], 'mr p c', { alias: ['mr pc'], nota: 'Blues menor de 12 compases.' }),
  T(1, 'All Blues', 'Miles Davis', ['jf50', 'ljs20', 'ja50'], 'all blues', { nota: 'Blues en 6/4: la app todavía no maneja ese compás.' }),
  T(1, 'Blue Bossa', 'Kenny Dorham', ['ljs50', 'ljs20', 'ja50', 'jf50'], 'blue bossa', { nota: '16 compases con ii–V–i menor y ii–V–I mayor: la mejor primera forma corta.' }),
  T(1, 'Autumn Leaves', 'Joseph Kosma', ['ljs50', 'ljs20', 'ja50', 'jf50'], 'autumn leaves', { nota: 'ii–V–I mayores y menores sobre dos tonalidades relativas.' }),
  T(1, 'All of Me', 'Gerald Marks', ['ljs50', 'ja50'], 'all of me', { nota: 'Melodía fácil y dominantes que resuelven una quinta abajo.' }),
  T(1, 'Fly Me to the Moon', 'Bart Howard', ['ljs50', 'jf50', 'ljs20'], 'fly me to the moon', { alias: ['in other words'], nota: 'Círculo de quintas casi todo el tema.' }),
  T(1, 'Summertime', 'George Gershwin', ['jf50', 'ljs20'], 'summertime'),
  // 2 · los infaltables
  T(2, 'What Is This Thing Called Love', 'Cole Porter', ['ljs50', 'ljs20', 'ja50', 'jf50'], 'what is this thing called love'),
  T(2, 'There Is No Greater Love', 'Isham Jones', ['ljs50', 'ljs20', 'ja50', 'jf50'], 'there is no greater love'),
  T(2, 'Alone Together', 'Arthur Schwartz', ['ljs50', 'ja50', 'jf50'], 'alone together'),
  T(2, 'Days of Wine and Roses', 'Henry Mancini', ['ljs50', 'ja50', 'jf50'], 'days of wine and roses'),
  T(2, 'Satin Doll', 'Duke Ellington / Billy Strayhorn', ['ljs50', 'jf50'], 'satin doll', { nota: 'Cadenas de ii–V muy claras: sirve para practicarlas.' }),
  T(2, 'Take the “A” Train', 'Billy Strayhorn', ['ljs50', 'ja50', 'jf50'], 'a train', { alias: ['take the a train'] }),
  T(2, 'St. Thomas', 'Sonny Rollins', ['ljs50', 'ljs20', 'jf50'], 'thomas', { alias: ['saint thomas'] }),
  T(2, 'Doxy', 'Sonny Rollins', ['ljs50', 'ljs20', 'ja50'], 'doxy'),
  T(2, 'Black Orpheus', 'Luiz Bonfá', ['ljs50', 'ja50'], 'black orpheus', { alias: ['manha de carnaval'] }),
  T(2, 'The Girl from Ipanema', 'Antonio Carlos Jobim', ['ljs50', 'jf50'], 'girl from ipanema', { alias: ['garota de ipanema'] }),
  T(2, 'Misty', 'Erroll Garner', ['ljs50', 'jf50'], 'misty'),
  T(2, 'My Funny Valentine', 'Richard Rodgers', ['ljs50', 'jf50'], 'my funny valentine'),
  T(2, 'Bye Bye Blackbird', 'Ray Henderson', ['ljs50', 'ja50'], 'bye bye blackbird'),
  T(2, 'It Could Happen to You', 'Jimmy Van Heusen', ['ljs50', 'ja50', 'jf50'], 'it could happen to you'),
  T(2, 'But Not for Me', 'George Gershwin', ['ljs50', 'ja50', 'jf50'], 'but not for me'),
  T(2, 'Just Friends', 'John Klenner', ['ljs50', 'ja50', 'jf50'], 'just friends'),
  T(2, 'There Will Never Be Another You', 'Harry Warren', ['ljs50', 'ja50', 'jf50'], 'there will never be another you'),
  T(2, 'I Remember You', 'Victor Schertzinger', ['ljs50', 'ja50'], 'i remember you'),
  T(2, 'If I Were a Bell', 'Frank Loesser', ['ljs50', 'ja50'], 'if i were a bell'),
  T(2, 'I Love You', 'Cole Porter', ['ljs50', 'ja50'], 'i love you'),
  T(2, 'Night and Day', 'Cole Porter', ['ljs50', 'ja50', 'jf50'], 'night and day'),
  T(2, 'Out of Nowhere', 'Johnny Green', ['ja50', 'jf50'], 'out of nowhere'),
  T(2, 'Softly, as in a Morning Sunrise', 'Sigmund Romberg', ['ja50', 'jf50'], 'softly as in a morning sunrise'),
  T(2, 'Footprints', 'Wayne Shorter', ['ljs50', 'ja50'], 'footprints'),
  T(2, 'In a Sentimental Mood', 'Duke Ellington', ['ljs50', 'jf50'], 'in a sentimental mood'),
  T(2, 'Caravan', 'Juan Tizol / Duke Ellington', ['ja50', 'jf50'], 'caravan'),
  T(2, 'Song for My Father', 'Horace Silver', ['ljs20'], 'song for my father'),
  T(2, 'Watermelon Man', 'Herbie Hancock', ['ljs20'], 'watermelon man'),
  T(2, 'Work Song', 'Nat Adderley', ['ljs20'], 'work song'),
  T(2, 'Bag’s Groove', 'Milt Jackson', ['ljs20'], 'bag groove', { nota: 'Blues.' }),
  T(2, 'Cold Duck Time', 'Eddie Harris', ['ljs20'], 'cold duck time'),
  T(2, 'Mack the Knife', 'Kurt Weill', ['ljs20'], 'mack the knife'),
  // 3 · bebop y rhythm changes
  T(3, 'Oleo', 'Sonny Rollins', ['ljs50', 'ja50'], 'oleo', { nota: 'Rhythm changes.' }),
  T(3, 'Lester Leaps In', 'Lester Young', ['ljs20'], 'lester leaps in', { nota: 'Rhythm changes.' }),
  T(3, 'Confirmation', 'Charlie Parker', ['ljs50', 'ja50'], 'confirmation'),
  T(3, 'Scrapple from the Apple', 'Charlie Parker', ['ljs50', 'ja50'], 'scrapple from the apple'),
  T(3, 'My Little Suede Shoes', 'Charlie Parker', ['ljs20'], 'my little suede shoes'),
  T(3, 'A Night in Tunisia', 'Dizzy Gillespie', ['ja50', 'jf50'], 'night in tunisia'),
  T(3, 'Cherokee', 'Ray Noble', ['ljs50', 'ja50', 'jf50'], 'cherokee'),
  T(3, 'How High the Moon', 'Morgan Lewis', ['ljs50', 'ja50', 'jf50'], 'how high the moon'),
  T(3, 'Four', 'Miles Davis', ['ljs50', 'ja50', 'jf50'], 'four'),
  T(3, 'Solar', 'Miles Davis', ['ljs50', 'ja50', 'jf50'], 'solar'),
  T(3, 'So What', 'Miles Davis', ['ljs50', 'ja50', 'jf50'], 'so what', { nota: 'Modal: dos acordes en 32 compases; se estudia distinto que los demás.' }),
  T(3, 'Up Jumped Spring', 'Freddie Hubbard', ['ljs50', 'ja50'], 'up jumped spring'),
  // 4 · armonía más exigente
  T(4, 'All the Things You Are', 'Jerome Kern', ['ljs50', 'ja50', 'jf50'], 'all the things you are', { nota: 'Pasa por varias tonalidades; muy útil para aprender a reconocerlas.' }),
  T(4, 'Stella by Starlight', 'Victor Young', ['ljs50', 'ja50', 'jf50'], 'stella by starlight'),
  T(4, 'Body and Soul', 'Johnny Green', ['ljs50', 'ja50', 'jf50'], 'body and soul'),
  T(4, 'Have You Met Miss Jones?', 'Richard Rodgers', ['ljs50', 'ja50', 'jf50'], 'have you met miss jones'),
  T(4, 'Recorda Me', 'Joe Henderson', ['ljs50', 'ja50', 'jf50'], 'recorda me', { alias: ['recordame', 'remember me'] }),
  T(4, 'On Green Dolphin Street', 'Bronislaw Kaper', ['ljs50', 'ja50', 'jf50'], 'green dolphin street'),
  T(4, 'I Hear a Rhapsody', 'Fragos / Baker / Gasparre', ['ljs50', 'ja50'], 'i hear a rhapsody'),
  T(4, 'If I Should Lose You', 'Ralph Rainger', ['ljs50', 'ja50'], 'if i should lose you'),
  T(4, 'I’ll Remember April', 'Gene de Paul', ['ljs50', 'ja50'], 'i ll remember april', { alias: ['ill remember april'] }),
];

/** Minúsculas, sin acentos, sin paréntesis ni signos y sin artículos: «Girl From Ipanema, The» ≈ «The Girl from Ipanema». */
export function normalizarTitulo(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[-–]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter((w) => w && w !== 'the' && w !== 'a')
    .join(' ');
}

/** Id del tema de Mis temas que corresponde a este standard (por título o alias), si está. */
export function idEnMisTemas(t: TemaEstudio, tunes: readonly { id: string; name: string }[]): string | null {
  const claves = new Set([t.titulo, ...(t.alias ?? [])].map(normalizarTitulo));
  return tunes.find((x) => claves.has(normalizarTitulo(x.name)))?.id ?? null;
}

/** El primer tema de la lista (en el orden de estudio) que todavía no está en Mis temas. */
export function siguienteSugerido(tunes: readonly { id: string; name: string }[]): TemaEstudio | null {
  return TEMAS_ESTUDIO.find((t) => idEnMisTemas(t, tunes) === null) ?? null;
}

export const temasDeEtapa = (n: number): TemaEstudio[] => TEMAS_ESTUDIO.filter((t) => t.etapa === n);
