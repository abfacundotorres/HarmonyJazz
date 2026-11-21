import { useEffect, useRef, useState } from 'react';
import type { Position } from '../../audio/engine';
import { beatsPerBar } from '../../theory/chart';
import type { Chart } from '../../theory/chart';
import { ATRIL_SIZE, clampAtrilSize } from '../../state/atril';
import { usePersistent } from '../../state/storage';
import { useWakeLock } from '../wakeLock';
import type { DocLayout } from '../../content/chartDoc';
import { MEMORIA_MODOS, type MemoriaModo, type MemoriaNivel } from '../../content/memoria';
import { useReading } from '../hooks';
import { ChordBoard } from './ChordInfo';
import { KeySelect } from './KeySelect';

/** Cómo se cambia la tonalidad desde el atril: elegir una de las 12 (temas con tonalidad) o subir y bajar medio tono (sin ella). */
export type AtrilTranspose =
  | { kind: 'key'; value: string; minor: boolean; onChange: (k: string) => void }
  | { kind: 'shift'; shift: number; onShift: (delta: number) => void; onReset: () => void };

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
  memory,
  memoryMode,
  onMemoryMode,
  peek,
  onPeek,
  transpose,
  consigna,
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
  /** Nivel de la grilla ya resuelto (modo de memoria, vuelta y «Mirar»). */
  memory: MemoriaNivel;
  memoryMode: MemoriaModo;
  /** Pasa al modo de memoria siguiente. */
  onMemoryMode: () => void;
  peek: boolean;
  onPeek: () => void;
  /** Para cambiar la tonalidad sin salir del atril. */
  transpose?: AtrilTranspose;
  /** Lo que hay que hacer ahora (la toma completa: «Coro 2 de 3: Improvisá»). */
  consigna?: string | null;
}) {
  const [cfg] = usePersistent<{ size: number }>('atril', { size: ATRIL_SIZE.default });
  const size = clampAtrilSize(cfg.size);
  const { keyLabel: label, view } = useReading();
  const [keysOpen, setKeysOpen] = useState(false);
  useWakeLock(true);

  // pantalla completa (si el navegador lo permite) y Escape para salir. Una sola vez: `onClose` cambia en cada actualización del
  // Play-along (cada tiempo del compás); si el efecto dependiera de él, saldría de la pantalla completa y no podría volver a entrar
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);

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
          {transpose ? (
            <button className={`atril-key ${keysOpen ? 'on' : ''}`} onClick={() => setKeysOpen((o) => !o)} aria-expanded={keysOpen} aria-label="Cambiar la tonalidad">
              ♪ {transpose.kind === 'key' ? `${label(transpose.value)}${transpose.minor ? 'm' : ''}` : transpose.shift === 0 ? 'original' : `${transpose.shift > 0 ? '+' : ''}${transpose.shift}`} ▾
            </button>
          ) : (
            keyLabel && <span className="muted">· {keyLabel}</span>
          )}
          {pos && pos.chorus >= 0 && <span className="muted">· coro {pos.chorus + 1}</span>}
          {pos?.countIn && <span className="muted">· cuenta…</span>}
          <div className="atril-beats" aria-hidden>
            {Array.from({ length: beatsPerBar(chart) }, (_, b) => (
              <i key={b} className={b === beat ? 'on' : ''} />
            ))}
          </div>
          <button onClick={onClose} aria-label="Cerrar el modo atril">✕ Cerrar</button>
        </div>
        {consigna && <p className="atril-consigna" role="status">{consigna}</p>}
        {keysOpen && transpose && (
          <div className="atril-keys" role="group" aria-label="Tonalidad">
            {transpose.kind === 'key' ? (
              <>
                <KeySelect value={transpose.value} onChange={(k) => { transpose.onChange(k); setKeysOpen(false); }} minor={transpose.minor} />
                <p className="muted small">
                  {view === 'Bb'
                    ? `Tocás en ${label(transpose.value)}${transpose.minor ? 'm' : ''} (escrito para Si♭); en concierto suena en ${transpose.value}${transpose.minor ? 'm' : ''}.`
                    : `Tocás en ${transpose.value}${transpose.minor ? 'm' : ''} (concierto).`}
                </p>
              </>
            ) : (
              <div className="row">
                <button onClick={() => transpose.onShift(-1)} aria-label="Bajar un semitono">− ½ tono</button>
                <b>{transpose.shift === 0 ? 'original' : `${transpose.shift > 0 ? '+' : ''}${transpose.shift} semitono${Math.abs(transpose.shift) === 1 ? '' : 's'}`}</b>
                <button onClick={() => transpose.onShift(1)} aria-label="Subir un semitono">+ ½ tono</button>
                {transpose.shift !== 0 && <button onClick={transpose.onReset}>Volver al original</button>}
              </div>
            )}
          </div>
        )}
      </div>

      <ChordBoard chart={chart} current={current} loop={loop} layout={layout} memory={memory} />

      <div className="atril-bar">
        <button className={`play ${playing ? 'on' : ''}`} onClick={onToggle} aria-label={playing ? 'Detener' : 'Reproducir'}>
          {playing ? '■' : '▶'}
        </button>
        <div className="atril-ctl" role="group" aria-label="Tempo">
          <button onClick={() => onTempo(Math.max(40, tempo - 4))} aria-label="Bajar el tempo">−4</button>
          <b>{tempo}<span className="unit"> bpm</span></b>
          <button onClick={() => onTempo(Math.min(320, tempo + 4))} aria-label="Subir el tempo">+4</button>
        </div>
        <div className="atril-ctl" role="group" aria-label="Modo de memoria">
          <button onClick={onMemoryMode} aria-label={`Modo de memoria: ${MEMORIA_MODOS.find((m) => m.id === memoryMode)?.label}. Tocá para cambiar`}>
            🧠 {MEMORIA_MODOS.find((m) => m.id === memoryMode)?.label}
          </button>
          {memoryMode !== 'off' && (
            <button className={peek ? 'on' : ''} aria-pressed={peek} onClick={onPeek} aria-label="Mirar los acordes">👁</button>
          )}
        </div>
      </div>
    </div>
  );
}
