import { analyzePc, Chord } from '../theory/chords';
import { Chart, chordAt, EIGHTHS_PER_BAR } from '../theory/chart';
import { degreeNote, mod, placeNear } from '../theory/notes';
import type { MelNote } from '../exercises/generators';

/** Evento crudo capturado durante el play-along. midi = null → fin de nota. */
export interface RawEvent {
  chorus: number;
  eighth: number;
  midi: number | null;
}

export interface ChorusTranscription {
  chorus: number;
  notes: MelNote[];
}

/** Escribe una altura MIDI con la ortografía que corresponde al acorde que suena. */
export function spellInContext(m: number, chord: Chord) {
  const a = analyzePc(chord, mod(m, 12));
  return placeNear(degreeNote(chord.root, a.degree), m);
}

/**
 * Convierte eventos cuantizados en notas por chorus.
 * Cada nota dura hasta la siguiente nota o hasta su fin (mínimo una corchea).
 */
export function transcribe(events: RawEvent[], chart: Chart): ChorusTranscription[] {
  const total = chart.bars * EIGHTHS_PER_BAR;
  const abs = (e: RawEvent) => e.chorus * total + e.eighth;
  const sorted = [...events].sort((a, b) => abs(a) - abs(b));

  // notas absolutas
  const notes: { start: number; end: number; midi: number }[] = [];
  for (const ev of sorted) {
    const t = abs(ev);
    const last = notes[notes.length - 1];
    if (last && last.end === Infinity) last.end = Math.max(t, last.start + 1);
    if (ev.midi === null) continue;
    if (last && last.start === t) {
      // dos ataques en la misma corchea: queda el último
      last.midi = ev.midi;
      last.end = Infinity;
      continue;
    }
    if (last && last.end > t) last.end = t;
    notes.push({ start: t, end: Infinity, midi: ev.midi });
  }
  const lastNote = notes[notes.length - 1];
  if (lastNote && lastNote.end === Infinity) lastNote.end = lastNote.start + 2;

  const byChorus = new Map<number, MelNote[]>();
  for (const n of notes) {
    let s = n.start;
    // cortar en el final de cada chorus
    while (s < n.end) {
      const chorus = Math.floor(s / total);
      const local = s - chorus * total;
      const end = Math.min(n.end, (chorus + 1) * total);
      const cc = chordAt(chart, local)!;
      const pitch = spellInContext(n.midi, cc.chord);
      if (!byChorus.has(chorus)) byChorus.set(chorus, []);
      byChorus.get(chorus)!.push({ start: local, dur: end - s, pitch });
      s = end;
    }
  }
  return [...byChorus.entries()].sort((a, b) => a[0] - b[0]).map(([chorus, notes]) => ({ chorus, notes }));
}

export interface SoloAnalysis {
  notes: number;
  /** % de notas en tiempo fuerte (corcheas pares) que son del acorde. */
  strongChordTones: number;
  /** % de cambios de acorde donde se tocó un guide tone al llegar. */
  guideLandings: number;
  changesPlayed: number;
  /** % de ataques en contratiempo. */
  offbeat: number;
  /** % de corcheas en silencio. */
  space: number;
  /** % de notas cromáticas (fuera de la escala-acorde). */
  chromatic: number;
  lowest: number;
  highest: number;
  feedback: string[];
}

export function analyzeSolo(notes: MelNote[], chart: Chart): SoloAnalysis {
  const total = chart.bars * EIGHTHS_PER_BAR;
  const played = notes.filter((n) => n.pitch);
  const midiOf = (n: MelNote) => (n.pitch!.octave + 1) * 12 + [0, 2, 4, 5, 7, 9, 11][n.pitch!.letter] + n.pitch!.acc;
  const roleOf = (n: MelNote) => analyzePc(chordAt(chart, n.start)!.chord, mod(midiOf(n), 12));

  const strong = played.filter((n) => n.start % 2 === 0);
  const strongCT = strong.filter((n) => roleOf(n).role === 'chord').length;

  let changesPlayed = 0;
  let landings = 0;
  for (const cc of chart.chords) {
    const n = played.find((x) => x.start >= cc.start && x.start <= cc.start + 1);
    if (!n) continue;
    changesPlayed++;
    if (analyzePc(cc.chord, mod(midiOf(n), 12)).guide) landings++;
  }

  const covered = played.reduce((s, n) => s + n.dur, 0);
  const offbeat = played.filter((n) => n.start % 2 === 1).length;
  const chromatic = played.filter((n) => roleOf(n).role === 'chromatic').length;
  const ms = played.map(midiOf);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  const a: SoloAnalysis = {
    notes: played.length,
    strongChordTones: pct(strongCT, strong.length),
    guideLandings: pct(landings, changesPlayed),
    changesPlayed,
    offbeat: pct(offbeat, played.length),
    space: pct(total - covered, total),
    chromatic: pct(chromatic, played.length),
    lowest: ms.length ? Math.min(...ms) : 0,
    highest: ms.length ? Math.max(...ms) : 0,
    feedback: [],
  };

  const f = a.feedback;
  if (a.notes < 6) {
    f.push('Muy pocas notas detectadas para analizar. Revisá que el micrófono te escuche (auriculares, volumen) y tocá al menos un chorus.');
    return a;
  }
  if (a.guideLandings < 40) f.push('Pocos cambios "aterrizan" en 3ª o 7ª. Probá un chorus sólo de guide tones antes de volver a improvisar.');
  else if (a.guideLandings >= 70) f.push('Muy buena llegada a los guide tones en los cambios: la armonía se escucha en tu línea.');
  if (a.strongChordTones < 45) f.push('En los tiempos fuertes predominan notas de paso. Si es intencional, bien; si no, apuntá a notas del acorde en 1 y 3.');
  if (a.space < 15) f.push('Casi no hay silencios: frases más cortas y respiradas suenan más claras (y te cuidan la embocadura).');
  else if (a.space > 65) f.push('Mucho espacio. Si es intencional, bien; también podés probar frases más largas que crucen los cambios.');
  if (a.offbeat < 25) f.push('Pocos ataques en contratiempo: empezar frases en el "y" ayuda mucho al swing.');
  if (a.chromatic > 25) f.push('Bastantes notas fuera de la escala-acorde. Verificá que las cromáticas resuelvan por semitono a una nota del acorde.');
  if (a.highest - a.lowest < 10) f.push('Registro estrecho (menos de una octava). Probá usar más rango del instrumento.');
  if (f.length === 0) f.push('Solo equilibrado en los aspectos que mide la app. Escuchalo y compará con una grabación de referencia.');
  return a;
}
