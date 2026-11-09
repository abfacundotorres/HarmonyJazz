import { useMemo, useState } from 'react';
import type { Style } from '../../audio/engine';
import { toAbc } from '../../exercises/abc';
import type { MelNote } from '../../exercises/generators';
import type { Chart } from '../../theory/chart';
import { KeySelect } from './KeySelect';
import { Notation } from './Notation';
import { Player } from './Player';
import { useMastery, usePosition, useReading } from '../hooks';

export interface ExerciseCardProps {
  id: string;
  title: string;
  description?: string;
  chart: Chart;
  notes: MelNote[];
  /** Tonalidad actual (concierto) o null si la progresión recorre varias. */
  keyValue: string | null;
  mode?: 'major' | 'minor';
  onKey?: (k: string) => void;
  tempo: number;
  style?: Style;
  onRegenerate?: () => void;
}

export function ExerciseCard(p: ExerciseCardProps) {
  const { iv, view } = useReading();
  const [tempo, setTempo] = useState(p.tempo);
  const [mastery, setMastery] = useMastery();
  const pos = usePosition();
  const bar = pos && pos.owner === p.id && !pos.countIn ? pos.bar : -1;
  const masteryKey = p.keyValue ?? 'todas';
  const record = mastery[p.id] ?? {};

  const abc = useMemo(
    () => toAbc(p.chart, p.notes, { transpose: iv, key: p.keyValue, mode: p.mode, barsPerLine: 4 }),
    [p.chart, p.notes, iv, p.keyValue, p.mode],
  );

  const mark = () =>
    setMastery((m) => ({ ...m, [p.id]: { ...(m[p.id] ?? {}), [masteryKey]: Math.max(tempo, m[p.id]?.[masteryKey] ?? 0) } }));
  const doneCount = Object.keys(record).filter((k) => k !== 'todas').length;

  return (
    <section className="card exercise">
      <header>
        <h3>{p.title}</h3>
        <span className="badge">{view === 'Bb' ? 'Trompeta en Si♭' : 'Concierto'}</span>
      </header>
      {p.description && <p className="muted">{p.description}</p>}
      {p.keyValue && p.onKey && (
        <>
          <KeySelect value={p.keyValue} onChange={p.onKey} mastered={record} minor={p.mode === 'minor'} />
          <p className="muted small">{doneCount}/12 tonalidades dominadas</p>
        </>
      )}
      <Notation abc={abc} highlightBar={bar} />
      <Player chart={p.chart} tempo={tempo} onTempo={setTempo} melody={p.notes} allowMelody style={p.style} owner={p.id} />
      <div className="row">
        <button className="primary" onClick={mark}>
          ✓ Salió limpio a {tempo} bpm{p.keyValue ? '' : ' (todas las tonalidades)'}
        </button>
        {record[masteryKey] ? <span className="muted small">Mejor marca: {record[masteryKey]} bpm</span> : null}
        {p.onRegenerate && <button onClick={p.onRegenerate}>Otra variante</button>}
      </div>
    </section>
  );
}
