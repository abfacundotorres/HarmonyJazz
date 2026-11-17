/**
 * Estiramiento de tiempo de alta calidad para música polifónica: vocoder de fase con bloqueo de fase alrededor
 * de cada pico del espectro (Laroche y Dolson, 1999) y transitorios intactos.
 *
 * Por qué no alcanza con WSOLA (el método anterior, que sigue como modo liviano): WSOLA copia trozos de la onda y
 * los empalma donde mejor continúan. Con una sola nota funciona muy bien, pero en un grupo (bajo, piano, platillos y
 * solista a la vez) no existe un empalme que sirva a todas las notas: cada una queda con un salto de fase distinto y,
 * al 50 %, cada golpe se oye dos veces porque el mismo trozo entra en dos cuadros seguidos.
 *
 * Cómo funciona esto
 *  - Cada cuadro (4096 muestras, ventana de Hann, salto de salida de 1024) se pasa al espectro. La magnitud de
 *    cada frecuencia se conserva; lo que se recalcula es la fase, para que cada parcial siga girando sin saltos
 *    aunque el cuadro se haya tomado de otro lugar del original.
 *  - Cuánto gira cada parcial en un salto se mide en el propio audio: se compara el cuadro con otro tomado
 *    exactamente un salto antes. No depende de la velocidad pedida ni hace falta "desenrollar" fases.
 *  - Bloqueo de fase: se buscan los picos del espectro y todas las frecuencias vecinas a un pico giran lo mismo
 *    que él. Así cada parcial conserva su forma (sin el sonido "lavado" del vocoder clásico).
 *  - Estéreo: el giro se calcula sobre la suma de los dos canales y se aplica igual a los dos, así la imagen
 *    estéreo (y "quitar el centro") queda intacta.
 *  - Ataques: se buscan un poco más adelante en el audio (salto brusco de energía en bloques de 3 ms). Alrededor
 *    de cada uno, los cuadros se toman a velocidad normal y con las fases del original: el golpe pasa tal cual, sin
 *    estirarse, repetirse ni tener eco previo. Para que además caiga en su lugar exacto, el paso se atrasa un poco
 *    antes del ataque y se adelanta lo mismo después (lo sostenido entre golpes se estira un poco más).
 *
 * Es código puro (sin dependencias del navegador): corre en el AudioWorklet y en los tests y el banco de medición.
 * El cuadro se calcula por etapas (`step`) para repartir el costo entre varios bloques de audio.
 */
import { fft } from './fft';

/** Tamaño del cuadro y salto de síntesis (75 % de solape). */
export const PV_N = 4096;
export const PV_HOP = 1024;
const HALF = PV_N / 2;
/** Etapas de un cuadro: espectro de cada canal, espectro del cuadro anterior, fases y vuelta al tiempo. */
const STAGES = 5;
/**
 * Ajustes del tratamiento de ataques.
 *  - zone: los cuadros cuyo centro queda a menos de esta distancia del ataque (muestras) pasan tal cual.
 *  - rise: cuántas veces tiene que crecer la energía de un bloque respecto del promedio anterior.
 *  - slow: cuánto puede frenarse o acelerarse el paso (fracción del avance pedido) para compensar.
 */
export const PV_TUNE = { zone: 1536, rise: 5, slow: 0.5, on: true };
/** Bloque del detector de ataques (muestras) y cuántos bloques anteriores forman el promedio. */
const BLOCK = 128;
const HISTORY = 10;
/** Bloques mínimos entre dos ataques (35 ms). */
const GAP = 12;
/** Energía mínima por muestra para considerar un ataque (−60 dB): el ruido de fondo no cuenta. */
const FLOOR = 1e-6;

const WIN = (() => {
  const w = new Float64Array(PV_N);
  for (let i = 0; i < PV_N; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / PV_N);
  return w;
})();
/** Peso (ventana de análisis × de síntesis) con que cada uno de los últimos cuatro cuadros entra al comienzo de un salto. */
const WEIGHT = [0, 1, 2, 3].map((m) => WIN[m * PV_HOP] * WIN[m * PV_HOP]);

