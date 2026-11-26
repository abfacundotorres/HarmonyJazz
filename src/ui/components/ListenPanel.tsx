import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import { cerrar, compasesFallados, cuenta, dondeFallo, nota, retoNuevo, ventanaNueva, type Ventana } from '../../content/retoGuideTones';
import { analyzePc, Chord, chordSymbol, NoteRole, prettyDegree, transposeChord } from '../../theory/chords';
import { BB_TRUMPET, midiName, mod } from '../../theory/notes';
import { listen, MicListener } from '../../pitch/mic';
import { useReading } from '../hooks';
import { ChordText } from './ChordInfo';

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

/** Un acorde de la forma que suena, para el reto de guide tones: el acorde, su compás escrito y cuánto dura (corcheas). */
export interface AcordeReto {
  chord: Chord;
  compas: number;
  dur: number;
}

/**
 * Escucha al trompetista mientras suena el play-along:
 * clasifica cada nota contra el acorde actual y lleva el reto de guide tones (la 3.ª o la 7.ª de cada acorde, antes de que cambie).
 */
export function ListenPanel({
  chord,
  chordIndex,
  chorus,
  tempo,
  acordes,
  recorder,
  micRef,
  onMarcarFlojos,
}: {
  /** La forma que suena, en orden: da el resultado del reto acorde por acorde. */
  acordes: AcordeReto[];
  chord: Chord | null;
  chordIndex: number;
  chorus: number;
  tempo: number;
  /** Si está, se muestra el botón de grabar y se le pasan las notas con su tiempo. */
  /** Para que otra parte de la pantalla (la toma completa) pida el micrófono encendido. */
  micRef?: MutableRefObject<{ ensure: () => Promise<boolean> } | null>;
  /** Si está, tras el reto se ofrece marcar como flojos los compases donde falló (el tema tiene que estar guardado). Recibe compases 0-based de la grilla escrita. */
  onMarcarFlojos?: (compases: number[]) => void;
  recorder?: { recording: boolean; toggle: () => void; onEvent: (midi: number | null, time: number) => void; count: number; /** Recibe el audio de la toma cuando termina. */ onAudio?: (b: Blob) => void };
}) {
  const { iv } = useReading();
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<Played[]>([]);
  const [counts, setCounts] = useState<Record<NoteRole, number>>({ chord: 0, tension: 0, scale: 0, chromatic: 0 });
  const [reto, setReto] = useState(() => retoNuevo(acordes.length));
  const mic = useRef<MicListener | null>(null);
  const chordRef = useRef<Chord | null>(chord);
  const recRef = useRef(recorder);
  recRef.current = recorder;
  const windowRef = useRef<Ventana | null>(null);
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;
  const acordesRef = useRef(acordes);
  acordesRef.current = acordes;
  const idRef = useRef(0);

  chordRef.current = chord;

  // otra forma (otro tema, otra tonalidad, otro tramo en loop): el reto empieza de nuevo
  useEffect(() => {
    windowRef.current = null;
    setReto(retoNuevo(acordes.length));
  }, [acordes]);

  // cada cambio de acorde cierra la ventana del anterior (acierto, fallo o silencio) y abre la del nuevo: dura lo que dura el acorde
  useEffect(() => {
    const anterior = windowRef.current;
    windowRef.current = null;
    if (anterior) setReto((r) => cerrar(r, anterior));
    if (!on || chordIndex < 0) return;
    windowRef.current = ventanaNueva(chordIndex, performance.now(), acordesRef.current[chordIndex]?.dur ?? 8, tempoRef.current);
  }, [chordIndex, chorus, on]);

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
          const nombre = midiName(written, false);
          setReto((r) => nota(r, windowRef.current, time, nombre, a.guide));
        },
      );
      setOn(true);
    } catch (e) {
      setError('No pude acceder al micrófono. Revisá los permisos del navegador.');
      console.error(e);
    }
  };

  if (micRef) micRef.current = { ensure: async () => { if (!mic.current) await start(); return !!mic.current; } };

  const stop = () => {
    mic.current?.stop();
    mic.current = null;
    setOn(false);
  };

  const reset = () => {
    setFeed([]);
    setCounts({ chord: 0, tension: 0, scale: 0, chromatic: 0 });
    windowRef.current = null;
    setReto(retoNuevo(acordesRef.current.length));
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const c = cuenta(reto);
  const etiquetas = acordes.map((a) => ({ compas: a.compas, acorde: chordSymbol(transposeChord(a.chord, iv), true) }));
  const fallos = dondeFallo(reto, etiquetas);
  const falladosCompases = compasesFallados(reto, acordes);
  // los compases ya marcados en este reto (para no ofrecerlo dos veces)
  const [marcados, setMarcados] = useState('');

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
              <b>{c.aciertos}</b> / {c.aciertos + c.fallos} acordes <span className="muted">({c.porcentaje}%)</span>
              {c.silencios > 0 && <span className="muted small"> · {c.silencios} sin tocar</span>}
            </div>
            <p className="muted small">Tocá la 3.ª o la 7.ª de cada acorde (la que quieras) antes de que cambie.</p>
            <ol className="reto-mapa" aria-label="Resultado por acorde">
              {acordes.map((a, i) => (
                <li key={i} className={`reto ${reto.estados[i]}${i === chordIndex ? ' ahora' : ''}`}>
                  <span className="n">{a.compas}</span>
                  <span className="s"><ChordText chord={a.chord} /></span>
                  <span className="m">{reto.estados[i] === 'acierto' ? `✓ ${reto.notas[i] ?? ''}` : reto.estados[i] === 'fallo' ? `✗ ${reto.notas[i] ?? ''}` : reto.estados[i] === 'silencio' ? '–' : ''}</span>
                </li>
              ))}
            </ol>
            {fallos.length > 0 && <p className="small" role="status">Te trabaste en: {fallos.join('; ')}.</p>}
            {fallos.length > 0 && onMarcarFlojos && (
              <p>
                <button
                  disabled={marcados === falladosCompases.join(',')}
                  onClick={() => {
                    onMarcarFlojos(falladosCompases);
                    setMarcados(falladosCompases.join(','));
                  }}
                >
                  {marcados === falladosCompases.join(',') ? '⚑ Marcados como flojos' : `⚑ Marcar ${falladosCompases.length === 1 ? 'ese compás' : `esos ${falladosCompases.length} compases`} como flojos`}
                </button>
              </p>
            )}
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
