import { useMemo, useState } from 'react';
import type { DocLayout } from '../../content/chartDoc';
import { lineaGuideTones, melodiaGuideTones, textoGrado, textoMovimiento } from '../../content/guideTones';
import { toAbc } from '../../exercises/abc';
import type { Chart } from '../../theory/chart';
import { noteName, simplify, transposeNote } from '../../theory/notes';
import { useReading } from '../hooks';
import { ChordText } from './ChordInfo';
import { Notation } from './Notation';

/**
 * Línea de guide tones del tema, en pentagrama y con los acordes arriba: una sola línea que pasa por la 3.ª o la 7.ª de cada acorde
 * moviéndose lo menos posible, para seguirla con la vista como una melodía. Mientras suena el play-along se resalta el compás que
 * va sonando. Se lee en la vista elegida (Si♭ o concierto).
 */
export function LineaGuiaTones({
  chart,
  layout,
  keyValue,
  minor,
  compasActual = -1,
}: {
  chart: Chart;
  layout?: DocLayout | null;
  /** Tonalidad (concierto) si el tema tiene una sola: da la armadura; null = sin armadura. */
  keyValue: string | null;
  minor: boolean;
  /** Compás que suena (de la grilla que se toca, 0-based); -1 si no suena. */
  compasActual?: number;
}) {
  const { iv } = useReading();
  const [open, setOpen] = useState(false);
  const orden = layout && layout.order.length === chart.bars ? layout.order : undefined;
  const linea = useMemo(() => (open ? lineaGuideTones(chart, orden) : []), [open, chart, orden]);
  const abc = useMemo(
    () => (linea.length ? toAbc(chart, melodiaGuideTones(chart, linea), { transpose: iv, key: keyValue, mode: minor ? 'minor' : 'major', barsPerLine: 4 }) : ''),
    [linea, chart, iv, keyValue, minor],
  );
  const nombre = (n: Parameters<typeof transposeNote>[0]) => noteName(simplify(transposeNote(n, iv)), true);
  return (
    <details className="linea" open={open} onToggle={(e) => e.target === e.currentTarget && setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Línea de guide tones (pentagrama)</summary>
      <p className="muted small">
        Una sola línea que pasa por la 3.ª o la 7.ª de cada acorde, moviéndose lo menos posible. Seguila con la vista mientras suena el play-along y
        tocala despacio, y cantala, antes de agregar otras notas.
      </p>
      {linea.length > 0 && (
        <>
          <div className="linea-pentagrama">
            <Notation abc={abc} highlightBar={compasActual} />
          </div>
          <p className="linea-notas" aria-label="La línea completa">
            {linea.map((p, i) => (
              <span key={i}>{i > 0 && ' → '}<b>{nombre(p.nota)}</b></span>
            ))}
          </p>
          <details className="linea-detalle">
            <summary>Acorde por acorde</summary>
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
          </details>
        </>
      )}
    </details>
  );
}
