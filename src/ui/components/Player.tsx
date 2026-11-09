import { useEffect, useId, useRef, useState } from 'react';
import { engine, Mix, PlayOptions } from '../../audio/engine';
import type { MelNote } from '../../exercises/generators';
import type { Chart } from '../../theory/chart';
import { useSettings } from '../hooks';

export interface PlayerProps {
  chart: Chart;
  tempo: number;
  onTempo: (t: number) => void;
  melody?: MelNote[];
  feel?: 'walking' | 'two';
  /** Mostrar la opción de escuchar la línea notada. */
  allowMelody?: boolean;
  defaultMetronome?: boolean;
  /** Identificador estable para saber si este reproductor es el que suena. */
  owner?: string;
  onPlayingChange?: (playing: boolean) => void;
}

export function Player({ chart, tempo, onTempo, melody, feel = 'walking', allowMelody, defaultMetronome, owner, onPlayingChange }: PlayerProps) {
  const autoId = useId();
  const id = owner ?? autoId;
  const [settings, setSettings] = useSettings();
  const [playing, setPlaying] = useState(false);
  const [countIn, setCountIn] = useState(true);
  const [mix, setMix] = useState<Mix>({ piano: true, bass: true, drums: true, melody: false, metronome: !!defaultMetronome });
  const [bassFeel, setBassFeel] = useState(feel);

  const opts = (): PlayOptions => ({
    chart, tempo, swing: settings.swing, feel: bassFeel, countIn, melody, mix, owner: id,
  });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // si otro reproductor toma el motor, este se marca detenido
  useEffect(() => engine.onPosition((p) => {
    if (p.owner !== id && playing) setPlaying(false);
  }) as () => void, [id, playing]);

  useEffect(() => onPlayingChange?.(playing), [playing, onPlayingChange]);

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
  }, [tempo, settings.swing, mix, bassFeel, chart, melody]);

  // detener al desmontar
  useEffect(() => () => {
    if (engine.options?.owner === id) engine.stop();
  }, [id]);

  const toggle = async () => {
    if (playing) {
      engine.stop();
      setPlaying(false);
    } else {
      await engine.play(opts());
      setPlaying(true);
    }
  };

  const tog = (k: keyof Mix) => setMix((m) => ({ ...m, [k]: !m[k] }));

  return (
    <div className="player">
      <button className={`play ${playing ? 'on' : ''}`} onClick={toggle} aria-label={playing ? 'Detener' : 'Reproducir'}>
        {playing ? '■' : '▶'}
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
          <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} /> Cuenta de 4
        </label>
        <label>
          Bajo{' '}
          <select value={bassFeel} onChange={(e) => setBassFeel(e.target.value as 'walking' | 'two')}>
            <option value="walking">walking (4)</option>
            <option value="two">en 2</option>
          </select>
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
