/**
 * Núcleo de reproducción del transcriptor: estiramiento de tiempo sin cambiar el tono,
 * afinación fina (remuestreo), loops continuos y silencios entre repeticiones.
 *
 * Es código puro y sin dependencias: corre dentro de un AudioWorklet (engine.worklet.ts) y también en
 * los tests, donde se mide lo que hace (frecuencia de salida, velocidad, continuidad del loop).
 *
 * Cómo funciona
 *  - Modo directo (velocidad 100 % y afinación 0): copia las muestras tal cual.
 *  - Estiramiento de alta calidad (por defecto): vocoder de fase con bloqueo de fase y ataques intactos (pv.ts).
 *    Cada cuadro se calcula por etapas, una por bloque de audio, para repartir el costo.
 *  - Estiramiento liviano (WSOLA, `setQuality(false)`): cuadros de N muestras (ventana Hann, solape del 50 %)
 *    del original; se busca, cerca de la posición nominal, el tramo que mejor continúa al cuadro anterior
 *    (correlación normalizada). Cuesta la cuarta parte, pero en música con varios instrumentos ensucia lo
 *    sostenido y repite los golpes.
 *  - Afinación: se estira por `velocidad / afinación` y después se remuestrea por `afinación`
 *    (interpolación de Hermite): la velocidad final es la pedida y el tono cambia por esa razón.
 *  - Loop: el tramo se trata como una señal circular. Los últimos ~12 ms se mezclan (potencia constante)
 *    con el audio anterior al inicio, de modo que el final empalma con el principio sin salto. Así el loop
 *    dura exactamente lo que se marcó y no suena ningún clic.
 *  - Cualquier salto (buscar una posición, pausar, cambiar de modo) se hace con un fundido corto.
 */
import { PhaseVocoder, PV_HOP } from './pv';

export type Samples = Float32Array | Int16Array;

export interface CoreSource {
  channels: Samples[];
  sampleRate: number;
}

/** Mitad del cuadro (salto de síntesis). El cuadro es de 2×HS muestras. */
export const HS = 1024;
const N = 2 * HS;
/** Radio de búsqueda del mejor empalme (muestras). */
const TOL = 512;
const FIFO = 1 << 15;
const MASK = FIFO - 1;
const FADE = 96;
/** Techo del limitador de salida. */
const LIMIT = 0.97;

export type CenterMode = 0 | 1 | 2; // 0 = estéreo, 1 = quitar el centro, 2 = sólo el centro

/** Click de metrónomo que sigue la posición del audio original (en segundos de origen). */
export interface ClickOpts {
  bpm: number;
  /** Instante (s) del primer tiempo del compás 1. */
  offset: number;
  beats: number;
  gain: number;
}

const HANN = (() => {
  const w = new Float32Array(N);
  for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  return w;
})();
/** Primer cuadro tras un arranque: sube rápido (no hay cuadro anterior con el que solapar). */
const HANN_FIRST = (() => {
  const w = new Float32Array(N);
  w.set(HANN);
  for (let i = 0; i < HS; i++) w[i] = Math.min(1, i / 48);
  return w;
})();

export class PlayerCore {
  readonly sr: number;
  readonly length: number;
  private readonly ch: Samples[];
  private readonly scale: number;
  private readonly nch: number;

  // parámetros
  private rate = 1;
  private pitch = 1;
  private center: CenterMode = 0;
  /** Estiramiento de alta calidad (vocoder de fase, pv.ts) o liviano (WSOLA, más barato para el procesador). */
  private hq = true;
  // lo pedido (se aplica enseguida, o al final de un fundido si cambia el modo)
  private tRate = 1;
  private tPitch = 1;
  private tHq = true;
  private pendMode = false;
  private pendSeek: number | null = null;
  private pv: PhaseVocoder;
  private gap = 0; // muestras de silencio entre repeticiones

  // loop
  private looping = false;
  private loopS = 0;
  private loopE = 0;
  private L = 0;
  private C = 0;
  private cosT = new Float32Array(0);
  private sinT = new Float32Array(0);

  // estado de reproducción
  private active = false;
  private wantPlay = false;
  private fade = 0;
  private fadeDir = 0;
  private a = 0; // posición de origen (muestras, con decimales)
  private silence = 0;
  private finished = false;

