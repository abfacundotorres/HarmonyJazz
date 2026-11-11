import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addTrack, decodePeaks, getBlob, listTracks, MAX_DECODE_BYTES, removeTrack, saveMeta, SavedLoop, TrackMeta } from '../../transcribe/audioStore';
import { clampView, fitRegion, fmtTime, followView, loopTarget, normRegion, parseTime, peakRange, Peaks, Region, View, zoomView } from '../../transcribe/regions';

const RATE_PRESETS = [50, 60, 70, 75, 80, 90, 100];
const NUDGE = 0.1;
const newId = () => 'l:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const mb = (n: number) => (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';

export function Transcribe() {
  const [tracks, setTracks] = useState<TrackMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<{ meta: TrackMeta; blob: Blob } | null>(null);
  const [usage, setUsage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTracks(await listTracks());
    } catch (e) {
      setTracks([]);
      setError((e as Error).message);
    }
    try {
      const est = await navigator.storage?.estimate?.();
      if (est?.usage != null && est.quota) setUsage(`${mb(est.usage)} usados de ${mb(est.quota)} disponibles en este navegador`);
    } catch {
      /* sin estimación */
    }
  }, []);
  useEffect(() => {
    void refresh();
    // pide que el navegador no borre los audios si falta espacio
    void navigator.storage?.persist?.().catch(() => undefined);
  }, [refresh]);

  const openTrack = async (m: TrackMeta) => {
    setError(null);
    try {
      const blob = await getBlob(m.id);
      if (!blob) return setError('No se encontró el archivo de este audio.');
      const meta = { ...m, opened: Date.now() };
      void saveMeta(meta);
      setOpen({ meta, blob });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    let last: TrackMeta | null = null;
    for (const f of Array.from(files)) {
      try {
        last = await addTrack(f);
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
    }
    await refresh();
    setBusy(false);
    if (last) void openTrack(last);
  };

  const remove = async (m: TrackMeta) => {
    if (!window.confirm(`¿Borrar "${m.name}" y sus pasajes guardados? No se puede deshacer.`)) return;
    await removeTrack(m.id);
    if (open?.meta.id === m.id) setOpen(null);
    void refresh();
  };

  return (
    <div className="page transcribe">
      <section className="card">
        <h2>Transcribir</h2>
        <p className="muted">
          Cargá un audio, bajale la velocidad sin cambiar el tono, marcá un pasaje para repetirlo en loop y guardalo para seguir otro día.
          Los audios quedan sólo en este navegador: no se suben a ningún lado.
        </p>
        <label className="button primary filebtn">
          {busy ? 'Guardando…' : '+ Cargar audio'}
          <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.oga,.flac,.aac,.opus,.webm" multiple hidden disabled={busy} onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
        </label>
        {error && <p role="alert" style={{ color: 'var(--bad)' }}>{error}</p>}
        {tracks && tracks.length > 0 && (
          <ul className="tracklist">
            {tracks.map((t) => (
              <li key={t.id} className={open?.meta.id === t.id ? 'on' : ''}>
                <button className="link" onClick={() => void openTrack(t)}>
                  <b>{t.name}</b>
                  <small>
                    {mb(t.size)}
                    {t.duration ? ` · ${fmtTime(t.duration, 0)}` : ''}
                    {t.loops.length ? ` · ${t.loops.length} pasaje${t.loops.length === 1 ? '' : 's'}` : ''}
                    {t.pos > 1 ? ` · quedaste en ${fmtTime(t.pos, 0)}` : ''}
                  </small>
                </button>
                <button onClick={() => void remove(t)} aria-label={`Borrar ${t.name}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
        {tracks && tracks.length === 0 && <p className="muted">Todavía no cargaste audios.</p>}
        {usage && <p className="muted small">{usage}</p>}
      </section>

      {open && (
        <TrackPlayer
          key={open.meta.id}
          initial={open.meta}
          blob={open.blob}
          onClose={() => {
            setOpen(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function TrackPlayer({ initial, blob, onClose }: { initial: TrackMeta; blob: Blob; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const [duration, setDuration] = useState(initial.duration ?? 0);
  const [rate, setRate] = useState(initial.rate);
  const [region, setRegion] = useState<Region | null>(initial.region);
  const [loopOn, setLoopOn] = useState(initial.loopOn);
  const [loops, setLoops] = useState<SavedLoop[]>(initial.loops);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(initial.pos);
  const [view, setView] = useState<View>({ start: 0, dur: Math.max(1, initial.duration ?? 60) });
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  const [wave, setWave] = useState<'loading' | 'ok' | 'none'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loopName, setLoopName] = useState('');
  const [saved, setSaved] = useState('');

  // valores "calientes" para el bucle de animación y los eventos
  const regionRef = useRef(region);
  const loopOnRef = useRef(loopOn);
  const viewRef = useRef(view);
  const durRef = useRef(duration);
  const rateRef = useRef(rate);
  const loopsRef = useRef(loops);
  const timeRef = useRef(time);
  timeRef.current = time;
  regionRef.current = region;
  loopOnRef.current = loopOn;
  viewRef.current = view;
  durRef.current = duration;
  rateRef.current = rate;
  loopsRef.current = loops;

  const applyRate = useCallback((r: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = r;
    // sin esto la velocidad también cambiaría el tono
    a.preservesPitch = true;
    (a as unknown as { webkitPreservesPitch: boolean }).webkitPreservesPitch = true;
    (a as unknown as { mozPreservesPitch: boolean }).mozPreservesPitch = true;
  }, []);
  useEffect(() => applyRate(rate), [rate, applyRate]);

  // onda
  useEffect(() => {
    let alive = true;
    setWave('loading');
    void decodePeaks(blob).then((p) => {
      if (!alive) return;
      setPeaks(p);
      setWave(p ? 'ok' : 'none');
    });
    return () => {
      alive = false;
    };
  }, [blob]);
  const gain = useMemo(() => {
    if (!peaks) return 1;
    let m = 0;
    for (let i = 0; i < peaks.max.length; i++) m = Math.max(m, peaks.max[i], -peaks.min[i]);
    return m > 0 ? 0.95 / m : 1;
  }, [peaks]);

  // ---- guardado (para continuar otro día)
  const persist = useCallback(() => {
    const meta: TrackMeta = {
      ...initial,
      duration: durRef.current || initial.duration,
      pos: timeRef.current,
      rate: rateRef.current,
      loopOn: loopOnRef.current,
      region: regionRef.current,
      loops: loopsRef.current,
      opened: Date.now(),
    };
    void saveMeta(meta).catch(() => undefined);
  }, [initial]);
  useEffect(() => {
    const t = setTimeout(persist, 600);
    return () => clearTimeout(t);
  }, [rate, region, loopOn, loops, persist]);
  useEffect(() => {
    const a = audioRef.current;
    const onHide = () => persist();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      persist();
      a?.pause();
    };
  }, [persist]);

  // ---- transporte
  const seek = useCallback((t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.min(Math.max(0, t), Math.max(0, durRef.current - 0.01));
    setTime(a.currentTime);
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    const r = regionRef.current;
    if (loopOnRef.current && r && (a.currentTime < r.start || a.currentTime >= r.end - 0.05)) a.currentTime = r.start;
    void a.play().catch(() => setLoadError('No se pudo reproducir este archivo.'));
  }, []);

  // bucle: vuelve al inicio de la selección y la vista sigue al cursor
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let lastUi = 0;
    const tick = () => {
      const a = audioRef.current;
      if (a && !a.paused) {
        const j = loopTarget(a.currentTime, regionRef.current, loopOnRef.current);
        if (j !== null) a.currentTime = j;
        const v = followView(viewRef.current, a.currentTime, durRef.current);
        if (v !== viewRef.current) setView(v);
        timeRef.current = a.currentTime;
        drawRef.current();
        if (performance.now() - lastUi > 100) {
          lastUi = performance.now();
          setTime(a.currentTime);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const keep = setInterval(persist, 4000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(keep);
    };
  }, [playing, persist]);

  // ---- selección
  const setA = (t: number) => {
    const end = region && region.end > t + 0.1 ? region.end : duration;
    const r = normRegion(t, end, duration);
    if (r) {
      setRegion(r);
      setLoopOn(true);
    }
  };
  const setB = (t: number) => {
    const start = region && region.start < t - 0.1 ? region.start : 0;
    const r = normRegion(start, t, duration);
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

  // ---- pasajes guardados
  const saveLoop = () => {
    if (!region) return;
    const name = loopName.trim() || `Pasaje ${loops.length + 1}`;
    setLoops([...loops, { id: newId(), name: name.slice(0, 60), start: region.start, end: region.end, rate }]);
    setLoopName('');
    setSaved(`"${name}" guardado`);
  };
  const activate = (l: SavedLoop) => {
    const r = normRegion(l.start, l.end, duration);
    if (!r) return;
    setRegion(r);
    setLoopOn(true);
    if (l.rate) setRate(l.rate);
    setView(fitRegion(r, duration));
    seek(r.start);
  };

  // ---- onda
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const drawRef = useRef<() => void>(() => undefined);
  drawRef.current = () => {
    const c = canvasRef.current;
    if (!c || !(durRef.current > 0)) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(c.clientWidth * dpr));
    const H = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    const cs = getComputedStyle(c);
    const col = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
    const cWave = col('--muted', '#888');
    const cAcc = col('--accent', '#e0a030');
    const cLine = col('--line', '#444');
    const cText = col('--text', '#ddd');
    const v = viewRef.current;
    const key = `${W}x${H}|${v.start}|${v.dur}|${peaks ? peaks.max.length : 0}|${gain}|${cWave}`;
    let cache = cacheRef.current;
    if (!cache || cache.key !== key) {
      const off = cache?.canvas ?? document.createElement('canvas');
      off.width = W;
      off.height = H;
      const g = off.getContext('2d')!;
      g.clearRect(0, 0, W, H);
      const mid = H / 2;
      g.fillStyle = cWave;
      if (peaks) {
        for (let x = 0; x < W; x++) {
          const t0 = v.start + (x / W) * v.dur;
          const t1 = v.start + ((x + 1) / W) * v.dur;
          if (t0 > durRef.current) break;
          const [lo, hi] = peakRange(peaks, t0, t1);
          const y1 = mid - hi * gain * mid;
          const y2 = mid - lo * gain * mid;
          g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
        }
      } else {
        g.fillRect(0, mid - 1, W, 2);
      }
      cache = { key, canvas: off };
      cacheRef.current = cache;
    }
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(cache.canvas, 0, 0);
    const xOf = (t: number) => ((t - v.start) / v.dur) * W;
    // regla
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    const step = steps.find((s) => (s / v.dur) * W >= 70 * dpr) ?? 600;
    ctx.font = `${11 * dpr}px system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    for (let t = Math.ceil(v.start / step) * step; t <= v.start + v.dur; t += step) {
      const x = Math.round(xOf(t)) + 0.5;
      ctx.fillStyle = cLine;
      ctx.fillRect(x, 0, 1, H);
      ctx.fillStyle = cText;
      ctx.fillText(fmtTime(t, step < 1 ? 1 : 0), x + 3 * dpr, 2 * dpr);
    }
    const r = regionRef.current;
    if (r) {
      const x1 = xOf(r.start);
      const x2 = xOf(r.end);
      ctx.globalAlpha = loopOnRef.current ? 0.28 : 0.14;
      ctx.fillStyle = cAcc;
      ctx.fillRect(x1, 0, x2 - x1, H);
      ctx.globalAlpha = 1;
      ctx.fillRect(x1 - 1, 0, 3 * dpr, H);
      ctx.fillRect(x2 - 2 * dpr, 0, 3 * dpr, H);
    }
    const xp = xOf(timeRef.current);
    ctx.fillStyle = cText;
    ctx.fillRect(xp - dpr, 0, 2 * dpr, H);
  };
  useEffect(() => {
    drawRef.current();
  }, [view, region, loopOn, peaks, gain, time, duration]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => drawRef.current());
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // ---- gestos sobre la onda: tocar = ir ahí; arrastrar = seleccionar; arrastrar un borde = ajustarlo
  const drag = useRef<{ x0: number; t0: number; moved: boolean; edge: 'start' | 'end' | null } | null>(null);
  const tAt = (clientX: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return view.start + ((clientX - r.left) / r.width) * view.dur;
  };
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = (t: number) => rect.left + ((t - view.start) / view.dur) * rect.width;
    let edge: 'start' | 'end' | null = null;
    if (region) {
      const ds = Math.abs(e.clientX - px(region.start));
      const de = Math.abs(e.clientX - px(region.end));
      if (Math.min(ds, de) < 14) edge = ds <= de ? 'start' : 'end';
    }
    drag.current = { x0: e.clientX, t0: tAt(e.clientX), moved: edge !== null, edge };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x0) > 6) d.moved = true;
    if (!d.moved) return;
    const t = tAt(e.clientX);
    const r =
      d.edge === 'start' && region ? normRegion(t, region.end, duration)
      : d.edge === 'end' && region ? normRegion(region.start, t, duration)
      : normRegion(d.t0, t, duration);
    if (r) setRegion(r);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) seek(d.t0);
    else if (!d.edge && regionRef.current) setLoopOn(true);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  // ---- teclado (en computadora)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
      const a = audioRef.current;
      if (!a) return;
      if (e.key === ' ') toggle();
      else if (e.key === 'l' || e.key === 'L') setLoopOn((v) => !v);
      else if (e.key === '[') setA(a.currentTime);
      else if (e.key === ']') setB(a.currentTime);
      else if (e.key === 'ArrowLeft') seek(a.currentTime - (e.shiftKey ? 1 : 5));
      else if (e.key === 'ArrowRight') seek(a.currentTime + (e.shiftKey ? 1 : 5));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const zoom = (f: number) => setView((v) => zoomView(v, f, v.start <= time && time <= v.start + v.dur ? time : v.start + v.dur / 2, duration));
  const whole = view.dur >= duration - 0.01;

  return (
    <section className="card">
      <header>
        <h3>{initial.name}</h3>
        <button onClick={onClose}>Cerrar</button>
      </header>
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (!Number.isFinite(a.duration) || a.duration <= 0) return setLoadError('No se pudo leer la duración de este archivo.');
          setDuration(a.duration);
          durRef.current = a.duration;
          applyRate(rateRef.current);
          a.currentTime = Math.min(initial.pos, Math.max(0, a.duration - 0.1));
          setTime(a.currentTime);
          setView(initial.region ? fitRegion(initial.region, a.duration) : clampView({ start: 0, dur: a.duration }, a.duration));
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setTime(audioRef.current?.currentTime ?? 0);
          persist();
        }}
        onEnded={() => {
          const r = regionRef.current;
          const a = audioRef.current;
          if (a && loopOnRef.current && r) {
            a.currentTime = r.start;
            void a.play();
          } else setPlaying(false);
        }}
        onError={() => setLoadError('Este archivo no se puede reproducir en este navegador (formato no compatible).')}
      />
      {loadError && <p role="alert" style={{ color: 'var(--bad)' }}>{loadError}</p>}

      <div className="wavewrap">
        <canvas
          ref={canvasRef}
          className="wave"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => (drag.current = null)}
          aria-label="Onda del audio: tocá para ir a un punto, arrastrá para seleccionar un pasaje"
        />
        {wave === 'loading' && <span className="muted small wavemsg">Dibujando la onda…</span>}
        {wave === 'none' && (
          <span className="muted small wavemsg">
            {blob.size > MAX_DECODE_BYTES ? 'Archivo muy grande: sin onda, pero podés marcar pasajes igual.' : 'No se pudo dibujar la onda, pero podés marcar pasajes igual.'}
          </span>
        )}
      </div>
      <div className="row">
        <button onClick={() => zoom(0.5)} disabled={view.dur <= 1.01} aria-label="Acercar">＋</button>
        <button onClick={() => zoom(2)} disabled={whole} aria-label="Alejar">－</button>
        <button onClick={() => setView({ start: 0, dur: duration })} disabled={whole}>Todo</button>
        <button onClick={() => region && setView(fitRegion(region, duration))} disabled={!region}>Ver selección</button>
        <input
          type="range"
          aria-label="Desplazar la vista"
          min={0}
          max={Math.max(0, duration - view.dur)}
          step={0.1}
          value={view.start}
          disabled={whole}
          onChange={(e) => setView(clampView({ start: Number(e.target.value), dur: view.dur }, duration))}
          style={{ flex: 1, minWidth: 120 }}
        />
      </div>

      <div className="row transport">
        <button onClick={() => seek(region && loopOn ? region.start : 0)} aria-label="Ir al inicio">⏮</button>
        <button className="primary bigplay" onClick={toggle} aria-label={playing ? 'Pausa' : 'Reproducir'}>
          {playing ? '❚❚ Pausa' : '▶ Reproducir'}
        </button>
        <b className="timeread">{fmtTime(time)}</b>
        <span className="muted">/ {fmtTime(duration)}</span>
        <button className={loopOn ? 'on' : ''} onClick={() => setLoopOn((v) => !v)} disabled={!region} aria-pressed={loopOn}>
          ⟲ Loop {loopOn ? 'activado' : 'apagado'}
        </button>
      </div>

      <div className="rate">
        <label>
          Velocidad: <b>{Math.round(rate * 100)} %</b>
          <input type="range" min={25} max={200} step={5} value={Math.round(rate * 100)} onChange={(e) => setRate(Number(e.target.value) / 100)} aria-label="Velocidad" />
        </label>
        <div className="seg" role="group" aria-label="Velocidades frecuentes">
          {RATE_PRESETS.map((p) => (
            <button key={p} className={Math.round(rate * 100) === p ? 'on' : ''} onClick={() => setRate(p / 100)}>{p}</button>
          ))}
        </div>
        <p className="muted small">El tono no cambia al bajar la velocidad.</p>
      </div>

      <div className="selection">
        <div className="row">
          <button onClick={() => setA(time)}>Inicio aquí [</button>
          <button onClick={() => setB(time)}>Fin aquí ]</button>
          {region && <button onClick={() => { setRegion(null); setLoopOn(false); }}>Quitar selección</button>}
        </div>
        {region ? (
          <div className="row">
            <span>
              Selección:{' '}
              <button className="link" onClick={() => editTime('start')}>{fmtTime(region.start)}</button> –{' '}
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
          <p className="muted small">Arrastrá sobre la onda para seleccionar un pasaje, o usá "Inicio aquí" y "Fin aquí" mientras suena. Tocá la onda para ir a un punto.</p>
        )}
      </div>

      <div className="savedloops">
        <h4>Pasajes guardados ({loops.length})</h4>
        <div className="row">
          <input type="text" value={loopName} maxLength={60} placeholder="Nombre (ej.: Solo, compases 5–8)" onChange={(e) => { setLoopName(e.target.value); setSaved(''); }} style={{ flex: 1, minWidth: 160 }} aria-label="Nombre del pasaje" />
          <button className="primary" onClick={saveLoop} disabled={!region}>Guardar selección</button>
        </div>
        {saved && <p className="muted small" role="status">{saved}. Se guarda con la velocidad actual.</p>}
        {loops.length > 0 && (
          <ul className="tracklist">
            {loops.map((l) => (
              <li key={l.id} className={region && Math.abs(region.start - l.start) < 0.01 && Math.abs(region.end - l.end) < 0.01 ? 'on' : ''}>
                <button className="link" onClick={() => activate(l)}>
                  <b>{l.name}</b>
                  <small>
                    {fmtTime(l.start)} – {fmtTime(l.end)}
                    {l.rate && l.rate !== 1 ? ` · ${Math.round(l.rate * 100)} %` : ''}
                  </small>
                </button>
                <button
                  onClick={() => {
                    const n = window.prompt('Nombre del pasaje', l.name);
                    if (n && n.trim()) setLoops(loops.map((x) => (x.id === l.id ? { ...x, name: n.trim().slice(0, 60) } : x)));
                  }}
                  aria-label={`Renombrar ${l.name}`}
                >
                  ✎
                </button>
                <button onClick={() => window.confirm(`¿Borrar el pasaje "${l.name}"?`) && setLoops(loops.filter((x) => x.id !== l.id))} aria-label={`Borrar ${l.name}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="muted small">Teclado: espacio = reproducir, [ y ] = inicio y fin, L = loop, ← → = saltar 5 s (con Mayús, 1 s).</p>
    </section>
  );
}
