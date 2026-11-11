/**
 * Núcleo de reproducción del transcriptor: estiramiento de tiempo sin cambiar el tono (WSOLA),
 * afinación fina (remuestreo), loops continuos y silencios entre repeticiones.
 *
 * Es código puro y sin dependencias: corre dentro de un AudioWorklet (engine.worklet.ts) y también en
 * los tests, donde se mide lo que hace (frecuencia de salida, velocidad, continuidad del loop).
 *
 * Cómo funciona
 *  - Modo directo (velocidad 100 % y afinación 0): copia las muestras tal cual.
 *  - Modo WSOLA: se arman cuadros de N muestras (ventana Hann, solape del 50 %) del original. La posición
 *    nominal de cada cuadro avanza `Hs × tempo`; para que no haya saltos de fase se busca, cerca de esa
 *    posición, el tramo que mejor continúa al cuadro anterior (correlación normalizada).
 *  - Afinación: se estira por `velocidad / afinación` y después se remuestrea por `afinación`
 *    (interpolación de Hermite): la velocidad final es la pedida y el tono cambia por esa razón.
 *  - Loop: el tramo se trata como una señal circular. Los últimos ~12 ms se mezclan (potencia constante)
 *    con el audio anterior al inicio, de modo que el final empalma con el principio sin salto. Así el loop
 *    dura exactamente lo que se marcó y no suena ningún clic.
 *  - Cualquier salto (buscar una posición, pausar, cambiar de modo) se hace con un fundido corto.
 */
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

export type CenterMode = 0 | 1 | 2; // 0 = estéreo, 1 = quitar el centro, 2 = sólo el centro

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
  private pending: (() => void) | null = null;
  private a = 0; // posición de origen (muestras, con decimales)
  private silence = 0;
  private finished = false;

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
    this.resetStretch();
  }

  // ---------- control ----------
  setRate(r: number) {
    const pos = this.getPosition();
    const was = this.direct();
    this.rate = Math.min(4, Math.max(0.1, r));
    this.modeChanged(was, pos);
  }
  setPitch(ratio: number) {
    const pos = this.getPosition();
    const was = this.direct();
    this.pitch = Math.min(4, Math.max(0.25, ratio));
    this.modeChanged(was, pos);
  }
  setCenter(m: CenterMode) {
    this.center = m;
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
    this.pending = () => this.reposition(f);
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
  private modeChanged(wasDirect: boolean, pos: number) {
    if (wasDirect === this.direct()) return;
    if (!this.active) return this.reposition(pos);
    this.pending = () => this.reposition(pos);
    this.fadeDir = -1;
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

  /** Genera un cuadro WSOLA y agrega Hs muestras terminadas a la cola. */
  private produce() {
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
  /** Llena un bloque de salida (estéreo). */
  process(L: Float32Array, R: Float32Array) {
    const n = L.length;
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
          const p = this.pending;
          this.pending = null;
          p?.();
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
      if (this.center === 1) l = r = 0.5 * (l - r);
      else if (this.center === 2) l = r = 0.5 * (l + r);
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
