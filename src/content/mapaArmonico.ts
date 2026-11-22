/**
 * Mapa armónico de un tema: reconoce en el cifrado los patrones que se repiten en el jazz (ii–V–I, dominantes secundarios,
 * cadenas de dominantes, turnarounds, sustitución tritonal, puerta de atrás, disminuidos de paso) y los centros tonales por
 * los que pasa. Aprender un standard es reconocer estas piezas, no memorizar acorde por acorde.
 *
 * Es una heurística sobre los símbolos del cifrado, no un análisis musical completo: no mira la melodía y puede leer de otra
 * forma un pasaje ambiguo. La tonalidad general es una estimación, salvo que se la pase. Funciones puras, sin dependencias de
 * la interfaz; el dibujo está en `ui/components/MapaArmonico.tsx`.
 */
import { qdef } from '../theory/chords';
import type { Chord } from '../theory/chords';
import type { Chart } from '../theory/chart';
import { mod, noteName, pc } from '../theory/notes';

export type TipoHallazgo = 'iiVI' | 'iiVi' | 'iiV' | 'VI' | 'cadena' | 'tritono' | 'turnaround' | 'puerta' | 'disminuido';

export interface Hallazgo {
  tipo: TipoHallazgo;
  /** Compases (0-based, de la grilla escrita) en que empieza y termina. */
  desde: number;
  hasta: number;
  /** Los acordes que lo forman, tal como están en el cifrado. */
  acordes: string[];
  titulo: string;
  /** Qué es y cómo se usa, en una o dos frases. */
  detalle: string;
  /** Centro tonal al que llega (pitch class), si lo hay. */
  centro?: number;
  centroMenor?: boolean;
}

export interface Centro {
  desde: number;
  hasta: number;
  /** Nombre ("F", "Gm") tal como se lee. */
  nombre: string;
  pc: number;
  menor: boolean;
}

export interface Mapa {
  /** Tonalidad general (estimada si no se indicó). null si no hay cifrado analizable. */
  tonica: { pc: number; menor: boolean; nombre: string; estimada: boolean } | null;
  hallazgos: Hallazgo[];
  /** Centros tonales que aparecen, en orden, con los compases en que están. */
  centros: Centro[];
  /** Cuántos compases de la grilla quedaron dentro de algún patrón. */
  compasesCubiertos: number;
  compases: number;
}

type Fam = 'maj' | 'min' | 'hdim' | 'dom' | 'dim';
interface Ev {
  pc: number;
  fam: Fam;
  chord: Chord;
  sym: string;
  /** Compases (de la carta analizada) en que suena. */
  b0: number;
  b1: number;
}

const FAM: Record<string, Fam> = { major: 'maj', minor: 'min', halfdim: 'hdim', dominant: 'dom', dim: 'dim' };
const NOMBRES_PC = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

const sym = (c: Chord) => noteName(c.root, true) + c.suffix + (c.bass ? '/' + noteName(c.bass, true) : '');
const nombrePc = (p: number, menor = false) => NOMBRES_PC[mod(p, 12)] + (menor ? 'm' : '');

/** Los acordes de la carta, sin repetir un mismo acorde seguido (Dm7 | Dm7 cuenta uno). */
function eventos(chart: Chart): Ev[] {
  const out: Ev[] = [];
  for (const cc of chart.chords) {
    const s = sym(cc.chord);
    const last = out[out.length - 1];
    if (last && last.sym === s) {
      last.b1 = cc.bar;
      continue;
    }
    out.push({ pc: pc(cc.chord.root), fam: FAM[qdef(cc.chord).family], chord: cc.chord, sym: s, b0: cc.bar, b1: cc.bar });
  }
  return out;
}

const esMayor = (e?: Ev) => e?.fam === 'maj';
const esMenor = (e?: Ev) => e?.fam === 'min';
/** Acorde de reposo posible: mayor o menor (no disminuido ni dominante). */
const esReposo = (e?: Ev) => esMayor(e) || esMenor(e);
const esII = (e?: Ev) => e?.fam === 'min' || e?.fam === 'hdim';

/** Cómo resuelve un dominante en `d` al acorde en `t`: V normal (quinta abajo) o sustituto tritonal (semitono abajo). */
function resuelve(d: number, t: number): 'V' | 'sub' | null {
  if (mod(t - d, 12) === 5) return 'V';
  if (mod(d - t, 12) === 1) return 'sub';
  return null;
}

const GRADOS_MAYOR = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'];
const GRADOS_MENOR = ['i', '♭II', 'ii', '♭III', 'III', 'iv', '♯iv', 'v', '♭VI', 'VI', '♭VII', 'VII'];
const gradoDe = (p: number, tonica: number, menor: boolean) => (menor ? GRADOS_MENOR : GRADOS_MAYOR)[mod(p - tonica, 12)];

