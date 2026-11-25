import { useEffect, useMemo, useState } from 'react';
import { alternarTonalidad, type Avance, BPM, detalleDe, estadoTema, fijarBpm, llegoAlTempo, logrados, marcar, ordenarTemas, PASOS, repasoRepertorio, resumenAvance, siguientePaso, tocado, UMBRAL } from '../../content/repertorio';
import { dayNum } from '../../state/progress';
import { CONCERT_KEYS } from '../../theory/chart';
import { useMonth, usePersistentLibrary, useReading, useRepertorio, useRoute, useTemaEstudio } from '../hooks';
import { MisTemas } from '../components/MisTemas';
import { QueEstudiar } from '../components/QueEstudiar';
import { TemaEjercicios } from '../components/TemaEjercicios';
import { progresionDeTema } from '../progresionDeTema';
import { temasDeRepertorio } from '../repertorioTemas';

const hace = (d: number) => (d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`);

const ESTADO_TXT = { sin: 'Sin empezar', aprendiendo: 'Aprendiendo', terminado: '✓ Terminado' } as const;

/**
 * Temas: todos los temas que estás aprendiendo en un solo lugar. Arriba el tema en estudio; después la lista (aprendiendo, sin
 * empezar, terminados) con su estado, y de cada uno la escalera de siete pasos plegada. «Terminado» = los siete pasos tildados.
 */
export function Repertorio() {
  const [rep, setRep] = useRepertorio();
  const [lib] = usePersistentLibrary();
  const [mp] = useMonth();
  const [estudio, setEstudio] = useTemaEstudio();
  // «＋ Cargar un tema» (o ?cargar=1 desde el Play-along): abre Mis temas y lo lleva a la vista
  const [cargarSenal, setCargarSenal] = useState(0);
  const hoy = dayNum();
  const today = useMemo(() => new Date(), []);
  const { temas, delMes } = useMemo(() => temasDeRepertorio(lib, mp, today), [lib, mp, today]);
  const { query } = useRoute();
  // el orden se fija al abrir la pantalla: si no, un tema saltaría de lugar cada vez que se tilda un paso
  const [repInicial] = useState(rep);
  const lista = useMemo(() => ordenarTemas(temas, repInicial, estudio.id), [temas, repInicial, estudio.id]);
  // el tempo de cada tema (el de la forma o el que se cargó), para saber si «de memoria» ya llegó
  const tempos = useMemo(() => new Map(temas.map((t) => [t.id, progresionDeTema(t.id, lib)?.tempo])), [temas, lib]);
  const repaso = useMemo(() => new Map(repasoRepertorio(rep, temas.map((t) => t.id), hoy).map((p) => [p.id, p.dias])), [rep, temas, hoy]);
  const resumen = useMemo(() => {
    const c = { aprendiendo: 0, sin: 0, terminado: 0 };
    for (const t of temas) c[estadoTema(rep[t.id])]++;
    return c;
  }, [temas, rep]);

  return (
    <div className="page repertorio">
      <section className="card">
        <header>
          <h2>Temas</h2>
          <button onClick={() => setCargarSenal((n) => n + 1)}>＋ Cargar un tema</button>
        </header>
        <p className="muted">
          Todos tus temas en un solo lugar; el que marcás «Estudiar este» queda arriba y en Hoy. Cada uno tiene siete pasos, de saber la forma a tenerlo grabado; cuando están los siete queda <b>terminado</b> y la app te avisa cuándo repasarlo. Más abajo cargás temas nuevos (Mis temas) y buscás en tu colección.
        </p>
        {temas.length > 0 && (
          <p className="small" role="status">
            {resumen.aprendiendo} aprendiendo · {resumen.sin} sin empezar · {resumen.terminado} {resumen.terminado === 1 ? 'terminado' : 'terminados'}
          </p>
        )}
      </section>

      {temas.length === 0 && (
        <section className="card">
          <p>Todavía no cargaste ningún tema. Cargá el cifrado de un standard de tu libro en «Mis temas» (más abajo) y aparece acá.</p>
        </section>
      )}

      {lista.map((t) => (
        <TemaCard
          key={t.id}
          t={t}
          avance={rep[t.id]}
          hoy={hoy}
          delMes={t.id === delMes}
          enEstudio={t.id === estudio.id}
          inicial={t.id === estudio.id || estadoTema(repInicial[t.id]) === 'aprendiendo'}
          diasSinTocar={repaso.get(t.id)}
          tempoTema={tempos.get(t.id)}
          setRep={setRep}
          onEstudiar={() => setEstudio(() => ({ id: t.id }))}
          onDejar={() => setEstudio(() => ({}))}
          query={query}
          lib={lib}
        />
      ))}

      <MisTemas buscar={query.get('buscar') ?? ''} cargarSenal={cargarSenal + (query.get('cargar') === '1' ? 1 : 0)} />

      <QueEstudiar tunes={lib.tunes} />
    </div>
  );
}

/** Un tema: nombre, estado, avance y atajos; los siete pasos (con tempo, tonalidades y ejercicios) van plegados. */
function TemaCard({ t, avance: a, hoy, delMes, enEstudio, inicial, diasSinTocar, tempoTema, setRep, onEstudiar, onDejar, query, lib }: {
  t: { id: string; name: string };
  avance: Avance | undefined;
  hoy: number;
  delMes: boolean;
  enEstudio: boolean;
  /** Si los pasos arrancan abiertos (el tema en estudio y los que se están aprendiendo). */
  inicial: boolean;
  diasSinTocar: number | undefined;
  tempoTema: number | undefined;
  setRep: ReturnType<typeof useRepertorio>[1];
  onEstudiar: () => void;
  onDejar: () => void;
  query: URLSearchParams;
  lib: { tunes?: unknown[] };
}) {
  const { keyLabel } = useReading();
  const [abierto, setAbierto] = useState(inicial || query.get('t') === t.id);
  const n = logrados(a);
  const sig = siguientePaso(a);
  const res = resumenAvance(a);
  const estado = estadoTema(a);
  return (
    <section className="card tema" aria-label={t.name}>
      <header>
        <h3>{t.name}</h3>
        <span className={`estado estado-${estado}`}>{ESTADO_TXT[estado]}</span>
        {delMes && <span className="muted small">Tema del mes</span>}
        {enEstudio && <span className="muted small">En estudio</span>}
      </header>
      <progress max={PASOS.length} value={n} aria-label={`Pasos logrados de ${t.name}`} />
      <p className="small">
        {n} de {PASOS.length} pasos · {a && a.ultimo > 0 ? `lo tocaste ${hace(hoy - a.ultimo)}` : 'todavía no lo tocaste'}
        {sig !== null ? ` · sigue: ${PASOS[sig].titulo}` : ' · ¡completo!'}
      </p>
      {diasSinTocar !== undefined && (
        <p className="small" role="status">
          ⏰ Toca repasarlo: hace {diasSinTocar} días que no lo tocás (cada {estado === 'terminado' ? UMBRAL.completo : UMBRAL.aprendiendo} días).
        </p>
      )}
      <div className="row">
        <a className="button primary" href={`#/playalong?p=${encodeURIComponent(t.id)}`}>Abrir en el play-along</a>
        {enEstudio && <a className="button" href={`#/playalong?p=${encodeURIComponent(t.id)}&estudio=1`}>Estudiarlo</a>}
        {!enEstudio && estado !== 'terminado' && <button onClick={onEstudiar}>Estudiar este</button>}
        {enEstudio && <button onClick={onDejar}>Dejar de estudiarlo</button>}
        <button onClick={() => setRep((r) => tocado(r, t.id, dayNum()))}>Lo toqué hoy</button>
      </div>
      <details className="pasos-det" open={abierto} onToggle={(e) => e.target === e.currentTarget && setAbierto((e.target as HTMLDetailsElement).open)}>
        <summary>Los {PASOS.length} pasos{estado === 'terminado' ? ' (completos)' : ''}</summary>
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
                tempoTema={p.id === 'memoria' ? tempoTema : undefined}
                onBpm={(v) => setRep((r) => fijarBpm(r, t.id, i, v, dayNum()))}
                onKey={(k) => setRep((r) => alternarTonalidad(r, t.id, i, k, dayNum()))}
              />
            </li>
          ))}
        </ol>
        <Ejercicios id={t.id} lib={lib} abrir={query.get('t') === t.id} ex={query.get('t') === t.id ? query.get('ex') : null} k={query.get('t') === t.id ? query.get('k') : null} />
      </details>
    </section>
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
