import type { Seccion } from '../../content/flojos';
import { rangoCompases } from '../../content/mapaArmonico';

/**
 * Bucle por sección y compases flojos del Play-along: un botón por sección (A, B…) que la deja en loop, y, si el tema está
 * guardado, la marca de los compases que se traban para trabajarlos de a un tramo.
 */
export function PracticaTramos({
  secciones,
  loop,
  onSeccion,
  flojos,
  marcando,
  onMarcando,
  onRecorrer,
  onBorrar,
  tramoActual,
}: {
  secciones: Seccion[];
  /** Loop actual (de lo que se toca) y a qué sección corresponde, si es el caso. */
  loop: [number, number] | null;
  onSeccion: (s: Seccion) => void;
  /** null si el tema no está guardado (no hay dónde recordar las marcas). */
  flojos: { cuantos: number; tramos: [number, number][] } | null;
  marcando: boolean;
  onMarcando: () => void;
  onRecorrer: () => void;
  onBorrar: () => void;
  tramoActual: [number, number] | null;
}) {
  if (!secciones.length && !flojos) return null;
  return (
    <div className="tramos">
      {secciones.length > 0 && (
        <div className="row" role="group" aria-label="Loop por sección">
          <span className="muted small">Loop de la sección</span>
          {secciones.map((s) => (
            <button key={s.nombre + s.desde} onClick={() => onSeccion(s)} aria-label={`Loop de la sección ${s.nombre}, ${rangoCompases(s.desde, s.hasta)}`}>
              {s.nombre}
            </button>
          ))}
        </div>
      )}
      {flojos && (
        <div className="row" role="group" aria-label="Compases flojos">
          <button className={marcando ? 'on' : ''} aria-pressed={marcando} onClick={onMarcando}>
            ⚑ {marcando ? 'Listo' : 'Marcar compases flojos'}
          </button>
          {flojos.cuantos > 0 && (
            <>
              <button onClick={onRecorrer} aria-label="Practicar el siguiente tramo flojo">
                ↻ Practicar flojos ({flojos.cuantos})
              </button>
              <button onClick={onBorrar}>Borrar marcas</button>
            </>
          )}
        </div>
      )}
      {marcando && <p className="muted small" role="status">Tocá los compases que se te traban; vuelve a tocarlos para desmarcarlos.</p>}
      {!marcando && tramoActual && loop && <p className="muted small" role="status">Tramo flojo: {rangoCompases(tramoActual[0], tramoActual[1])}.</p>}
    </div>
  );
}
