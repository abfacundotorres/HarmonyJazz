import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import {
  Library, MAX_TUNES, normalizeChartText, parseImport, tuneToProgression, UserTune, validateTune,
} from '../../content/library';
import { PROGRESSIONS, Progression } from '../../content/progressions';
import { ChorusTranscription, RawEvent, transcribe } from '../../pitch/transcribe';
import {
  Chart, keyInterval, parseChart, semitoneInterval, sliceChart, transposeChart,
} from '../../theory/chart';
import { ChordBoard, CurrentChord } from '../components/ChordInfo';
import { KeySelect } from '../components/KeySelect';
import { ListenPanel } from '../components/ListenPanel';
import { Player } from '../components/Player';
import { Transcription } from '../components/Transcription';
import { Draft, EMPTY_DRAFT, TuneLibrary } from '../components/TuneLibrary';
import { navigate, usePersistentLibrary, usePosition, useRoute } from '../hooks';

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

  const pos = usePosition();
  const mine = pos && pos.owner === OWNER ? pos : null;
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
  const events = useRef<RawEvent[]>([]);
  const snapshot = useRef<Omit<Take, 'choruses'> | null>(null);

  const onEvent = useCallback((midi: number | null, time: number) => {
    const loc = engine.locate(time - (midi === null ? OFF_LATENCY_MS : ON_LATENCY_MS));
    if (!loc) return;
    events.current.push({ ...loc, midi });
    if (midi !== null) setCount((c) => c + 1);
  }, []);

  const toggleRecording = () => {
    if (!recording) {
      events.current = [];
      setCount(0);
      setTake(null);
      snapshot.current = { chart: playChart, keyValue: baseKey ? key : null, mode: base.mode, tempo };
      setRecording(true);
    } else {
      setRecording(false);
      const snap = snapshot.current!;
      const choruses = transcribe(events.current, snap.chart);
      if (choruses.length) setTake({ ...snap, choruses });
    }
  };

  const setQuery = (p: string, k?: string | null) => {
    const q = new URLSearchParams({ p });
    if (k) q.set('k', k);
    navigate(`/playalong?${q}`);
  };
  const changeKey = (k: string) => (useCustom ? setCustomKey(k) : setQuery(selected.id, k));

  // ---- biblioteca ----
  const saveTune = () => {
    const r = validateTune({ ...draft, key: draft.key || null, chart: custom });
    if (typeof r === 'string') return setLibMsg(r);
    const exists = tunes.some((t) => t.id === draft.id);
    if (!exists && tunes.length >= MAX_TUNES) return setLibMsg(`Llegaste al máximo de ${MAX_TUNES} temas`);
    const tune: UserTune = exists ? { ...r, id: draft.id! } : r;
    setLibrary({ tunes: exists ? tunes.map((t) => (t.id === tune.id ? tune : t)) : [...tunes, tune] });
    setLibMsg(`"${tune.name}" guardado`);
    setUseCustom(false);
    setDraft(EMPTY_DRAFT);
    setCustom('');
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
            {(['Fundamentos', 'Blues', 'Standards', 'Avanzado', 'Mis temas'] as const).map((cat) => {
              const items = all.filter((p) => p.category === cat);
              return items.length ? (
                <optgroup key={cat} label={cat}>
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </header>
        {!useCustom && <p className="muted">{selected.notes}</p>}
        {useCustom && <p className="muted">Estás tocando una progresión propia sin guardar. Guardala en "Mis temas" para conservarla.</p>}

        {showKeys ? (
          <>
            <KeySelect value={key} onChange={changeKey} minor={base.mode === 'minor'} />
            <p className="muted small">
              Escrito en {baseKey}; estás tocando en {key}.
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
          owner={OWNER}
          defaultMetronome={query.get('m') === '1'}
        />
      </section>

      <div className="grid2">
        <CurrentChord chord={chord} next={next} />
        <ListenPanel
          chord={chord}
          chordIndex={ci}
          chorus={mine?.chorus ?? 0}
          tempo={tempo}
          recorder={{ recording, toggle: toggleRecording, onEvent, count }}
        />
      </div>

      {recording && !engine.playing && (
        <p className="card muted">Grabando: dale play al acompañamiento y tocá. Las notas se ubican en la forma según el tiempo del play-along.</p>
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
        <ChordBoard chart={chart} current={ci >= 0 ? ci + offset : -1} loop={loopValid} pending={pending} onBarClick={onBarClick} />
        {!useCustom && selected.listen && <p className="muted small">Escuchá: {selected.listen.join(' · ')}</p>}
      </section>

      <TuneLibrary
        draft={draft}
        onDraft={setDraft}
        chartText={custom}
        onChartText={setCustom}
        error={useCustom ? customError : null}
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
          setCustom(t.chart);
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
