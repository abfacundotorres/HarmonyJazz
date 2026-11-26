import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import { MAX_TUNES, UserTune, validateTune } from '../../content/library';
import { docLayout } from '../../content/chartDoc';
import { lineaGuideTones, melodiaGuideTones } from '../../content/guideTones';
import { melodyNotes, sliceMelody } from '../../content/melody';
import { PROGRESSIONS, Progression } from '../../content/progressions';
import { localizeNotes } from '../../exercises/localize';
import { ChorusTranscription, RawEvent, transcribe } from '../../pitch/transcribe';
import {
  barLen, beatsPerBar, Chart, keyInterval, parseChart, semitoneInterval, sliceChart, transposeChart,
} from '../../theory/chart';
import { Atril } from '../components/Atril';
import { TakeAudio } from '../components/TakeAudio';
import { ChordBoard, CurrentChord } from '../components/ChordInfo';
import { FichaAcordes } from '../components/FichaAcordes';
import { LineaGuiaTones } from '../components/LineaGuiaTones';
import { TemasParecidos } from '../components/TemasParecidos';
import { MapaArmonico } from '../components/MapaArmonico';
import { QuizAcordes } from '../components/QuizAcordes';
import { PracticaTramos } from '../components/PracticaTramos';
import { alternarFloja, flojosDentro, sumarFlojos, secciones as seccionesDe, sonados, tramoSiguiente, tramosFlojos } from '../../content/flojos';
import type { Flojos } from '../../content/flojos';
import { MEMORIA_MODOS, type MemoriaModo, memoriaNivel, siguienteModo } from '../../content/memoria';
import { KeySelect } from '../components/KeySelect';
import { ListenPanel } from '../components/ListenPanel';
import { MelodyPanel } from '../components/MelodyPanel';
import { Player } from '../components/Player';
import { Transcription } from '../components/Transcription';
import { navigate, useReading, usePersistentLibrary, useRepertorio, useRoute, useSettings, useTemaEstudio, useTemasDeRepertorio } from '../hooks';
import { todosLosTemas } from '../todosLosTemas';
import { consignaToma } from '../../content/toma';
import { detalleDe, logrado, PASO_GRABADO } from '../../content/repertorio';
import { COROS_TOMA_INICIAL } from '../../content/toma';
import { dayNum } from '../../state/progress';
import { TomaCompleta } from '../components/TomaCompleta';
import { agregarTema } from '../components/MisTemas';
import type { PlayerControl } from '../components/Player';
import { usePersistent } from '../../state/storage';
import { usePosition } from '../usePosition';

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
  const [library, setLibrary] = usePersistentLibrary();

  // temas propios: se validan al leerlos, por si el almacenamiento tiene datos dañados
  const tunes = useMemo(
    () => (library.tunes ?? []).map((t) => validateTune(t)).filter((t): t is UserTune => typeof t !== 'string'),
    [library],
  );
  const all: Progression[] = useMemo(() => todosLosTemas(tunes), [tunes]);
  // sin un tema pedido en la dirección, se abre el que se está estudiando ahora (si hay)
  const [temaEstudio, setTemaEstudio] = useTemaEstudio();
  const selected = all.find((p) => p.id === (query.get('p') ?? temaEstudio.id)) ?? PROGRESSIONS[0];
  const esEstudio = temaEstudio.id === selected.id;

  const [estudioAbierto, setEstudioAbierto] = useState(query.get('estudio') === '1');
  // aviso de «Copiar a Mis temas» (aparte del de la biblioteca, para no repetirlo ni abrir esa sección)
  const [dpMsg, setDpMsg] = useState<string | null>(null);
  const [shift, setShift] = useState(0);

  const base: Pick<Progression, 'id' | 'chart' | 'key' | 'mode' | 'style' | 'tempo'> = selected;
  const baseKey = base.key;
  const key = query.get('k') ?? baseKey ?? 'C';

  const [tempo, setTempo] = useState(selected.tempo);
  const [loop, setLoop] = useState<[number, number] | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  // al cambiar de tema se reinician loop, transposición y tempo
  const lastId = useRef(base.id);
  useEffect(() => {
    if (lastId.current === base.id) return;
    lastId.current = base.id;
    setLoop(null);
    setPending(null);
    setShift(0);
    setTempo(base.tempo);
  }, [base.id, base.tempo]);

  const chart = useMemo(() => {
    try {
      let c = parseChart(base.chart);
      if (baseKey) c = transposeChart(c, keyInterval(baseKey, key));
      else if (shift) c = transposeChart(c, semitoneInterval(shift));
      return c;
    } catch {
      // un cifrado inválido no debe romper la pantalla: se vuelve a una progresión conocida
      return parseChart(PROGRESSIONS[0].chart);
    }
  }, [base.chart, baseKey, key, shift]);

  // el loop se descarta si queda fuera de la forma
  const loopValid = loop && loop[1] < chart.bars ? loop : null;
  const playChart = useMemo(() => (loopValid ? sliceChart(chart, loopValid[0], loopValid[1]) : chart), [chart, loopValid]);
  const offset = loopValid ? Math.max(0, chart.chords.findIndex((c) => c.bar >= loopValid[0])) : 0;

  // melodía de un tema propio: se transpone con el mismo intervalo que el cifrado y se recorta al tramo en loop
  const melody = useMemo(() => {
    if (!selected.melody) return undefined;
    const iv = baseKey ? keyInterval(baseKey, key) : shift ? semitoneInterval(shift) : undefined;
    const notes = melodyNotes(selected.melody, iv);
    if (!notes.length) return undefined;
    return loopValid ? sliceMelody(notes, loopValid[0], loopValid[1], barLen(chart)) : notes;
  }, [selected.melody, baseKey, key, shift, loopValid, chart]);

  const layout = useMemo(() => {
    const d = selected.doc;
    return d ? docLayout(d) : null;
  }, [selected]);
  // «Oír la línea de guide tones»: la línea suena con la trompeta sobre el acompañamiento (en lugar de la melodía del tema, si la hay)
  const [oirGuia, setOirGuia] = useState(false);
  const guiaMel = useMemo(() => {
    if (!oirGuia) return undefined;
    const notas = melodiaGuideTones(chart, lineaGuideTones(chart, layout && layout.order.length === chart.bars ? layout.order : undefined));
    return loopValid ? sliceMelody(notas, loopValid[0], loopValid[1], barLen(chart)) : notas;
  }, [oirGuia, chart, loopValid, layout]);

  const pos = usePosition();
  const control = useRef<PlayerControl | null>(null);
  // el paso «Grabado completo» de Mi repertorio se puede marcar desde la toma, si el tema está en el repertorio
  const [rep, setRep] = useRepertorio();
  const temasRep = useTemasDeRepertorio();
  const esTemaRep = temasRep.some((t) => t.id === selected.id);
  const grabadoHecho = !!rep[selected.id]?.hechos.includes(PASO_GRABADO);
  // llegar desde Mi repertorio (?toma=1) deja la tarjeta de la toma a la vista
  useEffect(() => {
    if (query.get('toma') === '1') document.querySelector('.toma')?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [atril, setAtril] = useState(false);
  const [settings] = useSettings();
  const autoAtrilRef = useRef(settings.autoAtril);
  autoAtrilRef.current = settings.autoAtril;
  const atrilRef = useRef(false);
  atrilRef.current = atril;
  // modo de memoria: la grilla se oculta (todo o de a poco); «Mirar» la muestra un rato para comprobar
  const [memo, setMemo] = usePersistent<{ modo?: MemoriaModo }>('memoria', {});
  const memoModo: MemoriaModo = memo.modo ?? 'off';
  const [mirar, setMirar] = useState(false);
  const setModo = (m: MemoriaModo) => { setMemo({ modo: m }); setMirar(false); };
  const { keyLabel, view, iv } = useReading();
  /** Los nombres y notas de las progresiones de la app están en concierto: se muestran en la lectura elegida. Los temas propios no se tocan. */
  const loc = (p: Progression, text: string) => (p.category === 'Mis temas' || p.category === 'Dominio público' ? text : localizeNotes(text, 'C', 'C', iv));
  const mine = pos && pos.owner === OWNER ? pos : null;
  const nivel = mirar ? 'todo' : memoriaNivel(memoModo, mine && mine.chorus >= 0 ? mine.chorus : -1);
  const ci = mine && !mine.countIn ? mine.chordIndex : -1;
  const chord = ci >= 0 ? playChart.chords[ci]?.chord ?? null : null;
  const next = ci >= 0 ? playChart.chords[(ci + 1) % playChart.chords.length]?.chord ?? null : null;

  // compases flojos (se guardan por tema, en índices de la grilla escrita) y bucle por sección
  const [flojosTodos, setFlojosTodos] = usePersistent<Flojos>('flojos', {});
  const [marcando, setMarcando] = useState(false);
  const [tramoFloja, setTramoFloja] = useState<[number, number] | null>(null);
  const orden = layout && layout.order.length === chart.bars ? layout.order : undefined;
  // la forma que suena, para el reto de guide tones del micrófono: cada acorde con su compás escrito y su duración
  const acordesReto = useMemo(
    () => playChart.chords.map((c) => { const b = c.bar + (loopValid ? loopValid[0] : 0); return { chord: c.chord, compas: (orden ? orden[b] : b) + 1, dur: c.dur }; }),
    [playChart, loopValid, orden],
  );
  const flojosTema = useMemo(() => flojosDentro(flojosTodos[selected.id] ?? [], orden ? Math.max(...orden) + 1 : chart.bars), [flojosTodos, selected.id, orden, chart.bars]);
  const flojosSet = useMemo(() => new Set(flojosTema), [flojosTema]);
  const tramos = useMemo(() => tramosFlojos(flojosTema), [flojosTema]);
  const secciones = useMemo(() => seccionesDe(layout), [layout]);
  useEffect(() => {
    setMarcando(false);
    setTramoFloja(null);
  }, [selected.id]);
  const loopDe = (desde: number, hasta: number) => {
    const r = sonados(desde, hasta, orden);
    if (!r) return;
    setLoop(r);
    setPending(null);
  };
  // «Practicar solo esos» desde Temas u Hoy (?flojos=1): arranca en el primer tramo flojo, una sola vez
  const flojosAbiertos = useRef(false);
  useEffect(() => {
    if (flojosAbiertos.current || query.get('flojos') !== '1' || !tramos.length) return;
    flojosAbiertos.current = true;
    setTramoFloja(tramos[0]);
    loopDe(tramos[0][0], tramos[0][1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tramos]);

  const onBarClick = (bar: number) => {
    if (marcando) {
      const w = orden ? orden[bar] : bar;
      setFlojosTodos((f) => {
        const l = alternarFloja(f[selected.id], w);
        const { [selected.id]: _viejo, ...resto } = f;
        return l.length ? { ...resto, [selected.id]: l } : resto;
      });
      return;
    }
    if (pending === null) {
      setPending(bar);
      return;
    }
    setLoop([Math.min(pending, bar), Math.max(pending, bar)]);
    setPending(null);
  };

  // ---- grabación del solo ----
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const [take, setTake] = useState<Take | null>(null);
  const [takeAudio, setTakeAudio] = useState<Blob | null>(null);
  const events = useRef<RawEvent[]>([]);
  const snapshot = useRef<Omit<Take, 'choruses'> | null>(null);

  const onEvent = useCallback((midi: number | null, time: number) => {
    const loc = engine.locate(time - (midi === null ? OFF_LATENCY_MS : ON_LATENCY_MS));
    if (!loc) return;
    events.current.push({ ...loc, midi });
    if (midi !== null) setCount((c) => c + 1);
  }, []);

  const beginRecording = () => {
    events.current = [];
    setCount(0);
    setTake(null);
    setTakeAudio(null);
    snapshot.current = { chart: playChart, keyValue: baseKey ? key : null, mode: base.mode, tempo };
    setRecording(true);
  };
  // sólo usa referencias y setters: se puede llamar desde el aviso de «terminó la toma» sin que quede un estado viejo
  const endRecording = () => {
    setRecording(false);
    const snap = snapshot.current;
    if (!snap) return;
    const choruses = transcribe(events.current, snap.chart);
    if (choruses.length) setTake({ ...snap, choruses });
  };

  // ---- toma completa: melodía, solo, melodía, con el micrófono y el acompañamiento a la vez ----
  const micRef = useRef<{ ensure: () => Promise<boolean> } | null>(null);
  const [corosToma, setCorosToma] = useState(COROS_TOMA_INICIAL);
  const [tomaActiva, setTomaActiva] = useState(false);
  const [tomaMsg, setTomaMsg] = useState('');
  const recordingRef = useRef(false);
  recordingRef.current = recording;
  const tomaRef = useRef(false);
  tomaRef.current = tomaActiva;
  const tomaArrancó = useRef(false);
  const endRef = useRef(endRecording);
  endRef.current = endRecording;

  /** Termina la toma (se acabaron los coros, se cortó o se detuvo el reproductor): corta la grabación y arma «Tu toma». */
  const cerrarToma = () => {
    tomaArrancó.current = false;
    setTomaActiva(false);
    if (recordingRef.current) endRef.current();
  };
  const onPlaying = useCallback((p: boolean) => {
    if (p) {
      tomaArrancó.current = true;
      // dar play abre el atril solo (se apaga en Más → Ajustes); si ya está abierto no hace nada
      if (autoAtrilRef.current && !atrilRef.current) setAtril(true);
    } else if (tomaRef.current && tomaArrancó.current) {
      tomaArrancó.current = false;
      setTomaActiva(false);
      if (recordingRef.current) endRef.current();
    }
  }, []);

  const empezarToma = async () => {
    setTomaMsg('');
    if (!(await micRef.current?.ensure())) {
      setTomaMsg('Necesito el micrófono: revisá el permiso del navegador y probá de nuevo.');
      return;
    }
    beginRecording();
    tomaArrancó.current = false;
    setTomaActiva(true);
    if (!(await control.current?.start(corosToma))) {
      setTomaActiva(false);
      setRecording(false);
      setTomaMsg('No se pudo iniciar el audio. Probá de nuevo.');
    }
  };
  const cortarToma = () => {
    if (control.current?.playing) control.current.toggle();
    cerrarToma();
  };

  const toggleRecording = () => {
    if (!recording) beginRecording();
    else if (tomaActiva) cortarToma();
    else endRecording();
  };

  const setQuery = (p: string, k?: string | null) => {
    const q = new URLSearchParams({ p });
    if (k) q.set('k', k);
    navigate(`/playalong?${q}`);
  };
  const changeKey = (k: string) => setQuery(selected.id, k);

  // ---- biblioteca ----
  /** Un tema de dominio público pasa a ser tuyo: se puede corregir, sumarle la melodía y llevarlo por la escalera de repertorio. */
  const copiarAMisTemas = (p: Progression) => {
    if (tunes.some((t) => t.name === p.name && t.chart === p.chart)) return setDpMsg(`«${p.name}» ya está en Mis temas.`);
    if (tunes.length >= MAX_TUNES) return setDpMsg(`Llegaste al máximo de ${MAX_TUNES} temas`);
    const r = validateTune({ name: p.name, composer: 'Tradicional', key: p.key, mode: p.mode, chart: p.chart, tempo: p.tempo, style: p.style });
    if (typeof r === 'string') return setDpMsg(r);
    setLibrary({ tunes: [...tunes, r] });
    setDpMsg(`«${p.name}» copiado a Mis temas: lo encontrás ahí y en Mi repertorio.`);
  };

  /** Un tema de la colección pasa a Mis temas (sin repetir el nombre y respetando el máximo); con `tocar`, queda elegido en el Play-along. */
  const agregarDeColeccion = (t: UserTune, tocar: boolean): { ok: boolean; mensaje: string } => {
    const v = agregarTema(tunes, t);
    if (!v.ok) return v;
    setLibrary({ tunes: [...tunes, t] });
    if (tocar) {
      setTempo(t.tempo);
      setQuery(t.id);
    }
    return { ok: true, mensaje: `«${t.name}» agregado a Mis temas${tocar ? ' y listo para tocar' : ''} (${t.chart.split('|').length} compases).` };
  };
  const nombresEnMisTemas = useMemo(() => new Map(tunes.map((t) => [t.name.toLowerCase(), t.id])), [tunes]);
  const tocarExistente = (id: string) => {
    const t = tunes.find((x) => x.id === id);
    if (!t) return;
    setTempo(t.tempo);
    setQuery(t.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showKeys = !!baseKey;

  return (
    <div className="page playalong">
      <section className="card">
        <header>
          <h2>Play-along</h2>
          <a className="button" href="#/repertorio?cargar=1">＋ Cargar un tema</a>
          <select
            value={selected.id}
            onChange={(e) => {
              const p = all.find((x) => x.id === e.target.value);
              if (!p) return;
              setDpMsg(null);
              setTempo(p.tempo);
              setQuery(p.id);
            }}
            aria-label="Tema"
          >
            {(['Fundamentos', 'Blues', 'Formas', 'Avanzado', 'Dominio público', 'Mis temas'] as const).map((cat) => {
              const items = all.filter((p) => p.category === cat);
              return items.length ? (
                <optgroup key={cat} label={cat}>
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {loc(p, p.name)}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </header>
        <p className="muted">{loc(selected, selected.notes)}</p>
        {selected.category === 'Dominio público' && (
          <p>
            <button onClick={() => copiarAMisTemas(selected)}>Copiar a Mis temas</button>
            {dpMsg && <span className="muted small" role="status"> {dpMsg}</span>}
          </p>
        )}

        {showKeys ? (
          <>
            <KeySelect value={key} onChange={changeKey} minor={base.mode === 'minor'} />
            <p className="muted small">
              {view === 'Bb'
                ? `Tocás en ${keyLabel(key)}${base.mode === 'minor' ? 'm' : ''} (escrito para Si♭); en concierto suena en ${key}${base.mode === 'minor' ? 'm' : ''}.`
                : `Tocás en ${key}${base.mode === 'minor' ? 'm' : ''} (concierto).`}
            </p>
          </>
        ) : (
          <div className="transpose">
            <span className="muted small">Transponer</span>
            <button onClick={() => setShift((s) => s - 1)} aria-label="Bajar un semitono">− ½ tono</button>
            <b>{shift === 0 ? 'original' : `${shift > 0 ? '+' : ''}${shift} semitono${Math.abs(shift) === 1 ? '' : 's'}`}</b>
            <button onClick={() => setShift((s) => s + 1)} aria-label="Subir un semitono">+ ½ tono</button>
            {shift !== 0 && <button onClick={() => setShift(0)}>Volver al original</button>}
          </div>
        )}

        <Player
          chart={playChart}
          tempo={tempo}
          onTempo={setTempo}
          style={base.style}
          melody={oirGuia ? guiaMel : melody}
          allowMelody={!oirGuia && !!melody}
          oirLinea={oirGuia ? true : undefined}
          owner={OWNER}
          label={loc(selected, selected.name)}
          href={`#/playalong?${new URLSearchParams({ p: selected.id, ...(baseKey ? { k: key } : {}) })}`}
          defaultMetronome={query.get('m') === '1'}
          controlRef={control}
          onPlayingChange={onPlaying}
        />
        <p>
          <button onClick={() => setAtril(true)}>🎼 Modo atril (pantalla grande)</button>
        </p>
        <p>
          <button className={esEstudio ? 'on' : ''} aria-pressed={esEstudio} onClick={() => setTemaEstudio(() => (esEstudio ? {} : { id: selected.id }))}>
            📌 {esEstudio ? 'Es tu tema en estudio · dejar de estudiarlo' : 'Estudiar este tema ahora'}
          </button>
        </p>
      </section>

      <section className="card tablero">
        <div className="loopbar" role="status">
          {loopValid ? (
            <>
              <b>Loop: compases {loopValid[0] + 1}–{loopValid[1] + 1}</b>
              <button onClick={() => { setLoop(null); setPending(null); }}>Quitar loop</button>
            </>
          ) : pending !== null ? (
            <span className="muted small">Inicio en el compás {pending + 1}. Tocá el compás final (puede ser el mismo).</span>
          ) : (
            <span className="muted small">Tocá un compás para marcar el inicio de un loop y otro para el final.</span>
          )}
          {pending !== null && <button onClick={() => setPending(null)}>Cancelar</button>}
        </div>
        <ChordBoard chart={chart} current={ci >= 0 ? ci + offset : -1} loop={loopValid} pending={pending} onBarClick={onBarClick} layout={layout} memory={nivel} flojos={flojosSet} />
        {selected.listen && <p className="muted small">Escuchá: {selected.listen.join(' · ')}</p>}
      </section>

      {selected.category === 'Mis temas' && (() => {
        const tune = tunes.find((t) => t.id === selected.id);
        return tune ? <MelodyPanel tune={tune} onSave={(m) => setLibrary({ tunes: tunes.map((t) => (t.id === tune.id ? { ...t, melody: m } : t)) })} /> : null;
      })()}

      {atril && (
        <Atril
          title={loc(selected, selected.name)}
          keyLabel={baseKey ? keyLabel(key) : null}
          chart={chart}
          layout={layout}
          current={ci >= 0 ? ci + offset : -1}
          pos={mine}
          loop={loopValid}
          tempo={tempo}
          onTempo={setTempo}
          playing={!!mine && mine.chorus >= 0}
          onToggle={() => control.current?.toggle()}
          onClose={() => setAtril(false)}
          memory={nivel}
          memoryMode={memoModo}
          onMemoryMode={() => setModo(siguienteModo(memoModo))}
          peek={mirar}
          onPeek={() => setMirar((v) => !v)}
          transpose={showKeys ? { kind: 'key', value: key, minor: base.mode === 'minor', onChange: changeKey } : { kind: 'shift', shift, onShift: (d) => setShift((s) => s + d), onReset: () => setShift(0) }}
          consigna={tomaActiva ? consignaToma(corosToma, mine ? (mine.countIn ? -1 : mine.chorus) : -1) : null}
          keyValue={baseKey ? key : null}
          minor={base.mode === 'minor'}
          oirGuia={oirGuia}
          onOirGuia={() => setOirGuia((v) => !v)}
        />
      )}

      <div className="grid2">
        {nivel === 'todo' ? (
          <CurrentChord chord={chord} next={next} />
        ) : (
          <div className="current empty">
            <div className="sym">—</div>
            <p className="muted">Modo de memoria: el acorde, la escala y los guide tones están ocultos. «Mirar» los muestra.</p>
          </div>
        )}
        <ListenPanel
          acordes={acordesReto}
          chord={chord}
          chordIndex={ci}
          chorus={mine?.chorus ?? 0}
          tempo={tempo}
          micRef={micRef}
          onMarcarFlojos={(cs) => setFlojosTodos((f) => ({ ...f, [selected.id]: sumarFlojos(f[selected.id], cs) }))}
          recorder={{ recording, toggle: toggleRecording, onEvent, count, onAudio: setTakeAudio }}
        />
      </div>

      {recording && !engine.playing && (
        <p className="card muted">Grabando: dale play al acompañamiento y tocá. Las notas se ubican en la forma según el tiempo del play-along.</p>
      )}
      {takeAudio && !recording && (
        <TakeAudio blob={takeAudio} name={selected.name} onDiscard={() => setTakeAudio(null)}>
          {esTemaRep && (
            grabadoHecho
              ? <span className="muted small">✓ «Grabado completo» marcado en Mi repertorio{detalleDe(rep[selected.id], PASO_GRABADO).bpm ? ` (${detalleDe(rep[selected.id], PASO_GRABADO).bpm} bpm)` : ''}</span>
              : <button onClick={() => setRep((r) => logrado(r, selected.id, PASO_GRABADO, dayNum(), { bpm: tempo, key: baseKey ? key : undefined }))}>✓ Marcar «Grabado completo» en Mi repertorio ({tempo} bpm)</button>
          )}
        </TakeAudio>
      )}
      {take && (
        <Transcription
          chart={take.chart}
          choruses={take.choruses}
          keyValue={take.keyValue}
          mode={take.mode}
          tempo={take.tempo}
          style={base.style}
          onClear={() => setTake(null)}
        />
      )}

      <details className="card estudio-tema" open={estudioAbierto} onToggle={(e) => e.target === e.currentTarget && setEstudioAbierto((e.target as HTMLDetailsElement).open)}>
        <summary>
          <h3>
            📖 Estudiar este tema
            {memoModo !== 'off' && <span className="muted small"> · de memoria: {MEMORIA_MODOS.find((m) => m.id === memoModo)?.label}</span>}
          </h3>
        </summary>
        <div className="memoria" role="group" aria-label="Modo de memoria">
          <span className="muted small">🧠 De memoria</span>
          <div className="seg">
            {MEMORIA_MODOS.map((m) => (
              <button key={m.id} className={memoModo === m.id ? 'on' : ''} aria-pressed={memoModo === m.id} onClick={() => setModo(m.id)}>{m.label}</button>
            ))}
          </div>
          {memoModo !== 'off' && <button className={mirar ? 'on' : ''} aria-pressed={mirar} onClick={() => setMirar((v) => !v)}>👁 Mirar</button>}
        </div>
        {memoModo !== 'off' && <p className="muted small">{MEMORIA_MODOS.find((m) => m.id === memoModo)?.texto}</p>}
        <PracticaTramos
          secciones={secciones}
          loop={loopValid}
          onSeccion={(s) => { setTramoFloja(null); loopDe(s.desde, s.hasta); }}
          flojos={{ cuantos: flojosTema.length, tramos }}
          marcando={marcando}
          onMarcando={() => setMarcando((m) => !m)}
          onRecorrer={() => {
            const t = tramoSiguiente(tramos, tramoFloja);
            if (!t) return;
            setTramoFloja(t);
            loopDe(t[0], t[1]);
          }}
          onBorrar={() => {
            if (!window.confirm('¿Borrar las marcas de compases flojos de este tema?')) return;
            setFlojosTodos((f) => {
              const { [selected.id]: _viejo, ...resto } = f;
              return resto;
            });
            setTramoFloja(null);
          }}
          tramoActual={tramoFloja}
        />
        <LineaGuiaTones chart={chart} layout={layout} keyValue={baseKey ? key : null} minor={base.mode === 'minor'} compasActual={mine && !mine.countIn && mine.bar >= 0 ? mine.bar + (loopValid ? loopValid[0] : 0) : -1} notaActual={ci >= 0 ? ci + offset : -1} oir={oirGuia} onOir={() => setOirGuia((v) => !v)} />
        <FichaAcordes chart={chart} layout={layout} />
        <TemasParecidos chart={chart} titulo={selected.name} existentes={nombresEnMisTemas} onAgregar={agregarDeColeccion} onTocar={tocarExistente} />
        <MapaArmonico
          chart={chart}
          layout={layout}
          keyValue={baseKey ? key : null}
          minor={base.mode === 'minor'}
          onLoop={(a, b) => { setLoop([a, b]); setPending(null); }}
        />
        <QuizAcordes
          chart={chart}
          memoModo={memoModo}
          onOcultar={() => setModo('oculto')}
          onMarcarFloja={(bar) => {
            const w = orden ? orden[bar] : bar;
            setFlojosTodos((f) => (f[selected.id]?.includes(w) ? f : { ...f, [selected.id]: alternarFloja(f[selected.id], w) }));
          }}
        />
      </details>

      <TomaCompleta
        activa={tomaActiva}
        coros={corosToma}
        onCoros={setCorosToma}
        coro={mine ? (mine.countIn ? -1 : mine.chorus) : -1}
        compases={playChart.bars}
        pulsosPorCompas={beatsPerBar(playChart)}
        tempo={tempo}
        abierta={query.get('toma') === '1'}
        mensaje={tomaMsg}
        onEmpezar={() => void empezarToma()}
        onCortar={cortarToma}
      />
    </div>
  );
}