  /** Cuadros del vocoder que hubo que terminar de golpe (no alcanzó el cálculo por etapas): para medir. */
  syncFrames = 0;
  /** Ganancia del limitador de salida (1 = sin actuar). */
  /** Cuadros de arranque que faltan y si todavía no salió el primer salto desde el último arranque. */
  private warm = 2;
  private priming = true;
  private limit = 1;
  private limitRel = 0;
  /** Cantidad de vueltas del loop (crece a medida que se generan). */
  loops = 0;
  ended = false;

  // WSOLA
  private ola: Float32Array[];
  private fifo: Float32Array[];
  private fifoEnd = 0;
  private readPos = 0;
  private frames = 0;
  private havePrev = false;
  private prevStart = 0;
  /** Por cada cuadro: dónde empieza en la cola, su posición nominal de origen y su tempo. */
  private anchorIdx = new Float64Array(64);
  private anchorA = new Float64Array(64);
  private anchorT = new Float64Array(64);
  private gapMarks: number[] = [];
  private click: ClickOpts | null = null;
  private clickQ: { j: number; accent: boolean }[] = [];
  private clickLeft = 0;
  private clickLen = 0;
  private clickFreq = 1000;
  private clickPhase = 0;
  private srcDone = false;
  private tmp: Float32Array[];
  private mono = new Float32Array(2 * TOL + HS + 8);
  private target = new Float32Array(HS);

  constructor(src: CoreSource) {
    this.sr = src.sampleRate;
    this.ch = src.channels.length ? src.channels : [new Float32Array(0)];
    this.nch = this.ch.length;
    this.length = this.ch[0].length;
    this.scale = this.ch[0] instanceof Int16Array ? 1 / 32768 : 1;
    this.ola = [new Float32Array(N), new Float32Array(N)];
    this.fifo = [new Float32Array(FIFO), new Float32Array(FIFO)];
    this.tmp = [new Float32Array(N), new Float32Array(N)];
    this.limitRel = 1 - Math.exp(-1 / (0.3 * this.sr));
    this.pv = new PhaseVocoder((c, u) => this.at(c, u), this.nch > 1);
    this.resetStretch();
  }

  // ---------- control ----------
  setRate(r: number) {
    this.tRate = Math.min(4, Math.max(0.1, r));
    this.retarget();
  }
  setPitch(ratio: number) {
    this.tPitch = Math.min(4, Math.max(0.25, ratio));
    this.retarget();
  }
  /** Calidad del estiramiento: true = vocoder de fase (por defecto), false = WSOLA. */
  setQuality(high: boolean) {
    this.tHq = high;
    this.retarget();
  }
  /**
   * Aplica velocidad, afinación y calidad pedidas. Si cambia la forma de generar el sonido (directo, vocoder o
   * WSOLA) y está sonando, el cambio se hace en el punto más bajo de un fundido corto: hasta entonces sigue el modo
   * anterior, así no hay salto en la onda.
   */
  private retarget() {
    const next = Math.abs(this.tRate - 1) < 1e-6 && Math.abs(this.tPitch - 1) < 1e-6;
    const same = this.direct() === next && (next || this.tHq === this.hq);
    if (same && !this.pendMode) return this.applyTarget();
    if (!this.active) {
      const pos = this.getPosition();
      this.applyTarget();
      return this.reposition(pos);
    }
    this.pendMode = true;
    this.fadeDir = -1;
  }
  private applyTarget() {
    this.rate = this.tRate;
    this.pitch = this.tPitch;
    this.hq = this.tHq;
  }
  setCenter(m: CenterMode) {
    this.center = m;
  }
  setClick(c: ClickOpts | null) {
    this.click = c && c.bpm > 0 ? c : null;
  }
  setGap(seconds: number) {
    this.gap = Math.max(0, Math.round(seconds * this.sr));
  }
  /** Loop en muestras [start, end); null lo apaga. */
  setLoop(start: number | null, end = 0) {
    if (start === null || end - start < 64) {
      this.looping = false;
      return;
    }
    const pos = this.getPosition();
    this.loopS = Math.max(0, Math.floor(start));
    this.loopE = Math.min(this.length, Math.floor(end));
    this.L = this.loopE - this.loopS;
    this.C = Math.max(16, Math.min(Math.round(this.sr * 0.012), Math.floor(this.L / 4)));
    this.cosT = new Float32Array(this.C);
    this.sinT = new Float32Array(this.C);
    for (let j = 0; j < this.C; j++) {
      const w = ((j + 0.5) / this.C) * (Math.PI / 2);
      this.cosT[j] = Math.cos(w);
      this.sinT[j] = Math.sin(w);
    }
    this.looping = true;
    if (pos < this.loopS || pos >= this.loopE) this.seek(this.loopS);
  }
  play() {
    this.wantPlay = true;
    if (this.ended) {
      this.ended = false;
      this.finished = false;
      this.reposition(0);
    }
    if (!this.active) {
      this.active = true;
      this.fade = 0;
      this.fadeDir = 1;
    }
  }
  pause() {
    this.wantPlay = false;
    if (this.active) this.fadeDir = -1;
  }
  get playing() {
    return this.wantPlay && !this.ended;
  }
  seek(frame: number) {
    const f = Math.min(Math.max(0, frame), Math.max(0, this.length - 1));
    if (!this.active) return this.reposition(f);
    this.pendSeek = f;
    this.fadeDir = -1;
  }
  /** Posición de origen (muestras) de lo que se está oyendo. */
  getPosition(): number {
    let p = this.a;
    if (!this.direct() && this.frames > 0) {
      const lo = Math.max(0, this.frames - 64);
      for (let k = this.frames - 1; k >= lo; k--) {
        if (this.anchorIdx[k & 63] <= this.readPos) {
          p = this.anchorA[k & 63] + (this.readPos - this.anchorIdx[k & 63]) * this.anchorT[k & 63];
          break;
        }
      }
    }
    return this.wrap(p);
  }