export type Reader = (channel: number, index: number) => number;

export class PhaseVocoder {
  /** Salto terminado (un canal por arreglo). */
  readonly out: Float32Array[] = [new Float32Array(PV_HOP), new Float32Array(PV_HOP)];
  /** Cuánto avanzó el original con el último cuadro (muestras). */
  hop = 0;
  /** Posición del original que corresponde al comienzo del salto terminado. */
  anchor = 0;
  /** Hay un cuadro a medio calcular. */
  busy = false;

  private stage = 0;
  private pos = 0;
  private tempo = 1;
  private fresh = true;
  /** Este cuadro pasa tal cual (fases del original). */
  private identity = false;
  /** Ataque en cuya zona estaba el cuadro anterior (posición en el original), o −1. */
  private zoneOf = -1;
  /** Adelanto respecto de la velocidad pedida (muestras del original; negativo = atraso). */
  private lead = 0;
  // detector de ataques: hasta dónde se revisó, energías recientes y ataques por venir
  private scanPos = 0;
  private scanOn = false;
  private histFull = new Float64Array(HISTORY);
  private histHf = new Float64Array(HISTORY);
  private histN = 0;
  private sinceOnset = GAP;
  private lastSample = 0;
  /** Ataques por venir (posiciones en el original), en orden; `upN` dice cuántos hay. */
  private upcoming = new Float64Array(32);
  private upN = 0;
  private hops = new Float64Array(3);
  /** Cuadros hechos desde el último arranque. */
  count = 0;

  private lr = new Float64Array(PV_N);
  private li = new Float64Array(PV_N);
  private rr = new Float64Array(PV_N);
  private ri = new Float64Array(PV_N);
  private br = new Float64Array(PV_N);
  private bi = new Float64Array(PV_N);
  private mag = new Float64Array(HALF + 1);
  /** Giro de cada frecuencia (número complejo de módulo 1). */
  private rotR = new Float64Array(HALF + 1);
  private rotI = new Float64Array(HALF + 1);
  /** Fase de síntesis del cuadro anterior (número complejo de módulo 1). */
  private synR = new Float64Array(HALF + 1);
  private synI = new Float64Array(HALF + 1);
  private ola: Float64Array[] = [new Float64Array(PV_N), new Float64Array(PV_N)];
  private wsum = new Float64Array(PV_N);

  constructor(
    private read: Reader,
    private stereo: boolean,
  ) {}

  reset() {
    this.busy = false;
    this.stage = 0;
    this.fresh = true;
    this.identity = false;
    this.zoneOf = -1;
    this.lead = 0;
    this.scanOn = false;
    this.upN = 0;
    this.hops.fill(0);
    this.count = 0;
    this.ola[0].fill(0);
    this.ola[1].fill(0);
    this.wsum.fill(0);
  }

  /** El reproductor volvió al comienzo del loop: las posiciones guardadas se corren igual. */
  shift(delta: number) {
    this.scanPos += delta;
    if (this.zoneOf >= 0) this.zoneOf += delta;
    for (let i = 0; i < this.upN; i++) this.upcoming[i] += delta;
  }

  /** Empieza un cuadro en la posición `a` del original, para la velocidad `tempo` (1 = normal). */
  start(a: number, tempo: number) {
    this.pos = Math.round(a);
    this.tempo = tempo;
    this.stage = 0;
    this.busy = true;
    this.plan(a);
  }

