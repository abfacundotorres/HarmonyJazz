import { useMemo, useState } from 'react';
import { fichaAcordes, textoCompases } from '../../content/fichaAcordes';
import type { Chart } from '../../theory/chart';
import type { DocLayout } from '../../content/chartDoc';
import { ChordFacts } from './ChordInfo';
import { ChordText } from './ChordInfo';

/**
 * Ayuda memoria quieta: todos los acordes distintos del tema con sus guide tones, notas, tensiones y escala, para leerlos
 * despacio sin que se muevan con el play. Se lee en la vista elegida (Si♭ o concierto).
 */
export function FichaAcordes({ chart, layout }: { chart: Chart; layout?: DocLayout | null }) {
  const [open, setOpen] = useState(false);
  const orden = layout && layout.order.length === chart.bars ? layout.order : undefined;
  const fichas = useMemo(() => (open ? fichaAcordes(chart, orden) : []), [open, chart, orden]);
  return (
    <details className="ficha" open={open} onToggle={(e) => e.target === e.currentTarget && setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Ayuda memoria: acordes, guide tones y escalas</summary>
      <ul className="ficha-lista">
        {fichas.map((f, i) => (
          <li key={i} className="ficha-acorde">
            <div className="ficha-cab">
              <span className="sym"><ChordText chord={f.chord} /></span>
              <span className="muted small">{textoCompases(f.compases)}</span>
            </div>
            <ChordFacts chord={f.chord} />
          </li>
        ))}
      </ul>
    </details>
  );
}
