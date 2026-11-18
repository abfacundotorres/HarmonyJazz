import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { buildPlan, isoDate, tuneOfWeek } from '../../content/plan';
import { localDayNumber, suggest } from '../../content/scaleStudy';
import { localizeNotes } from '../../exercises/localize';
import type { PhraseLibrary } from '../../content/phrases';
import { collectLocal, daysSinceBackup, hasData, summarize } from '../../state/backup';
import { dayNum, dueItems } from '../../state/progress';
import { streak, usePersistent } from '../../state/storage';
import { abcOf, type PracticeExercise } from '../../content/practice';
import { ReviewList } from '../components/ReviewList';
import { phraseNames, showable } from '../progressItems';
import { useLog, useMastery, useMonth, usePersistentLibrary, useReading, useSeen, useSettings } from '../hooks';
import { buildMonthPlan, monthActive, monthName, monthOf, repertoireName, sessionNumber } from '../../content/monthPlan';
import { focusById } from '../../content/focus';

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

/** Aviso de fin de bloque: vibración y dos tonos cortos. El contexto de audio se crea al iniciar el temporizador (dentro del toque). */
let beepCtx: AudioContext | null = null;
function armBeep() {
  try {
    beepCtx ??= new AudioContext();
    void beepCtx.resume();
  } catch {
    /* sin audio: queda la vibración */
  }
}
function beep() {
  try {
    navigator.vibrate?.([250, 120, 250]);
  } catch {
    /* sin vibración */
  }
  const ctx = beepCtx;
  if (!ctx || ctx.state !== 'running') return;
  [0, 0.28].forEach((at, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = i ? 1175 : 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.24);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + at);
    o.stop(ctx.currentTime + at + 0.26);
  });
}

// las partituras (abcjs) se traen recién cuando se abre un ejercicio
const Notation = lazy(() => import('../components/Notation').then((m) => ({ default: m.Notation })));

export function Today() {
  const [settings, setSettings] = useSettings();
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
    () => (monthOn ? buildMonthPlan(today, settings.minutes, mp, session, repertoireName(mp.rep, tunes)!) : buildPlan(today, settings.minutes, settings.focusLesson, pl.phrases ?? [], scale)),
    [monthOn, today, settings.minutes, settings.focusLesson, pl, scale, mp, session, tunes],
  );
  const review = useMemo(() => showable(dueItems(mastery, seen, dayNum(today), 300), phraseNames(pl.phrases)), [mastery, seen, today, pl]);
  const day = log[plan.date] ?? { done: [], minutes: 0 };
  const total = plan.blocks.reduce((s, b) => s + b.minutes, 0);
  const s = streak(log, today);
  /** El primer bloque sin hacer arranca abierto; los demás, plegados. */
  const firstOpen = plan.blocks.find((b) => !day.done.includes(b.id))?.id;

  const toggle = (id: string) =>
    setLog((l) => {
      const d = l[plan.date] ?? { done: [], minutes: 0 };
      const done = d.done.includes(id) ? d.done.filter((x) => x !== id) : [...d.done, id];
      const mins = plan.blocks.filter((b) => done.includes(b.id)).reduce((a, b) => a + b.minutes, 0);
      return { ...l, [plan.date]: { done, minutes: mins } };
    });

  return (
    <div className="page today">
      {due !== false && (
        <p className="notice" role="status">
          <span>{due === null ? 'Todavía no hiciste ninguna copia de seguridad de tus datos.' : `Hace ${due} días que no hacés una copia de seguridad.`}</span>{' '}
          <a className="button" href="#/mas">Ir a la copia</a>
        </p>
      )}
      {monthOn ? (
        <p className="notice monthbar" role="status">
          <span>
            <b>{monthName(mp.month)}:</b> {focusById(mp.tech)?.title} · {focusById(mp.lang)?.title} · {repertoireName(mp.rep, tunes)}
          </span>
          <a href="#/mes">Ver mi mes</a>
        </p>
      ) : (
        <p className="notice monthbar" role="status">
          <span>
            {mp.month !== '' && mp.month !== monthOf(today)
              ? 'Empezó un mes nuevo: elegí tus focos (o seguí con los de antes).'
              : 'Elegí pocos focos para el mes y trabajalos a fondo: técnica, lenguaje y un tema.'}
          </span>
          <a className="button" href="#/mes">Elegir los focos del mes</a>
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
        <div>
          <span className="lbl">Racha</span>
          <div className="big">{s}</div>
          <span className="muted small">{s === 1 ? 'día' : 'días'}</span>
        </div>
        <div>
          <span className="lbl">Sesión</span>
          <select aria-label="Duración de la sesión" value={settings.minutes} onChange={(e) => setSettings({ minutes: Number(e.target.value) })}>
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>{m} min</option>
            ))}
          </select>
          <span className="muted small">
            {day.minutes}/{total} min hechos
          </span>
        </div>
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
            defaultOpen={b.id === firstOpen}
            key={`${plan.date}:${b.id}:${b.minutes}`}
            n={i + 1}
            block={b.id === 'tune' ? { ...b, title: localizeNotes(b.title, 'C', 'C', iv) } : b}
            tonalKey={plan.key}
            done={day.done.includes(b.id)}
            onToggle={() => toggle(b.id)}
          />
        ))}
      </div>

      <details className="info">
        <summary>¿Cómo se arma el plan de hoy?</summary>
        <p className="muted small">
          La tonalidad cambia cada día siguiendo el ciclo de cuartas: en 12 días pasás por todas. El foco de armonía se elige en Lecciones ("Fijar como foco"); si no hay ninguno, rota cada 3 días.
        </p>
      </details>
    </div>
  );
}