  /** Busca ataques entre lo ya revisado y `until` (bloques de 3 ms: energía total y de agudos). */
  private scan(until: number) {
    const rd = this.read;
    if (!this.scanOn) {
      this.scanOn = true;
      this.scanPos = this.pos - HISTORY * BLOCK;
      this.histN = 0;
      this.sinceOnset = GAP;
      this.lastSample = 0;
    }
    while (this.scanPos < until) {
      let full = 0;
      let hf = 0;
      let prev = this.lastSample;
      for (let i = 0; i < BLOCK; i++) {
        const x = this.stereo ? 0.5 * (rd(0, this.scanPos + i) + rd(1, this.scanPos + i)) : rd(0, this.scanPos + i);
        full += x * x;
        hf += (x - prev) * (x - prev);
        prev = x;
      }
      this.lastSample = prev;
      const n = Math.min(this.histN, HISTORY);
      if (n === HISTORY && this.sinceOnset >= GAP) {
        let af = 0;
        let ah = 0;
        for (let k = 0; k < HISTORY; k++) {
          af += this.histFull[k];
          ah += this.histHf[k];
        }
        const r = PV_TUNE.rise;
        const floor = FLOOR * BLOCK;
        if ((full > floor && full > (r * af) / HISTORY) || (hf > floor * 0.05 && hf > (r * ah) / HISTORY)) {
          if (this.upN < this.upcoming.length) this.upcoming[this.upN++] = this.scanPos;
          this.sinceOnset = 0;
        }
      }
      this.sinceOnset++;
      this.histFull[this.histN % HISTORY] = full;
      this.histHf[this.histN % HISTORY] = hf;
      this.histN++;
      this.scanPos += BLOCK;
    }
  }

  /** Adelanto que conviene tener cuando el centro (a velocidad pedida) está a `d` muestras de un ataque. */
  private target(d: number): number {
    const t = this.tempo;
    const z = PV_TUNE.zone;
    const zt = z * t; // media zona, medida sobre el avance pedido
    const amp = z * (1 - t); // atraso al entrar a la zona = adelanto al salir
    const ramp = Math.abs(amp) / (1 - PV_TUNE.slow);
    if (ramp < 1) return 0;
    if (Math.abs(d) <= zt) return -d * (1 / t - 1);
    if (d > 0) return d < zt + ramp ? (-amp * (zt + ramp - d)) / ramp : 0;
    return d > -zt - ramp ? (amp * (zt + ramp + d)) / ramp : 0;
  }

  /** El ataque por venir más cercano a `c`, o −1. */
  private nearest(c: number): number {
    let best = -1;
    for (let i = 0; i < this.upN; i++) {
      const v = this.upcoming[i];
      if (best < 0 || Math.abs(v - c) < Math.abs(best - c)) best = v;
    }
    return best;
  }

  /** Decide si este cuadro pasa tal cual y cuánto avanza el original hasta el próximo. */
  private plan(a: number) {
    const want = PV_HOP * this.tempo;
    this.identity = false;
    if (!PV_TUNE.on) {
      this.hop = want;
      return;
    }
    const t = this.tempo;
    const reach = PV_TUNE.zone * (t + (2 * Math.abs(1 - t)) / (1 - PV_TUNE.slow)) + 4 * PV_HOP;
    this.scan(this.pos + HALF + reach);
    const center = a + HALF;
    const nominal = center - this.lead;
    // se olvidan los ataques que ya quedaron lejos
    let drop = 0;
    while (drop < this.upN && this.upcoming[drop] < nominal - reach) drop++;
    if (drop) {
      this.upcoming.copyWithin(0, drop, this.upN);
      this.upN -= drop;
    }
    const here = this.nearest(center);
    if (here >= 0 && Math.abs(here - center) < PV_TUNE.zone) {
      // dentro de la zona de un ataque: el primer cuadro arranca con las fases del original; los siguientes
      // siguen igual mientras el avance haya sido exactamente un salto
      this.identity = this.zoneOf !== here || this.hop === PV_HOP;
      this.zoneOf = here;
    } else this.zoneOf = -1;
    const next = this.nearest(nominal + want);
    const goal = next >= 0 ? this.target(next - (nominal + want)) : 0;
    const lo = Math.min(want * PV_TUNE.slow, PV_HOP);
    const hi = Math.max(want * (2 - PV_TUNE.slow), PV_HOP);
    let hop = Math.max(lo, Math.min(hi, want + goal - this.lead));
    if (Math.abs(hop - PV_HOP) < 0.75) hop = PV_HOP;
    this.lead += hop - want;
    this.hop = hop;
  }

