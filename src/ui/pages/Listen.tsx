import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import { listen, MicListener, PitchFrame } from '../../pitch/mic';
import { byDay, type LongNote, trend } from '../../state/longnotes';
import { freqToMidi, midiName } from '../../theory/notes';
import { useReading, useSettings } from '../hooks';
import { useWakeLock } from '../wakeLock';
import { usePersistent } from '../../state/storage';

/** Afinador + medidor de estabilidad para notas largas. */
export function Listen() {
  const { view } = useReading();
  const [settings, setSettings] = useSettings();
  const a4 = settings.a4;
  const a4Ref = useRef(a4);
  a4Ref.current = a4;
  const [saved, setSaved] = usePersistent<{ rows: LongNote[] }>('longnotes', { rows: [] });
  const [droneNote, setDroneNote] = useState<number | null>(null);
  const [on, setOn] = useState(false);
  useWakeLock(on || droneNote !== null); // afinando o con el bordón sonando
  const [frame, setFrame] = useState<PitchFrame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<{ note: number; cents: number[]; start: number } | null>(null);
  const [results, setResults] = useState<{ note: string; secs: number; spread: number; offset: number }[]>([]);
  const mic = useRef<MicListener | null>(null);
  const holdRef = useRef(hold);
  holdRef.current = hold;

  useEffect(
    () => () => {
      mic.current?.stop();
      engine.stopDrone();
    },
    [],
  );
  // si cambia la afinación con el bordón sonando, se corrige en el momento
  useEffect(() => {
    if (droneNote !== null) void engine.startDrone(droneNote, a4);
  }, [a4, droneNote]);

  const writtenOffset = view === 'Bb' ? 2 : 0;

  const onFrame = (raw: PitchFrame) => {
    // el detector mide contra La = 440: se corrige a la afinación elegida
    const f = raw.freq && raw.midi !== null ? { ...raw, midi: freqToMidi((raw.freq * 440) / a4Ref.current) } : raw;
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
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setSaved((cur) => ({ rows: [...cur.rows, { day, midi: h.note, secs, spread: sd, offset: mean }].slice(-600) }));
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
            <button key={c} onClick={() => engine.playNote(c, 1.6, a4)}>
              {midiName(c + writtenOffset)}
            </button>
          ))}
        </div>
        <div className="row">
          <span className="muted small">Bordón (nota sostenida):</span>
          {[58, 60, 62, 65, 67, 70].map((c) => (
            <button key={c} aria-pressed={droneNote === c} className={droneNote === c ? 'primary' : ''} onClick={() => {
              if (droneNote === c) { engine.stopDrone(); setDroneNote(null); } else setDroneNote(c);
            }}>
              {midiName(c + writtenOffset)}
            </button>
          ))}
          {droneNote !== null && <button onClick={() => { engine.stopDrone(); setDroneNote(null); }}>Parar bordón</button>}
        </div>
        <div className="row">
          <label>Afinación del La
            <select value={a4} onChange={(e) => setSettings({ a4: Number(e.target.value) })}>
              <option value={440}>La = 440 Hz</option>
              <option value={442}>La = 442 Hz</option>
            </select>
          </label>
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

      <Evolution rows={saved.rows} onClear={() => setSaved({ rows: [] })} />
    </div>
  );
}

/** Evolución de las notas largas guardadas: dispersión media por día (menos es más estable). */
function Evolution({ rows, onClear }: { rows: LongNote[]; onClear: () => void }) {
  const stats = byDay(rows);
  const t = trend(stats);
  const top = Math.max(10, ...stats.map((d) => d.spread));
  return (
    <section className="card">
      <h3>Tu evolución</h3>
      {stats.length === 0 ? (
        <p className="muted small">Las notas largas que sostengas se guardan solas y acá vas a ver cómo cambia tu estabilidad día a día.</p>
      ) : (
        <>
          <p className="muted small">
            {t === null ? 'Con dos días de práctica ya se ve la tendencia.' : t < -0.5 ? `Mejoraste: la dispersión bajó ${Math.abs(t).toFixed(1)} cents.` : t > 0.5 ? `La dispersión subió ${t.toFixed(1)} cents: puede ser cansancio o un registro más difícil.` : 'Estás estable.'}
          </p>
          <table className="results">
            <thead><tr><th>Día</th><th>Notas</th><th>Dispersión media</th><th><span className="sr-only">Gráfico</span></th></tr></thead>
            <tbody>
              {[...stats].reverse().map((d) => (
                <tr key={d.day}>
                  <td>{d.day.slice(8)}/{d.day.slice(5, 7)}</td>
                  <td>{d.count}</td>
                  <td className={d.spread < 5 ? 'good' : d.spread < 10 ? 'ok' : 'bad'}>{d.spread.toFixed(1)} c</td>
                  <td aria-hidden="true"><span className="evo" style={{ width: `${Math.max(4, (d.spread / top) * 100)}%` }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row"><button onClick={() => window.confirm('¿Borrar el historial de notas largas?') && onClear()}>Borrar historial</button></div>
        </>
      )}
    </section>
  );
}
