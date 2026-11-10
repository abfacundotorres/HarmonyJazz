import * as Tone from 'tone';
import { Chart, EIGHTHS_PER_BAR } from '../theory/chart';
import { midi, midiToFreq, mod } from '../theory/notes';
import type { MelNote } from '../exercises/generators';
import { bassLine, compLine, CompState, DrumVoice, drumLine, effectiveSwing, mulberry32, newCompState, Rng, Style } from './patterns';

export interface Mix {
  piano: boolean;
  bass: boolean;
  drums: boolean;
  melody: boolean;
  /** Sólo el pedal de hi-hat en 2 y 4 (metrónomo de jazz). Ignora piano/bajo/batería. */
  metronome: boolean;
}

/** swing = walking en 4; two = bajo en 2; ballad = ride suave y piano sostenido; bossa = corcheas rectas. */
export type { Style };

/** "phone" compensa la falta de graves de un altavoz chico; "normal" es la respuesta completa (auriculares, parlantes). */
export type OutputMode = 'phone' | 'normal';

export const STYLE_LABEL: Record<Style, string> = {
  swing: 'Swing (walking)',
  two: 'Swing en 2',
  ballad: 'Balada',
  bossa: 'Bossa nova',
};

export interface PlayOptions {
  chart: Chart;
  tempo: number;
  /** Cantidad de swing que pide el usuario (0,5 = recto … 0,72); la relación real depende además del tempo. */
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
/** Nivel de cada bus con instrumentos reales y con los sintetizadores de respaldo. */
const BUS_DB = {
  real: { piano: 2, bass: 1.5, horn: 7, drums: -4 },
  synth: { piano: -9, bass: -18, horn: -14, drums: 8 },
};
/** Procesamiento de la salida "phone": corte de graves inaudibles, presencia y armónicos del bajo. */
const PHONE = { highpass: 120, presenceDb: 3, exciterDb: 6 };

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

/** Cantidad de variantes de cada golpe (carpeta samples/drums/). */
const DRUM_GROUPS = { ridepp: 2, ridemp: 5, rideff: 3, chick: 6, hatc: 6, kick: 5, ghost: 6, snare: 4, stick: 4 } as const;
type DrumGroup = keyof typeof DRUM_GROUPS;
/** Ganancia (dB) de cada grupo respecto de la muestra original; se ajustó midiendo cada golpe. */
const DRUM_DB: Record<DrumGroup, number> = { ridepp: 0, ridemp: 0, rideff: -2, chick: 0, hatc: -3, kick: 0, ghost: 0, snare: -2, stick: -1 };

/**
 * Kit de batería con muestras reales (Salamander Drumkit). Cada golpe tiene varias variantes que se
 * alternan para no sonar a "ametralladora" y la intensidad elige el grupo (ride suave / medio / fuerte,
 * golpe fantasma o acento de caja).
 */
class DrumKit {
  private buffers: Partial<Record<DrumGroup, Tone.ToneAudioBuffer[]>> = {};
  private lastIdx: Partial<Record<DrumGroup, number>> = {};
  loaded = false;
  constructor(private out: Tone.ToneAudioNode) {}

  async load(baseUrl: string): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const [g, n] of Object.entries(DRUM_GROUPS) as [DrumGroup, number][]) {
      for (let i = 1; i <= n; i++) {
        jobs.push(Tone.ToneAudioBuffer.fromUrl(`${baseUrl}drums/${g}_${i}.mp3`).then((b) => void (this.buffers[g] = [...(this.buffers[g] ?? []), b])));
      }
    }
    await Promise.all(jobs);
    this.loaded = true;
  }

  private groupOf(voice: DrumVoice, vel: number): DrumGroup {
    if (voice === 'ride') return vel < 0.45 ? 'ridepp' : vel < 0.72 ? 'ridemp' : 'rideff';
    return voice;
  }

  /** Devuelve false si el kit no está cargado (el motor usa entonces los sintetizadores). */
  hit(voice: DrumVoice, time: number, vel: number): boolean {
    if (!this.loaded) return false;
    const group = this.groupOf(voice, vel);
    const list = this.buffers[group];
    if (!list || list.length === 0) return false;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.lastIdx[group]) i = (i + 1) % list.length;
    this.lastIdx[group] = i;
    const src = new Tone.ToneBufferSource({ url: list[i] });
    const gain = new Tone.Gain(Tone.dbToGain(DRUM_DB[group]) * Math.pow(Math.max(0.05, vel), 1.1)).connect(this.out);
    src.connect(gain);
    src.onended = () => {
      src.dispose();
      gain.dispose();
    };
    src.start(time);
    return true;
  }
}

