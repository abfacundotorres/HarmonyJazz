import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

/**
 * Partitura con abcjs. Se dibuja al ancho real del contenedor (no se encoge un dibujo grande):
 * en pantallas angostas se pasa a 2 compases por línea para que las notas sigan siendo legibles.
 * (Se probó meter 4 compases por línea en el celular para las líneas de blancas y redondas: abcjs no achica
 * el espaciado por debajo de su mínimo y el dibujo se sale; sólo entraría reduciendo el tamaño de las notas.)
 */
export function Notation({ abc, highlightBar, highlightNote, transpose = 0 }: { abc: string; highlightBar?: number; /** Índice de la nota que suena (sin contar silencios). */ highlightNote?: number; transpose?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      setWidth((prev) => (Math.abs(prev - w) > 6 ? w : prev));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current || width <= 0) return;
    const inner = Math.max(240, width - 18);
    abcjs.renderAbc(ref.current, abc, {
      add_classes: true,
      visualTranspose: transpose,
      paddingtop: 4,
      paddingbottom: 10,
      paddingleft: 4,
      paddingright: 4,
      staffwidth: inner,
      scale: 1,
      wrap: {
        minSpacing: 1.4,
        maxSpacing: 2.4,
        preferredMeasuresPerLine: inner < 460 ? 2 : inner < 760 ? 3 : 4,
      },
    } as any);
  }, [abc, width, transpose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('.hj-current').forEach((n) => n.classList.remove('hj-current'));
    if (highlightBar === undefined || highlightBar < 0) return;
    el.querySelectorAll(`.abcjs-mm${highlightBar}`).forEach((n) => n.classList.add('hj-current'));
  }, [highlightBar, abc, width]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('.hj-note').forEach((n) => n.classList.remove('hj-note'));
    if (highlightNote === undefined || highlightNote < 0) return;
    const note = el.querySelectorAll('.abcjs-note')[highlightNote];
    if (!note) return;
    note.classList.add('hj-note');
    // en una partitura larga, la línea que suena queda a la vista
    const r = note.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight - 60) note.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightNote, abc, width]);

  return <div className="paper" ref={ref} />;
}
