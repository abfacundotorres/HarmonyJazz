import { useMemo, useState } from 'react';
import type { Style } from '../../audio/engine';
import { toAbc } from '../../exercises/abc';
import { analyzeSolo, ChorusTranscription } from '../../pitch/transcribe';
import type { Chart } from '../../theory/chart';
import { midiName } from '../../theory/notes';
import { Notation } from './Notation';
import { Player } from './Player';
import { usePosition, useReading } from '../hooks';

const OWNER = 'transcription';

export function Transcription({
  chart,
  choruses,
  keyValue,
  mode,
  tempo: initialTempo,
  style,
  onClear,
}: {
  chart: Chart;
  choruses: ChorusTranscription[];
  keyValue: string | null;
  mode?: 'major' | 'minor';
  tempo: number;
  style?: Style;
  onClear: () => void;
}) {
  const { iv, view } = useReading();
  const [sel, setSel] = useState(0);
  const [tempo, setTempo] = useState(initialTempo);
  const cur = choruses[Math.min(sel, choruses.length - 1)];
  const pos = usePosition();
  const bar = pos && pos.owner === OWNER && !pos.countIn ? pos.bar : -1;

  const abc = useMemo(
    () => toAbc(chart, cur.notes, { transpose: iv, key: keyValue, mode, barsPerLine: 4 }),
    [chart, cur, iv, keyValue, mode],
  );
  const a = useMemo(() => analyzeSolo(cur.notes, chart), [cur, chart]);
  const w = view === 'Bb' ? 2 : 0;

  return (
    <section className="card transcription">
      <header>
        <h3>Tu solo, transcripto</h3>
        <div className="row">
          {choruses.length > 1 &&
            choruses.map((c, i) => (
              <button key={c.chorus} className={`chip ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                Chorus {c.chorus + 1}
              </button>
            ))}
          <button onClick={onClear}>Descartar</button>
        </div>
      </header>
      <p className="muted small">
        Cuantizado a corcheas con el swing del acompañamiento. Es una aproximación: notas muy rápidas, ghost notes o glissandos pueden no aparecer. Usala para mirar las decisiones armónicas, no como partitura exacta.
      </p>
      <Notation abc={abc} highlightBar={bar} />
      <Player chart={chart} tempo={tempo} onTempo={setTempo} melody={cur.notes} allowMelody style={style} owner={OWNER} />
      {a.notes > 0 && (
        <div className="stats">
          <Stat label="Llegadas a guide tones" value={`${a.guideLandings}%`} hint={`en ${a.changesPlayed} cambios tocados`} />
          <Stat label="Notas del acorde en tiempo fuerte" value={`${a.strongChordTones}%`} />
          <Stat label="Ataques en contratiempo" value={`${a.offbeat}%`} />
          <Stat label="Espacio (silencio)" value={`${a.space}%`} />
          <Stat label="Cromáticas" value={`${a.chromatic}%`} />
          <Stat label="Registro" value={`${midiName(a.lowest + w)}–${midiName(a.highest + w)}`} hint={view === 'Bb' ? 'escrito' : 'concierto'} />
        </div>
      )}
      <ul className="feedback">{a.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat">
      <span className="lbl">{label}</span>
      <b>{value}</b>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}