  /** Avanza una etapa. Devuelve true cuando el cuadro terminó y `out`, `hop` y `anchor` están listos. */
  step(): boolean {
    const s = this.stage++;
    if (s === 0) this.load(0, this.pos, this.lr, this.li);
    else if (s === 1) {
      if (this.stereo) this.load(1, this.pos, this.rr, this.ri);
    } else if (s === 2) {
      if (!this.fresh) this.load(-1, this.pos - PV_HOP, this.br, this.bi);
    } else if (s === 3) {
      this.phases();
      this.back(this.lr, this.li, 0);
    } else {
      if (this.stereo) this.back(this.rr, this.ri, 1);
      this.emit();
    }
    if (this.stage < STAGES) return false;
    this.busy = false;
    return true;
  }

  /** El cuadro recién terminado fue de arranque: su avance es el pedido y no deja adelanto ni atraso. */
  force(hop: number) {
    this.hops[0] = hop;
    this.hop = hop;
    this.lead = 0;
  }

  /** Cuadro con ventana y su espectro. Canal −1 = suma de los dos (para el cuadro anterior). */
  private load(c: number, p: number, re: Float64Array, im: Float64Array) {
    const rd = this.read;
    if (c >= 0) for (let i = 0; i < PV_N; i++) re[i] = rd(c, p + i) * WIN[i];
    else if (this.stereo) for (let i = 0; i < PV_N; i++) re[i] = (rd(0, p + i) + rd(1, p + i)) * WIN[i];
    else for (let i = 0; i < PV_N; i++) re[i] = rd(0, p + i) * WIN[i];
    im.fill(0);
    fft(re, im);
  }

  /** Decide el giro de cada frecuencia y lo aplica a los espectros de los canales. */
  private phases() {
    const { lr, li, rr, ri, mag, rotR, rotI, synR, synI, stereo } = this;
    // suma de los canales: sobre ella se decide todo
    for (let k = 0; k <= HALF; k++) {
      const mr = stereo ? lr[k] + rr[k] : lr[k];
      const mi = stereo ? li[k] + ri[k] : li[k];
      mag[k] = Math.hypot(mr, mi);
    }
    if (this.fresh || this.identity) {
      // cuadro tal cual: las fases son las del original
      for (let k = 0; k <= HALF; k++) {
        rotR[k] = 1;
        rotI[k] = 0;
      }
    } else {
      // cada pico gira lo necesario para continuar su fase de síntesis anterior; sus vecinos giran con él
      let prevPeak = -1;
      let from = 0;
      for (let k = 0; k <= HALF; k++) {
        const m = mag[k];
        const isPeak =
          (k === 0 || m > mag[k - 1]) && (k === HALF || m >= mag[k + 1]) && (k < 2 || m > mag[k - 2]) && (k > HALF - 2 || m >= mag[k + 2]);
        if (!isPeak) continue;
        // la zona del pico anterior llega hasta el valle entre los dos
        if (prevPeak >= 0) {
          let valley = prevPeak + 1;
          for (let j = prevPeak + 1; j < k; j++) if (mag[j] < mag[valley]) valley = j;
          this.spread(prevPeak, from, valley);
          from = valley;
        }
        prevPeak = k;
      }
      if (prevPeak >= 0) this.spread(prevPeak, from, HALF + 1);
      else
        for (let k = 0; k <= HALF; k++) {
          rotR[k] = 1;
          rotI[k] = 0;
        }
    }
    // fase de síntesis de este cuadro (para el próximo) y espectros girados
    for (let k = 0; k <= HALF; k++) {
      const cr = rotR[k];
      const ci = rotI[k];
      const m = mag[k];
      if (m > 1e-12) {
        const mr = stereo ? lr[k] + rr[k] : lr[k];
        const mi = stereo ? li[k] + ri[k] : li[k];
        synR[k] = (mr * cr - mi * ci) / m;
        synI[k] = (mr * ci + mi * cr) / m;
      } else {
        synR[k] = 1;
        synI[k] = 0;
      }
      const a = lr[k];
      const b = li[k];
      lr[k] = a * cr - b * ci;
      li[k] = a * ci + b * cr;
      if (stereo) {
        const c = rr[k];
        const d = ri[k];
        rr[k] = c * cr - d * ci;
        ri[k] = c * ci + d * cr;
      }
    }
    this.fresh = false;
  }

