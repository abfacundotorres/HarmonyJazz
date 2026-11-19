import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { buildPlan, isoDate, tuneOfWeek } from '../../content/plan';
import { localDayNumber, suggest } from '../../content/scaleStudy';
import { localizeNotes } from '../../exercises/localize';
import type { PhraseLibrary } from '../../content/phrases';
import { collectLocal, daysSinceBackup, hasData, summarize } from '../../state/backup';
import { dayNum, dueItems } from '../../state/progress';
import { usePersistent } from '../../state/storage';
import { abcOf, type PracticeExercise } from '../../content/practice';
import { ReviewList } from '../components/ReviewList';
import { phraseNames, showable } from '../progressItems';
import { useLog, useMastery, useMonth, usePersistentLibrary, useReading, useSeen, useSettings } from '../hooks';
import { buildMonthPlan, monthActive, repertoireName, sessionNumber } from '../../content/monthPlan';

/** La fecha de hoy. La app instalada puede quedar abierta varios días: al volver a ella o al pasar la medianoche, cambia. */
function useToday(): Date {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const check = () => setToday((t) => (isoDate(t) === isoDate(new Date()) ? t : new Date()));
    const id = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
  return today;
}

/** ¿Hay datos sin respaldar hace 14 días o más (o nunca respaldados)? Devuelve los días, null = nunca, false = al día. */
function backupDue(): number | null | false {
  try {
    if (!hasData(summarize(collectLocal(localStorage), []))) return false;
    const days = daysSinceBackup(localStorage);
    return days === null || days >= 14 ? days : false;
  } catch {
    return false;
  }
}

// las partituras (abcjs) se traen recién cuando se abre un ejercicio
const Notation = lazy(() => import('../components/Notation').then((m) => ({ default: m.Notation })));

export function Today() {
  const [settings] = useSettings();
  const [log, setLog] = useLog();
  const { keyLabel, view, iv } = useReading();
  const today = useToday();
  const [due] = useState(backupDue);
  const [pl] = usePersistent<PhraseLibrary>('phrases', { phrases: [] });
  const [mastery] = useMastery();
  const [seen] = useSeen();
  const scale = useMemo(() => suggest(mastery, localDayNumber(today)), [mastery, today]);
  // plan del mes (focos elegidos) si lo hay; si no, el plan de rotación de siempre
  const [mp] = useMonth();
  const [lib] = usePersistentLibrary();
  const tunes = useMemo(() => phraseNames(lib.tunes as unknown[] | undefined), [lib]);
  const monthOn = monthActive(mp, today, tunes);
  const session = useMemo(() => sessionNumber(log, mp.startDay, dayNum(today)), [log, mp.startDay, today]);
  const plan = useMemo(
    () => (monthOn ? buildMonthPlan(today, mp, session, repertoireName(mp.rep, tunes)!) : buildPlan(today, settings.focusLesson, pl.phrases ?? [], scale)),
    [monthOn, today, settings.focusLesson, pl, scale, mp, session, tunes],
  );
  const review = useMemo(() => showable(dueItems(mastery, seen, dayNum(today), 300), phraseNames(pl.phrases)), [mastery, seen, today, pl]);

  // sin casilleros: un día cuenta como sesión del mes si se abrió Hoy ese día
  useEffect(() => {
    if (monthOn && !(log[plan.date]?.done.length > 0)) setLog((l) => ({ ...l, [plan.date]: { done: ['hoy'], minutes: 0 } }));
  }, [monthOn, plan.date, log, setLog]);

  return (
    <div className="page today">
      {due !== false && (
        <p className="notice" role="status">
          <span>{due === null ? 'Todavía no hiciste ninguna copia de seguridad de tus datos.' : `Hace ${due} días que no hacés una copia de seguridad.`}</span>{' '}
          <a className="button" href="#/mas">Ir a la copia</a>
        </p>
      )}
      <section className="card hero">
        <div>
          <span className="lbl">Tonalidad del día</span>
          <div className="big">{keyLabel(plan.key)}</div>
          <span className="muted small">{view === 'Bb' ? `concierto ${plan.key}` : ''}</span>
        </div>
        {monthOn && plan.month ? (
          <div>
            <span className="lbl">Tu mes</span>
            <div className="mid">Semana {plan.month.week + 1} de 4</div>
            <span className="muted small">sesión {plan.month.session}</span>
          </div>
        ) : (
          <div>
            <span className="lbl">Tema de la semana</span>
            <div className="mid">{localizeNotes(tuneOfWeek(today).name, 'C', 'C', iv)}</div>
          </div>
        )}
      </section>

      {review.length > 0 && (
        <section className="card" id="repaso">
          <h2 className="h3like">Para repasar</h2>
          <ReviewList items={review.slice(0, 3)} phrases={phraseNames(pl.phrases)} />
          <p>
            <a className="button" href="#/progreso">{review.length > 3 ? `Ver los ${review.length} pendientes →` : 'Ver mi progreso →'}</a>
          </p>
        </section>
      )}

      <div className="blocks">
        {plan.blocks.map((b, i) => (
          <Block
            defaultOpen={i === 0}
            key={`${plan.date}:${b.id}`}
            n={i + 1}
            block={b.id === 'tune' ? { ...b, title: localizeNotes(b.title, 'C', 'C', iv) } : b}
            tonalKey={plan.key}
          />
        ))}
      </div>
    </div>
  );
}

