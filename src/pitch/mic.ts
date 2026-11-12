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
  /** Empieza a guardar el audio del micrófono (para volver a escuchar la toma). */
  startRecording: () => void;
  /** Termina y devuelve el audio grabado (null si no se estaba grabando o no hubo nada). */
  stopRecording: () => Promise<Blob | null>;
}

/**
 * Escucha el micrófono y llama a onFrame ~60 veces por segundo y a onNote en cada nota nueva.
 * Se desactivan cancelación de eco/ruido/AGC: deforman el timbre y la detección.
 */
export async function listen(
  onFrame: (f: PitchFrame) => void,
  /** midi = null cuando la nota termina. */
  onNote?: (midi: number | null, time: number) => void,
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
    else if (ev.off) onNote?.(null, now);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // grabación de audio (MediaRecorder): independiente de la detección de notas
  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  const startRecording = () => {
    if (rec || typeof MediaRecorder === 'undefined') return;
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported?.(t));
    chunks = [];
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      rec = null;
      return;
    }
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.start(1000);
  };
  const stopRecording = () =>
    new Promise<Blob | null>((res) => {
      const r = rec;
      rec = null;
      if (!r || r.state === 'inactive') return res(chunks.length ? new Blob(chunks, { type: r?.mimeType }) : null);
      r.onstop = () => res(chunks.length ? new Blob(chunks, { type: r.mimeType }) : null);
      r.stop();
    });

  return {
    startRecording,
    stopRecording,
    stop: () => {
      if (rec && rec.state !== 'inactive') rec.stop();
      stopped = true;
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    },
  };
}