  // ---------- interno ----------
  private direct() {
    return Math.abs(this.rate - 1) < 1e-6 && Math.abs(this.pitch - 1) < 1e-6;
  }
  private tempo() {
    return this.rate / this.pitch;
  }
  private wrap(p: number) {
    if (!this.looping) return Math.min(Math.max(0, p), this.length);
    let q = (p - this.loopS) % this.L;
    if (q < 0) q += this.L;
    return this.loopS + q;
  }
  private reposition(f: number) {
    this.a = this.looping ? this.wrap(f) : Math.min(Math.max(0, f), this.length);
    if (this.direct()) this.a = Math.round(this.a);
    this.silence = 0;
    this.resetStretch();
  }
  private resetStretch() {
    for (const o of this.ola) o.fill(0);
    this.fifoEnd = 0;
    this.readPos = 0;
    this.frames = 0;
    this.havePrev = false;
    this.srcDone = false;
    this.gapMarks = [];
    this.pv.reset();
    this.warm = 2;
    this.priming = true;
  }

  /** Muestra del dominio de reproducción: del archivo, o circular con empalme si hay loop. */
  private at(c: number, u: number): number {
    const d = this.ch[Math.min(c, this.nch - 1)];
    if (!this.looping) return u >= 0 && u < this.length ? d[u] * this.scale : 0;
    let p = (u - this.loopS) % this.L;
    if (p < 0) p += this.L;
    const x = d[this.loopS + p] * this.scale;
    const edge = this.L - this.C;
    if (p < edge) return x;
    const j = p - edge;
    const pre = this.loopS - this.C + j;
    const b = pre >= 0 ? d[pre] * this.scale : 0;
    return x * this.cosT[j] + b * this.sinT[j];
  }
  private readMono(u0: number, n: number, dst: Float32Array) {
    if (this.nch === 1) for (let i = 0; i < n; i++) dst[i] = this.at(0, u0 + i);
    else for (let i = 0; i < n; i++) dst[i] = 0.5 * (this.at(0, u0 + i) + this.at(1, u0 + i));
  }

  /** Copia a la cola el salto que el vocoder acaba de terminar. `fade`: con caída (final antes de un silencio). */
  private pushPv(fade = false) {
    for (let c = 0; c < 2; c++) {
      const src = this.pv.out[c];
      const f = this.fifo[c];
      if (fade) for (let i = 0; i < PV_HOP; i++) f[(this.fifoEnd + i) & MASK] = src[i] * (0.5 + 0.5 * Math.cos((Math.PI * i) / PV_HOP));
      else for (let i = 0; i < PV_HOP; i++) f[(this.fifoEnd + i) & MASK] = src[i];
    }
    this.fifoEnd += PV_HOP;
  }

