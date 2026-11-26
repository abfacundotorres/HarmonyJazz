import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

/**
 * Partitura con abcjs. Se dibuja al ancho real del contenedor (no se encoge un dibujo grande):
 * en pantallas angostas se pasa a 2 compases por línea para que las notas sigan siendo legibles.
 * (Se probó meter 4 compases por línea en el celular para las líneas de blancas y redondas: abcjs no achica
 * el espaciado por debajo de su mínimo y el dibujo se sale; sólo entraría reduciendo el tamaño de las notas.)
 */
export function Notation({
  abc,
  highlightBar,
  highlightNote,
  transpose = 0,
  tira = false,
  seguir = true,
}: {
  abc: string;
  highlightBar?: number;
  /** Índice de la nota que suena (sin contar silencios). */
  highlightNote?: number;
  transpose?: number;
  /** Una sola línea larga que se desplaza para dejar la nota que suena en un lugar fijo (tipo teleprompter). El abc debe venir en una línea. */
  tira?: boolean;
  /** Si la nota que suena trae la pantalla a la vista (partituras largas de ejercicios). Apagado en pentagramas que van dentro de otra pantalla: el desplazamiento se llevaría al usuario del reproductor. */
  seguir?: boolean;
}) {
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
    const compases = (abc.match(/\|/g) ?? []).length || 1;
    abcjs.renderAbc(ref.current, abc, tira ? {
      add_classes: true,
      visualTranspose: transpose,
      paddingtop: 4,
      paddingbottom: 10,
      paddingleft: 4,
      paddingright: 4,
      staffwidth: Math.max(inner, compases * 170),
      scale: 1,
    } as any : {
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
  }, [abc, width, transpose, tira]);

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
    el.querySelectorAll('.hj-chord').forEach((n) => n.classList.remove('hj-chord'));
    if (highlightNote === undefined || highlightNote < 0) return;
    const note = el.querySelectorAll('.abcjs-note')[highlightNote];
    if (!note) return;
    note.classList.add('hj-note');
    // el nombre del acorde de esa nota (el más cercano a ella, en el mismo compás y línea) también se marca
    const mismo = [...note.classList].filter((c) => /^abcjs-(l|m)\d+$/.test(c)).map((c) => '.' + c).join('');
    if (mismo) {
      const x = note.getBoundingClientRect().left;
      let mejor: Element | null = null;
      let dist = Infinity;
      el.querySelectorAll(`.abcjs-chord${mismo}`).forEach((t) => {
        const d = Math.abs(t.getBoundingClientRect().left - x);
        if (d < dist) {
          dist = d;
          mejor = t;
        }
      });
      (mejor as Element | null)?.classList.add('hj-chord');
    }
    // en una partitura larga, la línea que suena queda a la vista
    const r = note.getBoundingClientRect();
    if (seguir && !tira && (r.top < 60 || r.bottom > window.innerHeight - 60)) note.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightNote, abc, width, tira, seguir]);

  // tira: la nota que suena queda fija a ~30 % del ancho y la partitura pasa por debajo
  useEffect(() => {
    const el = ref.current;
    const svg = el?.querySelector('svg');
    if (!el || !svg || !tira) return;
    const note = highlightNote !== undefined && highlightNote >= 0 ? el.querySelectorAll('.abcjs-note')[highlightNote] : undefined;
    const x = note ? note.getBoundingClientRect().left - svg.getBoundingClientRect().left : 0;
    const dx = note ? Math.max(0, x - width * 0.3) : 0;
    svg.style.transform = `translateX(${-dx}px)`;
  }, [highlightNote, abc, width, tira]);

  return <div className={`paper ${tira ? 'tira' : ''}`} ref={ref} />;
}
