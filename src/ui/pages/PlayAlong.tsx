import { useCallback, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import { RawEvent, transcribe, ChorusTranscription } from '../../pitch/transcribe';
import type { Chart } from '../../theory/chart';
import { Transcription } from '../components/Transcription';
import { PROGRESSIONS } from '../../content/progressions';
import { keyInterval, parseChart, transposeChart } from '../../theory/chart';
import { ChordBoard, CurrentChord } from '../components/ChordInfo';
import { KeySelect } from '../components/KeySelect';
import { ListenPanel } from '../components/ListenPanel';
import { Player } from '../components/Player';
import { navigate, usePosition, useRoute } from '../hooks';

const OWNER = 'playalong';
/** Retardo de la detección: estabilización (60 ms) + media ventana de análisis (~25 ms). */
const ON_LATENCY_MS = 85;
const OFF_LATENCY_MS = 90;

interface Take {
  chart: Chart;
  keyValue: string | null;
  mode?: 'major' | 'minor';
  tempo: number;
  choruses: ChorusTranscription[];
}

export function PlayAlong() {
  const { query } = useRoute();
  const prog = PROGRESSIONS.find((p) => p.id === query.get('p')) ?? PROGRESSIONS[0];
  const key = query.get('k') ?? prog.key ?? 'C';
  const [tempo, setTempo] = useState(prog.tempo);
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const { chart, customError } = useMemo(() => {
    let customError: string | null = null;
    if (useCustom && custom.trim()) {
      try {
        return { chart: parseChart(custom), customError };
      } catch (e) {
        customError = (e as Error).message;
      }
    }
    const base = parseChart(prog.chart);
    return { chart: prog.key ? transposeChart(base, keyInterval(prog.key, key)) : base, customError };
  }, [prog, key, custom, useCustom]);

  const pos = usePosition();
  const mine = pos && pos.owner === OWNER ? pos : null;
  const ci = mine && !mine.countIn ? mine.chordIndex : -1;
  const chord = ci >= 0 ? chart.chords[ci]?.chord ?? null : null;
  const next = ci >= 0 ? chart.chords[(ci + 1) % chart.chords.length]?.chord ?? null : null;

  // ---- grabación del solo ----
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const [take, setTake] = useState<Take | null>(null);
  const events = useRef<RawEvent[]>([]);
  const snapshot = useRef<Omit<Take, 'choruses'> | null>(null);

  const onEvent = useCallback((midi: number | null, time: number) => {
    const loc = engine.locate(time - (midi === null ? OFF_LATENCY_MS : ON_LATENCY_MS));
    if (!loc) return;
    events.current.push({ ...loc, midi });
    if (midi !== null) setCount((c) => c + 1);
  }, []);

  const toggleRecording = () => {
    if (!recording) {
      events.current = [];
      setCount(0);
      setTake(null);
      snapshot.current = { chart, keyValue: prog.key && !useCustom ? key : null, mode: prog.mode, tempo };
      setRecording(true);
    } else {
      setRecording(false);
      const snap = snapshot.current!;
      const choruses = transcribe(events.current, snap.chart);
      if (choruses.length) setTake({ ...snap, choruses });
    }
  };

  const setQuery = (p: string, k?: string | null) => {
    const q = new URLSearchParams({ p });
    if (k) q.set('k', k);
    navigate(`/playalong?${q}`);
  };

  return (
    <div className="page playalong">
      <section className="card">
        <header>
          <h2>Play-along</h2>
          <select
            value={prog.id}
            onChange={(e) => {
              const p = PROGRESSIONS.find((x) => x.id === e.target.value)!;
              setTempo(p.tempo);
              setUseCustom(false);
              setQuery(p.id);
            }}
          >
            {(['Fundamentos', 'Blues', 'Standards', 'Avanzado'] as const).map((cat) => (
              <optgroup key={cat} label={cat}>
                {PROGRESSIONS.filter((p) => p.category === cat).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </header>
        <p className="muted">{prog.notes}</p>
        {prog.key && !useCustom && <KeySelect value={key} onChange={(k) => setQuery(prog.id, k)} minor={prog.mode === 'minor'} />}
        <Player
          chart={chart}
          tempo={tempo}
          onTempo={setTempo}
          style={prog.style}
          owner={OWNER}
          defaultMetronome={query.get('m') === '1'}
        />
      </section>

      <div className="grid2">
        <CurrentChord chord={chord} next={next} />
        <ListenPanel
          chord={chord}
          chordIndex={ci}
          chorus={mine?.chorus ?? 0}
          tempo={tempo}
          recorder={{ recording, toggle: toggleRecording, onEvent, count }}
        />
      </div>

      {recording && !engine.playing && (
        <p className="card muted">Grabando: dale play al acompañamiento y tocá. Las notas se ubican en la forma según el tiempo del play-along.</p>
      )}
      {take && (
        <Transcription
          chart={take.chart}
          choruses={take.choruses}
          keyValue={take.keyValue}
          mode={take.mode}
          tempo={take.tempo}
          style={prog.style}
          onClear={() => setTake(null)}
        />
      )}

      <section className="card">
        <ChordBoard chart={chart} current={ci} />
        {prog.listen && <p className="muted small">Escuchá: {prog.listen.join(' · ')}</p>}
      </section>

      <section className="card">
        <details open={useCustom}>
          <summary>Tu propia progresión (concierto)</summary>
          <p className="muted small">
            Compases con "|", acordes separados por espacio, "%" repite. Ejemplo: <code>Em7b5 | A7alt | Dm7 | G7 | Cmaj7 | %</code>
          </p>
          <textarea rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Dm7 G7 | Cmaj7 | ..." />
          <label>
            <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} /> Usar esta progresión
          </label>
          {customError && <p className="error">{customError}</p>}
        </details>
      </section>
    </div>
  );
}
