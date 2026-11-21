import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import {
  Library, MAX_TUNES, normalizeChartText, parseImport, tuneToProgression, UserTune, validateTune,
} from '../../content/library';
import { ChartDoc, compileDoc, docFromChart, docLayout, emptyBar } from '../../content/chartDoc';
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
import { MEMORIA_MODOS, type MemoriaModo, memoriaNivel, siguienteModo } from '../../content/memoria';
import { KeySelect } from '../components/KeySelect';
import { ListenPanel } from '../components/ListenPanel';
import { MelodyPanel } from '../components/MelodyPanel';
import { Player } from '../components/Player';
import { Transcription } from '../components/Transcription';
import { Draft, EMPTY_DRAFT, TuneLibrary } from '../components/TuneLibrary';
import { navigate, useReading, usePersistentLibrary, useRepertorio, useRoute, useTemasDeRepertorio } from '../hooks';
import { marcar, PASO_GRABADO } from '../../content/repertorio';
import { COROS_TOMA_INICIAL } from '../../content/toma';
import { dayNum } from '../../state/progress';
import { TomaCompleta } from '../components/TomaCompleta';
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
  const all: Progression[] = useMemo(() => [...PROGRESSIONS, ...tunes.map(tuneToProgression)], [tunes]);
  const selected = all.find((p) => p.id === query.get('p')) ?? PROGRESSIONS[0];

  // progresión propia sin guardar ("probar")
  const [custom, setCustom] = useState('');
  // grilla del editor (null = el usuario eligió escribir texto); `custom` es siempre lo que se toca
  const [doc, setDocState] = useState<ChartDoc | null>({ bars: [emptyBar()] });
  const [docError, setDocError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const setDoc = (d: ChartDoc | null) => {
    setDocState(d);
    if (!d) return setDocError(null);
    try {
      setCustom(compileDoc(d));
      setDocError(null);
    } catch (e) {
      setCustom('');
      setDocError((e as Error).message);
    }
  };
  const [useCustom, setUseCustom] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [libMsg, setLibMsg] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState<string | null>(null);
  const [shift, setShift] = useState(0);

  const base: Pick<Progression, 'id' | 'chart' | 'key' | 'mode' | 'style' | 'tempo'> = useCustom
    ? { id: 'custom', chart: normalizeChartText(custom), key: draft.key || null, mode: draft.mode, style: draft.style, tempo: draft.tempo }
    : selected;
  const baseKey = base.key;
  const key = useCustom ? customKey ?? baseKey ?? 'C' : query.get('k') ?? baseKey ?? 'C';

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
    setCustomKey(null);
    setTempo(base.tempo);
  }, [base.id, base.tempo]);

  const { chart, customError } = useMemo(() => {
    try {
      let c = parseChart(base.chart);
      if (baseKey) c = transposeChart(c, keyInterval(baseKey, key));
      else if (shift) c = transposeChart(c, semitoneInterval(shift));
      return { chart: c, customError: null as string | null };
    } catch (e) {
      // un cifrado propio inválido no debe romper la pantalla: se vuelve a una progresión conocida
      const fallback = parseChart(PROGRESSIONS[0].chart);
      return { chart: fallback, customError: useCustom ? (e as Error).message : 'No se pudo leer este tema' };
    }
  }, [base.chart, baseKey, key, shift, useCustom]);

  // el loop se descarta si queda fuera de la forma
  const loopValid = loop && loop[1] < chart.bars ? loop : null;
  const playChart = useMemo(() => (loopValid ? sliceChart(chart, loopValid[0], loopValid[1]) : chart), [chart, loopValid]);
  const offset = loopValid ? Math.max(0, chart.chords.findIndex((c) => c.bar >= loopValid[0])) : 0;

  // melodía de un tema propio: se transpone con el mismo intervalo que el cifrado y se recorta al tramo en loop
  const melody = useMemo(() => {
    if (useCustom || !selected.melody) return undefined;
    const iv = baseKey ? keyInterval(baseKey, key) : shift ? semitoneInterval(shift) : undefined;
    const notes = melodyNotes(selected.melody, iv);
    if (!notes.length) return undefined;
    return loopValid ? sliceMelody(notes, loopValid[0], loopValid[1], barLen(chart)) : notes;
  }, [useCustom, selected.melody, baseKey, key, shift, loopValid, chart]);

  const layout = useMemo(() => {
    const d = useCustom ? doc : selected.doc;
    return d ? docLayout(d) : null;
  }, [useCustom, doc, selected]);

  const pos = usePosition();
  const control = useRef<PlayerControl | null>(null);
  // el paso «Grabado completo» de Mi repertorio se puede marcar desde la toma, si el tema está en el repertorio
  const [rep, setRep] = useRepertorio();
  const temasRep = useTemasDeRepertorio();
  const esTemaRep = !useCustom && temasRep.some((t) => t.id === selected.id);
  const grabadoHecho = !!rep[selected.id]?.hechos.includes(PASO_GRABADO);
  // llegar desde Mi repertorio (?toma=1) deja la tarjeta de la toma a la vista
  useEffect(() => {
    if (query.get('toma') === '1') document.querySelector('.toma')?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [atril, setAtril] = useState(false);
  // modo de memoria: la grilla se oculta (todo o de a poco); «Mirar» la muestra un rato para comprobar
  const [memo, setMemo] = usePersistent<{ modo?: MemoriaModo }>('memoria', {});
  const memoModo: MemoriaModo = memo.modo ?? 'off';
  const [mirar, setMirar] = useState(false);
  const setModo = (m: MemoriaModo) => { setMemo({ modo: m }); setMirar(false); };
  const { keyLabel, view, iv } = useReading();
  /** Los nombres y notas de las progresiones de la app están en concierto: se muestran en la lectura elegida. Los temas propios no se tocan. */
  const loc = (p: Progression, text: string) => (p.category === 'Mis temas' ? text : localizeNotes(text, 'C', 'C', iv));
  const mine = pos && pos.owner === OWNER ? pos : null;
  const nivel = mirar ? 'todo' : memoriaNivel(memoModo, mine && mine.chorus >= 0 ? mine.chorus : -1);
  const ci = mine && !mine.countIn ? mine.chordIndex : -1;
  const chord = ci >= 0 ? playChart.chords[ci]?.chord ?? null : null;
  const next = ci >= 0 ? playChart.chords[(ci + 1) % playChart.chords.length]?.chord ?? null : null;

  const onBarClick = (bar: number) => {
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
    if (p) tomaArrancó.current = true;
    else if (tomaRef.current && tomaArrancó.current) {
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
  const changeKey = (k: string) => (useCustom ? setCustomKey(k) : setQuery(selected.id, k));

  // ---- biblioteca ----
  const saveTune = () => {
    const r = validateTune({ ...draft, key: draft.key || null, chart: custom, doc: doc ?? undefined, melody: tunes.find((t) => t.id === draft.id)?.melody });
    if (typeof r === 'string') return setLibMsg(r);
    const exists = tunes.some((t) => t.id === draft.id);
    if (!exists && tunes.length >= MAX_TUNES) return setLibMsg(`Llegaste al máximo de ${MAX_TUNES} temas`);
    const tune: UserTune = exists ? { ...r, id: draft.id! } : r;
    setLibrary({ tunes: exists ? tunes.map((t) => (t.id === tune.id ? tune : t)) : [...tunes, tune] });
    setLibMsg(`"${tune.name}" guardado`);
    setUseCustom(false);
    setDraft(EMPTY_DRAFT);
    setCustom('');
    setDoc({ bars: [emptyBar()] });
    setEditorKey((k) => k + 1);
    setQuery(tune.id);
  };

  const exportTunes = () => {
    const blob = new Blob([JSON.stringify({ app: 'harmonyjazz', version: 1, tunes }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harmonyjazz-temas.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Carga masiva desde texto: ya vienen validadas y sin repetidos. */
  const bulkImport = (incoming: UserTune[]) => {
    const room = Math.max(0, MAX_TUNES - tunes.length);
    const fresh = incoming.slice(0, room);
    if (fresh.length) setLibrary({ tunes: [...tunes, ...fresh] } as Library);
    setLibMsg(
      `Importados ${fresh.length} tema(s)` + (incoming.length > fresh.length ? `. Se omitieron ${incoming.length - fresh.length} por el máximo de ${MAX_TUNES} temas` : ''),
    );
  };

  const importTunes = async (file: File) => {
    if (file.size > 5_000_000) return setLibMsg('El archivo es demasiado grande');
    const { tunes: incoming, errors } = parseImport(await file.text());
    const seen = new Set(tunes.map((t) => t.name + '\u0000' + t.chart));
    const fresh = incoming.filter((t) => !seen.has(t.name + '\u0000' + t.chart)).slice(0, Math.max(0, MAX_TUNES - tunes.length));
    if (fresh.length) setLibrary({ tunes: [...tunes, ...fresh] } as Library);
    setLibMsg(
      `Importados ${fresh.length} tema(s)` +
        (incoming.length - fresh.length > 0 ? `, ${incoming.length - fresh.length} repetidos u omitidos` : '') +
        (errors.length ? `. Avisos: ${errors.slice(0, 3).join('; ')}` : ''),
    );
  };

  const showKeys = !!baseKey && (!useCustom || !customError);

  return (
    <div className="page playalong">
      <section className="card">
        <header>
          <h2>Play-along</h2>
          <select
            value={useCustom ? '' : selected.id}
            onChange={(e) => {
              const p = all.find((x) => x.id === e.target.value);
              if (!p) return;
              setUseCustom(false);
              setTempo(p.tempo);
              setQuery(p.id);
            }}
            aria-label="Tema"
          >
            {useCustom && <option value="">Progresión propia (sin guardar)</option>}
            {(['Fundamentos', 'Blues', 'Formas', 'Avanzado', 'Mis temas'] as const).map((cat) => {
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
        {!useCustom && <p className="muted">{loc(selected, selected.notes)}</p>}
        {useCustom && <p className="muted">Estás tocando una progresión propia sin guardar. Guardala en "Mis temas" para conservarla.</p>}

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
          melody={melody}
          allowMelody={!!melody}
          owner={OWNER}
          defaultMetronome={query.get('m') === '1'}
          controlRef={control}
          onPlayingChange={onPlaying}
        />
        <p>
          <button onClick={() => setAtril(true)}>🎼 Modo atril (pantalla grande)</button>
        </p>
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
      </section>

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

      {!useCustom && selected.category === 'Mis temas' && (() => {
        const tune = tunes.find((t) => t.id === selected.id);
        return tune ? <MelodyPanel tune={tune} onSave={(m) => setLibrary({ tunes: tunes.map((t) => (t.id === tune.id ? { ...t, melody: m } : t)) })} /> : null;
      })()}

      {atril && (
        <Atril
          title={useCustom ? 'Progresión propia' : loc(selected, selected.name)}
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
          chord={chord}
          chordIndex={ci}
          chorus={mine?.chorus ?? 0}
          tempo={tempo}
          micRef={micRef}
          recorder={{ recording, toggle: toggleRecording, onEvent, count, onAudio: setTakeAudio }}
        />
      </div>

      {recording && !engine.playing && (
        <p className="card muted">Grabando: dale play al acompañamiento y tocá. Las notas se ubican en la forma según el tiempo del play-along.</p>
      )}
      {takeAudio && !recording && (
        <TakeAudio blob={takeAudio} name={useCustom ? 'Progresión propia' : selected.name} onDiscard={() => setTakeAudio(null)}>
          {esTemaRep && (
            grabadoHecho
              ? <span className="muted small">✓ «Grabado completo» marcado en Mi repertorio</span>
              : <button onClick={() => setRep((r) => marcar(r, selected.id, PASO_GRABADO, dayNum()))}>✓ Marcar «Grabado completo» en Mi repertorio</button>
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

      <section className="card">
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
        <ChordBoard chart={chart} current={ci >= 0 ? ci + offset : -1} loop={loopValid} pending={pending} onBarClick={onBarClick} layout={layout} memory={nivel} />
        {!useCustom && selected.listen && <p className="muted small">Escuchá: {selected.listen.join(' · ')}</p>}
      </section>

      <TuneLibrary
        draft={draft}
        onDraft={setDraft}
        chartText={custom}
        onChartText={setCustom}
        doc={doc}
        onDoc={setDoc}
        editorKey={editorKey}
        error={useCustom ? (doc ? docError ?? customError : customError) : null}
        tunes={tunes}
        message={libMsg}
        onTry={() => {
          setLibMsg(null);
          setCustomKey(null);
          setShift(0);
          setLoop(null);
          setUseCustom(true);
          setTempo(draft.tempo);
        }}
        onSave={saveTune}
        onPlay={(t) => { setUseCustom(false); setTempo(t.tempo); setQuery(t.id); }}
        onEdit={(t) => {
          setDraft({ id: t.id, name: t.name, composer: t.composer, key: t.key ?? '', mode: t.mode, tempo: t.tempo, style: t.style });
          setDoc(t.doc ?? docFromChart(t.chart));
          setCustom(t.chart);
          setEditorKey((k) => k + 1);
          setLibMsg(null);
        }}
        onDelete={(t) => {
          if (!window.confirm(`¿Borrar "${t.name}"?`)) return;
          setLibrary({ tunes: tunes.filter((x) => x.id !== t.id) });
          if (selected.id === t.id) setQuery(PROGRESSIONS[0].id);
        }}
        onExport={exportTunes}
        onImport={importTunes}
        onBulkImport={bulkImport}
      />
    </div>
  );
}
