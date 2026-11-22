import { useEffect, useMemo, useState } from 'react';
import { alternarTonalidad, type Avance, BPM, detalleDe, fijarBpm, llegoAlTempo, logrados, marcar, PASOS, resumenAvance, siguientePaso, tocado } from '../../content/repertorio';
import { dayNum } from '../../state/progress';
import { CONCERT_KEYS } from '../../theory/chart';
import { useMonth, usePersistentLibrary, useReading, useRepertorio, useRoute } from '../hooks';
import { TemaEjercicios } from '../components/TemaEjercicios';
import { progresionDeTema } from '../progresionDeTema';
import { temasDeRepertorio } from '../repertorioTemas';

const hace = (d: number) => (d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`);

/** Mi repertorio: la escalera de siete pasos de cada tema que estás aprendiendo, con la fecha de la última vez que lo tocaste. */
export function Repertorio() {
  const [rep, setRep] = useRepertorio();
  const [lib] = usePersistentLibrary();
  const [mp] = useMonth();
  const hoy = dayNum();
  const today = useMemo(() => new Date(), []);
  const { temas, delMes } = useMemo(() => temasDeRepertorio(lib, mp, today), [lib, mp, today]);
  const { query } = useRoute();
  const { keyLabel } = useReading();
  // el tempo de cada tema (el de la forma o el que se cargó), para saber si «de memoria» ya llegó
  const tempos = useMemo(() => new Map(temas.map((t) => [t.id, progresionDeTema(t.id, lib)?.tempo])), [temas, lib]);

  return (
    <div className="page repertorio">
      <section className="card">
        <h2>Mi repertorio</h2>
        <p className="muted">
          Cada tema que estás aprendiendo tiene siete pasos, de saber la forma a tenerlo grabado. Tildá lo que ya te sale; la app te avisa cuando hace una semana que no lo tocás. Los temas son los de Play-along → Mis temas, y el tema del mes de la currícula.
        </p>
      </section>

      {temas.length === 0 && (
        <section className="card">
          <p>Todavía no cargaste ningún tema. Cargá el cifrado de un standard de tu libro en Play-along → Mis temas y aparece acá.</p>
          <p>
            <a className="button primary" href="#/playalong">Ir a Play-along</a>
          </p>
        </section>
      )}

      {temas.map((t) => {
        const a = rep[t.id];
        const n = logrados(a);
        const sig = siguientePaso(a);
        const res = resumenAvance(a);
        return (
          <section key={t.id} className="card tema" aria-label={t.name}>
            <header>
              <h3>{t.name}</h3>
              {t.id === delMes && <span className="muted small">Tema del mes</span>}
            </header>
            <progress max={PASOS.length} value={n} aria-label={`Pasos logrados de ${t.name}`} />
            <p className="small">
              {n} de {PASOS.length} pasos · {a && a.ultimo > 0 ? `lo tocaste ${hace(hoy - a.ultimo)}` : 'todavía no lo tocaste'}
              {sig !== null ? ` · sigue: ${PASOS[sig].titulo}` : ' · ¡completo!'}
            </p>
            {(res.mejorBpm !== null || res.tonalidades.length > 0) && (
              <p className="small" data-testid="resumen-tema">
                {res.mejorBpm !== null && <>Mejor tempo anotado: <b>{res.mejorBpm} bpm</b></>}
                {res.mejorBpm !== null && res.tonalidades.length > 0 && ' · '}
                {res.tonalidades.length > 0 && <>Tonalidades tocadas: <b>{res.tonalidades.length} de 12</b> ({res.tonalidades.map(keyLabel).join(', ')})</>}
              </p>
            )}
            <ol className="pasos">
              {PASOS.map((p, i) => (
                <li key={p.id} className={sig === i ? 'next' : ''}>
                  <label>
                    <input type="checkbox" checked={!!a?.hechos.includes(i)} onChange={() => setRep((r) => marcar(r, t.id, i, dayNum()))} aria-label={`${t.name}: ${p.titulo}`} /> <b>{p.titulo}</b>
                  </label>
                  <small className="muted">{p.ayuda}</small>
                  {p.id === 'grabado' && (
                    <a className="small" href={`#/playalong?p=${encodeURIComponent(t.id)}&toma=1`}>● Grabar una toma completa de este tema →</a>
                  )}
                  <PasoDetalle
                    paso={p.titulo}
                    tema={t.name}
                    avance={a}
                    indice={i}
                    visible={!!a?.hechos.includes(i) || sig === i}
                    tempoTema={p.id === 'memoria' ? tempos.get(t.id) : undefined}
                    onBpm={(v) => setRep((r) => fijarBpm(r, t.id, i, v, dayNum()))}
                    onKey={(k) => setRep((r) => alternarTonalidad(r, t.id, i, k, dayNum()))}
                  />
                </li>
              ))}
            </ol>
            <div className="row">
              <button onClick={() => setRep((r) => tocado(r, t.id, dayNum()))}>Lo toqué hoy</button>
              <a className="button" href={`#/playalong?p=${encodeURIComponent(t.id)}`}>Abrir en el play-along</a>
            </div>
            <Ejercicios id={t.id} lib={lib} abrir={query.get('t') === t.id} ex={query.get('t') === t.id ? query.get('ex') : null} k={query.get('t') === t.id ? query.get('k') : null} />
          </section>
        );
      })}
    </div>
  );
}

