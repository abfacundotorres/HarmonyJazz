import { useEffect, useRef } from 'react';
import abcjs from 'abcjs';

export function Notation({ abc, highlightBar }: { abc: string; highlightBar?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    abcjs.renderAbc(ref.current, abc, {
      responsive: 'resize',
      add_classes: true,
      paddingtop: 4,
      paddingbottom: 4,
      paddingleft: 4,
      paddingright: 4,
      staffwidth: 900,
      wrap: { minSpacing: 1.6, maxSpacing: 2.6, preferredMeasuresPerLine: 4 },
    } as any);
  }, [abc]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('.hj-current').forEach((n) => n.classList.remove('hj-current'));
    if (highlightBar === undefined || highlightBar < 0) return;
    el.querySelectorAll(`.abcjs-mm${highlightBar}`).forEach((n) => n.classList.add('hj-current'));
  }, [highlightBar, abc]);

  return <div className="paper" ref={ref} />;
}
