import type { Chart } from '../theory/chart';
import { chordSymbol, qdef, type Chord } from '../theory/chords';
import { degreeNote, degreePc, mod, pc, type Note } from '../theory/notes';

/** Un acorde de la línea: la nota guía elegida (3.ª, 7.ª…) y cuánto se mueve desde la anterior. */
export interface PasoGuia {
  chord: Chord;
  /** Compás escrito (1-based) donde entra el acorde. */
  compas: number;
  /** Grado elegido ('3', 'b7', '6'…). */
  grado: string;
  /** Nota en concierto (sin transponer). */
  nota: Note;
  /** Semitonos respecto de la nota anterior (negativo = baja); null en el primer acorde. */
  mov: number | null;
}

/** Zona en la que se arma la línea (MIDI): se mantiene cerca del centro para que sea una sola línea, no saltos. */
const BAJO = 55;
const ALTO = 74;
const CENTRO = 64;

/**
 * Línea de guide tones: para cada acorde (los repetidos seguidos cuentan una vez) elige la 3.ª o la 7.ª (según el acorde) de modo que
 * la línea se mueva lo menos posible de un acorde al siguiente: es la conducción de voces mínima, la que conviene tener en el oído.
 * Programación dinámica sobre las dos notas guía de cada acorde en todas las octavas de una zona cómoda; el empate lo desempata
 * quedarse cerca del centro. `orden` traduce el compás que suena al compás escrito (repeticiones y finales).
 */
export function lineaGuideTones(chart: Chart, orden?: readonly number[]): PasoGuia[] {
  const acordes: { chord: Chord; compas: number }[] = [];
  let previo = '';
  for (const c of chart.chords) {
    const sym = chordSymbol(c.chord);
    if (sym === previo) continue;
    previo = sym;
    acordes.push({ chord: c.chord, compas: (orden ? orden[c.bar] : c.bar) + 1 });
  }
  if (!acordes.length) return [];

  // candidatos de cada acorde: (grado, altura MIDI) para cada octava en la zona
  const cand = acordes.map(({ chord }) => {
    const out: { grado: string; m: number }[] = [];
    for (const g of qdef(chord).guide) {
      const clase = mod(pc(chord.root) + degreePc(g), 12);
      for (let m = BAJO; m <= ALTO; m++) if (mod(m, 12) === clase) out.push({ grado: g, m });
    }
    return out;
  });

  // costo mínimo hasta cada candidato y de dónde viene
  const costo: number[][] = [];
  const desde: number[][] = [];
  cand.forEach((cs, i) => {
    costo.push([]);
    desde.push([]);
    cs.forEach((c, j) => {
      const centro = 0.01 * Math.abs(c.m - CENTRO);
      if (i === 0) {
        costo[i][j] = centro;
        desde[i][j] = -1;
        return;
      }
      let mejor = Infinity;
      let de = 0;
      cand[i - 1].forEach((p, k) => {
        const v = costo[i - 1][k] + Math.abs(c.m - p.m);
        if (v < mejor) {
          mejor = v;
          de = k;
        }
      });
      costo[i][j] = mejor + centro;
      desde[i][j] = de;
    });
  });

  // camino de menor costo, de atrás para adelante
  let j = costo[costo.length - 1].reduce((b, v, k, a) => (v < a[b] ? k : b), 0);
  const elegido: number[] = new Array(cand.length);
  for (let i = cand.length - 1; i >= 0; i--) {
    elegido[i] = j;
    j = desde[i][j];
  }

  return acordes.map(({ chord, compas }, i) => {
    const c = cand[i][elegido[i]];
    const anterior = i > 0 ? cand[i - 1][elegido[i - 1]].m : null;
    return { chord, compas, grado: c.grado, nota: degreeNote(chord.root, c.grado), mov: anterior === null ? null : c.m - anterior };
  });
}

/** «↓ 1 semitono», «↑ 2 semitonos», «= misma nota». */
export function textoMovimiento(mov: number | null): string {
  if (mov === null) return 'empieza';
  if (mov === 0) return '= misma nota';
  const n = Math.abs(mov);
  return `${mov < 0 ? '↓' : '↑'} ${n} semitono${n === 1 ? '' : 's'}`;
}

/** «3.ª», «♭7.ª»… para decir qué grado es. */
export function textoGrado(g: string): string {
  return g.replace(/bb/g, '𝄫').replace(/b/g, '♭').replace(/#/g, '♯') + '.ª';
}