/** Lo que se reconoce sin conocer la tonalidad general. `sig` es cuántos acordes consume. */
interface Candidato {
  n: number;
  h: Omit<Hallazgo, 'desde' | 'hasta' | 'acordes'>;
}

function reconocer(ev: Ev[], i: number): Candidato | null {
  const a = ev[i];
  const b = ev[i + 1];
  const c = ev[i + 2];
  const d = ev[i + 3];
  const e = ev[i + 4];

  // turnaround de 4 acordes: I–vi–ii–V, I–VI7–ii–V, iii–VI7–ii–V, I–♭iii°–ii–V, I–♯i°–ii–V
  if (a && b && c && d && d.fam === 'dom' && esII(c) && mod(d.pc - c.pc, 12) === 5) {
    const t = mod(c.pc - 2, 12); // tónica probable: el ii es el segundo grado
    const inicioI = esMayor(a) && a.pc === t;
    const inicioIII = esMenor(a) && a.pc === mod(t + 4, 12);
    const medio =
      (b.pc === mod(t + 9, 12) && (b.fam === 'min' || b.fam === 'dom')) ||
      (b.fam === 'dim' && (b.pc === mod(t + 3, 12) || b.pc === mod(t + 1, 12)));
    if ((inicioI || inicioIII) && medio && esMenor(c)) {
      const vuelve = esMayor(e) && e!.pc === t;
      const romano = inicioI
        ? b.fam === 'dim' ? `I–${b.pc === mod(t + 3, 12) ? '♭iii°' : '♯i°'}–ii–V` : b.fam === 'dom' ? 'I–VI7–ii–V' : 'I–vi–ii–V'
        : 'iii–VI7–ii–V';
      return {
        n: vuelve ? 5 : 4,
        h: {
          tipo: 'turnaround',
          titulo: `Turnaround ${romano} en ${nombrePc(t)}`,
          detalle: `Cuatro acordes que giran por el ciclo de quintas y devuelven a ${nombrePc(t)}${vuelve ? ' (aquí vuelve)' : ''}. Aparece al final de muchas formas para empezar de nuevo. Pensá guide tones: la 7ª de cada acorde baja a la 3ª del siguiente.`,
          centro: t,
          centroMenor: false,
        },
      };
    }
  }

  // puerta de atrás: iv–♭VII7–I o ♭VII7–I
  if (a && b && c && esMenor(a) && b.fam === 'dom' && esMayor(c) && mod(a.pc - c.pc, 12) === 5 && mod(b.pc - c.pc, 12) === 10) {
    return {
      n: 3,
      h: {
        tipo: 'puerta',
        titulo: `Puerta de atrás hacia ${nombrePc(c.pc)}`,
        detalle: `${a.sym} – ${b.sym} – ${c.sym}: el ♭VII7 resuelve a la tónica subiendo un tono (no bajando una quinta). Suena a "volver a casa por la puerta de atrás"; sobre el ♭VII7 va mixolidio.`,
        centro: c.pc,
        centroMenor: false,
      },
    };
  }
  if (a && b && a.fam === 'dom' && esMayor(b) && mod(a.pc - b.pc, 12) === 10) {
    return {
      n: 2,
      h: {
        tipo: 'puerta',
        titulo: `Puerta de atrás hacia ${nombrePc(b.pc)}`,
        detalle: `${a.sym} – ${b.sym}: el ♭VII7 resuelve a la tónica subiendo un tono. Es un cambio de color típico en finales y turnarounds.`,
        centro: b.pc,
        centroMenor: false,
      },
    };
  }

  // ii–V–I (con V normal o sustituto tritonal) y ii–V–i
  if (a && b && esII(a) && b.fam === 'dom') {
    const normal = mod(b.pc - a.pc, 12) === 5;
    const sub = mod(a.pc - b.pc, 12) === 1;
    if (normal || sub) {
      const destino = normal ? mod(b.pc + 5, 12) : mod(b.pc - 1, 12);
      const llega = c && esReposo(c) && c.pc === destino;
      const menor = llega ? esMenor(c) : a.fam === 'hdim';
      const nom = llega ? sym(c.chord) : nombrePc(destino, menor);
      const sustituto = sub ? ` El V está sustituido por ${b.sym} (sustitución tritonal): comparte las notas guía con ${nombrePc(mod(b.pc + 6, 12))}7.` : '';
      if (llega) {
        return {
          n: 3,
          h: {
            tipo: menor ? 'iiVi' : 'iiVI',
            titulo: menor ? `ii–V–i menor hacia ${nombrePc(destino, true)}` : `ii–V–I mayor en ${nombrePc(destino)}`,
            detalle: `${a.sym} – ${b.sym} – ${nom}: la cadencia básica del jazz.${sustituto} Tocá la escala del ii, la del V y resolvé sobre la 3ª del I.`,
            centro: destino,
            centroMenor: menor,
          },
        };
      }
      return {
        n: 2,
        h: {
          tipo: 'iiV',
          titulo: `ii–V hacia ${nombrePc(destino, menor)}`,
          detalle: `${a.sym} – ${b.sym} apunta a ${nombrePc(destino, menor)}, pero el siguiente acorde no es ese: el ii–V "no llega" y lo que sigue es una sorpresa o un cambio de centro.${sustituto}`,
          centro: destino,
          centroMenor: menor,
        },
      };
    }
  }

  // cadena de dominantes (círculo de quintas): cada uno resuelve en el siguiente
  if (a && a.fam === 'dom') {
    let k = 1;
    while (ev[i + k]?.fam === 'dom' && mod(ev[i + k - 1].pc - ev[i + k].pc, 12) === 7 /* quinta abajo */) k++;
    if (k >= 2) {
      const fin = ev[i + k];
      const llega = esReposo(fin) && mod(ev[i + k - 1].pc + 5, 12) === fin.pc;
      const n = k + (llega ? 1 : 0);
      const ult = ev[i + k - 1];
      const destino = llega ? fin.pc : mod(ult.pc + 5, 12);
      return {
        n,
        h: {
          tipo: 'cadena',
          titulo: `Cadena de dominantes: ${ev.slice(i, i + k).map((x) => x.sym).join(' → ')}${llega ? ` → ${fin.sym}` : ''}`,
          detalle: `Cada dominante resuelve en el siguiente (quinta abajo) hasta ${nombrePc(destino, llega && esMenor(fin))}. Es el círculo de quintas: se estudia como una sola frase, no como ${k} acordes sueltos.`,
          ...(llega ? { centro: fin.pc, centroMenor: esMenor(fin) } : {}),
        },
      };
    }
  }

  // V–I (o V–i) y sustitución tritonal sola
  if (a && b && a.fam === 'dom' && esReposo(b)) {
    const r = resuelve(a.pc, b.pc);
    if (r === 'V') {
      return {
        n: 2,
        h: {
          tipo: 'VI',
          titulo: `${a.sym} → ${b.sym} (V–${esMenor(b) ? 'i' : 'I'} hacia ${nombrePc(b.pc, esMenor(b))})`,
          detalle: `El dominante ${a.sym} resuelve en ${b.sym}: la 7ª del dominante baja a la 3ª del acorde que sigue. Si ${b.sym} no es la tónica del tema, es un dominante secundario.`,
          centro: b.pc,
          centroMenor: esMenor(b),
        },
      };
    }
    if (r === 'sub') {
      return {
        n: 2,
        h: {
          tipo: 'tritono',
          titulo: `Sustitución tritonal: ${a.sym} en lugar de ${nombrePc(mod(a.pc + 6, 12))}7`,
          detalle: `${a.sym} reemplaza al V habitual (${nombrePc(mod(a.pc + 6, 12))}7) y baja un semitono a ${b.sym}. Mismas notas guía (3ª y 7ª intercambiadas); el bajo desciende por semitonos.`,
          centro: b.pc,
          centroMenor: esMenor(b),
        },
      };
    }
  }

  // disminuido de paso
  if (a && b && a.fam === 'dim' && mod(b.pc - a.pc, 12) === 1) {
    return {
      n: 2,
      h: {
        tipo: 'disminuido',
        titulo: `${a.sym} de paso hacia ${b.sym}`,
        detalle: `El disminuido une dos acordes cuyas raíces están a un tono; sube cromáticamente a ${b.sym}. Se toca como el dominante de ${b.sym} con la raíz omitida (arpegio disminuido).`,
      },
    };
  }
  return null;
}

