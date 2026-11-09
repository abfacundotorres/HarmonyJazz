import { useMemo, useState } from 'react';
import { PROGRESSIONS } from '../../content/progressions';
import { keyInterval, parseChart, transposeChart } from '../../theory/chart';
import { ChordBoard, CurrentChord } from '../components/ChordInfo';
import { KeySelect } from '../components/KeySelect';
import { ListenPanel } from '../components/ListenPanel';
import { Player } from '../components/Player';
import { navigate, usePosition, useRoute } from '../hooks';

const OWNER = 'playalong';

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
          feel={prog.feel}
          owner={OWNER}
          defaultMetronome={query.get('m') === '1'}
        />
      </section>

      <div className="grid2">
        <CurrentChord chord={chord} next={next} />
        <ListenPanel chord={chord} chordIndex={ci} chorus={mine?.chorus ?? 0} tempo={tempo} />
      </div>

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
