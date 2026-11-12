import { Chord, chordSymbol, qdef, transposeChord } from '../../theory/chords';
import type { Chart } from '../../theory/chart';
import { degreeNote, noteName, simplify, transposeNote } from '../../theory/notes';
import { SCALES } from '../../theory/scales';
import { useReading } from '../hooks';

/**
 * Cuadrícula de compases tipo lead sheet, con el acorde actual resaltado.
 * Cada compás es clickeable para armar un loop: primer clic = inicio, segundo clic = final.
 */
export function ChordBoard({
  chart,
  current,
  loop,
  pending,
  onBarClick,
}: {
  chart: Chart;
  current: number;
  loop?: [number, number] | null;
  pending?: number | null;
  onBarClick?: (bar: number) => void;
}) {
  const { iv } = useReading();
  const bars: { idx: number; sym: string }[][] = Array.from({ length: chart.bars }, () => []);
  chart.chords.forEach((cc, i) => bars[cc.bar].push({ idx: i, sym: chordSymbol(transposeChord(cc.chord, iv), true) }));
  return (
    <div className="board">
      {bars.map((b, i) => {
        const inLoop = !!loop && i >= loop[0] && i <= loop[1];
        const cls = ['bar', b.some((x) => x.idx === current) ? 'now' : '', inLoop ? 'inloop' : '', pending === i ? 'pending' : '']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={i}
            type="button"
            className={cls}
            onClick={() => onBarClick?.(i)}
            disabled={!onBarClick}
            aria-pressed={inLoop}
          >
            <small className="barno"><span className="sr">Compás </span>{i + 1}</small>
            {b.map((x) => (
              <span key={x.idx} className={x.idx === current ? 'cur' : ''}>
                {x.sym}
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
