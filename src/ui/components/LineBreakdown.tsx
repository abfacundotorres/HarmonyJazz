import { useMemo } from 'react';
import { analyzeLick, lickStats } from '../../exercises/lickAnalysis';
import type { MelNote } from '../../exercises/generators';
import { Chart, sliceChart } from '../../theory/chart';
import { NoteRows } from './NoteRows';

const BARS = 4;

/**
 * Explica una línea generada: la fórmula del generador y, nota por nota, sus primeros compases
 * (el análisis se hace sobre las notas que realmente se tocan, así que no puede contradecirlas).
 */
export function LineBreakdown({ recipe, chart, notes }: { recipe: string; chart: Chart; notes: MelNote[] }) {
  const bars = Math.min(BARS, chart.bars);
  const part = useMemo(() => {
    const lim = bars * 8;
    return {
      chart: sliceChart(chart, 0, bars - 1),
      notes: notes.filter((n) => n.start < lim).map((n) => ({ ...n, dur: Math.min(n.dur, lim - n.start) })),
    };
  }, [chart, notes, bars]);
  const rows = useMemo(() => analyzeLick(part.notes, part.chart), [part]);
  const st = useMemo(() => lickStats(rows, part.chart), [rows, part]);
  if (rows.length === 0) return null;
  const pct = st.strongNotes ? Math.round((st.chordOnStrong / st.strongNotes) * 100) : 0;

  return (
    <details className="card study">
      <summary>
        <h3>Cómo está armada esta línea</h3>
        <span className="muted small"> primeros {bars} compases, nota por nota</span>
      </summary>
      <p>
        <strong>Fórmula: </strong>
        {recipe}
      </p>
      <p className="muted small">
        En estos {bars} compases hay {st.notes} notas: {st.chordOnStrong} de las {st.strongNotes} que caen en un tiempo son del acorde ({pct} %)
        {st.enclosures ? `, ${st.enclosures} enclosure${st.enclosures > 1 ? 's' : ''}` : ''}
        {st.approaches ? `, ${st.approaches} ${st.approaches > 1 ? 'aproximaciones' : 'aproximación'} cromática${st.approaches > 1 ? 's' : ''}` : ''}.
        Es la misma regla en cada acorde de la progresión: lo que cambia es el acorde, no la receta.
      </p>
      <NoteRows rows={rows} chart={part.chart} />
    </details>
  );
}