class Instruments {
  /** Los tres instrumentos que pasan a ser reales cuando cargan las muestras. */
  piano: Voice;
  bass: Voice;
  horn: Voice;
  ride: Tone.MetalSynth;
  hat: Tone.MetalSynth;
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  drums: DrumKit;
  /** Sintetizador para las notas de referencia del afinador (sostenido y estable). */
  lead: Tone.MonoSynth;
  click: Tone.Synth;
  reverb: Tone.Reverb;
  /** Ganancia fija antes del compresor. */
  master: Tone.Volume;
  /** Volumen del usuario, después del compresor: así sube el nivel de verdad en lugar de ser aplastado. */
  trim: Tone.Volume;
  private pianoBus: Tone.Volume;
  private bassBus: Tone.Volume;
  private hornBus: Tone.Volume;
  private drumBus: Tone.Volume;
  private hp: Tone.Filter;
  private presence: Tone.Filter;
  private exciter: Tone.Volume;
  private synths: { piano: Tone.PolySynth; bass: Tone.MonoSynth; horn: Tone.MonoSynth };

  constructor() {
    this.master = new Tone.Volume(MASTER_DB);
    this.trim = new Tone.Volume(0);
    this.hp = new Tone.Filter({ type: 'highpass', frequency: 20, rolloff: -24 });
    this.presence = new Tone.Filter({ type: 'peaking', frequency: 2200, Q: 0.7, gain: 0 });
    // compresión para subir el nivel medio sin que los transitorios (piano, bombo) saturen,
    // limitador y un recortador suave final: la salida nunca supera ~0,91 (−0,8 dBFS)
    const shaper = new Tone.WaveShaper((x: number) => {
      const t = 0.7;
      const a = Math.abs(x);
      return a < t ? x : Math.sign(x) * (t + (0.95 - t) * Math.tanh((a - t) / (0.95 - t)));
    }, 4096);
    shaper.oversample = 'none'; // con sobremuestreo el filtro de salida rebasa el techo en los transitorios (batería)
    this.master.chain(
      this.hp,
      this.presence,
      new Tone.Compressor({ threshold: -28, ratio: 8, attack: 0.003, release: 0.15 }),
      this.trim,
      new Tone.Limiter(-2),
      shaper,
      Tone.getDestination(),
    );
    this.reverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 }).connect(this.master);
    const comp = new Tone.Compressor(-18, 3).connect(this.reverb);

    // buses: cada instrumento (real o sintético) entra por el suyo, con su nivel
    this.pianoBus = new Tone.Volume(BUS_DB.synth.piano).connect(comp);
    this.bassBus = new Tone.Volume(BUS_DB.synth.bass).connect(comp);
    this.hornBus = new Tone.Volume(BUS_DB.synth.horn).connect(this.reverb);
    this.drumBus = new Tone.Volume(BUS_DB.synth.drums).connect(this.reverb);

    // excitador de armónicos del bajo: un altavoz de celular casi no reproduce por debajo de ~300 Hz, pero
    // si se agregan armónicos (240–900 Hz) el oído reconstruye la nota grave. Sólo suena en la salida "phone".
    this.exciter = new Tone.Volume(PHONE.exciterDb);
    this.exciter.mute = true;
    this.bassBus.chain(
      new Tone.Filter({ type: 'lowpass', frequency: 140, rolloff: -24 }),
      new Tone.Volume(14),
      new Tone.Distortion({ distortion: 0.8, oversample: '4x' }),
      new Tone.Filter({ type: 'highpass', frequency: 170, rolloff: -24 }),
      new Tone.Filter({ type: 'lowpass', frequency: 900, rolloff: -12 }),
      this.exciter,
      comp,
    );

    this.piano = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 1.6,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.005, decay: 1.4, sustain: 0.12, release: 0.9 },
      modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0.1, release: 0.5 },
    }).connect(this.pianoBus);
    (this.piano as Tone.PolySynth).maxPolyphony = 24;

    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      filter: { Q: 1, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.004, decay: 0.5, sustain: 0.35, release: 0.12 },
      filterEnvelope: { attack: 0.002, decay: 0.25, sustain: 0.25, release: 0.2, baseFrequency: 180, octaves: 2.6 },
    }).connect(this.bassBus);

    // batería sintética de respaldo (si el kit real no carga)
    this.ride = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 1.1, release: 0.4 },
      harmonicity: 5.1,
      modulationIndex: 24,
      resonance: 5200,
      octaves: 1.2,
    }).connect(new Tone.Volume(-24).connect(this.drumBus));
    this.ride.frequency.value = 340;
    this.hat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.06, release: 0.02 },
      harmonicity: 5.1,
      modulationIndex: 40,
      resonance: 7000,
      octaves: 1,
    }).connect(new Tone.Volume(-22).connect(this.drumBus));
    this.hat.frequency.value = 420;
    this.kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 4, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).connect(
      new Tone.Volume(-16).connect(this.drumBus),
    );
    this.snare = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 } }).connect(
      new Tone.Filter(2500, 'bandpass').connect(new Tone.Volume(-20).connect(this.drumBus)),
    );
    this.drums = new DrumKit(this.drumBus);

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

  /** Activa o desactiva el procesamiento para altavoz de celular. */
  setOutput(mode: OutputMode) {
    const phone = mode === 'phone';
    this.hp.frequency.value = phone ? PHONE.highpass : 20;
    this.presence.gain.value = phone ? PHONE.presenceDb : 0;
    this.exciter.mute = !phone;
  }

  /**
   * Carga piano, contrabajo y trompeta reales y reemplaza a los sintetizadores; después la batería.
   * Si fallan los instrumentos se conservan los sintetizadores y la promesa rechaza; si falla sólo la
   * batería, el resto queda real y la batería sigue siendo sintética.
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
    piano.connect(this.pianoBus);
    bass.connect(this.bassBus);
    horn.connect(this.hornBus);
    this.pianoBus.volume.value = BUS_DB.real.piano;
    this.bassBus.volume.value = BUS_DB.real.bass;
    this.hornBus.volume.value = BUS_DB.real.horn;
    this.piano = piano;
    this.bass = bass;
    this.horn = horn;
    this.synths.piano.dispose();
    this.synths.bass.dispose();
    try {
      await this.drums.load(baseUrl);
      this.drumBus.volume.value = BUS_DB.real.drums;
    } catch (e) {
      console.warn('No se pudo cargar la batería real; la batería sigue siendo sintética.', e);
    }
  }

  /** Un golpe de batería: con el kit real si cargó y, si no, con los sintetizadores. */
  drumHit(voice: DrumVoice, time: number, vel: number) {
    if (this.drums.hit(voice, time, vel)) return;
    if (voice === 'ride') this.ride.triggerAttackRelease('16n', time, vel);
    else if (voice === 'chick' || voice === 'hatc') this.hat.triggerAttackRelease('32n', time, Math.min(1, vel * 1.4));
    else if (voice === 'kick') this.kick.triggerAttackRelease('C1', '16n', time, vel);
    else this.snare.triggerAttackRelease('32n', time, vel);
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

/** Estado que se conserva entre los coros de una misma reproducción. */
interface RunState {
  bassPrev: number;
  comp: CompState;
  rng: Rng;
}

export class JazzEngine {
  private inst: Instruments | null = null;
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
  private outputMode: OutputMode = 'normal';

  /** Crea los instrumentos y empieza a bajar las muestras. No necesita un gesto del usuario. */
  private ensure(): Instruments {
    if (!this.inst) {
      const inst = new Instruments();
      this.inst = inst;
      inst.trim.volume.value = BASE_TRIM_DB + this.volumeDb;
      inst.setOutput(this.outputMode);
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

  /** Salida: "phone" para altavoz de celular (más presencia y armónicos del bajo) o "normal". */
  setOutputMode(mode: OutputMode) {
    this.outputMode = mode;
    this.inst?.setOutput(mode);
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
    const state: RunState = { bassPrev: 40, comp: newCompState(), rng: mulberry32((Math.random() * 0xffffffff) >>> 0) };
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

  /** Relación de la corchea larga: depende del estilo, del tempo y del ajuste del usuario. */
  swingOf(opts: PlayOptions) {
    return effectiveSwing(opts.tempo, opts.swing, opts.style);
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

  /**
   * Agenda un chorus. Los golpes salen de patterns.ts (datos puros); acá se les aplica el swing, una
   * humanización mínima de tiempo y se pasan al Transport en orden (se cancelan con stop()).
   */
  private scheduleChorus(opts: PlayOptions, time: number, chorus: number, st: RunState) {
    const queue: { time: number; call: (t: number) => void }[] = [];
    const defer = (at: number, call: (t: number) => void) => queue.push({ time: at, call });
    const inst = this.inst!;
    const gen = this.gen;
    const beat = 60 / opts.tempo;
    const total = opts.chart.bars * EIGHTHS_PER_BAR;
    const swing = this.swingOf(opts);
    /** corchea (posición absoluta en el chorus) → segundos, con swing */
    const at = (e: number) => time + (Math.floor(e / 2) + (mod(e, 2) === 1 ? swing : 0)) * beat;
    const r = st.rng;
    const jit = (a: number, b: number) => a + r() * (b - a);
    const { mix } = opts;
    const chords = opts.chart.chords;

    // posición para la UI
    const ui = (fn: () => void, t: number) => Tone.getDraw().schedule(() => gen === this.gen && fn(), t);
    chords.forEach((cc, i) => {
      defer(at(cc.start), (t) => ui(() => this.emit({ chorus, bar: cc.bar, chordIndex: i, beat: (cc.start % 8) / 2, countIn: false }), t));
    });
    for (let b = 0; b < opts.chart.bars; b++) {
      for (let k = 1; k < 4; k++) {
        const e = b * 8 + k * 2;
        defer(at(e), (t) =>
          ui(() => {
            const ci = chords.findIndex((c) => e >= c.start && e < c.start + c.dur);
            this.emit({ chorus, bar: b, chordIndex: ci, beat: k, countIn: false });
          }, t),
        );
      }
    }

    if (mix.metronome) {
      for (let b = 0; b < opts.chart.bars; b++) for (const k of [1, 3]) defer(at(b * 8 + k * 2), (t) => inst.drumHit('chick', t, 0.9));
    } else {
      if (mix.drums) {
        // pequeñas variaciones de tiempo según el instrumento (la caja un poco atrás, el ride justo)
        const lag: Record<DrumVoice, [number, number]> = {
          ride: [-0.004, 0.004], chick: [-0.003, 0.005], hatc: [-0.003, 0.005], kick: [-0.003, 0.003], ghost: [0, 0.01], snare: [0, 0.01], stick: [0, 0.006],
        };
        for (const h of drumLine(opts.chart, opts.style, r, chorus)) {
          const [a, b] = lag[h.voice];
          defer(at(h.e) + jit(a, b), (t) => inst.drumHit(h.voice, t, h.vel));
        }
      }
      if (mix.bass) {
        const { hits, last } = bassLine(opts.chart, opts.style, r, st.bassPrev);
        st.bassPrev = last;
        for (const h of hits) {
          const t0 = at(h.e);
          const dur = Math.max(0.06, (at(h.e + h.dur) - t0) * 0.98);
          defer(t0 + jit(-0.006, 0.004), (t) => inst.bass.triggerAttackRelease(midiToFreq(h.midi), dur, t, h.vel));
        }
      }
      if (mix.piano) {
        for (const h of compLine(opts.chart, opts.style, r, chorus, st.comp)) {
          const t0 = at(h.e);
          const dur = Math.max(0.12, (at(h.e + h.dur) - t0) * 0.98);
          const freqs = h.midis.map(midiToFreq);
          defer(t0 + jit(0.006, 0.022), (t) => inst.piano.triggerAttackRelease(freqs, dur, t, h.vel));
        }
      }
    }

    if (mix.melody && opts.melody) {
      for (const n of opts.melody) {
        if (!n.pitch || n.start >= total) continue;
        const start = at(n.start);
        const end = at(n.start + n.dur);
        defer(start, (t) => inst.horn.triggerAttackRelease(midiToFreq(midi(n.pitch!)), Math.max(0.05, (end - start) * 0.92), t, 0.8));
      }
    }

    // pasar todo al Transport (en orden temporal): se cancela con stop()
    const tr = Tone.getTransport();
    const t0 = tr.getSecondsAtTime(time);
    queue.sort((a, b) => a.time - b.time);
    for (const q of queue) {
      // lo que cae al inicio del chorus ya está dentro de la ventana de anticipación: se dispara directo
      if (q.time - time < 0.03) q.call(q.time);
      else tr.schedule((when) => q.call(when), t0 + (q.time - time));
    }
  }

  get options() {
    return this.lastOpts;
  }
}

export const engine = new JazzEngine();
