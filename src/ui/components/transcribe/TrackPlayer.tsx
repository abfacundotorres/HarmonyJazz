import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { engine as tone } from '../../../audio/engine';
import { savePhraseDraft } from '../../../content/phraseDraft';
import { saveMeta, SavedLoop, TrackMeta } from '../../../transcribe/audioStore';
import { createEngine, PlayerEngine } from '../../../transcribe/engine';
import { Filters, NO_FILTERS, TRUMPET_FILTERS } from '../../../transcribe/filters';
import { Grid, loopOfBars, Marker, MAX_BPM, MIN_BPM, snapRegion, snapTime, tapTempo, viewForRegion } from '../../../transcribe/grid';
import { analyzeFrame, DetectedNote, detectNotes, estimateTuning, FrameResult, TuningEstimate } from '../../../transcribe/pitch';
import { clampView, fitRegion, fmtTime, followView, normRegion, parseTime, Region, View, zoomView } from '../../../transcribe/regions';
import { notesToLine } from '../../../transcribe/toPhrase';
import { rateAfter, repsToTarget, roundRate, Trainer } from '../../../transcribe/trainer';
import { midiName, prettyAcc } from '../../../theory/notes';
import { navigate, useReading } from '../../hooks';
import { useWakeLock } from '../../wakeLock';
import { ViewMode, WaveView } from './WaveView';

const RATE_PRESETS = [50, 60, 70, 80, 90, 100];
const NUDGE = 0.1;
const newId = (p: string) => p + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const NOTE_PCS = [['Do', 0], ['Do♯', 1], ['Re', 2], ['Mi♭', 3], ['Mi', 4], ['Fa', 5], ['Fa♯', 6], ['Sol', 7], ['La♭', 8], ['La', 9], ['Si♭', 10], ['Si', 11]] as const;

function Panel({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="panel" open={open}>
      <summary>{title}</summary>
      <div className="panelbody">{children}</div>
    </details>
  );
}

export function TrackPlayer({ initial, blob, onClose }: { initial: TrackMeta; blob: Blob; onClose: () => void }) {
  const [simple, setSimple] = useState(initial.simple);
  const [boot, setBoot] = useState<{ engine: PlayerEngine; reason?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<TrackMeta>(initial);

  useEffect(() => {
    let alive = true;
    let eng: PlayerEngine | null = null;
    setBoot(null);
    setError(null);
    createEngine(blob, simple)
      .then((c) => {
        if (!alive) return c.engine.dispose();
        eng = c.engine;
        setBoot(c);
      })
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
      eng?.dispose();
    };
  }, [blob, simple]);

  if (error)
    return (
      <section className="card">
        <header>
          <h3>{initial.name}</h3>
          <button onClick={onClose}>Cerrar</button>
        </header>
        <p role="alert" style={{ color: 'var(--bad)' }}>{error}</p>
      </section>
    );
  if (!boot)
    return (
      <section className="card">
        <header>
          <h3>{initial.name}</h3>
          <button onClick={onClose}>Cerrar</button>
        </header>
        <p className="muted" role="status">Preparando el audio… (se decodifica entero para poder repetir los loops sin cortes)</p>
      </section>
    );
  return (
    <Loaded
      key={String(simple)}
      meta={latest.current}
      onMeta={(m) => (latest.current = m)}
      engine={boot.engine}
      reason={boot.reason}
      simple={simple}
      onSimple={setSimple}
      onClose={onClose}
    />
  );
}