  /**
   * Vocoder de fase: avanza una etapa del cuadro en curso (o lo empieza). Devuelve true si terminó un cuadro.
   * `a` es la posición que se oye al comienzo del salto; como lo que suena en cada instante lo dominan los dos
   * cuadros anteriores, el cuadro se toma `2 × salto × (1 − tempo)` antes. Al arrancar se calculan primero esos
   * dos cuadros anteriores (sin sacarlos): así el sonido empieza justo en el punto pedido y a la velocidad pedida.
   * Mientras tanto sale silencio (unos 20 ms), en lugar de calcular todo de golpe en un solo bloque.
   */
  private stepPv(): boolean {
    const pv = this.pv;
    const t = this.tempo();
    if (!pv.busy) pv.start(this.a - 2 * PV_HOP * (1 - t) - this.warm * PV_HOP * t, t);
    if (!pv.step()) return false;
    if (this.warm > 0) {
      // cuadro de arranque: no se saca
      pv.force(PV_HOP * t);
      this.warm--;
      return false;
    }
    if (this.priming) {
      // el fundido de entrada empieza con el primer sonido, no durante el silencio de arranque
      this.priming = false;
      if (this.fadeDir >= 0 && this.wantPlay) {
        this.fade = 0;
        this.fadeDir = 1;
      }
    }
    this.anchorIdx[this.frames & 63] = this.fifoEnd;
    this.anchorA[this.frames & 63] = pv.anchor;
    this.anchorT[this.frames & 63] = t;
    this.pushPv();
    this.frames++;
    this.havePrev = true;
    this.a += pv.hop;
    if (this.looping) {
      while (this.a >= this.loopE) {
        this.a -= this.L;
        pv.shift(-this.L);
        this.loops++;
        if (this.gap > 0) {
          // final del tramo con caída, silencio y arranque limpio
          pv.tail();
          this.pushPv(true);
          this.gapMarks.push(this.fifoEnd);
          pv.reset();
          this.warm = 2;
          this.priming = true;
        }
      }
    } else if (this.a >= this.length) {
      this.srcDone = true;
      for (let k = 0; k < 3; k++) {
        pv.tail();
        this.pushPv();
      }
    }
    return true;
  }

  /** Genera un cuadro y agrega un salto de muestras terminadas a la cola. */
  private produce() {
    if (this.hq) {
      this.syncFrames++;
      while (!this.stepPv());
      return;
    }
    const t = this.tempo();
    let nominal = this.a;
    let start = Math.round(nominal);
    if (this.havePrev) {
      // continuación natural del cuadro anterior = lo que vendría después de su primera mitad
      this.readMono(this.prevStart + HS, HS, this.target);
      const base = start - TOL;
      this.readMono(base, 2 * TOL + HS, this.mono);
      let best = -Infinity;
      let bestK = TOL;
      for (let k = 0; k <= 2 * TOL; k += 4) {
        let dot = 0;
        let e = 1e-9;
        for (let i = 0; i < HS; i += 4) {
          const v = this.mono[k + i];
          dot += v * this.target[i];
          e += v * v;
        }
        const s = dot / Math.sqrt(e);
        if (s > best) {
          best = s;
          bestK = k;
        }
      }
      best = -Infinity;
      let fineK = bestK;
      for (let k = Math.max(0, bestK - 3); k <= Math.min(2 * TOL, bestK + 3); k++) {
        let dot = 0;
        let e = 1e-9;
        for (let i = 0; i < HS; i += 2) {
          const v = this.mono[k + i];
          dot += v * this.target[i];
          e += v * v;
        }
        const s = dot / Math.sqrt(e);
        if (s > best) {
          best = s;
          fineK = k;
        }
      }
      start = base + fineK;
    }
    const w = this.havePrev ? HANN : HANN_FIRST;
    for (let c = 0; c < 2; c++) {
      const t0 = this.tmp[c];
      for (let i = 0; i < N; i++) t0[i] = this.at(c, start + i) * w[i];
      const o = this.ola[c];
      for (let i = 0; i < N; i++) o[i] += t0[i];
    }
    // las primeras Hs muestras ya no se solapan con nada: pasan a la cola
    for (let c = 0; c < 2; c++) {
      const o = this.ola[c];
      const f = this.fifo[c];
      for (let i = 0; i < HS; i++) f[(this.fifoEnd + i) & MASK] = o[i];
      o.copyWithin(0, HS);
      o.fill(0, HS);
    }
    this.anchorIdx[this.frames & 63] = this.fifoEnd;
    this.anchorA[this.frames & 63] = nominal;
    this.anchorT[this.frames & 63] = t;
    this.fifoEnd += HS;
    this.frames++;
    this.havePrev = true;
    this.prevStart = start;
    nominal += HS * t;
    this.a = nominal;
    if (this.looping) {
      while (this.a >= this.loopE) {
        this.a -= this.L;
        this.loops++;
        if (this.gap > 0) this.insertGap();
      }
    } else if (this.a >= this.length) {
      this.srcDone = true;
      // cola del último cuadro
      for (let c = 0; c < 2; c++) {
        const o = this.ola[c];
        const f = this.fifo[c];
        for (let i = 0; i < HS; i++) f[(this.fifoEnd + i) & MASK] = o[i];
      }
      this.fifoEnd += HS;
    }
  }

