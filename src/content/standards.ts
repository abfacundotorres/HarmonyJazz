import type { Style } from '../audio/engine';
import type { ChartDoc, DocBar } from './chartDoc';
import type { Progression } from './progressions';

/**
 * Repertorio: SÓLO la armonía (cifrado) de standards conocidos, sin melodía ni letra.
 *
 * Por qué es legal: la protección del derecho de autor sobre una canción recae en la melodía y la letra;
 * una sucesión de acordes no se protege por sí sola (por eso los músicos de jazz escriben "contrafacts",
 * temas nuevos sobre la armonía de otro: "Anthropology" sobre "I Got Rhythm", "Donna Lee" sobre "Indiana").
 * Los cifrados de acá están escritos a mano en su versión habitual de jam session, no copiados de un libro
 * en particular (las rearmonizaciones propias de cada edición sí podrían ser de su editor).
 *
 * Los temas marcados `publicDomain` además son de dominio público en EE. UU. (publicados en 1930 o antes).
 *
 * Están escritos de memoria: si un compás no coincide con la grabación que escuchás, copialo a "Mis temas"
 * y corregilo en el editor.
 */
export interface Standard {
  id: string;
  name: string;
  composer: string;
  year?: number;
  publicDomain?: boolean;
  key: string;
  mode: 'major' | 'minor';
  tempo: number;
  style?: Style;
  /** Secciones en orden de la forma: [rótulo, compases separados por "|"]. */
  form: [label: string, bars: string][];
  notes: string;
  listen?: string[];
}

