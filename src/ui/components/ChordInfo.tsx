import { useEffect, useRef } from 'react';
import type { DocBar, DocLayout } from '../../content/chartDoc';
import { chordParts } from '../../theory/chordFormat';
import { Chord, chordSymbol, qdef, transposeChord } from '../../theory/chords';
import type { Chart } from '../../theory/chart';
import { degreeNote, noteName, simplify, transposeNote } from '../../theory/notes';
import { SCALES } from '../../theory/scales';
import { useReading, useSettings } from '../hooks';

/**
 * Cuadrícula de compases tipo lead sheet, con el acorde actual resaltado.
 * Cada compás es clickeable para armar un loop: primer clic = inicio, segundo clic = final.
 */
/** Un acorde dibujado: estilo iReal (Δ7, -7, ø7, alteraciones en superíndice) o completo, según el ajuste. */
export function ChordText({ chord }: { chord: Chord }) {
  const { iv } = useReading();
  const [settings] = useSettings();
  const w = transposeChord(chord, iv);
  if (settings.chordStyle === 'full') return <>{chordSymbol(w, true)}</>;
  const p = chordParts(w);
  return (
    <>
      {p.root}
      {p.main}
      {p.sup && <sup>{p.sup}</sup>}
      {p.bass && <span className="slash">/{p.bass}</span>}
    </>
  );
}

interface BoardBar {
  /** Índices de los compases tocados (en la carta desplegada) que salen de este compás escrito. */
  plays: number[];
  mark?: DocBar;
}

export function ChordBoard({
  chart,
  current,
  loop,
  pending,
  onBarClick,
  layout,
}: {
  chart: Chart;
  current: number;
  loop?: [number, number] | null;
  pending?: number | null;
  onBarClick?: (bar: number) => void;
  /** Estructura escrita de la grilla: si coincide con la carta se muestran secciones, repeticiones y finales. */
  layout?: DocLayout | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const byBar: { idx: number; chord: Chord }[][] = Array.from({ length: chart.bars }, () => []);
  chart.chords.forEach((cc, i) => byBar[cc.bar].push({ idx: i, chord: cc.chord }));

  const useLayout = !!layout && layout.order.length === chart.bars;
  const written: BoardBar[] = useLayout
    ? layout.bars.map((mark) => ({ plays: [] as number[], mark }))
    : byBar.map((_, i) => ({ plays: [i] }));
  if (useLayout) layout.order.forEach((w, k) => written[w].plays.push(k));

  const curBar = current >= 0 ? chart.chords[current]?.bar ?? -1 : -1;
  const curPos = curBar >= 0 ? byBar[curBar].findIndex((x) => x.idx === current) : -1;
  const nextBar = curBar >= 0 ? (curBar + 1) % chart.bars : -1;
  const sections = new Set<number>();
  if (useLayout) layout.bars.forEach((b, i) => b.section && (i === 0 || layout.bars[i - 1].section !== b.section) && sections.add(i));

  // el compás que suena queda a la vista
  useEffect(() => {
    if (curBar < 0 || onBarClick === undefined) return;
    const el = ref.current?.querySelector('.bar.now');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [curBar, onBarClick]);

  return (
    <div className="board" ref={ref}>
      {written.map((wb, i) => {
        const first = wb.plays[0];
        const chords = byBar[first];
        const inLoop = !!loop && wb.plays.some((k) => k >= loop[0] && k <= loop[1]);
        const isNow = wb.plays.includes(curBar);
        const m = wb.mark;
        const cls = [
          'bar',
          isNow ? 'now' : '',
          !isNow && wb.plays.includes(nextBar) ? 'next' : '',
          inLoop ? 'inloop' : '',
          pending !== null && pending !== undefined && wb.plays.includes(pending) ? 'pending' : '',
          m?.repeatStart ? 'rs' : '',
          m?.repeatEnd ? 're' : '',
          m?.ending ? `end end${m.ending}` : '',
          chords.length > 2 ? 'many' : '',
        ].filter(Boolean).join(' ');
        const showEnd = m?.ending && layout?.bars[i - 1]?.ending !== m.ending;
        return (
          <button
            key={i}
            type="button"
            className={cls}
            onClick={() => onBarClick?.(first)}
            disabled={!onBarClick}
            aria-pressed={inLoop}
          >
            <small className="barno"><span className="sr">Compás </span>{i + 1}</small>
            {sections.has(i) && <b className="sec" title={`Sección ${m?.section}`}>{m?.section}</b>}
            {showEnd && <i className="endno">{m?.ending}.</i>}
            {chords.map((x, j) => (
              <span key={x.idx} className={isNow && j === curPos ? 'cur' : ''}>
                <ChordText chord={x.chord} />
              </span>
            ))}
          </button>
        );
      })}
    </div>
  );
}

/** Acorde actual en grande, con escala y notas para leer en la vista elegida. */
export function CurrentChord({ chord, next }: { chord: Chord | null; next: Chord | null }) {
  const { iv, view } = useReading();
  if (!chord) {
    return (
      <div className="current empty">
        <div className="sym">—</div>
        <p className="muted">Dale play. Vas a ver el acorde, la escala y los guide tones {view === 'Bb' ? 'escritos para trompeta en Si♭' : 'en concierto'}.</p>
      </div>
    );
  }
  const d = qdef(chord);
  const w = transposeChord(chord, iv);
  const name = (deg: string) => noteName(simplify(transposeNote(degreeNote(chord.root, deg), iv)), true);
  return (
    <div className="current">
      <div className="sym">{chordSymbol(w, true)}</div>
      <div className="facts">
        <div>
          <span className="lbl">Guide tones</span>
          <b className="gt">{d.guide.map(name).join(' · ')}</b>
        </div>
        <div>
          <span className="lbl">Acorde</span>
          {d.tones.map(name).join(' ')}
        </div>
        <div>
          <span className="lbl">Tensiones</span>
          {d.tensions.map(name).join(' ')}
        </div>
        <div>
          <span className="lbl">{SCALES[d.scale].name}</span>
          {SCALES[d.scale].degrees.map(name).join(' ')}
        </div>
      </div>
      {next && <div className="next">Sigue: {chordSymbol(transposeChord(next, iv), true)}</div>}
    </div>
  );
}
