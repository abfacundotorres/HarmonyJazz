import { MutableRefObject, useEffect, useId, useMemo, useRef, useState } from 'react';
import { engine, Mix, PlayOptions, Style, STYLE_LABEL } from '../../audio/engine';
import type { MelNote } from '../../exercises/generators';
import { beatsPerBar, type Chart } from '../../theory/chart';
import { useSettings } from '../hooks';
import { Ecualizador } from './Ecualizador';
import { NumberField } from './NumberField';
import { usePosition } from '../usePosition';
import { useWakeLock } from '../wakeLock';

export interface PlayerProps {
  chart: Chart;
  tempo: number;
  onTempo: (t: number) => void;
  melody?: MelNote[];
  style?: Style;
  /** Mostrar la opción de escuchar la línea notada. */
  allowMelody?: boolean;
  /** Si está, manda sobre «Oír la línea»: la melodía suena (true) o no (false) sin pasar por el botón del reproductor. */
  oirLinea?: boolean;
  defaultMetronome?: boolean;
  /** Identificador estable para saber si este reproductor es el que suena. */
  owner?: string;
  onPlayingChange?: (playing: boolean) => void;
  /** Con nombre, el play-along sigue sonando al cambiar de pantalla y se maneja desde la barra flotante. */
  label?: string;
  /** Dirección para volver a este tema desde la barra flotante. */
  href?: string;
  /** Para que otra pantalla (el modo atril) pueda iniciar y detener este reproductor. */
  controlRef?: MutableRefObject<PlayerControl | null>;
}

/** Lo que otra pantalla puede pedirle al reproductor. */
export interface PlayerControl {
  toggle: () => void;
  playing: boolean;
  /** Arranca (con cuenta previa) y se detiene solo tras `choruses` coros: una toma completa. Devuelve si arrancó. */
  start: (choruses: number) => Promise<boolean>;
}

