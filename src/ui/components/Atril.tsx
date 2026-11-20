import { useEffect } from 'react';
import type { Position } from '../../audio/engine';
import { beatsPerBar } from '../../theory/chart';
import type { Chart } from '../../theory/chart';
import { ATRIL_SIZE, clampAtrilSize } from '../../state/atril';
import { usePersistent } from '../../state/storage';
import { useWakeLock } from '../wakeLock';
import type { DocLayout } from '../../content/chartDoc';
import { ChordBoard } from './ChordInfo';

/**
 * Modo atril: la grilla en pantalla completa y en letra grande, para leer a distancia con el celular en el atril. Mantiene
 * la pantalla encendida. Casi todo el alto es para los compases: arriba sólo el título y los tiempos, abajo sólo detener y el
 * tempo. El acorde que suena y el que sigue se leen en la grilla misma; el tamaño de la letra se cambia en Más → Ajustes.
 */
export function Atril({
  title,
  keyLabel,
  chart,
  layout,
  current,
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
  layout?: DocLayout | null;
  /** Índice del acorde que suena en `chart` (−1 si no suena). */
  current: number;
  pos: Position | null;
  loop: [number, number] | null;
  tempo: number;
  onTempo: (t: number) => void;
  playing: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [cfg] = usePersistent<{ size: number }>('atril', { size: ATRIL_SIZE.default });
  const size = clampAtrilSize(cfg.size);
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

  const beat = pos && !pos.countIn ? pos.beat : -1;

  return (
    <div className="atril" role="dialog" aria-modal="true" aria-label="Modo atril" style={{ ['--asz' as string]: `${size}rem` }}>
      <div className="atril-head">
        <div className="atril-top">
          <b>{title}</b>
          {keyLabel && <span className="muted">· {keyLabel}</span>}
          {pos && pos.chorus >= 0 && <span className="muted">· coro {pos.chorus + 1}</span>}
          {pos?.countIn && <span className="muted">· cuenta…</span>}
          <div className="atril-beats" aria-hidden>
            {Array.from({ length: beatsPerBar(chart) }, (_, b) => (
              <i key={b} className={b === beat ? 'on' : ''} />
            ))}
          </div>
          <button onClick={onClose} aria-label="Cerrar el modo atril">✕ Cerrar</button>
        </div>
      </div>

      <ChordBoard chart={chart} current={current} loop={loop} layout={layout} />

      <div className="atril-bar">
        <button className={`play ${playing ? 'on' : ''}`} onClick={onToggle} aria-label={playing ? 'Detener' : 'Reproducir'}>
          {playing ? '■' : '▶'}
        </button>
        <div className="atril-ctl" role="group" aria-label="Tempo">
          <button onClick={() => onTempo(Math.max(40, tempo - 4))} aria-label="Bajar el tempo">−4</button>
          <b>{tempo} bpm</b>
          <button onClick={() => onTempo(Math.min(320, tempo + 4))} aria-label="Subir el tempo">+4</button>
        </div>
      </div>
    </div>
  );
}
