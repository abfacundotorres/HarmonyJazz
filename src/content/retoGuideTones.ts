/**
 * Reto de guide tones con micrófono: en cada acorde hay que tocar su 3.ª o su 7.ª (la que sea) antes de que cambie. Este módulo lleva la
 * cuenta sin depender del micrófono ni de la pantalla: una «ventana» por acorde que dura lo que dura el acorde (más un margen por la latencia
 * del micrófono), y el resultado de cada acorde de la forma.
 */
export type Estado = 'pendiente' | 'acierto' | 'fallo' | 'silencio';

export interface Reto {
  /** Un resultado por acorde de la forma (en el orden de la grilla que suena). */
  estados: Estado[];
  /** Nota con que se acertó, o la última tocada si se falló. */
  notas: (string | undefined)[];
}

export interface Ventana {
  /** Acorde de la forma al que pertenece. */
  idx: number;
  /** Hasta cuándo vale (ms, el mismo reloj que el de las notas). */
  hasta: number;
  juzgada: boolean;
  tocoAlgo: boolean;
  ultima?: string;
}

/** Margen después del cambio de acorde: el micrófono avisa un poco tarde. */
export const MARGEN_MS = 80;

export const retoNuevo = (acordes: number): Reto => ({ estados: Array(acordes).fill('pendiente'), notas: Array(acordes).fill(undefined) });

/** La ventana de un acorde que empieza `desde` y dura `corcheas` corcheas al `tempo` dado (negras por minuto). */
export const ventanaNueva = (idx: number, desde: number, corcheas: number, tempo: number): Ventana => ({
  idx,
  hasta: desde + (corcheas / 2) * (60_000 / tempo) + MARGEN_MS,
  juzgada: false,
  tocoAlgo: false,
});

const poner = (r: Reto, idx: number, estado: Estado, nota?: string): Reto => {
  if (idx < 0 || idx >= r.estados.length) return r;
  const estados = [...r.estados];
  const notas = [...r.notas];
  estados[idx] = estado;
  notas[idx] = nota;
  return { estados, notas };
};

/** Una nota tocada en `tiempo`: si es guide tone del acorde de la ventana y llegó a tiempo, es un acierto (cuenta una sola vez por acorde). */
export function nota(r: Reto, v: Ventana | null, tiempo: number, nombre: string, guide: boolean): Reto {
  if (!v || v.juzgada || tiempo > v.hasta) return r;
  v.tocoAlgo = true;
  v.ultima = nombre;
  if (!guide) return r;
  v.juzgada = true;
  return poner(r, v.idx, 'acierto', nombre);
}

/** Cierra la ventana (cambió el acorde o terminó): si no hubo acierto es un fallo (tocó otra cosa) o un silencio (no tocó nada). */
export function cerrar(r: Reto, v: Ventana | null): Reto {
  if (!v || v.juzgada) return r;
  v.juzgada = true;
  return v.tocoAlgo ? poner(r, v.idx, 'fallo', v.ultima) : poner(r, v.idx, 'silencio');
}

export interface Cuenta {
  aciertos: number;
  fallos: number;
  silencios: number;
  /** Aciertos sobre los acordes en que se tocó algo (0 a 100); 0 si todavía no se tocó nada. */
  porcentaje: number;
}

export function cuenta(r: Reto): Cuenta {
  const n = (e: Estado) => r.estados.filter((x) => x === e).length;
  const aciertos = n('acierto');
  const fallos = n('fallo');
  return { aciertos, fallos, silencios: n('silencio'), porcentaje: aciertos + fallos ? Math.round((aciertos / (aciertos + fallos)) * 100) : 0 };
}

/** Dónde se falló: «compás 3 (A7: tocaste B♭)». Los silencios no son fallos. */
export function dondeFallo(r: Reto, etiquetas: { compas: number; acorde: string }[]): string[] {
  const out: string[] = [];
  r.estados.forEach((e, i) => {
    if (e === 'fallo' && etiquetas[i]) out.push(`compás ${etiquetas[i].compas} (${etiquetas[i].acorde}${r.notas[i] ? `: tocaste ${r.notas[i]}` : ''})`);
  });
  return out;
}
