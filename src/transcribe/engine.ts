import workletUrl from './engine.worklet.ts?worker&url';
import type { WorkletIn, WorkletPos } from './engine.worklet';
import { decodePeaks } from './audioStore';
import type { Filters } from './filters';
import { Peaks, peaksFromChannels, Region } from './regions';

/**
 * Motores de reproducción del transcriptor.
 *  - BufferEngine: decodifica el audio entero y lo reproduce con PlayerCore dentro de un AudioWorklet
 *    (loops continuos, afinación fina, filtros). Necesita memoria: sólo para audios de hasta ~10 min.
 *  - MediaEngine: el reproductor del navegador (<audio>). Sirve para cualquier duración pero el loop se
 *    corta un instante y no tiene afinación ni filtros.
 */
export type { CenterChoice, Filters } from './filters';
export { NO_FILTERS } from './filters';

export interface Analysis {
  /** Mezcla mono a baja frecuencia de muestreo, para espectrograma y detección de notas. */
  mono: Float32Array;
  sampleRate: number;
}

export type EngineEvent = 'state' | 'loop' | 'ended' | 'error';

export interface PlayerEngine {
  readonly kind: 'buffer' | 'media';
  readonly duration: number;
  readonly peaks: Peaks | null;
  readonly analysis: Analysis | null;
  /** ¿Admite afinación, filtros y quitar el centro? */
  readonly canTune: boolean;
  readonly playing: boolean;
  readonly loops: number;
  /** Segundos de origen de lo que se está oyendo (estimado, compensando la latencia de salida). */
  position(): number;
  play(): Promise<void>;
  pause(): void;
  seek(t: number): void;
  setRate(r: number): void;
  setPitch(semitones: number, cents: number): void;
  setLoop(r: Region | null): void;
  setGap(seconds: number): void;
  setFilters(f: Filters): void;
  on(ev: EngineEvent, fn: (arg?: number | string) => void): () => void;
  dispose(): void;
}

class Emitter {
  private subs: Record<string, Set<(a?: number | string) => void>> = {};
  on(ev: EngineEvent, fn: (a?: number | string) => void) {
    (this.subs[ev] ??= new Set()).add(fn);
    return () => this.subs[ev].delete(fn);
  }
  emit(ev: EngineEvent, a?: number | string) {
    this.subs[ev]?.forEach((f) => f(a));
  }
}

/** Memoria máxima del audio decodificado (Float32) para usar el motor preciso. */
export const MAX_DECODED_BYTES = 260 * 1024 * 1024;
const ANALYSIS_RATE = 11025;

function probeDuration(blob: Blob): Promise<number> {
  return new Promise((res) => {
    const a = new Audio();
    const url = URL.createObjectURL(blob);
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      a.src = '';
      res(d);
    };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => done(0);
    a.src = url;
  });
}

// ---------------------------------------------------------------------------------------------

export class BufferEngine extends Emitter implements PlayerEngine {
  readonly kind = 'buffer' as const;
  readonly canTune = true;
  private last: { frame: number; time: number; playing: boolean } = { frame: 0, time: 0, playing: false };
  private isPlaying = false;
  private region: Region | null = null;
  private rate = 1;
  loops = 0;
  private ended = false;

  private constructor(
    private ctx: AudioContext,
    private node: AudioWorkletNode,
    private hp: BiquadFilterNode[],
    private lp: BiquadFilterNode[],
    private sr: number,
    readonly duration: number,
    readonly peaks: Peaks,
    readonly analysis: Analysis,
  ) {
    super();
    node.port.onmessage = (e: MessageEvent<WorkletPos | { type: 'ready' }>) => {
      const m = e.data;
      if (m.type !== 'pos') return;
      this.last = { frame: m.frame, time: m.time, playing: m.playing };
      if (m.ended && !this.ended) {
        this.ended = true;
        this.isPlaying = false;
        this.emit('ended');
        this.emit('state');
        return;
      }
      if (!m.ended) this.ended = false;
      if (m.loops !== this.loops) {
        this.loops = m.loops;
        this.emit('loop', m.loops);
      }
    };
  }

