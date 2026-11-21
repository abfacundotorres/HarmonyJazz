import { useEffect, useState } from 'react';
import { COROS_TOMA, consignaToma, duracionToma, guionToma, PARTE_TEXTO } from '../../content/toma';

/**
 * Toma completa del tema: un botón enciende el micrófono, graba y toca el acompañamiento con cuenta previa durante unos coros
 * (melodía, solo, melodía), diciendo qué hacer en cada uno, y se detiene solo. Después aparece «Tu toma».
 */
export function TomaCompleta({
  activa,
  coros,
  onCoros,
  coro,
  compases,
  pulsosPorCompas,
  tempo,
  abierta,
  mensaje,
  onEmpezar,
  onCortar,
}: {
  activa: boolean;
  coros: number;
  onCoros: (n: number) => void;
  /** El coro que suena (0 = el primero, −1 = cuenta previa). */
  coro: number;
  compases: number;
  pulsosPorCompas: number;
  tempo: number;
  abierta: boolean;
  mensaje: string;
  onEmpezar: () => void;
  onCortar: () => void;
}) {
  const guion = guionToma(coros);
  // estado propio: si `open` dependiera de «activa», la tarjeta se cerraría sola al terminar la toma y taparía el botón y los avisos
  const [open, setOpen] = useState(abierta);
  useEffect(() => {
    if (activa || mensaje) setOpen(true);
  }, [activa, mensaje]);
  return (
    <details className="card toma" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary><h3>🎙 Grabar una toma completa</h3></summary>
      <p className="muted small">
        Para el paso «Grabado completo»: {guion.map((p) => PARTE_TEXTO[p].toLowerCase()).join(' → ')}, de principio a fin sobre el acompañamiento y sin parar.
        Usá auriculares: si no, el micrófono capta el acompañamiento. Dura unos {duracionToma(coros, compases, tempo, pulsosPorCompas)} segundos al tempo elegido.
      </p>
      {activa ? (
        <>
          <p role="status" className="tomaconsigna"><b>{consignaToma(coros, coro)}</b></p>
          <div className="row"><button onClick={onCortar}>■ Cortar la toma</button></div>
        </>
      ) : (
        <div className="row">
          <label>
            Coros{' '}
            <select value={coros} onChange={(e) => onCoros(Number(e.target.value))} aria-label="Cantidad de coros de la toma">
              {COROS_TOMA.map((n) => <option key={n} value={n}>{n}{n === 3 ? ' (melodía, solo, melodía)' : ''}</option>)}
            </select>
          </label>
          <button className="primary" onClick={onEmpezar}>● Empezar la toma</button>
        </div>
      )}
      {mensaje && <p role="alert" className="error">{mensaje}</p>}
    </details>
  );
}
