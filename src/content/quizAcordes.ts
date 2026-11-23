/**
 * «¿Qué acorde sigue?»: una pregunta de memoria sobre la armonía de un tema. Se muestran los acordes que vienen sonando (o ninguno, para
 * «¿con cuál empieza?») y hay que elegir el que sigue entre cuatro. Sirve para comprobar que sabés el tema sin la grilla. Funciones puras:
 * el azar entra por parámetro para poder probarlas; el dibujo está en `ui/components/QuizAcordes.tsx`.
 */
import { chordSymbol, parseChord, transposeChord } from '../theory/chords';
import type { Chord } from '../theory/chords';
import { semitoneInterval } from '../theory/chart';
import type { Chart } from '../theory/chart';
import { noteName } from '../theory/notes';

export interface AcordeEnCompas {
  chord: Chord;
  /** Compás de la carta (0-based) donde empieza. */
  bar: number;
}

export interface Pregunta {
  /** Los acordes que suenan antes (vacío: se pregunta con cuál empieza el tema). */
  contexto: AcordeEnCompas[];
  /** El acorde que sigue y su compás. */
  correcta: AcordeEnCompas;
  /** Cuatro opciones, la correcta entre ellas, ya mezcladas. */
  opciones: Chord[];
  /** Índice de la correcta en `opciones`. */
  acierto: number;
  /** Los dos acordes que vienen después de la correcta, para mostrar al responder. */
  despues: Chord[];
  /** Índice de la correcta entre los acordes distintos seguidos del tema (para no repetir preguntas). */
  indice: number;
}

export const OPCIONES = 4;
export const CONTEXTOS = [1, 2, 4] as const;

const igual = (a: Chord, b: Chord) => chordSymbol(a) === chordSymbol(b);

/** Los acordes del tema en orden, sin repetir un mismo acorde seguido (Dm7 | Dm7 cuenta uno). */
export function acordesSeguidos(chart: Chart): AcordeEnCompas[] {
  const out: AcordeEnCompas[] = [];
  for (const cc of chart.chords) {
    const last = out[out.length - 1];
    if (last && igual(last.chord, cc.chord)) continue;
    out.push({ chord: cc.chord, bar: cc.bar });
  }
  return out;
}

const SUFIJOS = ['m7', '7', 'maj7', 'm7b5'];

/** Alternativas verosímiles al acorde correcto: otra calidad sobre la misma raíz y la misma calidad en raíces de movimientos comunes. */
function parecidos(c: Chord): Chord[] {
  const out: Chord[] = [];
  for (const s of SUFIJOS) {
    try {
      const x = parseChord(noteName(c.root) + s);
      if (!igual(x, c)) out.push(x);
    } catch {
      /* un sufijo que no aplica */
    }
  }
  for (const st of [5, 7, 2, 10, 3, 9]) out.push(transposeChord(c, semitoneInterval(st)));
  return out;
}

function mezclar<T>(a: readonly T[], rng: () => number): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * Arma una pregunta. `contexto` es cuántos acordes previos se muestran (0 los oculta todos: «¿con cuál empieza?»); `evitar` son
 * índices ya preguntados, que se saltan mientras queden otros. Devuelve null si el tema no tiene al menos dos acordes distintos.
 */
export function preguntaAcorde(chart: Chart, rng: () => number, opts: { contexto?: number; evitar?: readonly number[] } = {}): Pregunta | null {
  const seg = acordesSeguidos(chart);
  if (seg.length < 2) return null;
  const ctx = Math.max(0, Math.min(8, opts.contexto ?? 2));
  const todos = seg.map((_, i) => i);
  const libres = todos.filter((i) => !opts.evitar?.includes(i));
  const pool = libres.length ? libres : todos;
  const indice = pool[Math.floor(rng() * pool.length)];
  const correcta = seg[indice];
  const contexto = seg.slice(Math.max(0, indice - ctx), indice);

  // distractores: primero acordes del mismo tema (lo que se confunde de memoria), después alternativas verosímiles
  const propios = mezclar(seg.map((s) => s.chord), rng);
  const candidatos = [...propios, ...mezclar(parecidos(correcta.chord), rng)];
  const distractores: Chord[] = [];
  for (const c of candidatos) {
    if (igual(c, correcta.chord) || distractores.some((d) => igual(d, c))) continue;
    distractores.push(c);
    if (distractores.length === OPCIONES - 1) break;
  }
  const opciones = mezclar([correcta.chord, ...distractores], rng);
  return {
    contexto,
    correcta,
    opciones,
    acierto: opciones.findIndex((o) => igual(o, correcta.chord)),
    despues: seg.slice(indice + 1, indice + 3).map((s) => s.chord),
    indice,
  };
}