  static async create(blob: Blob): Promise<BufferEngine> {
    if (typeof AudioWorkletNode === 'undefined') throw new Error('Este navegador no admite el motor preciso.');
    const ctx = new AudioContext({ latencyHint: 'playback' });
    try {
      const dur = await probeDuration(blob);
      if (dur > 0 && dur * ctx.sampleRate * 2 * 4 > MAX_DECODED_BYTES) {
        throw new Error(`El audio dura ${Math.round(dur / 60)} min: es muy largo para el motor preciso.`);
      }
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      const sr = buf.sampleRate;
      const nch = Math.min(2, buf.numberOfChannels);
      const floats: Float32Array[] = [];
      for (let c = 0; c < nch; c++) floats.push(buf.getChannelData(c));
      const peaks = peaksFromChannels(floats, sr, 200);
      // análisis a baja frecuencia (el navegador filtra y remuestrea)
      const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * ANALYSIS_RATE)), ANALYSIS_RATE);
      const src = off.createBufferSource();
      src.buffer = buf;
      src.connect(off.destination);
      src.start();
      const mono = (await off.startRendering()).getChannelData(0).slice();
      // el audio va al worklet en 16 bits (mitad de memoria); se transfiere sin copiar
      const q: Int16Array[] = floats.map((f) => {
        const o = new Int16Array(f.length);
        for (let i = 0; i < f.length; i++) {
          const v = f[i];
          o[i] = v >= 1 ? 32767 : v <= -1 ? -32768 : Math.round(v * 32767);
        }
        return o;
      });
      await ctx.audioWorklet.addModule(workletUrl);
      const node = new AudioWorkletNode(ctx, 'hj-player', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
      const ready = new Promise<void>((res) => {
        const h = (e: MessageEvent) => {
          if ((e.data as { type: string }).type === 'ready') {
            node.port.removeEventListener('message', h);
            res();
          }
        };
        node.port.addEventListener('message', h);
        node.port.start();
      });
      const msg: WorkletIn = { type: 'load', channels: q, sampleRate: sr };
      node.port.postMessage(msg, q.map((a) => a.buffer));
      // los filtros: dos biquad en cascada por lado (24 dB/oct); "sin corte" = fuera de la banda audible
      const mk = (type: BiquadFilterType, f: number) => {
        const b = ctx.createBiquadFilter();
        b.type = type;
        b.frequency.value = f;
        b.Q.value = 0.707;
        return b;
      };
      const hp = [mk('highpass', 10), mk('highpass', 10)];
      const lp = [mk('lowpass', sr / 2 - 100), mk('lowpass', sr / 2 - 100)];
      let prev: AudioNode = node;
      for (const f of [...hp, ...lp]) {
        prev.connect(f);
        prev = f;
      }
      prev.connect(ctx.destination);
      const eng = new BufferEngine(ctx, node, hp, lp, sr, buf.length / sr, peaks, { mono, sampleRate: ANALYSIS_RATE });
      await ready;
      return eng;
    } catch (e) {
      void ctx.close().catch(() => undefined);
      throw e;
    }
  }

  get playing() {
    return this.isPlaying;
  }
  private post(m: WorkletIn) {
    this.node.port.postMessage(m);
  }

  position(): number {
    const { frame, time, playing } = this.last;
    let p = frame / this.sr;
    if (playing) {
      const lat = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
      const dt = Math.max(-0.25, this.ctx.currentTime - time - lat);
      p += dt * this.rate;
      const r = this.region;
      if (r && p >= r.end) p = r.start + ((p - r.start) % (r.end - r.start));
    }
    return Math.min(Math.max(0, p), this.duration);
  }
  async play() {
    if (this.ctx.state !== 'running') await this.ctx.resume();
    this.isPlaying = true;
    this.post({ type: 'play' });
    this.emit('state');
  }
  pause() {
    this.isPlaying = false;
    this.post({ type: 'pause' });
    this.emit('state');
  }
  seek(t: number) {
    const f = Math.round(Math.min(Math.max(0, t), this.duration) * this.sr);
    this.post({ type: 'seek', frame: f });
    this.last = { frame: f, time: this.ctx.currentTime, playing: this.isPlaying };
    this.ended = false;
  }
  setRate(r: number) {
    this.rate = r;
    this.post({ type: 'rate', value: r });
  }
  setPitch(semitones: number, cents: number) {
    this.post({ type: 'pitch', value: Math.pow(2, (semitones + cents / 100) / 12) });
  }
  setLoop(r: Region | null) {
    this.region = r;
    if (r) this.post({ type: 'loop', start: Math.round(r.start * this.sr), end: Math.round(r.end * this.sr) });
    else this.post({ type: 'loop', start: null, end: 0 });
  }
  setGap(seconds: number) {
    this.post({ type: 'gap', seconds });
  }
  setFilters(f: Filters) {
    const t = this.ctx.currentTime;
    const hp = f.hp > 0 ? f.hp : 10;
    const lp = f.lp > 0 ? Math.min(f.lp, this.sr / 2 - 100) : this.sr / 2 - 100;
    for (const b of this.hp) b.frequency.setTargetAtTime(hp, t, 0.01);
    for (const b of this.lp) b.frequency.setTargetAtTime(lp, t, 0.01);
    this.post({ type: 'center', mode: f.center === 'remove' ? 1 : f.center === 'only' ? 2 : 0 });
  }
  dispose() {
    this.isPlaying = false;
    try {
      this.node.port.postMessage({ type: 'pause' } satisfies WorkletIn);
      this.node.disconnect();
    } catch {
      /* ya cerrado */
    }
    void this.ctx.close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------------------------

export class MediaEngine extends Emitter implements PlayerEngine {
  readonly kind = 'media' as const;
  readonly canTune = false;
  loops = 0;
  private region: Region | null = null;
  private raf = 0;
  private gap = 0;
  private gapTimer = 0;
  private url: string;

  private constructor(private a: HTMLAudioElement, url: string, readonly duration: number, readonly peaks: Peaks | null) {
    super();
    this.url = url;
    a.onplay = () => this.emit('state');
    a.onpause = () => this.emit('state');
    a.onended = () => {
      if (this.region) {
        this.wrap();
        void a.play();
      } else this.emit('ended');
    };
    a.onerror = () => this.emit('error', 'Este archivo no se puede reproducir en este navegador (formato no compatible).');
    const tick = () => {
      if (!a.paused && this.region && a.currentTime >= this.region.end - 0.02) this.wrap();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  static async create(blob: Blob): Promise<MediaEngine> {
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    a.preload = 'auto';
    a.preservesPitch = true;
    (a as unknown as { webkitPreservesPitch: boolean }).webkitPreservesPitch = true;
    (a as unknown as { mozPreservesPitch: boolean }).mozPreservesPitch = true;
    const dur = await new Promise<number>((res, rej) => {
      a.onloadedmetadata = () => (Number.isFinite(a.duration) && a.duration > 0 ? res(a.duration) : rej(new Error('No se pudo leer la duración de este archivo.')));
      a.onerror = () => rej(new Error('Este archivo no se puede reproducir en este navegador (formato no compatible).'));
      a.src = url;
    }).catch((e) => {
      URL.revokeObjectURL(url);
      throw e;
    });
    const peaks = await decodePeaks(blob);
    return new MediaEngine(a, url, dur, peaks);
  }

  get analysis() {
    return null;
  }
  get playing() {
    return !this.a.paused;
  }
  private wrap() {
    if (!this.region) return;
    this.loops++;
    this.emit('loop', this.loops);
    this.a.currentTime = this.region.start;
    if (this.gap > 0) {
      this.a.pause();
      window.clearTimeout(this.gapTimer);
      this.gapTimer = window.setTimeout(() => void this.a.play(), this.gap * 1000);
    }
  }
  position() {
    return this.a.currentTime;
  }
  async play() {
    const r = this.region;
    if (r && (this.a.currentTime < r.start || this.a.currentTime >= r.end - 0.05)) this.a.currentTime = r.start;
    await this.a.play();
  }
  pause() {
    window.clearTimeout(this.gapTimer);
    this.a.pause();
  }
  seek(t: number) {
    this.a.currentTime = Math.min(Math.max(0, t), Math.max(0, this.duration - 0.01));
  }
  setRate(r: number) {
    this.a.playbackRate = r;
    this.a.preservesPitch = true;
  }
  setPitch() {
    /* no disponible en este modo */
  }
  setLoop(r: Region | null) {
    this.region = r;
  }
  setGap(s: number) {
    this.gap = s;
  }
  setFilters() {
    /* no disponible en este modo */
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.gapTimer);
    this.a.pause();
    this.a.src = '';
    URL.revokeObjectURL(this.url);
  }
}

export interface EngineChoice {
  engine: PlayerEngine;
  /** Por qué se usa el reproductor simple (si es el caso). */
  reason?: string;
}

export async function createEngine(blob: Blob, simple = false): Promise<EngineChoice> {
  if (simple) return { engine: await MediaEngine.create(blob), reason: 'Elegiste el reproductor simple.' };
  try {
    return { engine: await BufferEngine.create(blob) };
  } catch (e) {
    const engine = await MediaEngine.create(blob);
    return { engine, reason: `${(e as Error).message} Se usa el reproductor simple: el loop se corta un instante y no hay afinación ni filtros.` };
  }
}
