import { useMemo, useState } from 'react';
import type { DocLayout } from '../../content/chartDoc';
import { lineaGuideTones, textoGrado, textoMovimiento } from '../../content/guideTones';
import type { Chart } from '../../theory/chart';
import { noteName, simplify, transposeNote } from '../../theory/notes';
import { useReading } from '../hooks';
import { ChordText } from './ChordInfo';

/**
 * Línea de guide tones del tema: una sola línea que pasa por la 3.ª o la 7.ª de cada acorde moviéndose lo menos posible. Se lee en la
 * vista elegida (Si♭ o concierto); es lo primero que conviene tener en el oído antes de improvisar sobre el tema.
 */
export function LineaGuiaTones({ chart, layout }: { chart: Chart; layout?: DocLayout | null }) {
  const { iv } = useReading();
  const [open, setOpen] = useState(false);
  const orden = layout && layout.order.length === chart.bars ? layout.order : undefined;
  const linea = useMemo(() => (open ? lineaGuideTones(chart, orden) : []), [open, chart, orden]);
  const nombre = (n: Parameters<typeof transposeNote>[0]) => noteName(simplify(transposeNote(n, iv)), true);
  return (
    <details className="linea" open={open} onToggle={(e) => e.target === e.currentTarget && setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Línea de guide tones</summary>
      <p className="muted small">
        Una sola línea que pasa por la 3.ª o la 7.ª de cada acorde, moviéndose lo menos posible. Tocala despacio sobre el play-along, y cantala, antes de agregar otras notas.
      </p>
      {linea.length > 0 && (
        <>
          <p className="linea-notas" aria-label="La línea completa">
            {linea.map((p, i) => (
              <span key={i}>{i > 0 && ' → '}<b>{nombre(p.nota)}</b></span>
            ))}
          </p>
          <ol className="linea-lista">
            {linea.map((p, i) => (
              <li key={i}>
                <span className="muted small">compás {p.compas}</span>
                <span className="linea-acorde"><ChordText chord={p.chord} /></span>
                <span><b>{nombre(p.nota)}</b> <span className="muted small">({textoGrado(p.grado)})</span></span>
                <span className="muted small">{textoMovimiento(p.mov)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </details>
  );
}
