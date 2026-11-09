import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import { listen, MicListener, PitchFrame } from '../../pitch/mic';
import { midiName } from '../../theory/notes';
import { useReading } from '../hooks';

/** Afinador + medidor de estabilidad para notas largas. */
export function Listen() {
  const { view } = useReading();
  const [on, setOn] = useState(false);
  const [frame, setFrame] = useState<PitchFrame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<{ note: number; cents: number[]; start: number } | null>(null);
  const [results, setResults] = useState<{ note: string; secs: number; spread: number; offset: number }[]>([]);
  const mic = useRef<MicListener | null>(null);
  const holdRef = useRef(hold);
  holdRef.current = hold;

  useEffect(() => () => mic.current?.stop(), []);

  const writtenOffset = view === 'Bb' ? 2 : 0;

  const onFrame = (f: PitchFrame) => {
    setFrame(f);
    const h = holdRef.current;
    if (f.midi === null) {
      if (h && performance.now() - h.start > 1500 && h.cents.length > 30) finishHold(h);
      setHold(null);
      return;
    }
    const n = Math.round(f.midi);
    const c = (f.midi - n) * 100;
    if (!h || h.note !== n) {
      if (h && h.cents.length > 30) finishHold(h);
      setHold({ note: n, cents: [c], start: performance.now() });
    } else {
      h.cents.push(c);
    }
  };

  const finishHold = (h: { note: number; cents: number[]; start: number }) => {
    const cs = h.cents.slice(5); // descartar el ataque
    const mean = cs.reduce((a, b) => a + b, 0) / cs.length;
    const sd = Math.sqrt(cs.reduce((a, b) => a + (b - mean) ** 2, 0) / cs.length);
    const secs = (performance.now() - h.start) / 1000;
    setResults((r) => [{ note: midiName(h.note + writtenOffset), secs, spread: sd, offset: mean }, ...r].slice(0, 12));
  };

  const start = async () => {
    setError(null);
    try {
      mic.current = await listen(onFrame);
      setOn(true);
    } catch {
      setError('No pude acceder al micrófono. Revisá los permisos del navegador.');
    }
  };
  const stop = () => {
    mic.current?.stop();
    mic.current = null;
    setOn(false);
    setFrame(null);
  };

  const m = frame?.midi ?? null;
  const n = m !== null ? Math.round(m) : null;
  const cents = m !== null && n !== null ? Math.round((m - n) * 100) : 0;

  return (
    <div className="page listen-page">
      <section className="card tuner">
        <header>
          <h2>Afinador y notas largas</h2>
          {on ? <button onClick={stop}>Apagar</button> : <button className="primary" onClick={start}>Activar micrófono</button>}
        </header>
        {error && <p className="error">{error}</p>}
        <div className={`dial ${n === null ? 'idle' : Math.abs(cents) <= 5 ? 'good' : Math.abs(cents) <= 15 ? 'ok' : 'bad'}`}>
          <div className="note">{n !== null ? midiName(n + writtenOffset, false) : '—'}</div>
          <div className="octave muted">
            {n !== null ? `${view === 'Bb' ? 'escrita' : 'concierto'} · ${midiName(n + writtenOffset)} · ${frame?.freq?.toFixed(1)} Hz` : on ? 'Tocá una nota' : 'Micrófono apagado'}
          </div>
          <div className="meter">
            <div className="scale">
              <span>−50</span>
              <span>0</span>
              <span>+50</span>
            </div>
            <div className="track">
              <i className="zero" />
              {n !== null && <b style={{ left: `${50 + cents}%` }} />}
            </div>
            <div className="cents">{n !== null ? `${cents > 0 ? '+' : ''}${cents} cents` : ''}</div>
          </div>
        </div>
        <div className="row">
          <span className="muted small">Nota de referencia:</span>
          {[58, 60, 62, 65, 67, 70].map((c) => (
            <button key={c} onClick={() => engine.playNote(c, 1.6)}>
              {midiName(c + writtenOffset, false)}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Notas largas</h3>
        <p className="muted">
          Sostené cada nota al menos 2 segundos. Se mide la dispersión de la afinación (cuanto más baja, más estable el sonido) y el desvío medio. Objetivo: dispersión menor a 5 cents en el registro medio.
        </p>
        {results.length === 0 ? (
          <p className="muted small">Todavía no hay notas largas registradas.</p>
        ) : (
          <table className="results">
            <thead>
              <tr><th>Nota</th><th>Duración</th><th>Dispersión</th><th>Desvío</th></tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{r.note}</td>
                  <td>{r.secs.toFixed(1)} s</td>
                  <td className={r.spread < 5 ? 'good' : r.spread < 10 ? 'ok' : 'bad'}>{r.spread.toFixed(1)} c</td>
                  <td>{r.offset > 0 ? '+' : ''}{r.offset.toFixed(0)} c</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
