import { useEffect, useRef, useState } from 'react';
import { analyzePc, Chord, NoteRole, prettyDegree } from '../../theory/chords';
import { BB_TRUMPET, midiName, mod } from '../../theory/notes';
import { listen, MicListener } from '../../pitch/mic';
import { useReading } from '../hooks';

interface Played {
  id: number;
  name: string;
  role: NoteRole;
  degree: string;
  guide: boolean;
}

const ROLE_LABEL: Record<NoteRole, string> = {
  chord: 'nota del acorde',
  tension: 'tensión',
  scale: 'de la escala',
  chromatic: 'cromática',
};

/**
 * Escucha al trompetista mientras suena el play-along:
 * clasifica cada nota contra el acorde actual y lleva el reto de guide tones.
 */
export function ListenPanel({
  chord,
  chordIndex,
  chorus,
  tempo,
  recorder,
}: {
  chord: Chord | null;
  chordIndex: number;
  chorus: number;
  tempo: number;
  /** Si está, se muestra el botón de grabar y se le pasan las notas con su tiempo. */
  recorder?: { recording: boolean; toggle: () => void; onEvent: (midi: number | null, time: number) => void; count: number; /** Recibe el audio de la toma cuando termina. */ onAudio?: (b: Blob) => void };
}) {
  const { iv } = useReading();
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<Played[]>([]);
  const [counts, setCounts] = useState<Record<NoteRole, number>>({ chord: 0, tension: 0, scale: 0, chromatic: 0 });
  const [challenge, setChallenge] = useState({ hits: 0, total: 0 });
  const mic = useRef<MicListener | null>(null);
  const chordRef = useRef<Chord | null>(chord);
  const recRef = useRef(recorder);
  recRef.current = recorder;
  const windowRef = useRef<{ until: number; judged: boolean; played: boolean }>({ until: 0, judged: true, played: false });
  const idRef = useRef(0);

  chordRef.current = chord;

  // cada cambio de acorde abre una ventana de 1 tiempo para "aterrizar" en un guide tone
  useEffect(() => {
    if (!on || chordIndex < 0) return;
    const w = windowRef.current;
    if (!w.judged && w.played) setChallenge((c) => ({ ...c, total: c.total + 1 }));
    windowRef.current = { until: performance.now() + (60 / tempo) * 1000 + 80, judged: false, played: false };
  }, [chordIndex, chorus, on, tempo]);

  useEffect(() => () => mic.current?.stop(), []);

  // el audio de la toma se graba mientras dura "Grabar solo"
  const wasRecording = useRef(false);
  useEffect(() => {
    const rec = !!recorder?.recording;
    if (rec && !wasRecording.current) mic.current?.startRecording();
    if (!rec && wasRecording.current) void mic.current?.stopRecording().then((b) => b && recRef.current?.onAudio?.(b));
    wasRecording.current = rec;
  }, [recorder?.recording]);

  const start = async () => {
    setError(null);
    try {
      mic.current = await listen(
        () => {},
        (m, time) => {
          if (recRef.current?.recording) recRef.current.onEvent(m, time);
          if (m === null) return;
          const c = chordRef.current;
          if (!c) return;
          const a = analyzePc(c, mod(m, 12));
          const written = m + (iv.semis === BB_TRUMPET.semis ? 2 : 0);
          setFeed((f) => [{ id: idRef.current++, name: midiName(written, false), role: a.role, degree: a.degree, guide: a.guide }, ...f].slice(0, 14));
          setCounts((c0) => ({ ...c0, [a.role]: c0[a.role] + 1 }));
          const w = windowRef.current;
          if (!w.judged && time <= w.until) {
            w.played = true;
            if (a.guide) {
              w.judged = true;
              setChallenge((ch) => ({ hits: ch.hits + 1, total: ch.total + 1 }));
            }
          }
        },
      );
      setOn(true);
    } catch (e) {
      setError('No pude acceder al micrófono. Revisá los permisos del navegador.');
      console.error(e);
    }
  };

  const stop = () => {
    mic.current?.stop();
    mic.current = null;
    setOn(false);
  };

  const reset = () => {
    setFeed([]);
    setCounts({ chord: 0, tension: 0, scale: 0, chromatic: 0 });
    setChallenge({ hits: 0, total: 0 });
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const pct = challenge.total ? Math.round((challenge.hits / challenge.total) * 100) : 0;

  return (
    <section className="card listen">
      <header>
        <h3>Escucha</h3>
        <div className="row">
          {on ? <button onClick={stop}>Apagar micrófono</button> : <button className="primary" onClick={start}>Activar micrófono</button>}
          <button onClick={reset}>Reiniciar</button>
          {on && recorder && (
            <button className={recorder.recording ? 'rec on' : 'rec'} onClick={recorder.toggle}>
              {recorder.recording ? `■ Terminar (${recorder.count} notas)` : '● Grabar solo'}
            </button>
          )}
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      {!on && !error && (
        <p className="muted">
          Usá auriculares: si el micrófono capta el acompañamiento, el análisis se confunde. La app clasifica cada nota que tocás contra el acorde que está sonando.
        </p>
      )}
      {on && (
        <>
          <div className="challenge">
            <div>
              <span className="lbl">Reto guide tones</span>
              <b>{challenge.hits}</b> / {challenge.total} cambios <span className="muted">({pct}%)</span>
            </div>
            <p className="muted small">Tocá la 3ª o la 7ª dentro del primer tiempo de cada acorde.</p>
          </div>
          <div className="bars">
            {(Object.keys(counts) as NoteRole[]).map((r) => (
              <div key={r} className={`rbar ${r}`}>
                <span>{ROLE_LABEL[r]}</span>
                <div><i style={{ width: `${(counts[r] / total) * 100}%` }} /></div>
                <b>{Math.round((counts[r] / total) * 100)}%</b>
              </div>
            ))}
          </div>
          <ol className="feed">
            {feed.map((p) => (
              <li key={p.id} className={p.role}>
                <b>{p.name}</b>
                <span>{p.role === 'chord' ? p.degree : prettyDegree(p.degree)}</span>
                {p.guide && <em>GT</em>}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
