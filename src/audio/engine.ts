import * as Tone from 'tone';
import { Chord, qdef } from '../theory/chords';
import { Chart, EIGHTHS_PER_BAR } from '../theory/chart';
import { degreePc, midi, midiToFreq, mod, pc } from '../theory/notes';
import { SCALES } from '../theory/scales';
import { buildVoicing } from '../theory/voicings';
import type { MelNote } from '../exercises/generators';

export interface Mix {
  piano: boolean;
  bass: boolean;
  drums: boolean;
  melody: boolean;
  /** Sólo hi-hat en 2 y 4 (metrónomo de jazz). Ignora piano/bajo/batería. */
  metronome: boolean;
}

/** swing = walking en 4; two = bajo en 2; ballad = escobillas y piano sostenido; bossa = corcheas rectas. */
export type Style = 'swing' | 'two' | 'ballad' | 'bossa';

export const STYLE_LABEL: Record<Style, string> = {
  swing: 'Swing (walking)',
  two: 'Swing en 2',
  ballad: 'Balada',
  bossa: 'Bossa nova',
};

export interface PlayOptions {
  chart: Chart;
  tempo: number;
  /** Proporción de la corchea larga: 0.5 = recto, 0.67 = tresillo. */
  swing: number;
  style: Style;
  countIn: boolean;
  /** Melodía de guía en concierto (se toca en cada chorus). */
  melody?: MelNote[];
  mix: Mix;
  /** Quién inició la reproducción (para que la UI resalte sólo ese reproductor). */
  owner?: string;
}

export interface Position {
  owner?: string;
  chorus: number;
  bar: number;
  chordIndex: number;
  /** tiempo dentro del compás, 0..3; -1 durante la cuenta. */
  beat: number;
  countIn: boolean;
}

type Listener = (p: Position) => void;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Lo que el motor necesita de un instrumento: tanto los sintetizadores como los Sampler lo cumplen. */
interface Voice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  triggerAttackRelease(notes: any, duration: any, time?: number, velocity?: number): unknown;
  releaseAll?(time?: number): unknown;
}

/** Nivel base de la salida (dB) y niveles de cada instrumento; se ajustaron midiendo la salida real. */
const MASTER_DB = 18;
/** Base del volumen del usuario (después del compresor). El control actúa respecto de este valor. */
const BASE_TRIM_DB = 2;
const LEVEL_DB = { piano: 2, bass: 1.5, horn: 7 };

const SAMPLE_BASE = () => new URL('samples/', location.href.split('#')[0]).href;
/** Nota de Tone → archivo (los sostenidos del piano se renombraron: D#3 → Ds3). */
const PIANO_SAMPLES: Record<string, string> = Object.fromEntries(
  ['A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4', 'F#4', 'A4', 'C5', 'D#5', 'F#5', 'A5'].map((n) => [n, n.replace('#', 's') + '.mp3']),
);
const BASS_SAMPLES: Record<string, string> = Object.fromEntries(
  ['E1', 'G1', 'Bb1', 'Db2', 'E2', 'G2', 'Bb2', 'Db3', 'E3', 'G3'].map((n) => [n, n + '.mp3']),
);
const HORN_SAMPLES: Record<string, string> = Object.fromEntries(
  ['G3', 'Bb3', 'Db4', 'E4', 'G4', 'Bb4', 'Db5', 'E5', 'G5', 'Bb5', 'Db6'].map((n) => [n, n + '.mp3']),
);

class Instruments {
  /** Los tres instrumentos que pasan a ser reales cuando cargan las muestras. */
  piano: Voice;
  bass: Voice;
  horn: Voice;
  ride: Tone.MetalSynth;
  hat: Tone.MetalSynth;
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  /** Sintetizador para las notas de referencia del afinador (sostenido y estable). */
  lead: Tone.MonoSynth;
  click: Tone.Synth;
  reverb: Tone.Reverb;
  /** Ganancia fija antes del compresor. */
  master: Tone.Volume;
  /** Volumen del usuario, después del compresor: así sube el nivel de verdad en lugar de ser aplastado. */
  trim: Tone.Volume;
  private comp: Tone.Compressor;
  private synths: { piano: Tone.PolySynth; bass: Tone.MonoSynth; horn: Tone.MonoSynth };

