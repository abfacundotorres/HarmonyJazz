import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPlan, isoDate, tuneOfWeek } from '../../content/plan';
import type { PhraseLibrary } from '../../content/phrases';
import { streak, usePersistent } from '../../state/storage';
import type { PracticeExercise } from '../../content/practice';
import { BackupCard } from '../components/BackupCard';
import { Notation } from '../components/Notation';
import { useLog, useReading, useSettings } from '../hooks';

export function Today() {
  const [settings, setSettings] = useSettings();
  const [log, setLog] = useLog();
  const { keyLabel, view } = useReading();
  const today = useMemo(() => new Date(), []);
  const [pl] = usePersistent<PhraseLibrary>('phrases', { phrases: [] });
  const plan = useMemo(() => buildPlan(today, settings.minutes, settings.focusLesson, pl.phrases ?? []), [today, settings.minutes, settings.focusLesson, pl]);
  const day = log[plan.date] ?? { done: [], minutes: 0 };
  const total = plan.blocks.reduce((s, b) => s + b.minutes, 0);
  const s = streak(log, today);

  const toggle = (id: string) =>
    setLog((l) => {
      const d = l[plan.date] ?? { done: [], minutes: 0 };
      const done = d.done.includes(id) ? d.done.filter((x) => x !== id) : [...d.done, id];
      const mins = plan.blocks.filter((b) => done.includes(b.id)).reduce((a, b) => a + b.minutes, 0);
      return { ...l, [plan.date]: { done, minutes: mins } };
    });

  // últimos 28 días
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (27 - i));
    const k = isoDate(d);
    return { k, m: log[k]?.minutes ?? 0, d };
  });
  const maxM = Math.max(30, ...days.map((d) => d.m));

  return (
    <div className="page today">
      <section className="card hero">
        <div>
          <span className="lbl">Tonalidad del día</span>
          <div className="big">{keyLabel(plan.key)}</div>
          <span className="muted small">{view === 'Bb' ? `concierto ${plan.key}` : ''}</span>
        </div>
        <div>
          <span className="lbl">Tema de la semana</span>
          <div className="mid">{tuneOfWeek(today).name}</div>
        </div>
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

      <div className="blocks">
        {plan.blocks.map((b, i) => (
          <Block
            key={b.id}
            n={i + 1}
            block={b}
            done={day.done.includes(b.id)}
            onToggle={() => toggle(b.id)}
          />
        ))}
      </div>

      <section className="card">
        <h2 className="h3like">Últimas 4 semanas</h2>
        <div className="heat" role="img" aria-label="Minutos practicados por día">
          {days.map((d) => (
            <div key={d.k} title={`${d.k}: ${d.m} min`} className={d.k === plan.date ? 'today' : ''}>
              <i style={{ height: `${(d.m / maxM) * 100}%` }} />
            </div>
          ))}
        </div>
        <p className="muted small">
          La tonalidad cambia cada día siguiendo el ciclo de cuartas: en 12 días pasás por todas. El foco de armonía se elige en Lecciones ("Fijar como foco"); si no hay ninguno, rota cada 3 días.
        </p>
      </section>

      <BackupCard />
    </div>
  );
}

function Block({ n, block, done, onToggle }: { n: number; block: ReturnType<typeof buildPlan>['blocks'][number]; done: boolean; onToggle: () => void }) {
  const [left, setLeft] = useState(block.minutes * 60);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  useEffect(() => {
    if (left === 0 && running) {
      setRunning(false);
      if (!done) onToggle();
    }
  }, [left, running, done, onToggle]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <article className={`card block ${done ? 'done' : ''}`}>
      <header>
        <span className="num">{n}</span>
        <h2 className="h3like">{block.title}</h2>
        <span className="mins">{block.minutes} min</span>
      </header>
      <ul>
        {block.detail.map((d, i) =>
          typeof d === 'string' ? <li key={i}>{d}</li> : <li key={d.id}><Exercise ex={d} /></li>,
        )}
      </ul>
      <footer className="row">
        <button onClick={() => setRunning((r) => !r)} className={running ? 'on' : ''}>
          {running ? '❚❚' : '▶'} {mm}:{ss}
        </button>
        {block.link && <a className="button" href={block.link}>{block.linkLabel} →</a>}
        <label className="check">
          <input type="checkbox" checked={done} onChange={onToggle} /> Hecho
        </label>
      </footer>
    </article>
  );
}

/** Un ejercicio con su explicación completa, desplegable. */
function Exercise({ ex }: { ex: PracticeExercise }) {
  const { view } = useReading();
  return (
    <details className="exercise">
      <summary>{ex.short}</summary>
      <div className="ex-body">
        <p><b>Para qué:</b> {ex.goal}</p>
        {(ex.bpm || ex.minutes) && (
          <p className="muted small">
            {ex.bpm ? `Metrónomo: ${ex.bpm} bpm.` : ''} {ex.minutes ? `Unos ${ex.minutes} min.` : ''}
          </p>
        )}
        {ex.abc && (
          <figure>
            <Notation abc={ex.abc} transpose={view === 'C' ? -2 : 0} />
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