function Block({ n, block, done, onToggle, tonalKey, defaultOpen }: { n: number; block: ReturnType<typeof buildPlan>['blocks'][number]; done: boolean; onToggle: () => void; tonalKey: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [left, setLeft] = useState(block.minutes * 60);
  /** Hora (ms) en que termina; null = en pausa. Se mide contra el reloj: con la pantalla apagada el conteo no se atrasa. */
  const [endAt, setEndAt] = useState<number | null>(null);
  const running = endAt !== null;
  const fresh = useRef({ done, onToggle });
  fresh.current = { done, onToggle };

  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const l = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(l);
      if (l > 0) return;
      setEndAt(null);
      beep();
      if (!fresh.current.done) fresh.current.onToggle();
    };
    const id = window.setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endAt]);

  const toggleTimer = () => {
    if (running) return setEndAt(null);
    armBeep();
    // un bloque terminado se puede volver a empezar
    const from = left > 0 ? left : block.minutes * 60;
    setLeft(from);
    setEndAt(Date.now() + from * 1000);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  const bodyId = `blk-${block.id}`;
  return (
    <article className={`card block ${done ? 'done' : ''} ${open ? 'open' : ''}`}>
      <header>
        <h2 className="h3like">
          <button className="bhead" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
            <span className="num">{n}</span>
            <span className="btitle">{block.title}</span>
            <span className="mins">{running ? `${mm}:${ss}` : `${block.minutes} min`}</span>
            <span className="chev" aria-hidden>{open ? '▾' : '▸'}</span>
          </button>
        </h2>
        <label className="check">
          <input type="checkbox" checked={done} onChange={onToggle} aria-label={`Hecho: ${block.title}`} />
        </label>
      </header>
      {open && (
        <div id={bodyId} className="bbody">
          <ul>
            {block.detail.map((d, i) =>
              typeof d === 'string' ? <li key={i}>{d}</li> : <li key={d.id}><Exercise ex={d} tonalKey={tonalKey} /></li>,
            )}
          </ul>
          <footer className="row">
            <button onClick={toggleTimer} className={running ? 'on' : ''} aria-label={`${running ? 'Pausar' : 'Iniciar'} el temporizador, quedan ${mm}:${ss}`}>
              {running ? '❚❚' : '▶'} {mm}:{ss}
            </button>
            {block.link && <a className="button" href={block.link}>{block.linkLabel} →</a>}
          </footer>
        </div>
      )}
    </article>
  );
}

/** Un ejercicio con su explicación completa, desplegable. */
function Exercise({ ex, tonalKey }: { ex: PracticeExercise; tonalKey: string }) {
  const { view } = useReading();
  const [open, setOpen] = useState(false);
  const abc = open ? abcOf(ex, tonalKey) : null;
  return (
    <details className="exercise" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{ex.short}</summary>
      <div className="ex-body">
        <p><b>Para qué:</b> {ex.goal}</p>
        {(ex.bpm || ex.minutes) && (
          <p className="muted small">
            {ex.bpm ? `Metrónomo: ${ex.bpm} bpm.` : ''} {ex.minutes ? `Unos ${ex.minutes} min.` : ''}
          </p>
        )}
        {abc && (
          <figure>
            <Suspense fallback={<p className="muted small">Cargando la partitura…</p>}>
              <Notation abc={abc} transpose={view === 'C' ? -2 : 0} />
            </Suspense>
            {ex.abcCaption && <figcaption className="muted small">{ex.abcCaption}{view === 'C' ? ' (en concierto)' : ' (escrito para trompeta en Si♭)'}</figcaption>}
          </figure>
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
