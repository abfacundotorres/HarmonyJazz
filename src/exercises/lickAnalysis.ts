import { analyzePc, prettyDegree, qdef } from '../theory/chords';
import { chordAt, Chart } from '../theory/chart';
import { midi, mod, noteName, Pitch, pc } from '../theory/notes';
import type { MelNote } from './generators';

export type NoteKind = 'chord' | 'tension' | 'scale' | 'chromatic';

/** Una nota de la frase, explicada. */
export interface NoteRow {
  /** Posición entre las notas que suenan (0-based). */
  index: number;
  pitch: Pitch;
  midi: number;
  /** Compás (1-based) y tiempo dentro del compás: "1", "2 y", … */
  bar: number;
  beat: string;
  /** Cae en un tiempo (no en un "y"). */
  strong: boolean;
  /** Duración en corcheas. */
  dur: number;
  /** Índice del acorde en la carta. */
  chordIndex: number;
  /** Grado respecto del acorde que suena ("3", "♭7", "♭9", "♯11"…). */
  degree: string;
  kind: NoteKind;
  guide: boolean;
  /** Intervalo desde la nota anterior (vacío en la primera). */
  interval: { semis: number; name: string; dir: '↑' | '↓' | '=' } | null;
  /** Etiquetas que describen el recurso: aproximación, enclosure, salto, nota azul… */
  tags: string[];
  /** Si la nota se sostiene hasta el acorde siguiente y es una nota de ese acorde (anticipación). */
  tieTo?: { chordIndex: number; degree: string; guide: boolean };
}

const INTERVAL_NAMES = [
  'unísono', '2ª menor', '2ª mayor', '3ª menor', '3ª mayor', '4ª justa', 'tritono', '5ª justa', '6ª menor', '6ª mayor', '7ª menor', '7ª mayor', 'octava',
];

export function intervalName(semis: number): string {
  const a = Math.abs(semis);
  if (a <= 12) return INTERVAL_NAMES[a];
  return a < 24 ? `${INTERVAL_NAMES[a - 12]} + octava` : 'más de dos octavas';
}

const KIND_LABEL: Record<NoteKind, string> = {
  chord: 'nota del acorde',
  tension: 'tensión',
  scale: 'de la escala',
  chromatic: 'cromática',
};
export const kindLabel = (k: NoteKind) => KIND_LABEL[k];