  constructor() {
    this.master = new Tone.Volume(MASTER_DB);
    this.trim = new Tone.Volume(0);
    // compresión para subir el nivel medio sin que los transitorios (piano, bombo) saturen,
    // limitador y un recortador suave final: la salida nunca supera ~0,91 (−0,8 dBFS)
    const shaper = new Tone.WaveShaper((x: number) => {
      const t = 0.7;
      const a = Math.abs(x);
      return a < t ? x : Math.sign(x) * (t + (0.95 - t) * Math.tanh((a - t) / (0.95 - t)));
    }, 4096);
    shaper.oversample = '4x';
    this.master.chain(
      new Tone.Compressor({ threshold: -28, ratio: 8, attack: 0.003, release: 0.15 }),
      this.trim,
      new Tone.Limiter(-2),
      shaper,
      Tone.getDestination(),
    );
    this.reverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 }).connect(this.master);
    const comp = new Tone.Compressor(-18, 3).connect(this.reverb);
    this.comp = comp;

    this.piano = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 1.6,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.005, decay: 1.4, sustain: 0.12, release: 0.9 },
      modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0.1, release: 0.5 },
    }).connect(new Tone.Volume(-9).connect(comp));
    (this.piano as Tone.PolySynth).maxPolyphony = 24;

    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      filter: { Q: 1, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.004, decay: 0.5, sustain: 0.35, release: 0.12 },
      filterEnvelope: { attack: 0.002, decay: 0.25, sustain: 0.25, release: 0.2, baseFrequency: 180, octaves: 2.6 },
    }).connect(new Tone.Volume(-18).connect(comp));

    const drums = new Tone.Volume(8).connect(this.reverb);
    this.ride = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 1.1, release: 0.4 },
      harmonicity: 5.1,
      modulationIndex: 24,
      resonance: 5200,
      octaves: 1.2,
    }).connect(new Tone.Volume(-24).connect(drums));
    this.ride.frequency.value = 340;

    this.hat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.06, release: 0.02 },
      harmonicity: 5.1,
      modulationIndex: 40,
      resonance: 7000,
      octaves: 1,
    }).connect(new Tone.Volume(-22).connect(drums));
    this.hat.frequency.value = 420;

    this.kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 4, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).connect(
      new Tone.Volume(-16).connect(drums),
    );
    this.snare = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 } }).connect(
      new Tone.Filter(2500, 'bandpass').connect(new Tone.Volume(-20).connect(drums)),
    );

    this.lead = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'lowpass' },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.8, release: 0.08 },
      filterEnvelope: { attack: 0.03, decay: 0.3, sustain: 0.6, release: 0.2, baseFrequency: 700, octaves: 2.2 },
    }).connect(new Tone.Volume(-14).connect(this.reverb));
    // hasta que carguen las muestras (o si no cargan) la línea guía suena con el sintetizador
    this.horn = this.lead;

    this.click = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).connect(
      new Tone.Volume(-8).connect(this.master),
    );

    this.synths = { piano: this.piano as Tone.PolySynth, bass: this.bass as Tone.MonoSynth, horn: this.lead };
  }

  /**
   * Carga piano, contrabajo y trompeta reales y reemplaza a los sintetizadores.
   * Si alguna descarga falla se conservan los sintetizadores y la promesa rechaza.
   */
  async loadSamples(): Promise<void> {
    const baseUrl = SAMPLE_BASE();
    const piano = new Tone.Sampler({ urls: PIANO_SAMPLES, baseUrl: baseUrl + 'piano/', release: 1.2 });
    const bass = new Tone.Sampler({ urls: BASS_SAMPLES, baseUrl: baseUrl + 'bass/', release: 0.3 });
    const horn = new Tone.Sampler({ urls: HORN_SAMPLES, baseUrl: baseUrl + 'trumpet/', release: 0.15 });
    const nodes = [piano, bass, horn];
    try {
      await Tone.loaded();
      await Promise.all(nodes.map((n) => (n.loaded ? Promise.resolve() : new Promise<void>((res, rej) => setTimeout(() => (n.loaded ? res() : rej(new Error('muestras sin cargar'))), 4000)))));
    } catch (e) {
      nodes.forEach((n) => n.dispose());
      throw e;
    }
    piano.connect(new Tone.Volume(LEVEL_DB.piano).connect(this.comp));
    bass.connect(new Tone.Volume(LEVEL_DB.bass).connect(this.comp));
    horn.connect(new Tone.Volume(LEVEL_DB.horn).connect(this.reverb));
    this.piano = piano;
    this.bass = bass;
    this.horn = horn;
    this.synths.piano.dispose();
    this.synths.bass.dispose();
  }
}