/** Los ejercicios de un tema (si el tema se puede armar). Con `?t=&ex=&k=` se abre ese ejercicio en esa tonalidad. */
function Ejercicios({ id, lib, abrir, ex, k }: { id: string; lib: { tunes?: unknown[] }; abrir: boolean; ex: string | null; k: string | null }) {
  const prog = useMemo(() => progresionDeTema(id, lib), [id, lib]);
  // la clave hace que un enlace nuevo (otro ejercicio o tonalidad) rearme la tarjeta aunque la pantalla ya esté abierta
  return prog ? <TemaEjercicios key={`${abrir}|${ex}|${k}`} prog={prog} abierto={abrir} ejInicial={ex} keyInicial={k} /> : null;
}

/** Un casillero de tempo: se escribe el número y se confirma al salir del campo o con Enter; vacío lo borra. */
function BpmInput({ value, onChange, label }: { value: number | undefined; onChange: (v: number | null) => void; label: string }) {
  const [texto, setTexto] = useState(value === undefined ? '' : String(value));
  useEffect(() => setTexto(value === undefined ? '' : String(value)), [value]);
  const confirmar = () => {
    if (texto.trim() === '') return value === undefined ? undefined : onChange(null);
    const v = Math.round(Number(texto));
    if (Number.isFinite(v)) onChange(v);
    else setTexto(value === undefined ? '' : String(value));
  };
  return (
    <input
      type="number" inputMode="numeric" min={BPM.min} max={BPM.max} value={texto} placeholder="bpm" aria-label={label}
      onChange={(e) => setTexto(e.target.value)} onBlur={confirmar} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

/** Lo que se anota de un paso: a qué tempo salió y en qué tonalidades. Un renglón resumen y, plegado, para anotarlo. */
function PasoDetalle({ paso, tema, avance, indice, visible, tempoTema, onBpm, onKey }: {
  paso: string;
  tema: string;
  avance: Avance | undefined;
  indice: number;
  /** Se anota en los pasos ya tildados y en el que sigue; en los demás sólo si ya tienen algo anotado. */
  visible: boolean;
  /** Sólo para «De memoria, a tempo»: el tempo del tema. */
  tempoTema?: number;
  onBpm: (v: number | null) => void;
  onKey: (k: string) => void;
}) {
  const { keyLabel } = useReading();
  const d = detalleDe(avance, indice);
  const hay = d.bpm !== undefined || d.keys.length > 0;
  if (!visible && !hay) return null;
  return (
    <>
      {hay && (
        <small className="paso-resumen">
          {d.bpm !== undefined && <>♩ {d.bpm} bpm</>}
          {d.bpm !== undefined && d.keys.length > 0 && ' · '}
          {d.keys.length > 0 && <>en {d.keys.map(keyLabel).join(', ')}</>}
          {tempoTema !== undefined && d.bpm !== undefined && (llegoAlTempo(d.bpm, tempoTema) ? ` · ✓ llegaste al tempo del tema (${tempoTema})` : ` · faltan ${tempoTema - d.bpm} bpm para el tempo del tema (${tempoTema})`)}
        </small>
      )}
      <details className="pasodet">
        <summary>Tempo y tonalidades</summary>
        <label className="small">
          Tempo al que te salió{' '}
          <BpmInput value={d.bpm} onChange={onBpm} label={`Tempo del paso ${paso} de ${tema}`} />
          {tempoTema !== undefined && <span className="muted"> (tempo del tema: {tempoTema} bpm)</span>}
        </label>
        <div className="row" role="group" aria-label={`Tonalidades del paso ${paso} de ${tema}`}>
          {CONCERT_KEYS.map((k) => (
            <button key={k} className={d.keys.includes(k) ? 'on' : ''} aria-pressed={d.keys.includes(k)} onClick={() => onKey(k)} title={`Concierto: ${k}`}>
              {keyLabel(k)}
            </button>
          ))}
        </div>
        <p className="muted small">Las tonalidades se leen como el resto de la app (Si♭ o concierto). Tocá las que ya tocaste.</p>
      </details>
    </>
  );
}
