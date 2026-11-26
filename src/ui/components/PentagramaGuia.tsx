import { useMemo } from 'react';
import type { DocLayout } from '../../content/chartDoc';
import { lineaGuideTones, melodiaGuideTones, type PasoGuia } from '../../content/guideTones';
import { toAbcMap } from '../../exercises/abc';
import type { Chart } from '../../theory/chart';
import { useReading } from '../hooks';
import { Notation } from './Notation';

/** La línea de guide tones del tema ya calculada (para quien también la quiere en texto). */
export const useLineaGuia = (chart: Chart, layout: DocLayout | null | undefined, activa: boolean): PasoGuia[] => {
  const orden = layout && layout.order.length === chart.bars ? layout.order : undefined;
  return useMemo(() => (activa ? lineaGuideTones(chart, orden) : []), [activa, chart, orden]);
};

/**
 * La línea de guide tones en pentagrama, con los acordes arriba (en la lectura elegida: Si♭ o concierto). Resalta el compás que suena
 * y, si se oye la línea, la nota. Se usa en «Estudiar este tema» y en el modo atril.
 */
export function PentagramaGuia({
  chart,
  linea,
  keyValue,
  minor,
  compasActual = -1,
  notaActual = -1,
  tira = false,
}: {
  chart: Chart;
  linea: PasoGuia[];
  /** Tonalidad (concierto) si el tema tiene una sola: da la armadura; null = sin armadura. */
  keyValue: string | null;
  minor: boolean;
  /** Compás que suena (de la grilla que se toca, 0-based); -1 si no suena. */
  compasActual?: number;
  /** Nota de la línea que corresponde al acorde que suena (posición del acorde en la grilla); -1 si no suena. */
  notaActual?: number;
  /** Una sola línea que se desplaza con la nota actual fija. */
  tira?: boolean;
}) {
  const { iv } = useReading();
  const { abc, firstPiece } = useMemo(
    () => (linea.length ? toAbcMap(chart, melodiaGuideTones(chart, linea), { transpose: iv, key: keyValue, mode: minor ? 'minor' : 'major', barsPerLine: tira ? 999 : 4 }) : { abc: '', firstPiece: [] as number[] }),
    [linea, chart, iv, keyValue, minor, tira],
  );
  if (!linea.length) return null;
  return <Notation seguir={false} tira={tira} abc={abc} highlightBar={compasActual} highlightNote={notaActual >= 0 ? firstPiece[notaActual] : undefined} />;
}