function Block({ n, block, tonalKey, defaultOpen }: { n: number; block: ReturnType<typeof buildPlan>['blocks'][number]; tonalKey: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `blk-${block.id}`;
  return (
    <article className={`card block ${open ? 'open' : ''}`}>
      <header>
        <h2 className="h3like">
          <button className="bhead" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
            <span className="num">{n}</span>
            <span className="btitle">{block.title}</span>
            <span className="chev" aria-hidden>{open ? '▾' : '▸'}</span>
          </button>
        </h2>
      </header>
      {open && (
        <div id={bodyId} className="bbody">
          <ul>
            {block.detail.map((d, i) =>
              typeof d === 'string' ? <li key={i}>{d}</li> : <li key={d.id}><Exercise ex={d} tonalKey={tonalKey} /></li>,
            )}
          </ul>
          {block.link && (
            <footer className="row">
              <a className="button" href={block.link}>{block.linkLabel} →</a>
            </footer>
          )}
        </div>
      )}
    </article>
  );
}

/** Un ejercicio con su explicación completa, desplegable. */
function Exercise({ ex, tonalKey }: { ex: PracticeExercise; tonalKey: string }) {
  const { view } = useReading();
  const [open, setOpen] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const abc = open ? abcOf(ex, tonalKey) : null;
  return (
    <details className="exercise" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{ex.short}</summary>
      <div className="ex-body">
        <p><b>Para qué:</b> {ex.goal}</p>
        {ex.bpm && <p className="muted small">Metrónomo: {ex.bpm} bpm.</p>}
        {abc && (
          <figure>
            <Suspense fallback={<p className="muted small">Cargando la partitura…</p>}>
              <Notation abc={abc} transpose={view === 'C' ? -2 : 0} />
            </Suspense>
            {ex.abcCaption && <figcaption className="muted small">{ex.abcCaption}{view === 'C' ? ' (en concierto)' : ' (escrito para trompeta en Si♭)'}</figcaption>}
          </figure>
        )}
        {ex.ideas && (
          <details className="ideas" onToggle={(e) => setIdeasOpen((e.target as HTMLDetailsElement).open)}>
            <summary>Ideas para tocar ({ex.ideas.count})</summary>
            {ideasOpen && (
              <figure>
                <Suspense fallback={<p className="muted small">Cargando la partitura…</p>}>
                  <Notation abc={ex.ideas.abc(tonalKey)} transpose={view === 'C' ? -2 : 0} />
                </Suspense>
                <figcaption className="muted small">{ex.ideas.caption}{view === 'C' ? ' (en concierto)' : ' (escrito para trompeta en Si♭)'}</figcaption>
              </figure>
            )}
          </details>
        )}
        <h4>Cómo se hace</h4>
        <ol>{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {ex.tips && ex.tips.length > 0 && (
          <>
            <h4>En la trompeta</h4>
            <ul>{ex.tips.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </>
        )}
      </div>
    </details>
  );
}
