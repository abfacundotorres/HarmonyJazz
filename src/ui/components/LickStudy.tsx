import { useMemo } from 'react';
import { Lick } from '../../content/licks';
import { COMMON_EXERCISES, LICK_STUDY, learningSteps } from '../../content/licksStudy';
import { localizeNotes } from '../../exercises/localize';
import { analyzeLick, kindLabel, lickStats, NoteKind, NoteRow } from '../../exercises/lickAnalysis';
import type { MelNote } from '../../exercises/generators';
import { chordSymbol, transposeChord } from '../../theory/chords';
import type { Chart } from '../../theory/chart';
import { noteName, pitchName, Pitch, simplify, simplifyPitch, transposeNote, transposePitch } from '../../theory/notes';
import { usePersistent } from '../../state/storage';
import { useReading } from '../hooks';

/**
 * Estudio de una frase: pasos para aprenderla, ideas, análisis nota por nota (generado a partir
 * de la propia frase), por qué funciona y ejercicios.
 */
export function LickStudy({ lick, chart, notes, keyValue }: { lick: Lick; chart: Chart; notes: MelNote[]; keyValue: string }) {
  const { iv, view } = useReading();
  const study = LICK_STUDY[lick.id];
  /** Los textos están escritos en la tonalidad de referencia de la frase: se traducen a la elegida y a la lectura activa. */
  const loc = (t: string) => localizeNotes(t, lick.key, keyValue, iv);
  const rows = useMemo(() => analyzeLick(notes, chart), [notes, chart]);
  const stats = useMemo(() => lickStats(rows, chart), [rows, chart]);
  const [done, setDone] = usePersistent<Record<string, boolean>>('lickex', {});

  if (!study) return null;

  const name = (p: Pitch) => pitchName(simplifyPitch(transposePitch(p, iv)), true);
  const bare = (p: Pitch) => noteName(simplify(transposeNote(p, iv)), true);
  const chordAt = (ci: number) => chordSymbol(transposeChord(chart.chords[ci].chord, iv), true);

  const exercises = [...study.exercises, ...COMMON_EXERCISES];
  const doneCount = exercises.filter((_, i) => done[`${lick.id}:${i}`]).length;
  const toggle = (i: number) => setDone((cur) => ({ ...cur, [`${lick.id}:${i}`]: !cur[`${lick.id}:${i}`] }));

  const pct = stats.strongNotes ? Math.round((stats.chordOnStrong / stats.strongNotes) * 100) : 0;
  const multiChord = new Set(chart.chords.map((c) => chordSymbol(c.chord))).size > 1;
  const auto: string[] = [
    `${stats.chordOnStrong} de ${stats.strongNotes} notas en tiempo fuerte son del acorde (${pct} %). Eso es lo que hace que se oiga la armonía aunque no suene el acompañamiento.`,
  ];
  if (multiChord) auto.push(`La primera nota sobre el acorde es un guide tone (3ª o 7ª) en ${stats.guideLandings} de los ${stats.changes} acordes.`);
  if (stats.enclosures) auto.push(`Usa ${stats.enclosures} enclosure${stats.enclosures > 1 ? 's' : ''}: una nota por encima y otra por debajo de la nota objetivo.`);
  if (stats.approaches) auto.push(`Tiene ${stats.approaches} ${stats.approaches > 1 ? 'aproximaciones' : 'aproximación'} a medio tono de una nota del acorde.`);
  const blue = rows.filter((r) => r.tags.some((t) => t.startsWith('nota azul'))).length;
  if (blue) auto.push(`Incluye ${blue} nota${blue > 1 ? 's' : ''} azul${blue > 1 ? 'es' : ''}, usada${blue > 1 ? 's' : ''} de paso y no para quedarse.`);
  if (rows.some((r) => r.tieTo)) auto.push('Hay una nota que se sostiene hasta el acorde siguiente y pasa a ser una nota de ese acorde: una anticipación.');
  auto.push(`Se mueve por grado conjunto ${stats.stepwise} veces y por salto ${stats.leaps}: ${stats.stepwise >= stats.leaps ? 'predomina el movimiento conjunto, que suena cantable' : 'predominan los saltos, típicos de los arpegios'}.`);
  auto.push(`Rango (${view === 'Bb' ? 'escrito para trompeta en Si♭' : 'en concierto'}): de ${name(rows.reduce((a, b) => (a.midi < b.midi ? a : b)).pitch)} a ${name(rows.reduce((a, b) => (a.midi > b.midi ? a : b)).pitch)}.`);

  const byBar = new Map<number, NoteRow[]>();
  rows.forEach((r) => byBar.set(r.bar, [...(byBar.get(r.bar) ?? []), r]));

  return (
    <div className="study-wrap">
      <details className="card study" open>
        <summary>
          <h3>Cómo aprenderla, paso a paso</h3>
        </summary>
        <ol className="steps">
          {learningSteps(lick).map((t, i) => (
            <li key={i}>{loc(t)}</li>
          ))}
        </ol>
      </details>

      <details className="card study" open>
        <summary>
          <h3>Por ideas</h3>
          <span className="muted small"> {study.ideas.length} ideas</span>
        </summary>
        <p className="muted small">Una frase larga se aprende como un conjunto de ideas cortas. Cada una tiene su función y se puede usar sola.</p>
        <ol className="ideas">
          {study.ideas.map((idea, i) => {
            const part = rows.slice(idea.from - 1, idea.to);
            const first = part[0];
            const last = part[part.length - 1];
            return (
              <li key={i} className="idea">
                <h4>
                  {i + 1}. {loc(idea.name)}
                </h4>
                <p className="muted small">
                  {idea.from === idea.to ? `Nota ${idea.from}` : `Notas ${idea.from}–${idea.to}`} · compás {first?.bar}
                  {last && last.bar !== first?.bar ? `–${last.bar}` : ''}
                </p>
                <div className="chips" aria-label="Notas de la idea">
                  {part.map((r) => (
                    <span key={r.index} className={`nchip ${r.kind}`} title={`${kindLabel(r.kind)}${r.guide ? ' · guide tone' : ''}`}>
                      <b>{bare(r.pitch)}</b>
                      <small>{r.degree}</small>
                    </span>
                  ))}
                </div>
                <p>{loc(idea.text)}</p>
                <p className="why">
                  <strong>Por qué funciona: </strong>
                  {loc(idea.why)}
                </p>
              </li>
            );
          })}
        </ol>
      </details>

      <details className="card study">
        <summary>
          <h3>Nota por nota</h3>
          <span className="muted small"> {rows.length} notas</span>
        </summary>
        <p className="muted small">
          Cada nota con su lugar en el compás, su grado sobre el acorde que suena y qué hace. Los nombres están escritos para trompeta en Si♭ (o en concierto, según lo que
          elegiste arriba). <b>GT</b> = guide tone (3ª o 7ª).
        </p>
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
                      <div className="muted small">
                        {r.interval.dir === '=' ? 'Misma nota que la anterior' : `${r.interval.dir} ${r.interval.name} desde la anterior`}
                      </div>
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
      </details>

      <details className="card study" open>
        <summary>
          <h3>Por qué funciona</h3>
        </summary>
        <ul className="whylist">
          {study.why.map((t, i) => (
            <li key={`a${i}`}>{loc(t)}</li>
          ))}
        </ul>
        <h4>En números (medido sobre esta frase)</h4>
        <ul className="whylist">
          {auto.map((t, i) => (
            <li key={`b${i}`}>{t}</li>
          ))}
        </ul>
      </details>

      <details className="card study" open>
        <summary>
          <h3>Ejercicios</h3>
          <span className="muted small">
            {' '}
            {doneCount}/{exercises.length} hechos
          </span>
        </summary>
        <h4>De esta frase</h4>
        <ul className="checks">
          {study.exercises.map((t, i) => (
            <Check key={i} id={`${lick.id}:${i}`} text={loc(t)} on={!!done[`${lick.id}:${i}`]} onToggle={() => toggle(i)} />
          ))}
        </ul>
        <h4>Para cualquier frase</h4>
        <ul className="checks">
          {COMMON_EXERCISES.map((t, i) => {
            const k = study.exercises.length + i;
            return <Check key={k} id={`${lick.id}:${k}`} text={loc(t)} on={!!done[`${lick.id}:${k}`]} onToggle={() => toggle(k)} />;
          })}
        </ul>
      </details>

      <details className="card study">
        <summary>
          <h3>En la trompeta</h3>
        </summary>
        <ul className="whylist">
          {study.trumpet.map((t, i) => (
            <li key={i}>{loc(t)}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Check({ id, text, on, onToggle }: { id: string; text: string; on: boolean; onToggle: () => void }) {
  return (
    <li>
      <label className={on ? 'done' : ''}>
        <input type="checkbox" id={id} checked={on} onChange={onToggle} /> <span>{text}</span>
      </label>
    </li>
  );
}

const KINDS: NoteKind[] = ['chord', 'tension', 'scale', 'chromatic'];
function Legend() {
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
