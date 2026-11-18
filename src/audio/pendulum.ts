/**
 * Péndulo del metrónomo: ángulo de la varilla según el reloj de audio y escala de la pesa. Funciones puras (sin
 * audio ni pantalla). La varilla toca un extremo justo en cada pulso, como en un metrónomo de verdad: el clic cae
 * cuando la varilla llega al tope, y en el pulso siguiente está en el extremo opuesto.
 */

/** Un pulso agendado: instante en el reloj de audio (s), duración hasta el próximo (s) y número de pulso (global, desde 0). */
export interface SwingBeat {
  time: number;
  dur: number;
  index: number;
}

/** Amplitud de la varilla (grados), fija como en un metrónomo mecánico. */
export const SWING_DEG = 24;

/**
 * Ángulo (grados; + a un lado, − al otro) de la varilla en el instante `now`. `beats` va en orden de tiempo.
 * Entre dos pulsos sigue un coseno (frena en los extremos y pasa rápido por el centro, como un péndulo).
 * Antes del primer pulso, o sin pulsos, devuelve `rest`.
 */
export function pendulumAngle(now: number, beats: SwingBeat[], rest = 0, amp = SWING_DEG): number {
  let cur: SwingBeat | undefined;
  for (let i = beats.length - 1; i >= 0; i--) {
    if (beats[i].time <= now) {
      cur = beats[i];
      break;
    }
  }
  if (!cur) return rest;
  const phase = Math.min(1, Math.max(0, (now - cur.time) / cur.dur));
  const side = cur.index % 2 === 0 ? 1 : -1;
  return side * amp * Math.cos(Math.PI * phase);
}

/** Se descartan los pulsos viejos: alcanza con el último que ya pasó y los que vienen. */
export function trimBeats(beats: SwingBeat[], now: number): SwingBeat[] {
  let keep = 0;
  for (let i = 0; i < beats.length; i++) if (beats[i].time <= now) keep = i;
  return keep > 0 ? beats.slice(keep) : beats;
}

/** Escala de la pesa: como en un Maelzel, de 40 (arriba, lento) a 208 (abajo, rápido), con los números cada vez más juntos. */
export const SCALE_MIN = 40;
export const SCALE_MAX = 208;
/** Posición de la pesa de 0 (arriba, 40) a 1 (abajo, 208) → tempo. Escala logarítmica. */
export const posToTempo = (p: number) => SCALE_MIN * Math.pow(SCALE_MAX / SCALE_MIN, Math.min(1, Math.max(0, p)));
/** Tempo → posición de la pesa (0 a 1); lo que se sale de la escala queda en el tope. */
export const tempoToPos = (t: number) => Math.min(1, Math.max(0, Math.log(t / SCALE_MIN) / Math.log(SCALE_MAX / SCALE_MIN)));

/** Valores marcados en la varilla, como en los metrónomos clásicos. */
export const SCALE_MARKS = [40, 46, 52, 60, 66, 72, 80, 88, 96, 104, 112, 120, 132, 144, 160, 176, 192, 208];

/** Nombre italiano del tempo (los de siempre en los metrónomos). */
export function tempoName(bpm: number): string {
  if (bpm < 40) return 'Grave';
  if (bpm < 60) return 'Largo';
  if (bpm < 66) return 'Larghetto';
  if (bpm < 76) return 'Adagio';
  if (bpm < 108) return 'Andante';
  if (bpm < 120) return 'Moderato';
  if (bpm < 156) return 'Allegro';
  if (bpm < 176) return 'Vivace';
  if (bpm < 200) return 'Presto';
  return 'Prestissimo';
}