/** WAV mono de 8 kHz con 1 s de silencio, como blob: (permitido por la CSP: media-src blob:). */
function silentWavUrl(): string {
  const n = 8000;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  new Uint8Array(buf, 44).fill(128); // 8 bits sin signo: 128 = silencio
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export class JazzEngine {
  private inst: Instruments | null = null;
  /**
   * Instrumentos "diferidos" del chorus en curso: registran cada golpe en lugar de dispararlo.
   * Después cada golpe se agenda en el Transport, que sí se cancela al detener.
   */
  private sink: Instruments | null = null;
  private listeners = new Set<Listener>();
  private repeatId: number | null = null;
  private lastOpts: PlayOptions | null = null;
  /** Momento (tiempo de AudioContext) en que empieza cada chorus. */
  private chorusStarts: { chorus: number; time: number }[] = [];
  playing = false;
  private keepAlive: HTMLAudioElement | null = null;
  /**
   * Número de reproducción. Tone no puede cancelar un aviso visual que ya pasó a requestAnimationFrame,
   * así que cada aviso recuerda su generación y se descarta si el motor se detuvo o reinició.
   */
  private gen = 0;
  private meter: Tone.Meter | null = null;

  /**
   * En iPhone el audio web puede quedar mudo (modo silencio / sesión "ambient"). Pedir la sesión
   * "playback" y mantener un <audio> silencioso sonando lo evita. Debe llamarse dentro del gesto del usuario.
   */
  private unlockMobileAudio() {
    try {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
    } catch {
      /* no disponible */
    }
    try {
      if (!this.keepAlive) {
        const a = new Audio(silentWavUrl());
        a.loop = true;
        a.setAttribute('playsinline', '');
        this.keepAlive = a;
      }
      void this.keepAlive.play().catch(() => {});
    } catch {
      /* sin soporte: el resto sigue funcionando */
    }
  }

  /** Estado de las muestras: idle (sin pedir), loading, ready (instrumentos reales) o synth (se usan sintetizadores). */
  samples: 'idle' | 'loading' | 'ready' | 'synth' = 'idle';
  private loading: Promise<void> | null = null;
  private volumeDb = 0;

  /** Crea los instrumentos y empieza a bajar las muestras. No necesita un gesto del usuario. */
  private ensure(): Instruments {
    if (!this.inst) {
      const inst = new Instruments();
      this.inst = inst;
      inst.trim.volume.value = BASE_TRIM_DB + this.volumeDb;
      this.meter = new Tone.Meter({ smoothing: 0.7 });
      Tone.getDestination().connect(this.meter);
      this.samples = 'loading';
      this.loading = inst
        .loadSamples()
        .then(() => {
          this.samples = 'ready';
        })
        .catch((e) => {
          console.warn('No se pudieron cargar las muestras; se usan sintetizadores.', e);
          this.samples = 'synth';
        });
    }
    return this.inst;
  }

  /** Empieza a cargar los instrumentos antes de que el usuario toque ▶, para que no haya espera. */
  preload() {
    try {
      this.ensure();
    } catch (e) {
      console.warn('preload falló', e);
    }
  }

  /** Volumen general en dB respecto del nivel base (−14…+2; más arriba empieza a distorsionar). */
  setVolume(db: number) {
    this.volumeDb = Math.max(-14, Math.min(2, db));
    if (this.inst) this.inst.trim.volume.value = BASE_TRIM_DB + this.volumeDb;
  }

  async init() {
    this.unlockMobileAudio(); // antes de cualquier await, para seguir dentro del gesto
    await Tone.start();
    const ctx = Tone.getContext();
    if (ctx.state !== 'running') await ctx.resume();
    const inst = this.ensure();
    await inst.reverb.ready;
    // esperar los instrumentos reales (como máximo 20 s; si no llegan, suenan los sintetizadores)
    if (this.samples === 'loading') {
      await Promise.race([this.loading, new Promise((r) => setTimeout(r, 20000))]);
    }
  }

  /** Nivel de salida 0..1 (de −60 dB a 0 dB), para el medidor de la interfaz. */
  level(): number {
    if (!this.meter) return 0;
    const v = this.meter.getValue();
    const db = Array.isArray(v) ? Math.max(...v) : v;
    return Number.isFinite(db) ? Math.max(0, Math.min(1, (db + 60) / 60)) : 0;
  }

  /** Estado del contexto de audio: running, suspended, interrupted… */
  get audioState(): string {
    return Tone.getContext().state;
  }

  onPosition(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Registro de depuración: no hace nada salvo que la página defina window.__hjLog (lo usan las pruebas). */
  private dbg(msg: string) {
    (globalThis as unknown as { __hjLog?: string[] }).__hjLog?.push(`${Math.round(performance.now())} ${msg}`);
  }

  private emit(p: Position) {
    this.dbg(`emit chord=${p.chordIndex} bar=${p.bar} count=${p.countIn} playing=${this.playing}`);
    const withOwner = { ...p, owner: this.lastOpts?.owner };
    this.listeners.forEach((l) => l(withOwner));
  }

  /** Devuelve false si se canceló (hubo un stop mientras se preparaba el audio). */
  async play(opts: PlayOptions): Promise<boolean> {
    this.dbg(`play() inicia (playing=${this.playing})`);
    const entry = this.gen;
    await this.init();
    if (entry !== this.gen) {
      this.dbg('play() cancelado: hubo un stop durante la preparación');
      return false;
    }
    this.dbg('play() tras init');
    this.stop();
    const gen = this.gen;
    this.lastOpts = opts;
    this.chorusStarts = [];
    const t = Tone.getTransport();
    t.bpm.value = opts.tempo;
    const beat = 60 / opts.tempo;
    const barSec = 4 * beat;
    const chorusSec = opts.chart.bars * barSec;
    const inst = this.inst!;
    const draw = Tone.getDraw();

    let offset = 0;
    if (opts.countIn) {
      for (let i = 0; i < 4; i++) {
        t.schedule((time) => {
          inst.click.triggerAttackRelease(i === 0 ? 'C6' : 'G5', 0.05, time);
          draw.schedule(() => {
            if (gen === this.gen) this.emit({ chorus: -1, bar: -1, chordIndex: -1, beat: i, countIn: true });
          }, time);
        }, i * beat);
      }
      offset = barSec;
    }

    let chorus = 0;
    const state = { voicing: null as number[] | null, bassPrev: 40 };
    this.repeatId = t.scheduleRepeat(
      (time) => {
        this.chorusStarts.push({ chorus, time });
        if (this.chorusStarts.length > 64) this.chorusStarts.shift();
        this.scheduleChorus(opts, time, chorus, state);
        chorus++;
      },
      chorusSec,
      offset,
    );
    t.start('+0.05');
    this.playing = true;
    return true;
  }

  /** Vuelve a arrancar con nuevas opciones (p. ej. tempo) si está sonando. */
  async update(opts: PlayOptions) {
    this.dbg(`update() playing=${this.playing}`);
    if (this.playing) await this.play({ ...opts, countIn: false });
    else this.lastOpts = opts;
  }

  stop() {
    this.gen++;
    this.dbg(`stop() playing=${this.playing}`);
    const t = Tone.getTransport();
    t.stop();
    t.cancel();
    Tone.getDraw().cancel();
    if (this.repeatId !== null) t.clear(this.repeatId);
    this.repeatId = null;
    this.inst?.piano.releaseAll?.();
    this.inst?.horn.releaseAll?.();
    this.inst?.lead.triggerRelease();
    this.keepAlive?.pause();
    if (this.playing) this.listeners.forEach((l) => l({ owner: this.lastOpts?.owner, chorus: -1, bar: -1, chordIndex: -1, beat: -1, countIn: false }));
    this.playing = false;
  }

  /** Swing efectivo: la bossa siempre va recta. */
  swingOf(opts: PlayOptions) {
    return opts.style === 'bossa' ? 0.5 : opts.swing;
  }

  /**
   * Ubica un instante (performance.now()) en la forma: chorus y corchea cuantizada,
   * teniendo en cuenta el swing. Sirve para transcribir lo que se toca por micrófono.
   */
  locate(perfMs: number): { chorus: number; eighth: number } | null {
    const opts = this.lastOpts;
    if (!opts || !this.playing || this.chorusStarts.length === 0) return null;
    const raw = Tone.getContext().rawContext as AudioContext;
    const ts = raw.getOutputTimestamp?.();
    const ctxTime =
      ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0
        ? ts.contextTime + (perfMs - ts.performanceTime) / 1000
        : raw.currentTime - (performance.now() - perfMs) / 1000;
    const start = [...this.chorusStarts].reverse().find((c) => c.time <= ctxTime + 0.05);
    if (!start) return null;
    const beat = 60 / opts.tempo;
    const pos = (ctxTime - start.time) / beat;
    const b = Math.floor(pos);
    const frac = pos - b;
    const sw = this.swingOf(opts);
    // posiciones posibles dentro del tiempo: 0 (tiempo), sw (contratiempo), 1 (siguiente tiempo)
    const cands: [number, number][] = [[0, 0], [sw, 1], [1, 2]];
    const best = cands.reduce((a, c) => (Math.abs(c[0] - frac) < Math.abs(a[0] - frac) ? c : a));
    let eighth = b * 2 + best[1];
    let chorus = start.chorus;
    const total = opts.chart.bars * EIGHTHS_PER_BAR;
    if (eighth >= total) {
      eighth -= total;
      chorus++;
    }
    return { chorus, eighth: Math.max(0, eighth) };
  }

  /** Reproduce una sola nota (concierto) de referencia. */
  async playNote(m: number, dur = 0.8) {
    await this.init();
    this.inst!.lead.triggerAttackRelease(midiToFreq(m), dur);
  }

  private scheduleChorus(
    opts: PlayOptions,
    time: number,
    chorus: number,
    state: { voicing: number[] | null; bassPrev: number },
  ) {
    const queue: { time: number; call: (t: number) => void }[] = [];
    this.sink = this.deferred(queue, chorus);
    const inst = this.sink;
    const gen = this.gen;
    const draw = {
      schedule: (fn: () => void, at: number) =>
        queue.push({ time: at, call: (t) => Tone.getDraw().schedule(() => gen === this.gen && fn(), t) }),
    };
    const beat = 60 / opts.tempo;
    const total = opts.chart.bars * EIGHTHS_PER_BAR;
    /** corchea (posición absoluta en el chorus) → segundos, con swing */
    const swing = this.swingOf(opts);
    const at = (e: number) => time + (Math.floor(e / 2) + (mod(e, 2) === 1 ? swing : 0)) * beat;
    const { mix } = opts;
    const chords = opts.chart.chords;

    // posición para la UI
    chords.forEach((cc, i) => {
      draw.schedule(() => this.emit({ chorus, bar: cc.bar, chordIndex: i, beat: (cc.start % 8) / 2, countIn: false }), at(cc.start));
    });
    for (let b = 0; b < opts.chart.bars; b++) {
      for (let k = 1; k < 4; k++) {
        const e = b * 8 + k * 2;
        draw.schedule(() => {
          const ci = chords.findIndex((c) => e >= c.start && e < c.start + c.dur);
          this.emit({ chorus, bar: b, chordIndex: ci, beat: k, countIn: false });
        }, at(e));
      }
    }

    if (mix.metronome) {
      for (let b = 0; b < opts.chart.bars; b++) {
        for (const k of [1, 3]) inst.hat.triggerAttackRelease('32n', at(b * 8 + k * 2), 0.9);
      }
    } else {
      if (mix.drums) (opts.style === 'bossa' ? this.drumsBossa(opts, at) : this.drums(opts, at));
      if (mix.bass) this.bass(opts, at, state);
      if (mix.piano) this.comp(opts, at, state, beat);
    }

    if (mix.melody && opts.melody) {
      for (const n of opts.melody) {
        if (!n.pitch || n.start >= total) continue;
        const start = at(n.start);
        const end = at(n.start + n.dur);
        inst.horn.triggerAttackRelease(midiToFreq(midi(n.pitch)), Math.max(0.05, (end - start) * 0.92), start, 0.8);
      }
    }

    // pasar todo al Transport (en orden temporal): se cancela con stop()
    const t = Tone.getTransport();
    const t0 = t.getSecondsAtTime(time);
    queue.sort((a, b) => a.time - b.time);
    for (const q of queue) {
      // lo que cae al inicio del chorus ya está dentro de la ventana de anticipación: se dispara directo
      if (q.time - time < 0.03) q.call(q.time);
      else t.schedule((when) => q.call(when), t0 + (q.time - time));
    }
    this.sink = null;
  }

  private drums(opts: PlayOptions, at: (e: number) => number) {
    const inst = this.sink!;
    const ballad = opts.style === 'ballad';
    for (let b = 0; b < opts.chart.bars; b++) {
      const e0 = b * 8;
      if (ballad) {
        // escobillas: "barrido" suave en cada tiempo, hi-hat en 2 y 4
        for (let k = 0; k < 4; k++) {
          inst.snare.triggerAttackRelease('8n', at(e0 + k * 2), k % 2 ? 0.22 : 0.14);
          if (k % 2 === 1) inst.hat.triggerAttackRelease('32n', at(e0 + k * 2), 0.6);
          if (k % 2 === 1) inst.snare.triggerAttackRelease('32n', at(e0 + k * 2 + 1), 0.08);
        }
        continue;
      }
      for (let k = 0; k < 4; k++) {
        inst.ride.triggerAttackRelease('16n', at(e0 + k * 2), k % 2 ? 0.75 : 0.55);
        inst.kick.triggerAttackRelease('C1', '16n', at(e0 + k * 2), 0.25);
        if (k % 2 === 1) inst.hat.triggerAttackRelease('32n', at(e0 + k * 2), 0.8);
        // skip note de ride en el "y" de 2 y 4
        if (k % 2 === 1) inst.ride.triggerAttackRelease('16n', at(e0 + k * 2 + 1), 0.4);
        // comping de redoblante ocasional
        // comping de redoblante ocasional; en el último compás, pequeño fill en el "y" de 3 y 4
        // (los golpes de un mismo instrumento deben agendarse en orden temporal)
        const last = b === opts.chart.bars - 1;
        if (last && k >= 2) inst.snare.triggerAttackRelease('32n', at(e0 + k * 2 + 1), k === 2 ? 0.5 : 0.7);
        else if (Math.random() < 0.12) inst.snare.triggerAttackRelease('32n', at(e0 + k * 2 + 1), rnd(0.15, 0.4));
      }
    }
  }

  private drumsBossa(opts: PlayOptions, at: (e: number) => number) {
    const inst = this.sink!;
    // rim-click en clave 3-2 a lo largo de 2 compases; hi-hat en corcheas; bombo 1, (y del 2), 3
    const rim = [[0, 3, 6], [2, 4]];
    for (let b = 0; b < opts.chart.bars; b++) {
      const e0 = b * 8;
      for (let e = 0; e < 8; e++) inst.hat.triggerAttackRelease('32n', at(e0 + e), e % 2 ? 0.35 : 0.55);
      for (const e of rim[b % 2]) inst.snare.triggerAttackRelease('64n', at(e0 + e), 0.35);
      for (const [e, v] of [[0, 0.5], [3, 0.3], [4, 0.45], [7, 0.3]] as const) inst.kick.triggerAttackRelease('C1', '16n', at(e0 + e), v);
    }
  }

  private bass(opts: PlayOptions, at: (e: number) => number, state: { bassPrev: number }) {
    const inst = this.sink!;
    const chords = opts.chart.chords;
    const LOW = 31;
    const HIGH = 52;
    const place = (targetPc: number, near: number) => {
      let best = LOW;
      for (let m = LOW; m <= HIGH; m++) if (mod(m, 12) === targetPc && Math.abs(m - near) < Math.abs(best - near)) best = m;
      return best;
    };
    const beatDur = 60 / opts.tempo;
    chords.forEach((cc, i) => {
      const next = chords[(i + 1) % chords.length];
      const rootPc = pc(cc.chord.root);
      const nextRoot = place(pc(next.chord.root), state.bassPrev);
      const beats = cc.dur / 2;
      const root = place(rootPc, state.bassPrev);
      const tones = bassTones(cc.chord);
      let line: number[];
      if (opts.style === 'bossa') {
        // fundamental (negra con puntillo), quinta en el "y" del 2 ligada al 3
        const fifth = place(tones.fifth, root + 5);
        const hits: [number, number, number][] =
          beats >= 4 ? [[root, 0, 3], [fifth, 3, 1], [fifth, 4, 4]] : beats >= 2 ? [[root, 0, 3], [fifth, 3, 1]] : [[root, 0, 2]];
        for (const [m, e, d] of hits) inst.bass.triggerAttackRelease(midiToFreq(m), d * beatDur * 0.5 * 0.9, at(cc.start + e), 0.85);
        state.bassPrev = root;
        return;
      }
      if (opts.style === 'two' || opts.style === 'ballad') {
        line = beats >= 4 ? [root, place(tones.fifth, root + 4)] : [root];
        line.forEach((m, k) => {
          inst.bass.triggerAttackRelease(midiToFreq(m), beatDur * (beats >= 4 ? 1.8 : beats * 0.9), at(cc.start + k * 4), 0.9);
        });
        state.bassPrev = line[line.length - 1];
        return;
      }
      const approach = () => pick([nextRoot - 1, nextRoot + 1, place(mod(pc(next.chord.root) + 7, 12), nextRoot)]);
      if (beats >= 4) {
        const up = nextRoot >= root;
        const pattern = pick([
          [tones.second, tones.third],
          [tones.third, tones.fifth],
          [tones.fifth, tones.third],
          [tones.third, tones.second],
        ]);
        const a = place(pattern[0], root + (up ? 3 : -3));
        const b = place(pattern[1], a + (up ? 2 : -2));
        line = [root, a, b, approach()];
      } else if (beats >= 2) {
        line = [root, approach()];
      } else {
        line = [root];
      }
      line.forEach((m, k) => {
        const clamped = Math.max(LOW, Math.min(HIGH, m));
        inst.bass.triggerAttackRelease(midiToFreq(clamped), beatDur * 0.92, at(cc.start + k * 2), k === 0 ? 0.95 : 0.8);
      });
      state.bassPrev = line[line.length - 1];
    });
  }

  private comp(opts: PlayOptions, at: (e: number) => number, state: { voicing: number[] | null }, beat: number) {
    const inst = this.sink!;
    const chords = opts.chart.chords;
    chords.forEach((cc) => {
      const v = buildVoicing(cc.chord, state.voicing);
      state.voicing = v;
      const pats: [number, number][][] =
        opts.style === 'ballad'
          ? [[[0, cc.dur]], [[0, Math.min(cc.dur, 4)], ...(cc.dur >= 8 ? ([[5, 3]] as [number, number][]) : [])]]
          : opts.style === 'bossa'
            ? cc.dur >= 8
              ? [[[0, 2], [3, 3], [6, 2]], [[-1, 3], [3, 2], [6, 1]], [[1, 2], [4, 1], [6, 2]]]
              : [[[0, 2], [3, 1]], [[-1, 2], [3, 1]]]
            : cc.dur >= 8
          ? [
              [[0, 3], [3, 1]],
              [[2, 1], [5, 3]],
              [[1, 1], [4, 2]],
              [[-1, 4], [5, 1]],
              [[0, 2], [6, 1]],
            ]
          : cc.dur >= 4
            ? [[[0, 2]], [[1, 1]], [[-1, 2]], [[0, 1], [3, 1]]]
            : [[[0, 2]]];
      for (const [p, len] of pick(pats)) {
        const s = Math.max(0, cc.start + p);
        const dur = Math.max(0.12, len * beat * 0.5 * 0.95);
        const vel = opts.style === 'ballad' ? rnd(0.25, 0.4) : rnd(0.35, 0.6);
        const freqs = v.map(midiToFreq);
        inst.piano.triggerAttackRelease(freqs, dur, at(s), vel);
      }
    });
  }

  /** Envoltorio que registra los triggerAttackRelease en una cola en lugar de ejecutarlos. */
  private deferred(queue: { time: number; call: (t: number) => void }[], chorus: number): Instruments {
    const real = this.inst!;
    // Humanización: pequeñas variaciones de tiempo (segundos) y de intensidad por instrumento.
    // El piano llega apenas "atrás" del pulso y el bajo apenas adelante; la melodía y el clic quedan exactos.
    const jitter: Partial<Record<keyof Instruments, () => number>> = {
      piano: () => rnd(0.006, 0.022),
      bass: () => rnd(-0.006, 0.004),
      ride: () => rnd(-0.004, 0.004),
      hat: () => rnd(-0.003, 0.005),
      kick: () => rnd(-0.003, 0.003),
      snare: () => rnd(0, 0.01),
    };
    // La intensidad crece en los primeros coros (más sutil al principio, más presente después).
    const intensity = 0.88 + (0.12 * Math.min(chorus, 3)) / 3;
    const humanized = new Set<keyof Instruments>(['piano', 'bass', 'ride', 'hat', 'kick', 'snare']);
    // posición del argumento de tiempo: (duración, tiempo, vel) para metales/ruido; (nota, duración, tiempo, vel) para el resto
    const timeArg: Partial<Record<keyof Instruments, number>> = { ride: 1, hat: 1, snare: 1 };
    const wrap = <K extends keyof Instruments>(name: K): Instruments[K] => {
      const target = real[name] as unknown as { triggerAttackRelease: (...a: unknown[]) => unknown };
      const idx = timeArg[name] ?? 2;
      const human = humanized.has(name);
      return {
        triggerAttackRelease: (...args: unknown[]) => {
          if (human) {
            const vi = idx + 1; // la intensidad va justo después del tiempo
            if (typeof args[vi] === 'number') args[vi] = Math.max(0.04, Math.min(1, (args[vi] as number) * intensity * rnd(0.9, 1.08)));
          }
          queue.push({
            time: (args[idx] as number) + (jitter[name]?.() ?? 0),
            call: (when) => {
              const a = [...args];
              a[idx] = when;
              target.triggerAttackRelease(...a);
            },
          });
        },
      } as unknown as Instruments[K];
    };
    return {
      ...real,
      piano: wrap('piano'), bass: wrap('bass'), ride: wrap('ride'), hat: wrap('hat'),
      kick: wrap('kick'), snare: wrap('snare'), lead: wrap('lead'), horn: wrap('horn'), click: wrap('click'),
    } as Instruments;
  }

  get options() {
    return this.lastOpts;
  }
}

function bassTones(c: Chord) {
  const d = qdef(c);
  const third = degreePc(d.guide[0]);
  const fifthDeg = d.tones.find((t) => /5$/.test(t)) ?? 'b7';
  const second = degreePc(SCALES[d.scale].degrees[1]);
  const r = pc(c.root);
  return { third: mod(r + third, 12), fifth: mod(r + degreePc(fifthDeg), 12), second: mod(r + second, 12) };
}

export const engine = new JazzEngine();