/** Tonalidad general: la indicada, o la que más patrones apuntan, empieza y termina. */
function estimarTonica(ev: Ev[], hallazgos: Hallazgo[], hint?: { pc: number; menor: boolean }): Mapa['tonica'] {
  if (hint) return { ...hint, nombre: nombrePc(hint.pc, hint.menor), estimada: false };
  if (!ev.length) return null;
  // blues: casi todo son dominantes y la tónica es el primero (F7 en un blues en F), no un centro que salga de los patrones
  if (ev.filter((e) => e.fam === 'dom').length >= ev.length * 0.7) return { pc: ev[0].pc, menor: false, nombre: nombrePc(ev[0].pc), estimada: true };
  const MAYOR = new Set([0, 2, 4, 5, 7, 9, 11]);
  const MENOR = new Set([0, 2, 3, 5, 7, 8, 10, 11]);
  let mejor: { pc: number; menor: boolean; s: number } | null = null;
  const ultimo = ev[ev.length - 1];
  const primero = ev[0];
  for (let p = 0; p < 12; p++) {
    for (const menor of [false, true]) {
      let s = 0;
      for (const h of hallazgos) if (h.centro === p && !!h.centroMenor === menor && (h.tipo === 'iiVI' || h.tipo === 'iiVi' || h.tipo === 'turnaround')) s += 4;
      else if (h.centro === p && !!h.centroMenor === menor && h.tipo === 'VI') s += 1;
      // en un blues el I es un dominante (F7): cuenta como tónica mayor al empezar o terminar
      const tonico = (e: Ev) => e.pc === p && (menor ? e.fam === 'min' : e.fam === 'maj' || e.fam === 'dom');
      if (tonico(ultimo)) s += 5;
      if (tonico(primero)) s += 3;
      const escala = menor ? MENOR : MAYOR;
      for (const e of ev) if (escala.has(mod(e.pc - p, 12))) s += 0.5;
      if (!mejor || s > mejor.s) mejor = { pc: p, menor, s };
    }
  }
  return mejor ? { pc: mejor.pc, menor: mejor.menor, nombre: nombrePc(mejor.pc, mejor.menor), estimada: true } : null;
}

