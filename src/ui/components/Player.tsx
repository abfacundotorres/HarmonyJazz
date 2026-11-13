import { MutableRefObject, useEffect, useId, useRef, useState } from 'react';
import { engine, Mix, PlayOptions, Style, STYLE_LABEL } from '../../audio/engine';
import type { MelNote } from '../../exercises/generators';
import type { Chart } from '../../theory/chart';
import { useSettings } from '../hooks';
import { useWakeLock } from '../wakeLock';

export interface PlayerProps {
  chart: Chart;
  tempo: number;
  onTempo: (t: number) => void;
  melody?: MelNote[];
  style?: Style;
  /** Mostrar la opción de escuchar la línea notada. */
  allowMelody?: boolean;
  defaultMetronome?: boolean;
  /** Identificador estable para saber si este reproductor es el que suena. */
  owner?: string;
  onPlayingChange?: (playing: boolean) => void;
  /** Para que otra pantalla (el modo atril) pueda iniciar y detener este reproductor. */
  controlRef?: MutableRefObject<{ toggle: () => void; playing: boolean } | null>;
}

export function Player({ chart, tempo, onTempo, melody, style: initialStyle = 'swing', allowMelody, defaultMetronome, owner, onPlayingChange, controlRef }: PlayerProps) {
  const autoId = useId();
  const id = owner ?? autoId;
  const [settings, setSettings] = useSettings();
  const [playing, setPlaying] = useState(false);
  const [countIn, setCountIn] = useState(true);
  const [mix, setMix] = useState<Mix>({ piano: true, bass: true, drums: true, melody: false, metronome: !!defaultMetronome });
  const [style, setStyle] = useState<Style>(initialStyle);
  useEffect(() => setStyle(initialStyle), [initialStyle]);

  const opts = (): PlayOptions => ({
    chart, tempo, swing: settings.swing, style, countIn, melody, mix, owner: id,
  });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // si otro reproductor toma el motor, este se marca detenido
  useEffect(() => engine.onPosition((p) => {
    if (p.owner !== id && playing) setPlaying(false);
  }) as () => void, [id, playing]);

  useEffect(() => onPlayingChange?.(playing), [playing, onPlayingChange]);
  useWakeLock(playing);

  // aplicar cambios en vivo (reinicia el chorus)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (playing) {
      const t = setTimeout(() => engine.update(optsRef.current()), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempo, settings.swing, mix, style, chart, melody]);

  // detener al desmontar
  useEffect(() => () => {
    if (engine.options?.owner === id) engine.stop();
  }, [id]);

  const [error, setError] = useState<string | null>(null);

  // los instrumentos reales (~3 MB) se piden al abrir la pantalla, para que ▶ no espere
  useEffect(() => {
    engine.preload();
  }, []);
  useEffect(() => engine.setVolume(settings.volume), [settings.volume]);
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
      engine.stop();
      setPlaying(false);
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

  if (controlRef) controlRef.current = { toggle: () => void toggle(), playing };

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
      <label className="tempo">
        <span>
          <b>{tempo}</b> bpm
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
        <Chip on={mix.metronome} onClick={() => tog('metronome')}>Sólo 2 y 4</Chip>
        {allowMelody && melody && (
          <Chip on={mix.melody} onClick={() => tog('melody')}>Oír la línea</Chip>
        )}
      </div>
      <select className="style" value={style} onChange={(e) => setStyle(e.target.value as Style)} aria-label="Estilo">
        {(Object.keys(STYLE_LABEL) as Style[]).map((s) => (
          <option key={s} value={s}>{STYLE_LABEL[s]}</option>
        ))}
      </select>
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
          <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> Cuenta de 4
        </label>
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
