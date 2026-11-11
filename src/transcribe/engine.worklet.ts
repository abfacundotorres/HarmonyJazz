/**
 * AudioWorklet del transcriptor. Corre PlayerCore (stretch.ts) fuera del hilo de la interfaz.
 * Se carga con `audioWorklet.addModule(url)`; vite empaqueta este archivo con sus importaciones.
 */
import { CenterMode, PlayerCore } from './stretch';

declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;

export type WorkletIn =
  | { type: 'load'; channels: Int16Array[]; sampleRate: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seek'; frame: number }
  | { type: 'rate'; value: number }
  | { type: 'pitch'; value: number }
  | { type: 'loop'; start: number | null; end: number }
  | { type: 'gap'; seconds: number }
  | { type: 'center'; mode: CenterMode };

export interface WorkletPos {
  type: 'pos';
  /** Muestras de origen de lo que se está oyendo. */
  frame: number;
  /** Hora del contexto en que se midió. */
  time: number;
  playing: boolean;
  loops: number;
  ended: boolean;
}

class HjPlayer extends AudioWorkletProcessor {
  private core: PlayerCore | null = null;
  private n = 0;
  private lastEnded = false;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent<WorkletIn>) => {
      const m = e.data;
      if (m.type === 'load') {
        this.core = new PlayerCore({ channels: m.channels, sampleRate: m.sampleRate });
        this.port.postMessage({ type: 'ready' });
        return;
      }
      const c = this.core;
      if (!c) return;
      if (m.type === 'play') c.play();
      else if (m.type === 'pause') c.pause();
      else if (m.type === 'seek') c.seek(m.frame);
      else if (m.type === 'rate') c.setRate(m.value);
      else if (m.type === 'pitch') c.setPitch(m.value);
      else if (m.type === 'loop') c.setLoop(m.start, m.end);
      else if (m.type === 'gap') c.setGap(m.seconds);
      else if (m.type === 'center') c.setCenter(m.mode);
      this.report();
    };
  }

  private report() {
    const c = this.core;
    if (!c) return;
    const msg: WorkletPos = { type: 'pos', frame: c.getPosition(), time: currentTime, playing: c.playing, loops: c.loops, ended: c.ended };
    this.port.postMessage(msg);
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    const c = this.core;
    if (!c || !out?.length) return true;
    c.process(out[0], out[1] ?? out[0]);
    // posición ~ cada 6 bloques (≈ 16 ms); y de inmediato cuando termina
    if (++this.n % 6 === 0 || c.ended !== this.lastEnded) {
      this.lastEnded = c.ended;
      this.report();
    }
    return true;
  }
}

registerProcessor('hj-player', HjPlayer as unknown as new () => AudioWorkletProcessor);
void sampleRate;