  /** Silencio entre repeticiones: termina el cuadro con su caída, marca dónde hacer silencio y vuelve a empezar. */
  private insertGap() {
    for (let c = 0; c < 2; c++) {
      const o = this.ola[c];
      const f = this.fifo[c];
      for (let i = 0; i < HS; i++) f[(this.fifoEnd + i) & MASK] = o[i];
      o.fill(0);
    }
    this.fifoEnd += HS;
    this.gapMarks.push(this.fifoEnd);
    this.havePrev = false;
  }

  private nextStretched(out: { l: number; r: number }, again = false): boolean {
    if (again) {
      out.l = 0;
      out.r = 0;
      return true;
    }
    // arrancando el vocoder: silencio hasta que esté listo el primer salto (se calcula por etapas en process)
    if (this.hq && this.priming && !this.srcDone && this.fifoEnd - this.readPos < 4 && !this.gapMarks.length) {
      out.l = 0;
      out.r = 0;
      return true;
    }
    // asegura muestras suficientes para interpolar
    let guard = 0;
    while (!this.srcDone && this.fifoEnd - this.readPos < 4 && guard++ < 64) this.produce();
    if (this.fifoEnd - this.readPos < 3) return false;
    if (this.gapMarks.length && this.readPos >= this.gapMarks[0]) {
      this.gapMarks.shift();
      this.silence = this.gap;
      return this.nextStretched(out, true);
    }
    const i = Math.floor(this.readPos);
    const fr = this.readPos - i;
    for (let c = 0; c < 2; c++) {
      const f = this.fifo[c];
      const y0 = f[(i - 1) & MASK];
      const y1 = f[i & MASK];
      const y2 = f[(i + 1) & MASK];
      const y3 = f[(i + 2) & MASK];
      const v = ((0.5 * (y3 - y0) + 1.5 * (y1 - y2)) * fr + (y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3)) * fr;
      const r = (v + 0.5 * (y2 - y0)) * fr + y1;
      if (c === 0) out.l = r;
      else out.r = r;
    }
    this.readPos += this.pitch;
    return true;
  }

  private sample = { l: 0, r: 0 };
  /**
   * Ubica los clicks de este bloque: cada tiempo de la grilla que cae dentro del tramo de origen que se va a oír
   * (con la vuelta del loop si la hay) se convierte en la muestra de salida donde suena, según la velocidad.
   */
  private scheduleClicks(n: number) {
    this.clickQ.length = 0;
    const c = this.click;
    if (!c || !this.active || this.silence > 0) return;
    const sr = this.sr;
    const r = this.rate;
    const beat = 60 / c.bpm;
    const p0 = this.getPosition() / sr;
    const add = (a: number, b: number, j0: number) => {
      for (let k = Math.max(0, Math.ceil((a - c.offset) / beat - 1e-9)); c.offset + k * beat < b; k++) {
        const j = j0 + Math.round(((c.offset + k * beat - a) / r) * sr);
        if (j >= 0 && j < n) this.clickQ.push({ j, accent: k % c.beats === 0 });
      }
    };
    const end = p0 + ((n / sr) * r);
    const le = this.loopE / sr;
    if (this.looping && end > le) {
      add(p0, le, 0);
      add(this.loopS / sr, this.loopS / sr + (end - le), Math.round(((le - p0) / r) * sr));
    } else add(p0, end, 0);
  }

