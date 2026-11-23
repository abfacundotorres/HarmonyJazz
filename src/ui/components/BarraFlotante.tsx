import { useSyncExternalStore } from 'react';
import { accionesSonando, getSonando, subscribeSonando } from '../../audio/sonando';

/**
 * Barra baja y chica con pausa/seguir y stop del play-along, visible en cualquier pantalla mientras suena o está en pausa.
 * No importa el motor de audio: sólo lee el estado que él publica.
 */
export function BarraFlotante({ pantalla }: { pantalla: string }) {
  const s = useSyncExternalStore(subscribeSonando, getSonando);
  if (!s) return null;
  const a = accionesSonando();
  return (
    <div className="barra-flotante" role="region" aria-label="Play-along sonando">
      <button className="bf-pp" onClick={() => (s.paused ? a?.resume() : a?.pause())} aria-label={s.paused ? 'Seguir' : 'Pausa'}>
        {s.paused ? '▶' : '⏸'}
      </button>
      <button className="bf-stop" onClick={() => a?.stop()} aria-label="Detener">■</button>
      <span className="bf-nombre">
        {s.label}
        {s.paused && <span className="muted small"> · en pausa</span>}
      </span>
      {s.href && pantalla !== 'playalong' && <a className="bf-ir" href={s.href}>Abrir</a>}
    </div>
  );
}
