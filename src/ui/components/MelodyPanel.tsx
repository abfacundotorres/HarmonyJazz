import { useMemo, useState } from 'react';
import type { UserTune } from '../../content/library';
import { buildMelody, melodyNotes, type Reading } from '../../content/melody';
import { toAbc } from '../../exercises/abc';
import { parseChart } from '../../theory/chart';
import { BB_TRUMPET, INTERVAL } from '../../theory/notes';
import { useReading } from '../hooks';
import { Notation } from './Notation';
import { NotePad } from './NotePad';

/** La melodía de un tema propio: se ve en el pentagrama, se escribe con el cuadro de notas y suena con la trompeta sobre el acompañamiento. */
export function MelodyPanel({ tune, onSave }: { tune: UserTune; onSave: (melody: string | undefined) => void }) {
  const { view } = useReading();
  const [editing, setEditing] = useState(false);
  const [line, setLine] = useState('');
  const [reading, setReading] = useState<Reading>(view === 'Bb' ? 'Bb' : 'C');
  const [tried, setTried] = useState(false);

  const chart = useMemo(() => {
    try {
      return parseChart(tune.chart);
    } catch {
      return null;
    }
  }, [tune.chart]);

  const abcOf = (concertLine: string) => {
    if (!chart) return '';
    try {
      return toAbc(chart, melodyNotes(concertLine), { transpose: view === 'Bb' ? BB_TRUMPET : INTERVAL.P1, key: tune.key ?? undefined, mode: tune.mode, barsPerLine: 4 });
    } catch {
      return '';
    }
  };

  const built = useMemo(() => (chart && line.trim() ? buildMelody(chart, line, reading) : null), [chart, line, reading]);
  const ok = built && typeof built !== 'string' ? built : null;

  const start = () => {
    // una melodía nueva se escribe en la lectura elegida; al editar, las notas guardadas están en concierto
    setReading(tune.melody ? 'C' : view === 'Bb' ? 'Bb' : 'C');
    setLine(tune.melody ?? '');
    setTried(false);
    setEditing(true);
  };

  if (!chart) return null;
  return (
    <section className="card melody" aria-label="Melodía del tema">
      <header>
        <h3>Melodía</h3>
        {!editing && <button onClick={start}>{tune.melody ? 'Editar la melodía' : 'Agregar la melodía'}</button>}
      </header>
      {!editing && !tune.melody && (
        <p className="muted small">Escribí la melodía de «{tune.name}» (de tu libro o de oído) para verla en el pentagrama y oírla con la trompeta sobre el acompañamiento. La app no trae melodías: las cargás vos.</p>
      )}
      {!editing && tune.melody && (
        <>
          <p className="muted small">En el reproductor, activá «Oír la línea» para escucharla sobre el acompañamiento. Sigue la tonalidad que elijas.</p>
          <Notation abc={abcOf(tune.melody)} />
        </>
      )}
      {editing && (
        <>
          <div className="seg" role="group" aria-label="Lectura de la melodía">
            <button className={reading === 'Bb' ? 'on' : ''} onClick={() => setReading('Bb')}>Escribo para trompeta (Si♭)</button>
            <button className={reading === 'C' ? 'on' : ''} onClick={() => setReading('C')}>Escribo en concierto</button>
          </div>
          <p className="muted small">
            Las notas empiezan en el primer tiempo del primer compás; una anacrusa se escribe con silencios (<code>r:2</code>). El tema tiene {chart.bars} compases.
          </p>
          <NotePad line={line} onLine={setLine} placeholder="r:6 A4 | D5:4 C5:2 A4:2 | …" rows={5} />
          {ok ? <Notation abc={abcOf(ok.line)} /> : (tried || line.trim()) && built && <p className="muted small" role="status">{built as string}</p>}
          <div className="row">
            <button
              className="primary"
              onClick={() => {
                setTried(true);
                if (ok) {
                  onSave(ok.line);
                  setEditing(false);
                }
              }}
            >
              Guardar la melodía
            </button>
            {tune.melody && (
              <button onClick={() => { onSave(undefined); setEditing(false); }}>Borrar la melodía</button>
            )}
            <button onClick={() => setEditing(false)}>Cancelar</button>
          </div>
          {tried && !ok && <p style={{ color: 'var(--bad)' }} role="alert">{(built as string | null) ?? 'Escribí al menos una nota'}</p>}
        </>
      )}
    </section>
  );
}
