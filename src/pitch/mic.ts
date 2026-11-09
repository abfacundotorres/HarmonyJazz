import { freqToMidi } from '../theory/notes';
import { detectPitch, NoteTracker } from './yin';

export interface PitchFrame {
  /** Altura en concierto (MIDI fraccional) o null. */
  midi: number | null;
  freq: number | null;
  clarity: number;
  rms: number;
  time: number;
}

export interface MicListener {
  stop: () => void;
}

/**
 * Escucha el micrófono y llama a onFrame ~60 veces por segundo y a onNote en cada nota nueva.
 * Se desactivan cancelación de eco/ruido/AGC: deforman el timbre y la detección.
 */
export async function listen(
  onFrame: (f: PitchFrame) => void,
  onNote?: (midi: number, time: number) => void,
): Promise<MicListener> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const tracker = new NoteTracker();
  let raf = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    analyser.getFloatTimeDomainData(buf);
    const r = detectPitch(buf, ctx.sampleRate, { minFreq: 140, maxFreq: 1400 });
    const now = performance.now();
    const m = r && r.clarity > 0.85 ? freqToMidi(r.freq) : null;
    onFrame({ midi: m, freq: r?.freq ?? null, clarity: r?.clarity ?? 0, rms: r?.rms ?? 0, time: now });
    const ev = tracker.push(m, now);
    if (ev.on !== undefined) onNote?.(ev.on, now);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    },
  };
}