function Loaded({
  meta,
  onMeta,
  engine,
  reason,
  simple,
  onSimple,
  onClose,
}: {
  meta: TrackMeta;
  onMeta: (m: TrackMeta) => void;
  engine: PlayerEngine;
  reason?: string;
  simple: boolean;
  onSimple: (v: boolean) => void;
  onClose: () => void;
}) {
  const duration = engine.duration;
  const { view: reading } = useReading();
  const written = reading === 'Bb';
  const shift = written ? 2 : 0;
  const nm = (midi: number) => prettyAcc(midiName(midi + shift));

  const [rate, setRate] = useState(meta.rate);
  const [semis, setSemis] = useState(meta.pitchSemis);
  const [cents, setCents] = useState(meta.pitchCents);
  const [filters, setFilters] = useState<Filters>(meta.filters);
  const [region, setRegion] = useState<Region | null>(meta.region);
  const [loopOn, setLoopOn] = useState(meta.loopOn);
  const [saved, setSaved] = useState<SavedLoop[]>(meta.loops);
  const [markers, setMarkers] = useState<Marker[]>(meta.markers);
  const [grid, setGrid] = useState<Grid | null>(meta.grid);
  const [trainer, setTrainer] = useState<Trainer>(meta.trainer);
  const [text, setText] = useState(meta.text);
  const [clickOn, setClickOn] = useState(meta.clickOn);
  const [clickGain, setClickGain] = useState(meta.clickGain);
  const [tuneEst, setTuneEst] = useState<TuningEstimate | 'none' | 'working' | null>(null);
  const [mode, setMode] = useState<ViewMode>(meta.viewMode);
  const [view, setView] = useState<View>(() => (meta.region ? fitRegion(meta.region, duration) : { start: 0, dur: duration }));
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(meta.pos);
  const [live, setLive] = useState<FrameResult | null>(null);
  const [notes, setNotes] = useState<DetectedNote[] | null>(null);
  const [sens, setSens] = useState(0.35);
  const [detecting, setDetecting] = useState(false);
  const [listening, setListening] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [snapOn, setSnapOn] = useState(true);
  const [loopName, setLoopName] = useState('');
  const [msg, setMsg] = useState('');
  useWakeLock(playing);
  const [refPc, setRefPc] = useState(0);
  const [refOct, setRefOct] = useState(4);

  // valores calientes para el bucle de animación y los eventos del motor
  const timeRef = useRef(meta.pos);
  const viewRef = useRef(view);
  const rateRef = useRef(rate);
  const trainerRef = useRef(trainer);
  const trainBase = useRef(0);
  const taps = useRef<number[]>([]);
  const snapshot = useRef({ rate, semis, cents, filters, region, loopOn, saved, markers, grid, trainer, text, mode, simple, clickOn, clickGain });
  viewRef.current = view;
  rateRef.current = rate;
  trainerRef.current = trainer;
  snapshot.current = { rate, semis, cents, filters, region, loopOn, saved, markers, grid, trainer, text, mode, simple, clickOn, clickGain };

  // ---- guardado (para seguir otro día)
  const persist = useCallback(() => {
    const s = snapshot.current;
    const m: TrackMeta = {
      ...meta,
      duration,
      pos: timeRef.current,
      rate: s.rate,
      pitchSemis: s.semis,
      pitchCents: s.cents,
      filters: s.filters,
      region: s.region,
      loopOn: s.loopOn,
      loops: s.saved,
      markers: s.markers,
      grid: s.grid,
      trainer: s.trainer,
      text: s.text,
      viewMode: s.mode,
      simple: s.simple,
      clickOn: s.clickOn,
      clickGain: s.clickGain,
      opened: Date.now(),
    };
    onMeta(m);
    void saveMeta(m).catch(() => undefined);
  }, [meta, duration, onMeta]);
  useEffect(() => {
    const t = setTimeout(persist, 700);
    return () => clearTimeout(t);
  }, [rate, semis, cents, filters, region, loopOn, saved, markers, grid, trainer, text, mode, clickOn, clickGain, persist]);
  useEffect(() => {
    const onHide = () => persist();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      persist();
      engine.pause();
      tone.stopLine();
    };
  }, [persist, engine]);

  // ---- motor: estado inicial y eventos
  useEffect(() => {
    engine.setRate(meta.rate);
    engine.setPitch(meta.pitchSemis, meta.pitchCents);
    engine.setFilters(meta.filters);
    engine.setLoop(meta.loopOn && meta.region ? meta.region : null);
    engine.setGap(meta.trainer.on ? meta.trainer.gap : 0);
    engine.setClick(meta.clickOn && meta.grid ? { ...meta.grid, gain: meta.clickGain } : null);
    engine.seek(meta.pos);
    const offs = [
      engine.on('state', () => setPlaying(engine.playing)),
      engine.on('ended', () => setPlaying(false)),
      engine.on('error', (m) => setMsg(String(m))),
      engine.on('loop', (n) => {
        const k = Number(n) - trainBase.current;
        setLoopCount(k);
        const next = rateAfter(rateRef.current, trainerRef.current, k);
        if (next !== rateRef.current) setRate(next);
      }),
    ];
    return () => offs.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);
  useEffect(() => engine.setRate(rate), [engine, rate]);
  useEffect(() => engine.setPitch(semis, cents), [engine, semis, cents]);
  useEffect(() => engine.setFilters(filters), [engine, filters]);
  useEffect(() => engine.setLoop(loopOn && region ? region : null), [engine, loopOn, region]);
  useEffect(() => engine.setGap(trainer.on ? trainer.gap : 0), [engine, trainer.on, trainer.gap]);
  useEffect(() => engine.setClick(clickOn && grid ? { bpm: grid.bpm, offset: grid.offset, beats: grid.beats, gain: clickGain } : null), [engine, clickOn, clickGain, grid]);

  const resetTraining = useCallback(() => {
    trainBase.current = engine.loops;
    setLoopCount(0);
  }, [engine]);
  useEffect(resetTraining, [region, loopOn, trainer.on, resetTraining]);
  const userRate = (r: number) => {
    setRate(Math.min(2, Math.max(0.25, roundRate(r))));
    resetTraining();
  };

  // ---- reloj: posición, vista que sigue al cursor y nota que suena
  useEffect(() => {
    let raf = 0;
    let lastUi = 0;
    let lastPitch = 0;
    const tick = () => {
      const t = engine.position();
      timeRef.current = t;
      const now = performance.now();
      if (engine.playing) {
        const v = followView(viewRef.current, t, duration);
        if (v !== viewRef.current) setView(v);
        if (engine.analysis && now - lastPitch > 220) {
          lastPitch = now;
          const an = engine.analysis;
          const f = snapshot.current.filters;
          setLive(analyzeFrame(an.mono, an.sampleRate, t * an.sampleRate, { hp: f.hp, lp: f.lp || undefined }));
        }
      }
      if (now - lastUi > 100) {
        lastUi = now;
        setTime(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, duration]);

  // ---- transporte
  const seek = useCallback(
    (t: number) => {
      engine.seek(t);
      timeRef.current = t;
      setTime(t);
      setLive(null);
    },
    [engine],
  );
  const toggle = useCallback(() => {
    if (engine.playing) return engine.pause();
    tone.stopLine();
    setListening(false);
    const r = snapshot.current.loopOn ? snapshot.current.region : null;
    if (r && (timeRef.current < r.start || timeRef.current >= r.end - 0.05)) seek(r.start);
    void engine.play().catch(() => setMsg('No se pudo reproducir este archivo.'));
  }, [engine, seek]);

  // ---- selección
  const snap = grid && snapOn ? (t: number) => snapTime(grid, t, 'beat') : null;
  const setA = (t: number) => {
    const s = snap ? snap(t) : t;
    const r = normRegion(s, region && region.end > s + 0.1 ? region.end : duration, duration);
    if (r) {
      setRegion(r);
      setLoopOn(true);
    }
  };
  const setB = (t: number) => {
    const s = snap ? snap(t) : t;
    const r = normRegion(region && region.start < s - 0.1 ? region.start : 0, s, duration);
    if (r) {
      setRegion(r);
      setLoopOn(true);
    }
  };
  const nudge = (edge: 'start' | 'end', d: number) => {
    if (!region) return;
    const r = edge === 'start' ? normRegion(region.start + d, region.end, duration) : normRegion(region.start, region.end + d, duration);
    if (r) setRegion(r);
  };
  const editTime = (edge: 'start' | 'end') => {
    if (!region) return;
    const txt = window.prompt(edge === 'start' ? 'Inicio (m:ss.s)' : 'Fin (m:ss.s)', fmtTime(region[edge]));
    const t = txt == null ? null : parseTime(txt);
    if (t == null) return;
    const r = edge === 'start' ? normRegion(t, region.end, duration) : normRegion(region.start, t, duration);
    if (r) setRegion(r);
  };
  const onRegion = (r: Region | null) => {
    setRegion(r);
    if (r && !loopOn) setLoopOn(true);
  };
  const zoom = (f: number) => setView((v) => zoomView(v, f, v.start <= timeRef.current && timeRef.current <= v.start + v.dur ? timeRef.current : v.start + v.dur / 2, duration));
  const whole = view.dur >= duration - 0.01;

  // ---- pasajes y marcadores
  const saveLoop = () => {
    if (!region) return;
    const name = loopName.trim() || `Pasaje ${saved.length + 1}`;
    setSaved([...saved, { id: newId('l'), name: name.slice(0, 60), start: region.start, end: region.end, rate }]);
    setLoopName('');
    setMsg(`"${name}" guardado con la velocidad actual.`);
  };
  const activate = (l: SavedLoop) => {
    const r = normRegion(l.start, l.end, duration);
    if (!r) return;
    setRegion(r);
    setLoopOn(true);
    if (l.rate) userRate(l.rate);
    setView(fitRegion(r, duration));
    seek(r.start);
  };
  const addMarker = () => {
    const t = timeRef.current;
    setMarkers((ms) => [...ms, { id: newId('m'), t, name: `M${ms.length + 1}` }].sort((a, b) => a.t - b.t));
  };

  // ---- compases
  const tap = () => {
    const r = tapTempo([...taps.current, performance.now() / 1000]);
    taps.current = r.taps;
    if (r.bpm) setGrid((g) => ({ bpm: r.bpm!, offset: g?.offset ?? 0, beats: g?.beats ?? 4 }));
  };
  const setBeatOne = () => setGrid((g) => ({ bpm: g?.bpm ?? 120, offset: timeRef.current, beats: g?.beats ?? 4 }));
  const barLoop = (n: number) => {
    if (!grid) return;
    const r = loopOfBars(grid, timeRef.current, n, duration);
    if (r) {
      setRegion(r);
      setLoopOn(true);
      setView(viewForRegion(r, duration));
      seek(r.start);
    }
  };

  // ---- notas
  const detect = () => {
    const an = engine.analysis;
    if (!an) return;
    const a = region ? region.start : view.start;
    const b = region ? region.end : Math.min(view.start + view.dur, a + 90);
    setDetecting(true);
    setMsg('');
    window.setTimeout(() => {
      const found = detectNotes(an.mono, an.sampleRate, a, b, { hp: filters.hp, lp: filters.lp || undefined });
      setNotes(found);
      setMode('spec');
      setDetecting(false);
      setMsg(found.length ? `${found.length} notas detectadas entre ${fmtTime(a)} y ${fmtTime(b)}.` : 'No se detectaron notas en ese tramo.');
    }, 30);
  };
  const estimate = () => {
    const an = engine.analysis;
    if (!an) return;
    setTuneEst('working');
    window.setTimeout(() => {
      const e = estimateTuning(an.mono, an.sampleRate, { hp: filters.hp, lp: filters.lp || undefined });
      setTuneEst(e ?? 'none');
    }, 30);
  };
  const shown = notes ? notes.filter((n) => n.strength >= sens) : null;
  const listen = () => {
    if (!shown?.length) return;
    if (listening) {
      tone.stopLine();
      return setListening(false);
    }
    engine.pause();
    const t0 = shown[0].start;
    setListening(true);
    void tone.playLine(shown.map((n) => ({ midi: n.midi, start: n.start - t0, dur: n.end - n.start })), () => setListening(false));
  };
  const toPhrase = () => {
    if (!shown?.length) return;
    let bpm = grid?.bpm ?? 0;
    if (!bpm) {
      const a = window.prompt('¿A qué tempo (negras por minuto) está este pasaje? Hace falta para pasar las notas a corcheas.', '120');
      bpm = Number(a);
      if (!(bpm >= MIN_BPM && bpm <= MAX_BPM)) return;
    }
    const t0 = region ? region.start : shown[0].start;
    const r = notesToLine(shown, bpm, t0);
    if (!r) return setMsg('No se pudo armar la frase.');
    savePhraseDraft({ name: `${meta.name} ${fmtTime(t0, 0)}`.slice(0, 80), tempo: Math.round(bpm), line: r.line, idea: `Estimada automáticamente de "${meta.name}". Verificá de oído y corregí.` });
    navigate('#/vocabulario');
  };

  // ---- teclado (computadora)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = timeRef.current;
      if (e.key === ' ') toggle();
      else if (e.key === 'l' || e.key === 'L') setLoopOn((v) => !v);
      else if (e.key === '[') setA(t);
      else if (e.key === ']') setB(t);
      else if (e.key === 'm' || e.key === 'M') addMarker();
      else if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? 1 : 5));
      else if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? 1 : 5));
      else if (e.key === 'ArrowUp') userRate(rateRef.current + 0.05);
      else if (e.key === 'ArrowDown') userRate(rateRef.current - 0.05);
      else if (e.key === '+' || e.key === '=') zoom(0.5);
      else if (e.key === '-') zoom(2);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const hpOn = filters.hp > 0;
  const lpOn = filters.lp > 0;
  const refMidi = (refOct + 1) * 12 + refPc - shift;

  return (
    <section className="card">
      <header>
        <h3>{meta.name}</h3>
        <button onClick={onClose}>Cerrar</button>
      </header>
      {reason && <p className="muted small" role="status">{reason}</p>}
      {msg && <p className="muted small" role="status">{msg}</p>}

      <div className="row viewbar">
        <div className="seg" role="group" aria-label="Tipo de vista">
          <button className={mode === 'wave' ? 'on' : ''} onClick={() => setMode('wave')}>Onda</button>
          <button className={mode === 'spec' ? 'on' : ''} onClick={() => setMode('spec')} disabled={!engine.analysis} title={engine.analysis ? '' : 'No disponible con el reproductor simple'}>
            Espectrograma
          </button>
        </div>
        <button onClick={() => zoom(0.5)} disabled={view.dur <= 1.01} aria-label="Acercar">＋</button>
        <button onClick={() => zoom(2)} disabled={whole} aria-label="Alejar">－</button>
        <button onClick={() => setView({ start: 0, dur: duration })} disabled={whole}>Todo</button>
        <button onClick={() => region && setView(fitRegion(region, duration))} disabled={!region}>Ver selección</button>
      </div>

      <WaveView
        duration={duration}
        peaks={engine.peaks}
        analysis={engine.analysis}
        mode={mode}
        view={view}
        onView={(v) => setView(clampView(v, duration))}
        region={region}
        onRegion={onRegion}
        loopOn={loopOn}
        markers={markers}
        grid={grid}
        notes={shown}
        timeRef={timeRef}
        playing={playing}
        snap={snap}
        onSeek={seek}
        written={written}
      />

      {!engine.peaks && mode === 'wave' && <p className="muted small">Este audio es muy largo para dibujar la onda, pero podés marcar pasajes igual.</p>}
      <div className="row transport">
        <button onClick={() => seek(region && loopOn ? region.start : 0)} aria-label="Ir al inicio">⏮</button>
        <button className="primary bigplay" onClick={toggle} aria-label={playing ? 'Pausa' : 'Reproducir'}>
          {playing ? '❚❚ Pausa' : '▶ Reproducir'}
        </button>
        <b className="timeread">{fmtTime(time)}</b>
        <span className="muted">/ {fmtTime(duration)}</span>
        <button className={loopOn ? 'on' : ''} onClick={() => setLoopOn((v) => !v)} disabled={!region} aria-pressed={loopOn}>
          ⟲ Loop {loopOn ? 'sí' : 'no'}
        </button>
      </div>

      <div className="livepitch" aria-live="off">
        {live && engine.playing ? (
          <>
            <b>{nm(live.midi)}</b>
            <span className="muted">
              {' '}
              {Math.round((live.midi - Math.round(live.midi)) * 100) >= 0 ? '+' : ''}
              {Math.round((live.midi - Math.round(live.midi)) * 100)}¢ · suena {prettyAcc(midiName(live.midi))} (concierto) ·{' '}
              {live.strength < 0.25 ? 'poco clara' : live.strength < 0.6 ? 'aceptable' : 'clara'}
            </span>
          </>
        ) : (
          <span className="muted small">{engine.analysis ? 'Al reproducir se muestra la nota que suena.' : 'La nota que suena sólo se muestra con el motor preciso.'}</span>
        )}
      </div>

      <div className="rate">
        <label>
          Velocidad: <b>{Math.round(rate * 100)} %</b>
          <input type="range" min={25} max={200} step={5} value={Math.round(rate * 100)} onChange={(e) => userRate(Number(e.target.value) / 100)} aria-label="Velocidad" />
        </label>
        <div className="row">
          <button onClick={() => userRate(rate - 0.05)} aria-label="Bajar 5 puntos">− 5</button>
          <div className="seg" role="group" aria-label="Velocidades frecuentes">
            {RATE_PRESETS.map((p) => (
              <button key={p} className={Math.round(rate * 100) === p ? 'on' : ''} onClick={() => userRate(p / 100)}>{p}</button>
            ))}
          </div>
          <button onClick={() => userRate(rate + 0.05)} aria-label="Subir 5 puntos">+ 5</button>
        </div>
      </div>

      <div className="selection">
        <div className="row">
          <button onClick={() => setA(time)}>Inicio aquí [</button>
          <button onClick={() => setB(time)}>Fin aquí ]</button>
          <button onClick={addMarker}>＋ Marcador</button>
          {region && <button onClick={() => { setRegion(null); setLoopOn(false); }}>Quitar selección</button>}
        </div>
        {region ? (
          <div className="row">
            <span>
              Selección: <button className="link" onClick={() => editTime('start')}>{fmtTime(region.start)}</button> –{' '}
              <button className="link" onClick={() => editTime('end')}>{fmtTime(region.end)}</button>{' '}
              <span className="muted">({(region.end - region.start).toFixed(1)} s)</span>
            </span>
            <span className="seg" role="group" aria-label="Ajustar el inicio">
              <button onClick={() => nudge('start', -NUDGE)} aria-label="Inicio 0,1 segundos antes">‹</button>
              <span className="seglabel">inicio</span>
              <button onClick={() => nudge('start', NUDGE)} aria-label="Inicio 0,1 segundos después">›</button>
            </span>
            <span className="seg" role="group" aria-label="Ajustar el fin">
              <button onClick={() => nudge('end', -NUDGE)} aria-label="Fin 0,1 segundos antes">‹</button>
              <span className="seglabel">fin</span>
              <button onClick={() => nudge('end', NUDGE)} aria-label="Fin 0,1 segundos después">›</button>
            </span>
          </div>
        ) : (
          <p className="muted small">Arrastrá sobre la onda para seleccionar un pasaje, o usá "Inicio aquí" y "Fin aquí" mientras suena. Tocá para ir a un punto; pellizcá para acercar.</p>
        )}
        {grid && (
          <label className="small muted">
            <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} /> Ajustar la selección a los tiempos de la grilla
          </label>
        )}
      </div>

      <Panel title="Entrenador de loops" open={trainer.on}>
        <label>
          <input type="checkbox" checked={trainer.on} onChange={(e) => setTrainer({ ...trainer, on: e.target.checked })} /> Subir la velocidad solo
        </label>
        <div className="formgrid">
          <label>
            Meta (%)
            <input type="number" min={25} max={200} step={5} value={Math.round(trainer.target * 100)} onChange={(e) => setTrainer({ ...trainer, target: Math.min(2, Math.max(0.25, Number(e.target.value) / 100 || 1)) })} />
          </label>
          <label>
            Sube (puntos)
            <input type="number" min={1} max={50} value={Math.round(trainer.step * 100)} onChange={(e) => setTrainer({ ...trainer, step: Math.min(0.5, Math.max(0.01, Number(e.target.value) / 100 || 0.05)) })} />
          </label>
          <label>
            Cada (repeticiones)
            <input type="number" min={1} max={50} value={trainer.every} onChange={(e) => setTrainer({ ...trainer, every: Math.min(50, Math.max(1, Math.round(Number(e.target.value)) || 4)) })} />
          </label>
          <label>
            Pausa entre repeticiones (s)
            <input type="number" min={0} max={10} step={0.5} value={trainer.gap} onChange={(e) => setTrainer({ ...trainer, gap: Math.min(10, Math.max(0, Number(e.target.value) || 0)) })} />
          </label>
        </div>
        <p className="muted small" role="status">
          {!trainer.on
            ? 'Marcá un pasaje, poné una velocidad de partida y activá el entrenador: sube solo cada tantas repeticiones hasta la meta.'
            : !loopOn || !region
              ? 'Necesita un pasaje con el loop activado.'
              : `Repetición ${loopCount} · ${Math.round(rate * 100)} %${rate < trainer.target - 1e-9 ? ` → meta ${Math.round(trainer.target * 100)} % (faltan unas ${repsToTarget(rate, trainer)} repeticiones)` : ' (meta alcanzada)'}`}
        </p>
      </Panel>

      <Panel title="Afinación y filtros">
        {!engine.canTune && <p className="muted small">Esto necesita el motor preciso. Ahora estás con el reproductor simple.</p>}
        <fieldset disabled={!engine.canTune}>
          <div className="row">
            <b>Afinación</b>
            <button onClick={() => setSemis((s) => Math.max(-12, s - 1))} aria-label="Un semitono más grave">♭</button>
            <span>{semis > 0 ? '+' : ''}{semis} semitonos</span>
            <button onClick={() => setSemis((s) => Math.min(12, s + 1))} aria-label="Un semitono más agudo">♯</button>
            <button onClick={() => { setSemis(0); setCents(0); }} disabled={semis === 0 && cents === 0}>Original</button>
          </div>
          <div className="row">
            <button onClick={estimate} disabled={!engine.analysis || tuneEst === 'working'}>{tuneEst === 'working' ? 'Midiendo…' : 'Estimar la afinación del disco'}</button>
            {tuneEst === 'none' && <span className="muted small">No hay notas claras y parejas para medirla (música percusiva, ruido o varios instrumentos desafinados entre sí).</span>}
            {tuneEst && typeof tuneEst === 'object' && (
              <>
                <span className="small" role="status">
                  Parece estar {tuneEst.cents > 0 ? 'alto' : tuneEst.cents < 0 ? 'bajo' : 'afinado'}: {tuneEst.cents > 0 ? '+' : ''}{tuneEst.cents}¢ (La ≈ {(440 * Math.pow(2, tuneEst.cents / 1200)).toFixed(1)} Hz; ±{tuneEst.spread}¢ con {tuneEst.frames} muestras).
                </span>
                {Math.abs(tuneEst.cents) >= 5 && (
                  <button className="primary" onClick={() => { setSemis(0); setCents(Math.max(-100, Math.min(100, -tuneEst.cents))); }}>
                    Corregir ({-tuneEst.cents > 0 ? '+' : ''}{-tuneEst.cents}¢)
                  </button>
                )}
              </>
            )}
          </div>
          <label className="block">
            <span className="muted small">Ajuste fino: {cents > 0 ? '+' : ''}{cents} centésimas (para discos que no están a 440 Hz)</span>
            <input type="range" min={-100} max={100} step={5} value={cents} onChange={(e) => setCents(Number(e.target.value))} style={{ width: '100%' }} aria-label="Ajuste fino en centésimas" />
          </label>
          <hr />
          <div className="row">
            <b>Filtros</b>
            <button onClick={() => setFilters(TRUMPET_FILTERS)}>Aislar trompeta</button>
            <button onClick={() => setFilters(NO_FILTERS)} disabled={!hpOn && !lpOn && filters.center === 'keep'}>Sin filtros</button>
          </div>
          <label className="block">
            <span className="muted small">Cortar graves: {hpOn ? `por debajo de ${filters.hp} Hz` : 'sin corte'}</span>
            <input type="range" min={0} max={800} step={10} value={filters.hp} onChange={(e) => setFilters({ ...filters, hp: Number(e.target.value) })} style={{ width: '100%' }} aria-label="Cortar graves" />
          </label>
          <label className="block">
            <span className="muted small">Cortar agudos: {lpOn ? `por encima de ${filters.lp} Hz` : 'sin corte'}</span>
            <input type="range" min={1000} max={12000} step={250} value={filters.lp || 12000} onChange={(e) => setFilters({ ...filters, lp: Number(e.target.value) >= 12000 ? 0 : Number(e.target.value) })} style={{ width: '100%' }} aria-label="Cortar agudos" />
          </label>
          <div className="seg" role="group" aria-label="Centro del estéreo">
            <button className={filters.center === 'keep' ? 'on' : ''} onClick={() => setFilters({ ...filters, center: 'keep' })}>Estéreo</button>
            <button className={filters.center === 'remove' ? 'on' : ''} onClick={() => setFilters({ ...filters, center: 'remove' })}>Quitar el centro</button>
            <button className={filters.center === 'only' ? 'on' : ''} onClick={() => setFilters({ ...filters, center: 'only' })}>Sólo el centro</button>
          </div>
          <p className="muted small">"Quitar el centro" atenúa lo que suena igual en los dos lados (bajo, bombo, a veces la voz o el solista). Sirve sólo en grabaciones estéreo.</p>
        </fieldset>
      </Panel>

      <Panel title="Compases y marcadores" open={!!grid || markers.length > 0}>
        <div className="row">
          <label>
            Tempo{' '}
            <input type="number" min={MIN_BPM} max={MAX_BPM} step={0.5} value={grid?.bpm ?? ''} placeholder="bpm" style={{ width: '5.5em' }} onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= MIN_BPM && v <= MAX_BPM) setGrid({ bpm: v, offset: grid?.offset ?? 0, beats: grid?.beats ?? 4 });
            }} aria-label="Tempo en negras por minuto" />
          </label>
          <button onClick={tap}>Tocar el tempo</button>
          <button onClick={setBeatOne}>El "1" está aquí</button>
          <label>
            Tiempos{' '}
            <select value={grid?.beats ?? 4} onChange={(e) => setGrid({ bpm: grid?.bpm ?? 120, offset: grid?.offset ?? 0, beats: Number(e.target.value) })}>
              {[3, 4, 5, 6, 7].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          {grid && <button onClick={() => setGrid(null)}>Quitar grilla</button>}
        </div>
        <p className="muted small">
          Tocá el botón al compás de la música (3 o más veces) para medir el tempo; con la música sonando, "El 1 está aquí" fija dónde empieza un compás. Después podés repetir compases enteros.
        </p>
        {grid && (
          <div className="row">
            <label>
              <input type="checkbox" checked={clickOn} disabled={!engine.canTune} onChange={(e) => setClickOn(e.target.checked)} /> Click de metrónomo sobre la grilla
            </label>
            <input type="range" min={0.05} max={1} step={0.05} value={clickGain} disabled={!engine.canTune || !clickOn} onChange={(e) => setClickGain(Number(e.target.value))} aria-label="Volumen del click" style={{ flex: '1 1 100px' }} />
            {!engine.canTune && <span className="muted small">Necesita el motor preciso.</span>}
          </div>
        )}
        {grid && clickOn && <p className="muted small">Si el click no cae con la música, corregí el tempo o el "1" hasta que coincidan: es la mejor forma de comprobar la grilla de oído.</p>}
        {grid && (
          <div className="row">
            <span className="muted small">Repetir desde el compás del cursor:</span>
            {[1, 2, 4, 8].map((n) => (
              <button key={n} onClick={() => barLoop(n)}>{n} {n > 1 ? 'compases' : 'compás'}</button>
            ))}
            <button
              disabled={!region}
              onClick={() => {
                const r = region && snapRegion(grid, region, duration);
                if (r) setRegion(r);
              }}
            >
              Ajustar la selección a compases
            </button>
          </div>
        )}
        {markers.length > 0 && (
          <ul className="tracklist">
            {markers.map((m) => (
              <li key={m.id}>
                <button className="link" onClick={() => seek(m.t)}>
                  <b>{m.name}</b>
                  <small>{fmtTime(m.t)}</small>
                </button>
                <button onClick={() => { const n = window.prompt('Nombre del marcador', m.name); if (n && n.trim()) setMarkers(markers.map((x) => (x.id === m.id ? { ...x, name: n.trim().slice(0, 30) } : x))); }} aria-label={`Renombrar ${m.name}`}>✎</button>
                <button onClick={() => setMarkers(markers.filter((x) => x.id !== m.id))} aria-label={`Borrar ${m.name}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Notas: detectar, comparar y pasar a frase" open={!!notes}>
        <div className="row">
          <button className="primary" onClick={detect} disabled={!engine.analysis || detecting}>
            {detecting ? 'Detectando…' : region ? 'Detectar notas de la selección' : 'Detectar notas de lo que se ve'}
          </button>
          {shown && shown.length > 0 && (
            <>
              <button onClick={listen}>{listening ? '■ Detener' : '▶ Escuchar lo detectado'}</button>
              <button onClick={toPhrase}>Pasar a Vocabulario</button>
            </>
          )}
          {notes && <button onClick={() => { setNotes(null); tone.stopLine(); setListening(false); }}>Borrar</button>}
        </div>
        <p className="muted small">
          Es una <b>estimación</b> automática de la melodía: con una banda detrás puede inventar notas (por los armónicos del bajo) o perder otras. Sirve para tener un punto de partida y compararlo de oído con "Escuchar lo detectado"; corregí lo que no coincida. Si el bajo molesta, usá "Aislar trompeta" en Afinación y filtros antes de detectar.
        </p>
        {!engine.analysis && <p className="muted small">Necesita el motor preciso.</p>}
        {notes && (
          <label className="block">
            <span className="muted small">Sensibilidad: se muestran {shown?.length ?? 0} de {notes.length} notas (las más débiles se ocultan)</span>
            <input type="range" min={0} max={0.9} step={0.05} value={sens} onChange={(e) => setSens(Number(e.target.value))} style={{ width: '100%' }} aria-label="Sensibilidad" />
          </label>
        )}
        {shown && shown.length > 0 && (
          <ol className="notelist">
            {shown.slice(0, 120).map((n, i) => (
              <li key={i}>
                <button className="link" onClick={() => seek(n.start)}>
                  <b>{nm(n.midi)}</b> <small>{fmtTime(n.start)} · {Math.round((n.end - n.start) * 1000)} ms{Math.abs(n.cents) >= 15 ? ` · ${n.cents > 0 ? '+' : ''}${n.cents}¢` : ''}</small>
                </button>
              </li>
            ))}
          </ol>
        )}
        <hr />
        <div className="row">
          <b>Nota de referencia</b>
          <select value={refPc} onChange={(e) => setRefPc(Number(e.target.value))} aria-label="Nota">
            {NOTE_PCS.map(([n, pc]) => (
              <option key={pc} value={pc}>{n}</option>
            ))}
          </select>
          <select value={refOct} onChange={(e) => setRefOct(Number(e.target.value))} aria-label="Octava">
            {[2, 3, 4, 5, 6].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <button onClick={() => { engine.pause(); void tone.playNote(refMidi, 1.5); }}>▶ Tocar</button>
        </div>
        <p className="muted small">Toca la nota con trompeta para compararla con el audio. Los nombres son los {written ? 'que lee la trompeta en Si♭ (escritos)' : 'de concierto'}.</p>
      </Panel>

      <Panel title={`Pasajes guardados (${saved.length})`} open={saved.length > 0}>
        <div className="row">
          <input type="text" value={loopName} maxLength={60} placeholder="Nombre (ej.: Solo, compases 5–8)" onChange={(e) => setLoopName(e.target.value)} style={{ flex: 1, minWidth: 160 }} aria-label="Nombre del pasaje" />
          <button className="primary" onClick={saveLoop} disabled={!region}>Guardar selección</button>
        </div>
        {saved.length > 0 && (
          <ul className="tracklist">
            {saved.map((l) => (
              <li key={l.id} className={region && Math.abs(region.start - l.start) < 0.01 && Math.abs(region.end - l.end) < 0.01 ? 'on' : ''}>
                <button className="link" onClick={() => activate(l)}>
                  <b>{l.name}</b>
                  <small>{fmtTime(l.start)} – {fmtTime(l.end)}{l.rate && l.rate !== 1 ? ` · ${Math.round(l.rate * 100)} %` : ''}</small>
                </button>
                <button onClick={() => { const n = window.prompt('Nombre del pasaje', l.name); if (n && n.trim()) setSaved(saved.map((x) => (x.id === l.id ? { ...x, name: n.trim().slice(0, 60) } : x))); }} aria-label={`Renombrar ${l.name}`}>✎</button>
                <button onClick={() => window.confirm(`¿Borrar el pasaje "${l.name}"?`) && setSaved(saved.filter((x) => x.id !== l.id))} aria-label={`Borrar ${l.name}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Apuntes" open={!!text}>
        <textarea value={text} rows={4} maxLength={5000} onChange={(e) => setText(e.target.value)} placeholder="Qué estás sacando, en qué compás estás, dudas…" style={{ width: '100%' }} aria-label="Apuntes" />
      </Panel>

      <p className="muted small">
        {engine.kind === 'buffer' ? 'Motor preciso: loops sin cortes, afinación y filtros.' : 'Reproductor simple del navegador: el loop se corta un instante; sin afinación ni filtros.'}{' '}
        <label>
          <input type="checkbox" checked={simple} onChange={(e) => onSimple(e.target.checked)} /> Usar el reproductor simple
        </label>
      </p>
      <p className="muted small">Teclado: espacio = reproducir · [ ] = inicio y fin · L = loop · M = marcador · ← → = saltar 5 s (Mayús: 1 s) · ↑ ↓ = velocidad · + − = zoom.</p>
    </section>
  );
}
