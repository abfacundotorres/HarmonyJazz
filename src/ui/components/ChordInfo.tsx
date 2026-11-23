import { useEffect, useRef } from 'react';
import type { DocBar, DocLayout } from '../../content/chartDoc';
import { chordParts } from '../../theory/chordFormat';
import { Chord, chordSymbol, qdef, transposeChord } from '../../theory/chords';
import { compasesVisibles, type MemoriaNivel } from '../../content/memoria';
import { barLen, pulseLen } from '../../theory/chart';
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

/** Cuántos caracteres de ancho ocupa un acorde dibujado (los superíndices cuentan menos): sirve para que dos acordes entren en un renglón. */
function chordGlyphs(chord: Chord, style: 'ireal' | 'full', iv: Parameters<typeof transposeChord>[1]): number {
  const w = transposeChord(chord, iv);
  if (style === 'full') return chordSymbol(w, true).length;
  const p = chordParts(w);
  return p.root.length + p.main.length + p.sup.length * 0.62 + (p.bass ? p.bass.length * 0.8 + 1 : 0);
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
  memory = 'todo',
  flojos,
}: {
  chart: Chart;
  current: number;
  loop?: [number, number] | null;
  pending?: number | null;
  onBarClick?: (bar: number) => void;
  /** Estructura escrita de la grilla: si coincide con la carta se muestran secciones, repeticiones y finales. */
  layout?: DocLayout | null;
  /** Modo de memoria: cuánto de la grilla se ve ('todo' la muestra completa). Los compases ocultos conservan número, sección y marca. */
  memory?: MemoriaNivel;
  /** Compases flojos (índices de la grilla escrita): se marcan con una bandera. */
  flojos?: ReadonlySet<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { iv } = useReading();
  const [settings] = useSettings();
  const chordStyle = settings.chordStyle;
  // por compás: cada acorde con el pulso en que entra (1-based) y cuántos pulsos dura
  const byBar: { idx: number; chord: Chord; beat: number; dur: number }[][] = Array.from({ length: chart.bars }, () => []);
  chart.chords.forEach((cc, i) =>
    byBar[cc.bar].push({ idx: i, chord: cc.chord, beat: Math.round((cc.start - cc.bar * barLen(chart)) / pulseLen(chart)) + 1, dur: cc.dur / pulseLen(chart) }),
  );

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

  const visible = compasesVisibles(memory, written.length, sections);

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
        const hide = !visible[i];
        // acordes de distinta duración en un compás (2+1+1): se dibujan en proporción y se rotula el pulso en que entra cada uno
        const prop = !hide && chords.length >= 2 && chords.some((x) => x.dur !== chords[0].dur);
        const rotular = prop || (!hide && chords.length >= 3);
        const total = chords.reduce((n, x) => n + x.dur, 0);
        const cls = [
          'bar',
          isNow ? 'now' : '',
          !isNow && wb.plays.includes(nextBar) ? 'next' : '',
          inLoop ? 'inloop' : '',
          flojos?.has(i) ? 'floja' : '',
          pending !== null && pending !== undefined && wb.plays.includes(pending) ? 'pending' : '',
          m?.repeatStart ? 'rs' : '',
          m?.repeatEnd ? 're' : '',
          m?.ending ? `end end${m.ending}` : '',
          hide ? 'hid' : '',
          !hide && chords.length > 2 ? 'many' : '',
          !hide && chords.length === 2 ? 'two' : '',
          prop ? 'prop' : '',
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
            // letras del cifrado de un compás con dos acordes: el atril las achica para que entren en un solo renglón
            style={
              prop
                ? ({ ['--cols' as string]: chords.map((x) => `${x.dur}fr`).join(' ') } as React.CSSProperties)
                : !hide && chords.length === 2
                  ? ({ ['--glyphs' as string]: Math.round(chords.reduce((n, x) => n + chordGlyphs(x.chord, chordStyle, iv), 0) * 10) / 10 } as React.CSSProperties)
                  : undefined
            }
          >
            <small className="barno"><span className="sr">Compás </span>{i + 1}</small>
            {flojos?.has(i) && <span className="flag" aria-label="Compás flojo" title="Compás flojo">⚑</span>}
            {sections.has(i) && <b className="sec" title={`Sección ${m?.section}`}>{m?.section}</b>}
            {showEnd && <i className="endno">{m?.ending}.</i>}
            {hide ? (
              <span className="ph"><span aria-hidden>· · ·</span><span className="sr">Acordes ocultos</span></span>
            ) : (
              chords.map((x, j) => (
                <span
                  key={x.idx}
                  className={isNow && j === curPos ? 'cur' : ''}
                  style={prop ? ({ ['--share' as string]: x.dur / total, ['--glyphs' as string]: chordGlyphs(x.chord, chordStyle, iv) } as React.CSSProperties) : undefined}
                >
                  <ChordText chord={x.chord} />
                  {rotular && (
                    <i className="pulso" title={`Entra en el tiempo ${x.beat}`}>
                      <span className="sr">Tiempo </span>
                      {x.beat}
                    </i>
                  )}
                </span>
              ))
            )}
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