export function Player({ chart, tempo, onTempo, melody, style: initialStyle = 'swing', allowMelody, oirLinea, defaultMetronome, owner, onPlayingChange, controlRef, label, href }: PlayerProps) {
  const autoId = useId();
  const id = owner ?? autoId;
  const [settings, setSettings] = useSettings();
  // si ya suena (volvió de otra pantalla con el play-along de fondo), se retoma el estado en vez de arrancar de cero
  const retoma = !!label && engine.playing && engine.options?.owner === id;
  const [playing, setPlaying] = useState(retoma);
  const [paused, setPaused] = useState(retoma && engine.paused);
  const [countIn, setCountIn] = useState(true);
  const [mix, setMix] = useState<Mix>({ piano: true, bass: true, drums: true, melody: false, metronome: !!defaultMetronome });
  /** La mezcla que suena: «Oír la línea» puede venir impuesto desde afuera. */
  const mixSuena = useMemo<Mix>(() => (oirLinea === undefined ? mix : { ...mix, melody: oirLinea }), [mix, oirLinea]);
  const [style, setStyle] = useState<Style>(initialStyle);
  useEffect(() => setStyle(initialStyle), [initialStyle]);

  // compás de la progresión: en 3/4 y 6/8 hay swing y balada (los demás estilos son de 4/4)
  const meter = chart.meter;
  const bpb = beatsPerBar(chart);
  const styleList = (Object.keys(STYLE_LABEL) as Style[]).filter((x) => !meter || x === 'swing' || x === 'ballad');
  const shownStyle = styleList.includes(style) ? style : 'swing';
  // subir el tempo solo (de a `step` bpm cada `every` vueltas, hasta `max`)
  const [rampOn, setRampOn] = useState(false);
  const [rampStep, setRampStep] = useState(4);
  const [rampEvery, setRampEvery] = useState(2);
  const [rampMax, setRampMax] = useState(200);
  const ramp = rampOn ? { step: rampStep, every: rampEvery, max: Math.max(rampMax, tempo) } : undefined;
  const pos = usePosition();
  /** Tempo de la vuelta que suena (distinto del elegido si se está subiendo solo). */
  const live = pos && pos.owner === id && playing && pos.tempo ? Math.round(pos.tempo) : null;

  // límite de coros de una toma completa: se mantiene si el motor se reinicia por un cambio en vivo
  const limit = useRef<number | null>(null);
  const opts = (): PlayOptions => ({
    chart, tempo, swing: settings.swing, style, countIn, melody, mix: mixSuena, owner: id, ramp, label, href,
    ...(limit.current ? { choruses: limit.current, onEnd: () => { limit.current = null; setPlaying(false); } } : {}),
  });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // si otro reproductor toma el motor, este se marca detenido
  useEffect(() => engine.onPosition((p) => {
    if (p.owner !== id && playing) setPlaying(false);
  }) as () => void, [id, playing]);

  // pausa, seguir o stop pedidos desde la barra flotante
  useEffect(() => engine.onState(() => {
    const mine = engine.playing && engine.options?.owner === id;
    setPlaying(mine);
    setPaused(mine && engine.paused);
  }) as () => void, [id]);
  const adoptado = useRef(false);
  // al volver con el tema sonando, el tempo que suena manda sobre el que traía la pantalla
  useEffect(() => {
    if (retoma && engine.options && engine.options.tempo !== tempo) {
      adoptado.current = true;
      onTempo(engine.options.tempo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => onPlayingChange?.(playing), [playing, onPlayingChange]);
  useWakeLock(playing);

  // aplicar cambios en vivo (reinicia el chorus)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (adoptado.current) {
      // el tempo recién retomado del motor ya es el que suena: no hay que reiniciar nada
      adoptado.current = false;
      return;
    }
    if (playing) {
      const t = setTimeout(() => engine.update(optsRef.current()), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempo, settings.swing, mixSuena, style, chart, melody, rampOn, rampStep, rampEvery, rampMax]);

  // detener al desmontar
  useEffect(() => () => {
    if (engine.options?.owner === id && !engine.enFondo) engine.stop();
  }, [id]);

  const [error, setError] = useState<string | null>(null);

  // los instrumentos reales (~3 MB) se piden al abrir la pantalla, para que ▶ no espere
  useEffect(() => {
    engine.preload();
  }, []);
  useEffect(() => engine.setVolume(settings.volume), [settings.volume]);
  useEffect(() => engine.setMixer(settings.mixer), [settings.mixer]);
  useEffect(() => {
    const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const mode = settings.output === 'auto' ? (touch ? 'phone' : 'normal') : settings.output;
    engine.setOutputMode(mode);
  }, [settings.output]);
  const [samples, setSamples] = useState(engine.samples);
  useEffect(() => {
    const id = setInterval(() => setSamples(engine.samples), 300);
    return () => clearInterval(id);
  }, []);

  const [starting, setStarting] = useState(false);

  const toggle = async () => {
    setError(null);
    if (playing || starting) {
      // un segundo toque mientras se prepara el audio también cancela
      limit.current = null;
      engine.stop();
      setPlaying(false);
      setPaused(false);
      setStarting(false);
      return;
    }
    setStarting(true);
    try {
      const started = await engine.play(opts());
      setPlaying(started);
    } catch (e) {
      console.error(e);
      setError('No se pudo iniciar el audio: ' + ((e as Error).message || 'error desconocido') + '. Probá tocar de nuevo.');
    } finally {
      setStarting(false);
    }
  };

  /** Una toma completa: siempre con cuenta previa y parando solo tras `choruses` coros. */
  const start = async (choruses: number) => {
    setError(null);
    limit.current = Math.max(1, Math.round(choruses));
    setStarting(true);
    try {
      const started = await engine.play({ ...opts(), countIn: true });
      setPlaying(started);
      if (!started) limit.current = null;
      return started;
    } catch (e) {
      console.error(e);
      limit.current = null;
      setError('No se pudo iniciar el audio: ' + ((e as Error).message || 'error desconocido') + '. Probá tocar de nuevo.');
      return false;
    } finally {
      setStarting(false);
    }
  };

  if (controlRef) controlRef.current = { toggle: () => void toggle(), playing, start };

  const tog = (k: keyof Mix) => setMix((m) => ({ ...m, [k]: !m[k] }));

  return (
    <div className="player">
      <button
        className={`play ${playing ? 'on' : ''}`}
        onClick={toggle}
        aria-label={playing ? 'Detener' : starting ? 'Preparando el audio (tocá para cancelar)' : 'Reproducir'}
      >
        {playing ? '■' : starting ? '…' : '▶'}
      </button>
      {playing && (
        <button className="pausa" onClick={() => (paused ? void engine.resume() : engine.pause())} aria-label={paused ? 'Seguir' : 'Pausa'} aria-pressed={paused}>
          {paused ? '▶' : '⏸'}
        </button>
      )}
      <label className="tempo">
        <span>
          <b>{tempo}</b> bpm{live !== null && live !== tempo ? <> · sonando a <b>{live}</b></> : null}
        </span>
        <input type="range" min={40} max={320} step={2} value={tempo} onChange={(e) => onTempo(Number(e.target.value))} />
      </label>
      <div className="tempo-nudge">
        <button onClick={() => onTempo(Math.max(40, tempo - 4))}>−4</button>
        <button onClick={() => onTempo(Math.min(320, tempo + 4))}>+4</button>
      </div>
      <div className="mix">
        {!mix.metronome && (
          <>
            <Chip on={mix.piano} onClick={() => tog('piano')}>Piano</Chip>
            <Chip on={mix.bass} onClick={() => tog('bass')}>Bajo</Chip>
            <Chip on={mix.drums} onClick={() => tog('drums')}>Batería</Chip>
          </>
        )}
        <Chip on={mix.metronome} onClick={() => tog('metronome')}>{meter === '3/4' ? 'Sólo 2 y 3' : meter === '6/8' ? 'Sólo el 2.º pulso' : 'Sólo 2 y 4'}</Chip>
        {allowMelody && melody && (
          <Chip on={mix.melody} onClick={() => tog('melody')}>Oír la línea</Chip>
        )}
      </div>
      <select className="style" value={shownStyle} onChange={(e) => setStyle(e.target.value as Style)} aria-label="Estilo">
        {styleList.map((s) => (
          <option key={s} value={s}>{STYLE_LABEL[s]}</option>
        ))}
      </select>
      {meter && <p className="muted small player-note">{meter === '3/4' ? 'Compás de 3/4: el tempo marca la negra (tres por compás).' : 'Compás de 6/8: el tempo marca la negra con puntillo (dos pulsos por compás).'}</p>}
      {error && <p className="error player-note">{error}</p>}
      {samples === 'loading' && <p className="muted small player-note" role="status">Cargando instrumentos reales (unos 3 MB)… la primera vez puede tardar un poco.</p>}
      {samples === 'synth' && <p className="muted small player-note" role="status">No se pudieron cargar los instrumentos reales (¿sin conexión?): se usan sonidos sintetizados.</p>}
      {playing && <LevelMeter />}
      <details className="more">
        <summary>Más</summary>
        <label>
          Swing{' '}
          <input
            type="range" min={0.5} max={0.72} step={0.01} value={settings.swing}
            onChange={(e) => setSettings({ swing: Number(e.target.value) })}
          />{' '}
          {settings.swing <= 0.52 ? 'recto' : settings.swing >= 0.66 ? 'tresillo' : Math.round(settings.swing * 100) + '%'}
        </label>
        <label>
          Volumen{' '}
          <input
            type="range" min={-14} max={2} step={1} value={settings.volume}
            onChange={(e) => setSettings({ volume: Number(e.target.value) })}
          />{' '}
          {settings.volume > 0 ? '+' : ''}{settings.volume} dB
        </label>
        <Ecualizador />
        <label>
          Salida{' '}
          <select value={settings.output} onChange={(e) => setSettings({ output: e.target.value as typeof settings.output })}>
            <option value="auto">Automática</option>
            <option value="phone">Altavoz del celular (más graves y presencia)</option>
            <option value="normal">Auriculares / parlantes</option>
          </select>
        </label>
        <label>
          Estilo de cifrado{' '}
          <select value={settings.chordStyle} onChange={(e) => setSettings({ chordStyle: e.target.value as typeof settings.chordStyle })}>
            <option value="ireal">iReal (Δ7, -7, ø7)</option>
            <option value="full">Completo (maj7, m7, m7♭5)</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> Cuenta de {bpb}
        </label>
        <label>
          <input type="checkbox" checked={rampOn} onChange={(e) => setRampOn(e.target.checked)} /> Acelerar solo
        </label>
        {rampOn && (
          <div className="ramp">
            <span>
              Sube (bpm) <NumberField label="Cuánto sube, en bpm" value={rampStep} min={1} max={20} onCommit={setRampStep} />
            </span>
            <span>
              Cada (vueltas) <NumberField label="Cada cuántas vueltas sube" value={rampEvery} min={1} max={20} onCommit={setRampEvery} />
            </span>
            <span>
              Hasta (bpm) <NumberField label="Máximo al que llega, en bpm" value={rampMax} min={40} max={320} onCommit={setRampMax} />
            </span>
          </div>
        )}
      </details>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

/**
 * Muestra cuánto sonido genera la app. Si la barra se mueve y no se oye nada, el problema está en el
 * teléfono (volumen, modo silencio, salida de audio) y no en la app.
 */
function LevelMeter() {
  const bar = useRef<HTMLElement>(null);
  const [state, setState] = useState(engine.audioState);
  const [silent, setSilent] = useState(false);
  useEffect(() => {
    let raf = 0;
    let quiet = 0;
    const tick = () => {
      const l = engine.level();
      if (bar.current) bar.current.style.width = `${Math.round(l * 100)}%`;
      quiet = l < 0.02 ? quiet + 1 : 0;
      setSilent(quiet > 90); // ~1,5 s seguidos sin señal
      setState(engine.audioState);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="level player-note" role="status">
      <div className="level-track" aria-hidden>
        <i ref={bar} />
      </div>
      <span className="muted small">
        {state !== 'running'
          ? `El audio del navegador está en pausa (${state}). Tocá de nuevo ▶ para reanudarlo.`
          : silent
            ? 'La app no está generando sonido: revisá que Piano, Bajo o Batería estén activados.'
            : 'La barra muestra el sonido que genera la app. Si se mueve y no lo oís: subí el volumen del teléfono y, en iPhone, desactivá el modo silencio.'}
      </span>
    </div>
  );
}