  /** Todas las frecuencias de [from, to) giran lo mismo que el pico `p`. */
  private spread(p: number, from: number, to: number) {
    const b = Math.hypot(this.br[p], this.bi[p]);
    let cr = 1;
    let ci = 0;
    if (b > 1e-12) {
      // giro = fase de síntesis anterior − fase del cuadro tomado un salto antes
      const ur = this.br[p] / b;
      const ui = this.bi[p] / b;
      cr = this.synR[p] * ur + this.synI[p] * ui;
      ci = this.synI[p] * ur - this.synR[p] * ui;
    }
    for (let k = from; k < to; k++) {
      this.rotR[k] = cr;
      this.rotI[k] = ci;
    }
  }

  /** Vuelve al tiempo (transformada inversa) y suma el cuadro, con ventana, al acumulador del canal. */
  private back(re: Float64Array, im: Float64Array, c: number) {
    // mitad negativa del espectro = conjugada de la positiva; inversa = conjugar, transformar y conjugar
    for (let k = 1; k < HALF; k++) {
      re[PV_N - k] = re[k];
      im[PV_N - k] = -im[k];
    }
    im[0] = 0;
    im[HALF] = 0;
    for (let k = 0; k < PV_N; k++) im[k] = -im[k];
    fft(re, im);
    const o = this.ola[c];
    const g = 1 / PV_N;
    for (let i = 0; i < PV_N; i++) o[i] += re[i] * g * WIN[i];
  }

  /** Saca el primer salto del acumulador (ya no se solapa con nada) y lo corre. */
  private emit() {
    const w = this.wsum;
    for (let i = 0; i < PV_N; i++) w[i] += WIN[i] * WIN[i];
    this.take(PV_HOP);
    // posición del original que se oye al comienzo del salto: promedio (según su peso) de los cuadros que lo forman
    // (al arrancar todavía no hay cuadros anteriores: sólo cuentan los que existen)
    const h = this.hops;
    let sum = 0;
    let wt = 0;
    let back = 0;
    for (let m = 1; m <= Math.min(3, this.count); m++) {
      back += h[m - 1];
      sum += WEIGHT[m] * (m * PV_HOP - back);
      wt += WEIGHT[m];
    }
    this.anchor = this.pos + (wt > 0 ? sum / wt : 0);
    h[2] = h[1];
    h[1] = h[0];
    h[0] = this.hop;
    this.count++;
  }

  /** Pasa `n` muestras del acumulador a `out` (divididas por el peso real de las ventanas) y lo corre. */
  private take(n: number) {
    const w = this.wsum;
    for (let c = 0; c < 2; c++) {
      const o = this.ola[this.stereo ? c : 0];
      const dst = this.out[c];
      // con el solape completo el peso es 1,5; al arrancar es menor y la división devuelve el nivel real
      for (let i = 0; i < n; i++) dst[i] = o[i] / Math.max(w[i], 0.02);
    }
    for (let c = 0; c < (this.stereo ? 2 : 1); c++) {
      this.ola[c].copyWithin(0, n);
      this.ola[c].fill(0, PV_N - n);
    }
    w.copyWithin(0, n);
    w.fill(0, PV_N - n);
  }

  /** Lo que queda en el acumulador después del último cuadro: un salto más por llamada (hasta tres). */
  tail() {
    this.take(PV_HOP);
  }
}
