import { kindLabel, NoteKind, NoteRow } from '../../exercises/lickAnalysis';
import { chordSymbol, transposeChord } from '../../theory/chords';
import type { Chart } from '../../theory/chart';
import { pitchName, Pitch, simplifyPitch, transposePitch } from '../../theory/notes';
import { useReading } from '../hooks';

const KINDS: NoteKind[] = ['chord', 'tension', 'scale', 'chromatic'];

export function Legend() {
  return (
    <div className="legend" aria-label="Colores">
      {KINDS.map((k) => (
        <span key={k} className={`nchip ${k}`}>
          {kindLabel(k)}
        </span>
      ))}
    </div>
  );
}

/** Análisis nota por nota, agrupado por compás. Los nombres siguen la lectura elegida (Si♭ o concierto). */
export function NoteRows({ rows, chart }: { rows: NoteRow[]; chart: Chart }) {
  const { iv } = useReading();
  const name = (p: Pitch) => pitchName(simplifyPitch(transposePitch(p, iv)), true);
  const chordAt = (ci: number) => chordSymbol(transposeChord(chart.chords[ci].chord, iv), true);
  const byBar = new Map<number, NoteRow[]>();
  rows.forEach((r) => byBar.set(r.bar, [...(byBar.get(r.bar) ?? []), r]));

  return (
    <>
      <Legend />
      {[...byBar.entries()].map(([bar, rs]) => (
        <section key={bar} className="barblock">
          <h4>
            Compás {bar} · <span className="muted">{[...new Set(rs.map((r) => chordAt(r.chordIndex)))].join('  →  ')}</span>
          </h4>
          <ol className="notelist">
            {rs.map((r) => (
              <li key={r.index} className={`nrow ${r.kind} ${r.strong ? 'strong' : ''}`}>
                <span className="num">{r.index + 1}</span>
                <div>
                  <div className="ntop">
                    <b className="nname">{name(r.pitch)}</b>
                    <span className="where">
                      tiempo {r.beat}
                      {r.dur > 1 ? ` · dura ${r.dur / 2} tiempo${r.dur === 2 ? '' : 's'}` : ''}
                    </span>
                  </div>
                  <div className="fn">
                    Sobre <b>{chordAt(r.chordIndex)}</b>: <b>{r.degree}</b>
                    <span className="muted"> — {kindLabel(r.kind)}</span>
                    {r.guide && <em className="gt">GT</em>}
                  </div>
                  {r.interval && (
                    <div className="muted small">{r.interval.dir === '=' ? 'Misma nota que la anterior' : `${r.interval.dir} ${r.interval.name} desde la anterior`}</div>
                  )}
                  {r.tieTo && (
                    <div className="small tag">
                      Se sostiene hasta {chordAt(r.tieTo.chordIndex)}, donde es la {r.tieTo.degree}
                    </div>
                  )}
                  {r.tags.filter((t) => t !== 'anticipación').length > 0 && (
                    <div className="tags">
                      {r.tags
                        .filter((t) => t !== 'anticipación')
                        .map((t) => (
                          <span key={t} className="tagpill">
                            {t}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