/** Analiza una frase contra la carta de acordes sobre la que se toca. Todo en concierto. */
export function analyzeLick(notes: MelNote[], chart: Chart): NoteRow[] {
  const sounding = notes.filter((n) => n.pitch !== null) as (MelNote & { pitch: Pitch })[];
  const rows: NoteRow[] = sounding.map((n, i) => {
    const cc = chordAt(chart, n.start)!;
    const m = midi(n.pitch);
    const a = analyzePc(cc.chord, mod(m, 12));
    const e = n.start % 8;
    const beatNo = Math.floor(e / 2) + 1;
    const prev = i > 0 ? midi(sounding[i - 1].pitch) : null;
    const d = prev === null ? 0 : m - prev;
    return {
      index: i,
      pitch: n.pitch,
      midi: m,
      bar: Math.floor(n.start / 8) + 1,
      beat: e % 2 === 0 ? String(beatNo) : `${beatNo} y`,
      strong: e % 2 === 0,
      dur: n.dur,
      chordIndex: chart.chords.indexOf(cc),
      degree: prettyDegree(a.degree),
      kind: a.role,
      guide: a.guide,
      interval: prev === null ? null : { semis: d, name: intervalName(d), dir: d > 0 ? '↑' : d < 0 ? '↓' : '=' },
      tags: [],
    };
  });

  // nota azul: ♭5 sobre un acorde menor, ♭3 sobre un dominante
  for (const r of rows) {
    const ch = chart.chords[r.chordIndex].chord;
    const fam = qdef(ch).family;
    const rel = mod(r.midi - midi({ ...ch.root, octave: 4 }), 12);
    if ((fam === 'minor' && rel === 6) || (fam === 'dominant' && rel === 3 && r.kind === 'chromatic')) {
      r.tags.push(fam === 'minor' ? 'nota azul (♭5)' : 'nota azul (♭3)');
    }
  }
  // anticipación: una nota que cruza al acorde siguiente y es nota de ese acorde
  for (const r of rows) {
    const src = notes.filter((n) => n.pitch !== null)[r.index];
    const endCc = chordAt(chart, Math.min(src.start + src.dur - 1, chart.bars * 8 - 1));
    if (endCc && chart.chords.indexOf(endCc) !== r.chordIndex) {
      const a2 = analyzePc(endCc.chord, mod(r.midi, 12));
      if (a2.role === 'chord') {
        r.tieTo = { chordIndex: chart.chords.indexOf(endCc), degree: prettyDegree(a2.degree), guide: a2.guide };
        r.tags.push('anticipación');
      }
    }
  }
  // aproximaciones cromáticas: una nota que no es del acorde y resuelve por semitono a una que sí lo es
  for (let i = 0; i < rows.length - 1; i++) {
    const r = rows[i];
    const nx = rows[i + 1];
    if (r.kind !== 'chord' && nx.kind === 'chord' && Math.abs(nx.midi - r.midi) === 1 && !r.tags.length) {
      r.tags.push(nx.midi > r.midi ? 'aproximación desde abajo' : 'aproximación desde arriba');
    }
  }
  // enclosure: nota por encima (1–2 semitonos) + cromática por debajo → nota del acorde
  for (let i = 0; i < rows.length - 2; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    const t = rows[i + 2];
    if (t.kind === 'chord' && b.midi === t.midi - 1 && (a.midi - t.midi === 1 || a.midi - t.midi === 2)) {
      a.tags = ['enclosure (arriba)'];
      b.tags = ['enclosure (abajo)'];
      t.tags.push('objetivo del enclosure');
    }
  }
  // saltos
  for (const r of rows) {
    if (r.interval && Math.abs(r.interval.semis) >= 5) r.tags.push(`salto de ${r.interval.name}`);
  }
  return rows;
}

export interface LickStats {
  notes: number;
  chordOnStrong: number;
  strongNotes: number;
  chromatic: number;
  tensions: number;
  guideLandings: number;
  changes: number;
  lowest: number;
  highest: number;
  /** Cantidad de enclosures y aproximaciones cromáticas detectados. */
  enclosures: number;
  approaches: number;
  stepwise: number;
  leaps: number;
}

export function lickStats(rows: NoteRow[], chart: Chart): LickStats {
  const strong = rows.filter((r) => r.strong);
  // llegada a cada acorde: primera nota que suena dentro de su primer tiempo
  let landings = 0;
  let changes = 0;
  chart.chords.forEach((_, ci) => {
    const first = rows.find((r) => r.chordIndex === ci);
    // una nota anticipada que llega sostenida a este acorde también cuenta como llegada
    const anticipated = rows.find((r) => r.tieTo?.chordIndex === ci);
    if (!first && !anticipated) return;
    changes++;
    if (anticipated?.tieTo?.guide || (!anticipated && first?.guide)) landings++;
  });
  const moves = rows.filter((r) => r.interval);
  return {
    notes: rows.length,
    chordOnStrong: strong.filter((r) => r.kind === 'chord').length,
    strongNotes: strong.length,
    chromatic: rows.filter((r) => r.kind === 'chromatic').length,
    tensions: rows.filter((r) => r.kind === 'tension').length,
    guideLandings: landings,
    changes,
    lowest: rows.length ? Math.min(...rows.map((r) => r.midi)) : 0,
    highest: rows.length ? Math.max(...rows.map((r) => r.midi)) : 0,
    enclosures: rows.filter((r) => r.tags.includes('enclosure (arriba)')).length,
    approaches: rows.filter((r) => r.tags.some((t) => t.startsWith('aproximación'))).length,
    stepwise: moves.filter((r) => Math.abs(r.interval!.semis) <= 2).length,
    leaps: moves.filter((r) => Math.abs(r.interval!.semis) >= 3).length,
  };
}

/** Nombre de la nota para mostrar (concierto o escrita ya se resuelve afuera). */
export const pitchLabel = (p: Pitch) => noteName(p, true);
export { pc };