/**
 * Analiza una carta. `orden` es, por cada compás que se toca, el índice del compás escrito (para temas con repeticiones y
 * finales): los resultados usan compases escritos y no repiten lo que ya salió en la vuelta anterior.
 */
export function mapaArmonico(chart: Chart, opts: { tonica?: { pc: number; menor: boolean }; orden?: readonly number[] } = {}): Mapa {
  const ev = eventos(chart);
  const orden = opts.orden && opts.orden.length === chart.bars ? opts.orden : null;
  const escrito = (b: number) => (orden ? orden[b] : b);
  const compases = orden ? Math.max(...orden) + 1 : chart.bars;
  const vistos = new Set<string>();
  const hallazgos: Hallazgo[] = [];
  let i = 0;
  while (i < ev.length) {
    const cand = reconocer(ev, i);
    if (!cand) {
      i++;
      continue;
    }
    const grupo = ev.slice(i, i + cand.n);
    const desde = escrito(grupo[0].b0);
    // si el último acorde es el de llegada (no un dominante), sólo cuenta su primer compás: lo que dura después ya es otra cosa
    const ultimo = grupo[grupo.length - 1];
    const hasta = escrito(ultimo.fam !== 'dom' && grupo.length > 1 ? ultimo.b0 : ultimo.b1);
    const clave = `${cand.h.tipo}|${grupo.map((g) => g.sym).join(' ')}|${desde}`;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      hallazgos.push({ ...cand.h, desde, hasta: Math.max(desde, hasta), acordes: grupo.map((g) => g.sym) });
    }
    i += cand.n;
  }

  const tonica = estimarTonica(ev, hallazgos, opts.tonica);

  // centros tonales: los destinos de los patrones, en orden, uniendo los consecutivos que apuntan al mismo
  const centros: Centro[] = [];
  for (const h of hallazgos) {
    if (h.centro === undefined) continue;
    const menor = !!h.centroMenor;
    const ult = centros[centros.length - 1];
    if (ult && ult.pc === h.centro && ult.menor === menor) ult.hasta = Math.max(ult.hasta, h.hasta);
    else centros.push({ desde: h.desde, hasta: h.hasta, nombre: nombrePc(h.centro, menor), pc: h.centro, menor });
  }

  const cubiertos = new Set<number>();
  for (const h of hallazgos) for (let b = h.desde; b <= h.hasta; b++) cubiertos.add(b);

  return { tonica, hallazgos, centros, compasesCubiertos: cubiertos.size, compases };
}

/** Texto del rango de compases (1-based): «compás 3» o «compases 3–6». */
export function rangoCompases(desde: number, hasta: number): string {
  return desde === hasta ? `compás ${desde + 1}` : `compases ${desde + 1}–${hasta + 1}`;
}

/** Grado del centro respecto de la tonalidad general («ii», «♭VI»…), para decir «va a la zona del IV». */
export function gradoDelCentro(c: Pick<Centro, 'pc' | 'menor'>, t: NonNullable<Mapa['tonica']>): string {
  const g = gradoDe(c.pc, t.pc, t.menor);
  return c.menor ? g.toLowerCase() : g.toUpperCase();
}
