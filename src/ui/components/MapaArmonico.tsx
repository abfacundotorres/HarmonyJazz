import { useMemo, useState } from 'react';
import { mapaArmonico, rangoCompases, gradoDelCentro } from '../../content/mapaArmonico';
import type { DocLayout } from '../../content/chartDoc';
import { transposeChart } from '../../theory/chart';
import type { Chart } from '../../theory/chart';
import { parseNote, pc, simplify, transposeNote } from '../../theory/notes';
import { useReading } from '../hooks';

/**
 * Mapa armónico de lo que se está tocando: los patrones (ii–V–I, dominantes, turnarounds…) y los centros tonales, con los
 * compases de cada uno y un botón para dejarlo en loop. Lee el cifrado como se ve (en Si♭ o en concierto).
 */
export function MapaArmonico({
  chart,
  layout,
  keyValue,
  minor,
  onLoop,
}: {
  /** La progresión en concierto, en la tonalidad en que suena. */
  chart: Chart;
  layout?: DocLayout | null;
  /** Tonalidad (concierto) si el tema tiene una sola; null si no. */
  keyValue: string | null;
  minor: boolean;
  /** Deja en loop los compases (de lo que se toca, 0-based). */
  onLoop?: (desde: number, hasta: number) => void;
}) {
  const { iv } = useReading();
  const [open, setOpen] = useState(false);
  const orden = layout && layout.order.length === chart.bars ? layout.order : undefined;
  const mapa = useMemo(() => {
    if (!open) return null;
    const escrito = transposeChart(chart, iv);
    const tonica = keyValue ? { pc: pc(simplify(transposeNote(parseNote(keyValue), iv))), menor: minor } : undefined;
    return mapaArmonico(escrito, { tonica, orden });
  }, [open, chart, iv, keyValue, minor, orden]);

  const sonados = (desde: number, hasta: number): [number, number] | null => {
    if (!orden) return [desde, hasta];
    const a = orden.indexOf(desde);
    const b = orden.indexOf(hasta);
    return a >= 0 && b >= a ? [a, b] : null;
  };

  return (
    <details className="mapa" open={open} onToggle={(e) => e.target === e.currentTarget && setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Mapa armónico del tema</summary>
      {mapa && (
        <>
          <p className="muted small">
            Los patrones que la app reconoce en los acordes. Es una lectura automática del cifrado (no mira la melodía): usala como guía y contrastala de oído.
          </p>
          {mapa.tonica && (
            <p>
              <b>Tonalidad:</b> {mapa.tonica.nombre.replace(/m$/, '')} {mapa.tonica.menor ? 'menor' : 'mayor'}
              {mapa.tonica.estimada && <span className="muted"> (estimada)</span>}
              {mapa.centros.length > 1 && (
                <>
                  {' · '}
                  <b>Pasa por:</b>{' '}
                  {mapa.centros.slice(0, 8).map((c, i) => (
                    <span key={i}>
                      {i > 0 && ' → '}
                      {c.nombre}
                      {mapa.tonica && c.pc !== mapa.tonica.pc && <span className="muted"> ({gradoDelCentro(c, mapa.tonica)})</span>}
                    </span>
                  ))}
                  {mapa.centros.length > 8 && ' → …'}
                </>
              )}
            </p>
          )}
          {mapa.hallazgos.length === 0 ? (
            <p className="muted">No se reconoció ningún patrón conocido en estos acordes (puede ser un tema modal o con movimientos poco habituales).</p>
          ) : (
            <>
              <p className="muted small">
                {mapa.compasesCubiertos} de {mapa.compases} compases forman parte de un patrón.
              </p>
              <ul className="mapa-lista">
                {mapa.hallazgos.map((h, i) => {
                  const r = sonados(h.desde, h.hasta);
                  return (
                    <li key={i} className={`mapa-${h.tipo}`}>
                      <div className="mapa-cab">
                        <b>{h.titulo}</b>
                        <span className="muted small">{rangoCompases(h.desde, h.hasta)}</span>
                      </div>
                      <div className="mapa-acordes">{h.acordes.join('  ')}</div>
                      <p className="muted small">{h.detalle}</p>
                      {onLoop && r && <button onClick={() => onLoop(r[0], r[1])} aria-label={`Repetir en bucle: ${h.titulo}`}>↻ Repetir estos compases</button>}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </details>
  );
}
