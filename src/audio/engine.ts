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

export interface PlayOptions {
  chart: Chart;
  tempo: number;
  /** Proporción de la corchea larga: 0.5 = recto, 0.67 = tresillo. */
  swing: number;
  feel: 'walking' | 'two';
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

class Instruments {
  piano: Tone.PolySynth;
  bass: Tone.MonoSynth;
  ride: Tone.MetalSynth;
  hat: Tone.MetalSynth;
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  lead: Tone.MonoSynth;
  click: Tone.Synth;
  reverb: Tone.Reverb;

  constructor() {
    this.reverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 }).toDestination();
    const comp = new Tone.Compressor(-18, 3).connect(this.reverb);

    this.piano = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 1.6,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.005, decay: 1.4, sustain: 0.12, release: 0.9 },
      modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0.1, release: 0.5 },
    }).connect(new Tone.Volume(-15).connect(comp));
    this.piano.maxPolyphony = 24;

    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      filter: { Q: 1, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.004, decay: 0.5, sustain: 0.35, release: 0.12 },
      filterEnvelope: { attack: 0.002, decay: 0.25, sustain: 0.25, release: 0.2, baseFrequency: 180, octaves: 2.6 },
    }).connect(new Tone.Volume(-5).connect(comp));

    const drums = new Tone.Volume(-8).connect(this.reverb);
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

    this.click = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 } }).connect(
      new Tone.Volume(-20).toDestination(),
    );
  }
}

export class JazzEngine {
  private inst: Instruments | null = null;
  private listeners = new Set<Listener>();
  private repeatId: number | null = null;
  private lastOpts: PlayOptions | null = null;
  playing = false;

  async init() {
    await Tone.start();
    if (!this.inst) {
      this.inst = new Instruments();
      await this.inst.reverb.ready;
    }
  }

  onPosition(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(p: Position) {
    const withOwner = { ...p, owner: this.lastOpts?.owner };
    this.listeners.forEach((l) => l(withOwner));
  }

  async play(opts: PlayOptions) {
    await this.init();
    this.stop();
    this.lastOpts = opts;
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
          draw.schedule(() => this.emit({ chorus: -1, bar: -1, chordIndex: -1, beat: i, countIn: true }), time);
        }, i * beat);
      }
      offset = barSec;
    }

    let chorus = 0;
    const state = { voicing: null as number[] | null, bassPrev: 40 };
    this.repeatId = t.scheduleRepeat(
      (time) => {
        this.scheduleChorus(opts, time, chorus, state);
        chorus++;
      },
      chorusSec,
      offset,
    );
    t.start('+0.05');
    this.playing = true;
  }

  /** Vuelve a arrancar con nuevas opciones (p. ej. tempo) si está sonando. */
  async update(opts: PlayOptions) {
    if (this.playing) await this.play({ ...opts, countIn: false });
    else this.lastOpts = opts;
  }

  stop() {
    const t = Tone.getTransport();
    t.stop();
    t.cancel();
    if (this.repeatId !== null) t.clear(this.repeatId);
    this.repeatId = null;
    this.inst?.piano.releaseAll();
    this.inst?.lead.triggerRelease();
    if (this.playing) this.listeners.forEach((l) => l({ owner: this.lastOpts?.owner, chorus: -1, bar: -1, chordIndex: -1, beat: -1, countIn: false }));
    this.playing = false;
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
    const inst = this.inst!;
    const beat = 60 / opts.tempo;
    const draw = Tone.getDraw();
    const total = opts.chart.bars * EIGHTHS_PER_BAR;
    /** corchea (posición absoluta en el chorus) → segundos, con swing */
    const at = (e: number) => time + (Math.floor(e / 2) + (mod(e, 2) === 1 ? opts.swing : 0)) * beat;
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
      if (mix.drums) this.drums(opts, at, chorus);
      if (mix.bass) this.bass(opts, at, state);
      if (mix.piano) this.comp(opts, at, state, beat);
    }

    if (mix.melody && opts.melody) {
      for (const n of opts.melody) {
        if (!n.pitch || n.start >= total) continue;
        const start = at(n.start);
        const end = at(n.start + n.dur);
        inst.lead.triggerAttackRelease(midiToFreq(midi(n.pitch)), Math.max(0.05, (end - start) * 0.92), start, 0.8);
      }
    }
  }

  private drums(opts: PlayOptions, at: (e: number) => number, _chorus: number) {
    const inst = this.inst!;
    for (let b = 0; b < opts.chart.bars; b++) {
      const e0 = b * 8;
      for (let k = 0; k < 4; k++) {
        inst.ride.triggerAttackRelease('16n', at(e0 + k * 2), k % 2 ? 0.75 : 0.55);
        inst.kick.triggerAttackRelease('C1', '16n', at(e0 + k * 2), 0.25);
        if (k % 2 === 1) inst.hat.triggerAttackRelease('32n', at(e0 + k * 2), 0.8);
        // skip note de ride en el "y" de 2 y 4
        if (k % 2 === 1) inst.ride.triggerAttackRelease('16n', at(e0 + k * 2 + 1), 0.4);
        // comping de redoblante ocasional
        if (Math.random() < 0.12) inst.snare.triggerAttackRelease('32n', at(e0 + k * 2 + 1), rnd(0.15, 0.4));
      }
      // pequeño fill en el último compás
      if (b === opts.chart.bars - 1) {
        inst.snare.triggerAttackRelease('32n', at(e0 + 5), 0.5);
        inst.snare.triggerAttackRelease('32n', at(e0 + 7), 0.7);
      }
    }
  }

  private bass(opts: PlayOptions, at: (e: number) => number, state: { bassPrev: number }) {
    const inst = this.inst!;
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
      if (opts.feel === 'two') {
        line = beats >= 4 ? [root, place(tones.fifth, root + 4)] : [root];
        line.forEach((m, k) => {
          inst.bass.triggerAttackRelease(midiToFreq(m), beatDur * 1.8, at(cc.start + k * 4), 0.9);
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
    const inst = this.inst!;
    const chords = opts.chart.chords;
    chords.forEach((cc) => {
      const v = buildVoicing(cc.chord, state.voicing);
      state.voicing = v;
      const pats: [number, number][][] =
        cc.dur >= 8
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
        const vel = rnd(0.35, 0.6);
        const freqs = v.map(midiToFreq);
        inst.piano.triggerAttackRelease(freqs, dur, at(s), vel);
      }
    });
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