  /** Llena un bloque de salida (estéreo). */
  process(L: Float32Array, R: Float32Array) {
    const n = L.length;
    // el cuadro siguiente del vocoder se adelanta de a una etapa por bloque, para no cargar todo el costo en uno solo
    if (this.hq && this.active && !this.direct() && !this.srcDone) {
      const ahead = this.fifoEnd - this.readPos;
      if (ahead < 2 * PV_HOP) {
        const steps = this.priming ? 3 : ahead < PV_HOP ? 2 : 1;
        for (let k = 0; k < steps; k++) if (this.stepPv()) break;
      }
    }
    this.scheduleClicks(n);
    let qi = 0;
    this.clickQ.sort((a, b) => a.j - b.j);
    for (let i = 0; i < n; i++) {
      if (!this.active) {
        L[i] = 0;
        R[i] = 0;
        continue;
      }
      if (this.fadeDir < 0) {
        this.fade -= 1 / FADE;
        if (this.fade <= 0) {
          this.fade = 0;
          if (this.pendMode || this.pendSeek !== null) {
            const pos = this.pendSeek ?? this.getPosition();
            if (this.pendMode) this.applyTarget();
            this.pendMode = false;
            this.pendSeek = null;
            this.reposition(pos);
          }
          if (this.wantPlay) this.fadeDir = 1;
          else {
            this.fadeDir = 0;
            this.active = false;
          }
        }
      } else if (this.fadeDir > 0) {
        this.fade += 1 / FADE;
        if (this.fade >= 1) {
          this.fade = 1;
          this.fadeDir = 0;
        }
      }
      if (!this.active) {
        L[i] = 0;
        R[i] = 0;
        continue;
      }
      let l = 0;
      let r = 0;
      if (this.silence > 0) {
        this.silence--;
      } else if (this.direct()) {
        const u = Math.floor(this.a);
        if (this.looping || u < this.length) {
          l = this.at(0, u);
          r = this.nch > 1 ? this.at(1, u) : l;
          this.a = u + 1;
          if (this.looping && this.a >= this.loopE) {
            this.a = this.loopS;
            this.loops++;
            if (this.gap > 0) this.silence = this.gap;
          }
        } else this.finish();
      } else if (this.nextStretched(this.sample)) {
        l = this.sample.l;
        r = this.nch === 1 ? l : this.sample.r;
        if (this.nch === 1) r = l;
      } else if (this.srcDone) this.finish();
      // El vocoder cambia la relación de fases entre parciales: en discos masterizados "al tope" los picos pueden
      // pasar el máximo. Un limitador (baja al instante y se recupera despacio, en ~0,3 s, para no "bombear") evita que la salida recorte.
      const top = Math.max(Math.abs(l), Math.abs(r)) * this.limit;
      if (top > LIMIT) this.limit *= LIMIT / top;
      else if (this.limit < 1) this.limit = Math.min(1, this.limit + (1 - this.limit) * this.limitRel);
      l *= this.limit;
      r *= this.limit;
      if (this.center === 1) l = r = 0.5 * (l - r);
      else if (this.center === 2) l = r = 0.5 * (l + r);
      while (qi < this.clickQ.length && this.clickQ[qi].j <= i) {
        const q = this.clickQ[qi++];
        this.clickLen = this.clickLeft = Math.round(this.sr * 0.018);
        this.clickFreq = q.accent ? 1800 : 1200;
        this.clickPhase = 0;
      }
      if (this.clickLeft > 0 && this.click) {
        const env = this.clickLeft / this.clickLen;
        const v = Math.sin(this.clickPhase) * env * env * this.click.gain;
        this.clickPhase += (2 * Math.PI * this.clickFreq) / this.sr;
        this.clickLeft--;
        l += v;
        r += v;
      }
      L[i] = l * this.fade;
      R[i] = r * this.fade;
    }
  }
  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.ended = true;
    this.wantPlay = false;
    this.active = false;
  }
}
