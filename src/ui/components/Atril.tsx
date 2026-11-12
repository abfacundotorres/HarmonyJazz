import { useEffect } from 'react';
import type { Position } from '../../audio/engine';
import { Chord, chordSymbol, transposeChord } from '../../theory/chords';
import type { Chart } from '../../theory/chart';
import { usePersistent } from '../../state/storage';
import { useReading } from '../hooks';
import { useWakeLock } from '../wakeLock';
import { ChordBoard } from './ChordInfo';

/**
 * Modo atril: la grilla y el acorde actual en pantalla completa y en letra grande, para leer a distancia con el
 * celular en el atril. Mantiene la pantalla encendida. El tamaño se ajusta y se recuerda.
 */
export function Atril({
  title,
  keyLabel,
  chart,
  current,
  chord,
  next,
  pos,
  loop,
  tempo,
  onTempo,
  playing,
  onToggle,
  onClose,
}: {
  title: string;
  keyLabel: string | null;
  chart: Chart;
  /** Índice del acorde que suena en `chart` (−1 si no suena). */
  current: number;
  chord: Chord | null;
  next: Chord | null;
  pos: Position | null;
  loop: [number, number] | null;
  tempo: number;
  onTempo: (t: number) => void;
  playing: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { iv } = useReading();
  const [cfg, setCfg] = usePersistent<{ size: number }>('atril', { size: 2 });
  const size = Math.min(5, Math.max(1.2, cfg.size));
  useWakeLock(true);

  // pantalla completa (si el navegador lo permite) y Escape para salir
  useEffect(() => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [onClose]);

  // el compás que suena queda a la vista
  useEffect(() => {
    document.querySelector('.atril .bar.now')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [pos?.bar, pos?.chorus]);

  const sym = (c: Chord) => chordSymbol(transposeChord(c, iv), true);
  const beat = pos && !pos.countIn ? pos.beat : -1;

  return (
    <div className="atril" role="dialog" aria-modal="true" aria-label="Modo atril" style={{ ['--asz' as string]: `${size}rem` }}>
      <div className="atril-head">
      <div className="atril-top">
        <b>{title}</b>
        {keyLabel && <span className="muted">· {keyLabel}</span>}
        {pos && pos.chorus >= 0 && <span className="muted">· coro {pos.chorus + 1}</span>}
        {pos?.countIn && <span className="muted">· cuenta…</span>}
        <button onClick={onClose} aria-label="Cerrar el modo atril">✕ Cerrar</button>
      </div>

      <div className="atril-now" aria-live="off">
        <div className="atril-sym">{chord ? sym(chord) : '—'}</div>
        <div className="atril-side">
          <div className="atril-beats" aria-hidden>
            {[0, 1, 2, 3].map((b) => (
              <i key={b} className={b === beat ? 'on' : ''} />
            ))}
          </div>
          {next && <div className="atril-next">sigue <b>{sym(next)}</b></div>}
        </div>
      </div>
      </div>

      <ChordBoard chart={chart} current={current} loop={loop} />

      <div className="atril-bar">
        <button className={`play ${playing ? 'on' : ''}`} onClick={onToggle} aria-label={playing ? 'Detener' : 'Reproducir'}>
          {playing ? '■' : '▶'}
        </button>
        <div className="atril-ctl" role="group" aria-label="Tempo">
          <button onClick={() => onTempo(Math.max(40, tempo - 4))} aria-label="Bajar el tempo">−4</button>
          <b>{tempo} bpm</b>
          <button onClick={() => onTempo(Math.min(320, tempo + 4))} aria-label="Subir el tempo">+4</button>
        </div>
        <div className="atril-ctl" role="group" aria-label="Tamaño de la letra">
          <button onClick={() => setCfg({ size: Math.max(1.2, size - 0.3) })} aria-label="Letra más chica">A−</button>
          <button onClick={() => setCfg({ size: Math.min(5, size + 0.3) })} aria-label="Letra más grande">A+</button>
        </div>
      </div>
    </div>
  );
}
