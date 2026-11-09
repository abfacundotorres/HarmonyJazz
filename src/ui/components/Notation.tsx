import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

/**
 * Partitura con abcjs. Se dibuja al ancho real del contenedor (no se encoge un dibujo grande):
 * en pantallas angostas se pasa a 2 compases por línea para que las notas sigan siendo legibles.
 */
export function Notation({ abc, highlightBar }: { abc: string; highlightBar?: number }) {
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
    const inner = Math.max(240, width - 12);
    abcjs.renderAbc(ref.current, abc, {
      add_classes: true,
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
  }, [abc, width]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('.hj-current').forEach((n) => n.classList.remove('hj-current'));
    if (highlightBar === undefined || highlightBar < 0) return;
    el.querySelectorAll(`.abcjs-mm${highlightBar}`).forEach((n) => n.classList.add('hj-current'));
  }, [highlightBar, abc, width]);

  return <div className="paper" ref={ref} />;
}
