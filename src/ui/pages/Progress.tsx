import { useMemo } from 'react';
import type { PhraseLibrary } from '../../content/phrases';
import { dayNum, dueItems, KEY_ORDER, keyBalance, keyMatrix, weakestKeys } from '../../state/progress';
import { usePersistent } from '../../state/storage';
import { EarReview, useEarReview } from '../components/EarReview';
import { RepertorioReview, useRepasoRepertorio } from '../components/RepertorioReview';
import { ReviewList } from '../components/ReviewList';
import { useMastery, useReading, useSeen, useTemasDeRepertorio } from '../hooks';
import { lessonRows, phraseNames, scaleRows, showable } from '../progressItems';

/** Columnas de barras: se dibujan con CSS y llevan su tabla equivalente (un gráfico no es la única forma de ver el dato). */
function Chart({ label, bars, max, unit }: { label: string; bars: { label: string; value: number; title: string; hi?: boolean; show?: boolean }[]; max: number; unit: string }) {
  const n = bars.length;
  return (
    <div className="chart">
      <p className="muted small chartmax" aria-hidden>{max} {unit}</p>
      <div role="img" aria-label={label}>
        <div className="plot" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {bars.map((b, i) => (
            <i key={i} className={b.hi ? 'hi' : ''} style={{ height: `${b.value > 0 ? Math.max(3, (b.value / max) * 100) : 0}%` }} title={b.title} />
          ))}
        </div>
        <div className="axis" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {bars.map((b, i) => (
            <span key={i} className={b.hi ? 'hi' : ''}>{b.show === false ? '' : b.label}</span>
          ))}
        </div>
      </div>
      <details className="more">
        <summary>Ver como tabla</summary>
        <table className="results">
          <tbody>
            {bars.map((b, i) => (
              <tr key={i}>
                <th scope="row">{b.label || '·'}</th>
                <td>{b.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

const level = (c: number, total: number) => (c === 0 ? 0 : c >= total ? 4 : c / total <= 0.34 ? 1 : c / total <= 0.67 ? 2 : 3);

function Matrix({ caption, corner, rows, mastery, hint }: { caption: string; corner: string; rows: { id: string; title: string; group?: string; ids: string[] }[]; mastery: Record<string, Record<string, number>>; hint: string }) {
  const { keyLabel } = useReading();
  const cells = useMemo(() => keyMatrix(mastery, rows), [mastery, rows]);
  return (
    // la tabla se desplaza hacia los costados: tiene que poder enfocarse para recorrerla con el teclado
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="matrix" role="region" aria-label={caption} tabIndex={0}>
      <table>
        <caption className="sr">{caption}. {hint}</caption>
        <thead>
          <tr>
            <th scope="col">{corner}</th>
            {KEY_ORDER.map((k) => (
              <th key={k} scope="col">{keyLabel(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((r, i) => {
            const g = rows[i].group;
            const head = g && (i === 0 || rows[i - 1].group !== g);
            return [
              head ? (
                <tr key={`g${g}`} className="mgroup">
                  <th scope="rowgroup" colSpan={13}>{g}</th>
                </tr>
              ) : null,
              <tr key={r.id}>
                <th scope="row" title={rows[i].title}>{rows[i].title}</th>
                {KEY_ORDER.map((k) => {
                  const c = r.counts[k];
                  return (
                    <td key={k} className={`lv${level(c, r.total)}`} title={`${rows[i].title} en ${keyLabel(k)}: ${c} de ${r.total}`}>
                      {c > 0 ? c : '·'}
                    </td>
                  );
                })}
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Progress() {
  const { keyLabel } = useReading();
  const [mastery] = useMastery();
  const [seen] = useSeen();
  const [pl] = usePersistent<PhraseLibrary>('phrases', { phrases: [] });
  const today = useMemo(() => dayNum(), []);
  const phrases = useMemo(() => phraseNames(pl.phrases), [pl]);

  const ear = useEarReview();
  const rpt = useRepasoRepertorio();
  const temas = useTemasDeRepertorio();
  const due = useMemo(() => showable(dueItems(mastery, seen, today, 300), phrases, temas), [mastery, seen, today, phrases, temas]);
  const balance = useMemo(() => keyBalance(mastery), [mastery]);
  const weak = weakestKeys(balance);
  const marks = Object.values(balance).reduce((a, b) => a + b, 0);
  const lessons = useMemo(() => lessonRows(), []);
  const scales = useMemo(() => scaleRows(), []);
  const maxKey = Math.max(4, ...Object.values(balance));

  return (
    <div className="page progress">
      <section className="card">
        <h2>Tu progreso</h2>
        <p className="muted">Lo que marcás con «Salió limpio» en Lecciones, Escalas y Vocabulario y lo que fallás en Oído: qué repasar y qué tonalidades trabajaste menos.</p>
      </section>

      <section className="card" id="repaso">
        <h3>Para repasar</h3>
        {marks === 0 ? (
          <p className="muted">Cuando marques ejercicios con "Salió limpio", la app va a ir proponiéndote repasarlos: a los 2 días, después a los 4, 9, 18 y 35. Cuanto más firme, más espaciado.</p>
        ) : due.length === 0 ? (
          <p className="muted">Estás al día: nada vence hoy. Mirá el balance de abajo para elegir qué tonalidad trabajar.</p>
        ) : (
          <>
            <p className="muted small">{due.length} {due.length === 1 ? 'ejercicio vence' : 'ejercicios vencen'}, el más atrasado primero. Repasarlo y marcarlo de nuevo lo aleja en el calendario.</p>
            <ReviewList items={due.slice(0, 12)} phrases={phrases} temas={temas} />
            {due.length > 12 && <p className="muted small">Y {due.length - 12} más.</p>}
          </>
        )}
        {ear.due && <EarReview review={ear.review} />}
        {rpt.due && <RepertorioReview items={rpt.items} />}
      </section>

      <section className="card">
        <h3>Balance por tonalidad</h3>
        {marks === 0 ? (
          <p className="muted">Todavía no marcaste ninguna tonalidad.</p>
        ) : (
          <>
            <Chart
              label="Ejercicios con marca en cada tonalidad"
              max={maxKey}
              unit="ejercicios"
              bars={KEY_ORDER.map((k) => ({
                label: keyLabel(k),
                value: balance[k],
                title: `${keyLabel(k)}: ${balance[k]} ${balance[k] === 1 ? 'ejercicio' : 'ejercicios'}`,
                hi: weak.includes(k),
              }))}
            />
            <p className="muted small">
              {weak.length === 12 ? 'Todas las tonalidades van parejas.' : `Las que menos trabajaste (con la letra resaltada): ${weak.map((k) => keyLabel(k)).join(', ')}. Elegí una de esas al empezar el día.`}
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h3>Lecciones por tonalidad</h3>
        <Matrix caption="Ejercicios de cada lección marcados en cada tonalidad" corner="Lección" rows={lessons} mastery={mastery} hint="Cada casillero cuenta los ejercicios marcados; se llena cuando están todos" />
      </section>

      <section className="card">
        <h3>Escalas por tonalidad</h3>
        <Matrix caption="Patrones de cada escala marcados en cada tonalidad" corner="Escala" rows={scales} mastery={mastery} hint="Cada casillero cuenta los patrones marcados (de 6); se llena cuando están todos" />
      </section>
    </div>
  );
}