const S: Standard[] = [
  {
    id: 'std-all-the-things',
    name: 'All the Things You Are',
    composer: 'Jerome Kern',
    year: 1939,
    key: 'Ab',
    mode: 'major',
    tempo: 160,
    form: [
      ['A', 'Fm7 | Bbm7 | Eb7 | Abmaj7 | Dbmaj7 | G7 | Cmaj7 | Cmaj7'],
      ['A', 'Cm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | D7 | Gmaj7 | Gmaj7'],
      ['B', 'Am7 | D7 | Gmaj7 | Gmaj7 | F#m7b5 | B7 | Emaj7 | C7alt'],
      ['A', 'Fm7 | Bbm7 | Eb7 | Abmaj7 | Dbmaj7 | Dbm7 | Cm7 | Bdim7 | Bbm7 | Eb7 | Abmaj7 | Gm7b5 C7b9'],
    ],
    notes: '36 compases y cinco tonalidades. La segunda A repite la primera una 5ª más abajo. Para volver del puente, la G♯ (3ª de Emaj7) se reescribe como A♭ (♭3 de Fm7): una nota común une las dos tonalidades.',
    listen: ['Clifford Brown & Max Roach', 'Sonny Rollins – "Sonny Meets Hawk!"'],
  },
  {
    id: 'std-a-train',
    name: 'Take the "A" Train',
    composer: 'Billy Strayhorn',
    year: 1939,
    key: 'C',
    mode: 'major',
    tempo: 170,
    form: [
      ['A', 'Cmaj7 | Cmaj7 | D7#11 | D7#11 | Dm7 | G7 | Cmaj7 | Dm7 G7'],
      ['A', 'Cmaj7 | Cmaj7 | D7#11 | D7#11 | Dm7 | G7 | Cmaj7 | Cmaj7'],
      ['B', 'Fmaj7 | Fmaj7 | Fmaj7 | Fmaj7 | D7 | D7 | Dm7 | G7'],
      ['A', 'Cmaj7 | Cmaj7 | D7#11 | D7#11 | Dm7 | G7 | Cmaj7 | Dm7 G7'],
    ],
    notes: 'AABA de 32. El II7 con ♯11 (D7♯11) es el color del tema: la F♯ es la nota a buscar.',
    listen: ['Duke Ellington Orchestra (1941)', 'Clark Terry'],
  },
  {
    id: 'std-satin-doll',
    name: 'Satin Doll',
    composer: 'Duke Ellington, Billy Strayhorn',
    year: 1953,
    key: 'C',
    mode: 'major',
    tempo: 130,
    form: [
      ['A', 'Dm7 G7 | Dm7 G7 | Em7 A7 | Em7 A7 | Am7 D7 | Abm7 Db7 | Cmaj7 | Cmaj7'],
      ['A', 'Dm7 G7 | Dm7 G7 | Em7 A7 | Em7 A7 | Am7 D7 | Abm7 Db7 | Cmaj7 | Cmaj7'],
      ['B', 'Gm7 C7 | Gm7 C7 | Fmaj7 | Fmaj7 | Am7 D7 | Am7 D7 | Dm7 | G7'],
      ['A', 'Dm7 G7 | Dm7 G7 | Em7 A7 | Em7 A7 | Am7 D7 | Abm7 Db7 | Cmaj7 | Cmaj7'],
    ],
    notes: 'ii–V que suben por tono y uno que baja por semitono (A♭m7–D♭7). Ideal para practicar ii–V cortos repetidos.',
    listen: ['Duke Ellington – "Satin Doll"', 'Clark Terry & Bob Brookmeyer'],
  },
  {
    id: 'std-misty',
    name: 'Misty',
    composer: 'Erroll Garner',
    year: 1954,
    key: 'Eb',
    mode: 'major',
    tempo: 66,
    style: 'ballad',
    form: [
      ['A', 'Ebmaj7 | Bbm7 Eb7 | Abmaj7 | Abm7 Db7 | Ebmaj7 Cm7 | Fm7 Bb7 | Gm7 C7 | Fm7 Bb7'],
      ['A', 'Ebmaj7 | Bbm7 Eb7 | Abmaj7 | Abm7 Db7 | Ebmaj7 Cm7 | Fm7 Bb7 | Ebmaj7 | Ebmaj7'],
      ['B', 'Bbm7 | Eb7b9 | Abmaj7 | Abmaj7 | Am7 | D7 | Gm7 C7 | Fm7 Bb7'],
      ['A', 'Ebmaj7 | Bbm7 Eb7 | Abmaj7 | Abm7 Db7 | Ebmaj7 Cm7 | Fm7 Bb7 | Ebmaj7 | Fm7 Bb7'],
    ],
    notes: 'Balada. El IV y su iv menor con backdoor (A♭m7–D♭7) en el compás 4: la C♭ (♭3 de A♭m) es la nota que da el color.',
    listen: ['Erroll Garner – "Concert by the Sea"', 'Clark Terry'],
  },
  {
    id: 'std-stella',
    name: 'Stella by Starlight',
    composer: 'Victor Young',
    year: 1944,
    key: 'Bb',
    mode: 'major',
    tempo: 140,
    form: [
      ['A', 'Em7b5 | A7b9 | Cm7 | F7 | Fm7 | Bb7 | Ebmaj7 | Ab7'],
      ['B', 'Bbmaj7 | Em7b5 A7b9 | Dm7 | Bbm7 Eb7 | Fmaj7 | Em7b5 A7b9 | Am7b5 | D7b9'],
      ['C', 'G7#5 | G7#5 | Cm7 | Cm7 | Ab7 | Ab7 | Bbmaj7 | Bbmaj7'],
      ['D', 'Em7b5 | A7b9 | Dm7b5 | G7b9 | Cm7b5 | F7b9 | Bbmaj7 | Bbmaj7'],
    ],
    notes: 'Empieza lejos de la tónica y no la confirma hasta el compás 9. Los últimos 8 compases son una cadena de ii–V menores que bajan por tonos.',
    listen: ['Miles Davis – "Stella by Starlight" (1958)', 'Freddie Hubbard'],
  },
  {
    id: 'std-miss-jones',
    name: 'Have You Met Miss Jones?',
    composer: 'Richard Rodgers',
    year: 1937,
    key: 'F',
    mode: 'major',
    tempo: 170,
    form: [
      ['A', 'Fmaj7 | F#dim7 | Gm7 | C7 | Am7 | Dm7 | Gm7 | C7'],
      ['A', 'Fmaj7 | F#dim7 | Gm7 | C7 | Am7 Dm7 | Gm7 C7 | Fmaj7 | Cm7 F7'],
      ['B', 'Bbmaj7 | Abm7 Db7 | Gbmaj7 | Em7 A7 | Dmaj7 | Abm7 Db7 | Gbmaj7 | Gm7 C7'],
      ['A', 'Fmaj7 | F#dim7 | Gm7 | C7 | Am7 Dm7 | Gm7 C7 | Fmaj7 | Gm7 C7'],
    ],
    notes: 'El puente recorre B♭, G♭ y D (terceras mayores que bajan): un antecedente directo de los cambios de Coltrane.',
    listen: ['Art Blakey & Clifford Brown – "A Night at Birdland"', 'Tony Bennett & Bill Evans'],
  },
  {
    id: 'std-just-friends',
    name: 'Just Friends',
    composer: 'John Klenner',
    year: 1931,
    key: 'G',
    mode: 'major',
    tempo: 170,
    form: [
      ['A', 'Cmaj7 | Cmaj7 | Cm7 | F7 | Gmaj7 | Gmaj7 | Bbm7 | Eb7'],
      ['B', 'Am7 | Am7 | Bm7 | E7 | A7 | A7 | Am7 | D7'],
      ['A', 'Cmaj7 | Cmaj7 | Cm7 | F7 | Gmaj7 | Gmaj7 | Bbm7 | Eb7'],
      ['C', 'Am7 | Am7 | Cm7 | F7 | Bm7 E7 | Am7 D7 | Gmaj7 | Am7 D7'],
    ],
    notes: 'Empieza en el IV (C) y llega a G por el backdoor (Cm7–F7). Tema de jam session, rápido.',
    listen: ['Charlie Parker with Strings', 'Sonny Rollins & Sonny Stitt'],
  },
  {
    id: 'std-fly-me',
    name: 'Fly Me to the Moon',
    composer: 'Bart Howard',
    year: 1954,
    key: 'C',
    mode: 'major',
    tempo: 140,
    form: [
      ['A', 'Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7b9 | Am7 A7 | Dm7 | G7 | Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | Bm7b5 E7b9'],
      ['B', 'Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7b9 | Am7 A7 | Dm7 | G7 | Em7 | A7 | Dm7 | G7 | Cmaj7 | Bm7b5 E7b9'],
    ],
    notes: 'Ciclo de quintas casi completo (Am–Dm–G–C–F–B–E–A). La forma más clara para seguir guide tones 3→7 de un acorde a otro.',
    listen: ['Count Basie (arr. Quincy Jones)'],
  },
  {
    id: 'std-summertime',
    name: 'Summertime',
    composer: 'George Gershwin',
    year: 1935,
    key: 'D',
    mode: 'minor',
    tempo: 110,
    form: [
      ['A', 'Dm6 | Em7b5 A7b9 | Dm6 | Dm6 | Gm7 | Gm7 | Em7b5 | A7b9'],
      ['A', 'Dm6 | Em7b5 A7b9 | Dm6 | Bm7b5 E7 | Fmaj7 | Em7b5 A7b9 | Dm6 | Em7b5 A7b9'],
    ],
    notes: 'Dieciséis compases en menor: i, iv y ii–V menor. Sirve para trabajar la menor melódica sobre el i y la ♭9 en el V.',
    listen: ['Miles Davis & Gil Evans – "Porgy and Bess"', 'Louis Armstrong & Ella Fitzgerald'],
  },
  {
    id: 'std-sweet-georgia',
    name: 'Sweet Georgia Brown',
    composer: 'Ben Bernie, Maceo Pinkard, Kenneth Casey',
    year: 1925,
    publicDomain: true,
    key: 'F',
    mode: 'major',
    tempo: 220,
    form: [
      ['A', 'D7 | D7 | G7 | G7 | C7 | C7 | F6 | F6'],
      ['B', 'D7 | D7 | G7 | G7 | Am7 | E7 | Am7 | D7'],
      ['A', 'D7 | D7 | G7 | G7 | C7 | C7 | F6 | F6'],
      ['C', 'Dm7 | A7 | Dm7 | A7 | F6 | D7 | Gm7 C7 | F6'],
    ],
    notes: 'Dominantes que llegan a F por quintas, dos compases cada una. Dominio público. Ideal para practicar guide tones a tempo rápido.',
    listen: ['Coleman Hawkins', 'Django Reinhardt & Stéphane Grappelli'],
  },
  {
    id: 'std-honeysuckle',
    name: 'Honeysuckle Rose',
    composer: 'Fats Waller',
    year: 1929,
    publicDomain: true,
    key: 'F',
    mode: 'major',
    tempo: 160,
    form: [
      ['A', 'Gm7 C7 | Gm7 C7 | Gm7 C7 | Gm7 C7 | Fmaj7 | Fmaj7 | Fmaj7 | Gm7 C7'],
      ['A', 'Gm7 C7 | Gm7 C7 | Gm7 C7 | Gm7 C7 | Fmaj7 | Fmaj7 | Fmaj7 | F6'],
      ['B', 'Cm7 F7 | Cm7 F7 | Bb6 | Bb6 | Dm7 G7 | Dm7 G7 | Gm7 | C7'],
      ['A', 'Gm7 C7 | Gm7 C7 | Gm7 C7 | Gm7 C7 | Fmaj7 | Fmaj7 | Fmaj7 | Gm7 C7'],
    ],
    notes: 'Cuatro compases de un mismo ii–V antes de resolver: hay que inventar variedad sobre dos acordes. Dominio público. "Scrapple from the Apple" (Parker) usa estas A.',
    listen: ['Fats Waller', 'Charlie Parker – "Scrapple from the Apple"'],
  },
  {
    id: 'std-lady-be-good',
    name: 'Oh, Lady Be Good!',
    composer: 'George Gershwin',
    year: 1924,
    publicDomain: true,
    key: 'G',
    mode: 'major',
    tempo: 190,
    form: [
      ['A', 'G6 | C7 | G6 | E7 | Am7 | D7 | G6 E7 | Am7 D7'],
      ['A', 'G6 | C7 | G6 | E7 | Am7 | D7 | G6 | G6'],
      ['B', 'C7 | C7 | G6 | G6 | A7 | A7 | Am7 | D7'],
      ['A', 'G6 | C7 | G6 | E7 | Am7 | D7 | G6 E7 | Am7 D7'],
    ],
    notes: 'Swing de la era de Kansas City. El IV7 (C7) en el compás 2 da sabor de blues. Dominio público.',
    listen: ['Lester Young con Count Basie (1936)', 'Ella Fitzgerald (1947)'],
  },
  {
    id: 'std-softly',
    name: 'Softly, as in a Morning Sunrise',
    composer: 'Sigmund Romberg',
    year: 1928,
    publicDomain: true,
    key: 'C',
    mode: 'minor',
    tempo: 170,
    form: [
      ['A', 'Cm7 | Dm7b5 G7b9 | Cm7 | Dm7b5 G7b9 | Cm7 | Dm7b5 G7b9 | Cm7 | Dm7b5 G7b9'],
      ['A', 'Cm7 | Dm7b5 G7b9 | Cm7 | Dm7b5 G7b9 | Cm7 | Dm7b5 G7b9 | Cm7 | Cm7'],
      ['B', 'Gm7 | C7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7b9'],
      ['A', 'Cm7 | Dm7b5 G7b9 | Cm7 | Dm7b5 G7b9 | Cm7 | Dm7b5 G7b9 | Cm7 | Dm7b5 G7b9'],
    ],
    notes: 'La A es un ii–V–i menor que se repite; el puente va al relativo mayor (E♭). Dominio público.',
    listen: ['John Coltrane – "Live at the Village Vanguard"', 'Sonny Rollins – "A Night at the Village Vanguard"'],
  },
  {
    id: 'std-tune-up',
    name: 'Tune Up',
    composer: 'Eddie "Cleanhead" Vinson (atribuido a Miles Davis)',
    year: 1953,
    key: 'D',
    mode: 'major',
    tempo: 200,
    form: [['A', 'Em7 | A7 | Dmaj7 | Dmaj7 | Dm7 | G7 | Cmaj7 | Cmaj7 | Cm7 | F7 | Bbmaj7 | Bbmaj7 | Em7 | A7 | Dmaj7 | Em7 A7']],
    notes: 'ii–V–I que bajan por tonos (D, C, B♭). El ejercicio perfecto para pasar el mismo lick por tres tonalidades.',
    listen: ['Miles Davis – "Blue Haze"', 'Sonny Stitt'],
  },
  {
    id: 'std-lady-bird',
    name: 'Lady Bird',
    composer: 'Tadd Dameron',
    year: 1939,
    key: 'C',
    mode: 'major',
    tempo: 150,
    form: [['A', 'Cmaj7 | Cmaj7 | Fm7 | Bb7 | Cmaj7 | Cmaj7 | Bbm7 | Eb7 | Abmaj7 | Abmaj7 | Am7 | D7 | Dm7 | G7 | Cmaj7 Ebmaj7 | Abmaj7 Dbmaj7']],
    notes: 'Dieciséis compases con backdoor (Fm7–B♭7) y el famoso turnaround "Dameron" por maj7 que bajan (C–E♭–A♭–D♭).',
    listen: ['Tadd Dameron & Fats Navarro (1948)', 'Miles Davis – "Half Nelson" (contrafact)'],
  },
  {
    id: 'std-doxy',
    name: 'Doxy',
    composer: 'Sonny Rollins',
    year: 1954,
    key: 'Bb',
    mode: 'major',
    tempo: 130,
    form: [['A', 'Bb7 Ab7 | G7 | C7 | F7 | Bb7 Ab7 | G7 | C7 F7 | Bb7 | Eb7 | Edim7 | Bb7 | G7 | C7 | F7 | Bb7 | C7 F7']],
    notes: 'Dieciséis compases, casi todo dominantes: ideal para la mixolidia, la ♭9 y el blues.',
    listen: ['Miles Davis & Sonny Rollins – "Bags\' Groove"'],
  },
  {
    id: 'std-confirmation',
    name: 'Confirmation',
    composer: 'Charlie Parker',
    year: 1946,
    key: 'F',
    mode: 'major',
    tempo: 190,
    form: [
      ['A', 'Fmaj7 | Em7b5 A7b9 | Dm7 G7 | Cm7 F7 | Bb7 | Am7 D7 | Gm7 C7 | Am7 D7 Gm7 C7'],
      ['A', 'Fmaj7 | Em7b5 A7b9 | Dm7 G7 | Cm7 F7 | Bb7 | Am7 D7 | Gm7 C7 | Fmaj7'],
      ['B', 'Cm7 | F7 | Bbmaj7 | Bbmaj7 | Ebm7 | Ab7 | Dbmaj7 | Gm7 C7'],
      ['A', 'Fmaj7 | Em7b5 A7b9 | Dm7 G7 | Cm7 F7 | Bb7 | Am7 D7 | Gm7 C7 | Fmaj7'],
    ],
    notes: 'ii–V descendentes como en el Bird blues, ahora en AABA. Bebop puro: guide tones y enclosures en cada compás.',
    listen: ['Charlie Parker (1953)', 'Kenny Dorham'],
  },
  {
    id: 'std-cantaloupe',
    name: 'Cantaloupe Island',
    composer: 'Herbie Hancock',
    year: 1964,
    key: 'F',
    mode: 'minor',
    tempo: 110,
    style: 'two',
    form: [['A', 'Fm7 | Fm7 | Fm7 | Fm7 | Db7 | Db7 | Db7 | Db7 | Dm7 | Dm7 | Dm7 | Dm7 | Fm7 | Fm7 | Fm7 | Fm7']],
    notes: 'Tres acordes de cuatro compases: dórica de F, mixolidia (o lidia ♭7) de D♭ y dórica de D. Ideal para pentatónicas.',
    listen: ['Herbie Hancock (con Freddie Hubbard) – "Empyrean Isles"'],
  },
  {
    id: 'std-ipanema',
    name: 'The Girl from Ipanema',
    composer: 'Antônio Carlos Jobim',
    year: 1962,
    key: 'F',
    mode: 'major',
    tempo: 130,
    style: 'bossa',
    form: [
      ['A', 'Fmaj7 | Fmaj7 | G7 | G7 | Gm7 | Gb7 | Fmaj7 | Gb7'],
      ['A', 'Fmaj7 | Fmaj7 | G7 | G7 | Gm7 | Gb7 | Fmaj7 | Fmaj7'],
      ['B', 'Gbmaj7 | Gbmaj7 | B7 | B7 | F#m7 | F#m7 | D7 | D7 | Gm7 | Gm7 | Eb7 | Eb7 | Am7 | D7b9 | Gm7 | C7b9'],
      ['A', 'Fmaj7 | Fmaj7 | G7 | G7 | Gm7 | Gb7 | Fmaj7 | Gb7'],
    ],
    notes: 'Bossa AABA con un puente de 16 compases que modula por medio tono. Corcheas rectas.',
    listen: ['Stan Getz & João Gilberto – "Getz/Gilberto"'],
  },
  {
    id: 'std-blue-in-green',
    name: 'Blue in Green',
    composer: 'Miles Davis, Bill Evans',
    year: 1959,
    key: 'D',
    mode: 'minor',
    tempo: 60,
    style: 'ballad',
    form: [['A', 'Bbmaj7#11 | A7alt | Dm7 Db7 | Cm7 F7 | Bbmaj7 | A7alt | Dm7 | E7alt | Am7 | Dm7']],
    notes: 'Diez compases que giran en círculo, sin una tónica clara. Balada: sonido, aire y notas largas.',
    listen: ['Miles Davis – "Kind of Blue"', 'Bill Evans Trio – "Portrait in Jazz"'],
  },
  {
    id: 'std-saints',
    name: 'When the Saints Go Marching In',
    composer: 'Tradicional',
    publicDomain: true,
    key: 'F',
    mode: 'major',
    tempo: 180,
    style: 'two',
    form: [['A', 'F6 | F6 | F6 | F6 | F6 | F6 | C7 | C7 | F6 | F7 | Bb6 | Bbm6 | F6 | C7 | F6 | F6']],
    notes: 'El himno del jazz de Nueva Orleans. Simple a propósito: trabajá el sonido de Armstrong, el vibrato y las respuestas.',
    listen: ['Louis Armstrong (1938)'],
  },
  {
    id: 'std-blues-bb',
    name: 'Blues en B♭ (Now\'s the Time, Tenor Madness…)',
    composer: 'Forma tradicional',
    publicDomain: true,
    key: 'Bb',
    mode: 'major',
    tempo: 150,
    form: [['A', 'Bb7 | Eb7 | Bb7 | Fm7 Bb7 | Eb7 | Edim7 | Bb7 | Dm7 G7b9 | Cm7 | F7 | Bb7 G7b9 | Cm7 F7']],
    notes: 'El blues de jazz en la tonalidad de jam más común para vientos. La forma no tiene dueño: cientos de temas usan estos 12 compases.',
    listen: ['Sonny Rollins & John Coltrane – "Tenor Madness"', 'Miles Davis – "Freddie Freeloader" (variante)'],
  },
  {
    id: 'std-blue-monk',
    name: 'Blue Monk',
    composer: 'Thelonious Monk',
    year: 1954,
    key: 'Bb',
    mode: 'major',
    tempo: 120,
    form: [['A', 'Bb7 | Eb7 | Bb7 | Bb7 | Eb7 | Eb7 | Bb7 | G7 | Cm7 | F7 | Bb7 G7 | Cm7 F7']],
    notes: 'Blues de 12 compases con el IV7 ya en el compás 2 y un VI7 que prepara el ii–V final. Tempo cómodo: ideal para vocabulario de blues y espacio.',
    listen: ['Thelonious Monk – "Misterioso" (Five Spot)', 'Miles Davis & Thelonious Monk – "Bags\' Groove" (sesión de 1954)'],
  },
  {
    id: 'std-straight-no-chaser',
    name: 'Straight, No Chaser',
    composer: 'Thelonious Monk',
    year: 1951,
    key: 'F',
    mode: 'major',
    tempo: 150,
    form: [['A', 'F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7']],
    notes: 'Blues en F de jam session, con el VI7 (D7) que lleva al ii–V final.',
    listen: ['Miles Davis – "Milestones" (1958)', 'Thelonious Monk – "Straight, No Chaser" (1967)'],
  },
  {
    id: 'std-billies-bounce',
    name: 'Billie\'s Bounce',
    composer: 'Charlie Parker',
    year: 1945,
    key: 'F',
    mode: 'major',
    tempo: 180,
    form: [['A', 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7 D7 | Gm7 | C7 | F7 D7 | Gm7 C7']],
    notes: 'El blues de Parker: ii–V en el compás 4, el IV7 que se vuelve disminuido y la cadena de ii–V final. Es la forma que cualquier jam espera.',
    listen: ['Charlie Parker – "Billie\'s Bounce" (Savoy, 1945)'],
  },
  {
    id: 'std-nows-the-time',
    name: 'Now\'s the Time',
    composer: 'Charlie Parker',
    year: 1945,
    key: 'F',
    mode: 'major',
    tempo: 150,
    form: [['A', 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7']],
    notes: 'Otro blues en F de Parker; se diferencia de "Billie\'s Bounce" en que el IV7 se mantiene dos compases.',
    listen: ['Charlie Parker – "Now\'s the Time" (1953)', 'Sonny Rollins – "Now\'s the Time"'],
  },
  {
    id: 'std-freddie-freeloader',
    name: 'Freddie Freeloader',
    composer: 'Miles Davis',
    year: 1959,
    key: 'Bb',
    mode: 'major',
    tempo: 120,
    form: [['A', 'Bb7 | Bb7 | Bb7 | Bb7 | Eb7 | Eb7 | Bb7 | Bb7 | F7 | Eb7 | Bb7 | Bb7']],
    notes: 'Blues "abierto": sin ii–V, casi sólo I7, IV7 y V7. Pide fraseo melódico y mucho espacio.',
    listen: ['Miles Davis – "Kind of Blue" (1959)'],
  },
  {
    id: 'std-all-of-me',
    name: 'All of Me',
    composer: 'Gerald Marks, Seymour Simons',
    year: 1931,
    key: 'C',
    mode: 'major',
    tempo: 130,
    form: [
      ['A', 'C6 | C6 | E7 | E7 | A7 | A7 | Dm7 | Dm7'],
      ['B', 'E7 | E7 | Am7 | Am7 | D7 | D7 | Dm7 | G7'],
      ['A', 'C6 | C6 | E7 | E7 | A7 | A7 | Dm7 | Dm7'],
      ['C', 'Fmaj7 | Fm6 | C6 | A7 | Dm7 | G7 | C6 | Dm7 G7'],
    ],
    notes: 'Cadena de dominantes secundarios (E7, A7, D7) que llegan a su ii. Los cuatro últimos compases varían bastante entre versiones: escuchá la grabación que toques.',
    listen: ['Billie Holiday (1941)', 'Louis Armstrong (1932)'],
  },
];

export const STANDARDS: Standard[] = S;

const barsOf = (s: string) => s.split('|').map((b) => b.trim()).filter(Boolean);

export function standardChart(s: Standard): string {
  return s.form.flatMap(([, bars]) => barsOf(bars)).join(' | ');
}

/** Grilla con rótulos de sección, para copiar el tema a "Mis temas" y editarlo. */
export function standardDoc(s: Standard): ChartDoc {
  const bars: DocBar[] = [];
  for (const [label, src] of s.form) {
    barsOf(src).forEach((b, i) => bars.push(i === 0 ? { chords: b.split(/\s+/), section: label } : { chords: b.split(/\s+/) }));
  }
  return { bars };
}

export function standardToProgression(s: Standard): Progression {
  const total = s.form.reduce((n, [, b]) => n + barsOf(b).length, 0);
  const shape = s.form.map(([l]) => l).join('');
  return {
    id: s.id,
    name: s.name,
    category: 'Repertorio',
    key: s.key,
    mode: s.mode,
    chart: standardChart(s),
    tempo: s.tempo,
    style: s.style,
    notes:
      `${s.composer}${s.year ? ` (${s.year})` : ''}. Forma ${shape.length > 1 ? shape + ', ' : ''}${total} compases. ${s.notes}` +
      (s.publicDomain ? ' Sólo la armonía; el tema es de dominio público.' : ' Sólo la armonía: la melodía y la letra tienen derechos de autor y no están.'),
    listen: s.listen,
  };
}

export const standardById = (id: string) => STANDARDS.find((s) => s.id === id);
