import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Lesson, LessonExercise, LESSONS, lessonById } from '../../content/lessons';
import { progressionById } from '../../content/progressions';
import { generatorById } from '../../exercises/generators';
import { concertRange } from '../../state/storage';
import { keyInterval, parseChart, transposeChart } from '../../theory/chart';
import { localizeNotes } from '../../exercises/localize';
import { COMMON_METHOD, GUIDES } from '../../content/exerciseGuides';
import { ExerciseCard } from '../components/ExerciseCard';
import { LineBreakdown } from '../components/LineBreakdown';
import { Prose } from '../components/Prose';
import { useMastery, useReading, useRoute, useSettings } from '../hooks';

export function Lessons() {
  const { path, query } = useRoute();
  const lesson = path[1] ? lessonById(path[1]) : undefined;
  const ex = Number(query.get('ex'));
  if (lesson) return <LessonView lesson={lesson} initialKey={query.get('k')} initialEx={query.has('ex') && Number.isInteger(ex) ? ex : null} />;
  return <LessonList />;
}

function LessonList() {
  const [mastery] = useMastery();
  const [settings, setSettings] = useSettings();
  const areas = [...new Set(LESSONS.map((l) => l.area))];
  return (
    <div className="page">
      {areas.map((a) => (
        <section key={a} className="card">
          <h2>{a}</h2>
          <div className="lesson-grid">
            {LESSONS.filter((l) => l.area === a).map((l) => {
              const keys = new Set(
                l.exercises.flatMap((_, i) => Object.keys(mastery[`${l.id}:${i}`] ?? {})),
              );
              return (
                <article key={l.id} className="lesson-tile">
                  <a href={`#/lecciones/${l.id}`}>
                    <h3>{l.title}</h3>
                    <p>{l.summary}</p>
                  </a>
                  <footer>
                    <span className="muted small">{keys.size ? `${keys.size} tonalidades trabajadas` : 'Sin empezar'}</span>
                    <button
                      className={`chip ${settings.focusLesson === l.id ? 'on' : ''}`}
                      onClick={() => setSettings({ focusLesson: settings.focusLesson === l.id ? '' : l.id })}
                      title="El plan diario usa esta lección como foco"
                    >
                      {settings.focusLesson === l.id ? 'Foco actual' : 'Fijar como foco'}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Sección plegable de una lección. Con `lazy`, el contenido (partituras, reproductores) se arma recién al abrirla. */
function Fold({ title, meta, defaultOpen, lazy, id, children }: { title: string; meta?: string; defaultOpen?: boolean; lazy?: boolean; id?: string; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const ref = useRef<HTMLDetailsElement>(null);
  // si se llegó desde un enlace a este ejercicio, queda a la vista
  useEffect(() => {
    if (defaultOpen) ref.current?.scrollIntoView({ block: 'start' });
  }, [defaultOpen]);
  return (
    <details ref={ref} className="card study fold" id={id} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        <h3>{title}</h3>
        {meta && <span className="muted small"> {meta}</span>}
      </summary>
      {(!lazy || open) && children}
    </details>
  );
}

function LessonView({ lesson, initialKey, initialEx }: { lesson: Lesson; initialKey: string | null; initialEx: number | null }) {
  const { iv } = useReading();
  const [mastery] = useMastery();
  /** Los textos usan nombres de notas en concierto (tonalidad de Do): se traducen a la lectura elegida. */
  const loc = (t: string) => localizeNotes(t, 'C', 'C', iv);
  return (
    <div className="page lesson">
      <a href="#/lecciones" className="back">← Lecciones</a>
      <section className="card">
        <span className="badge">{lesson.area}</span>
        <h2>{lesson.title}</h2>
        <p className="lead">{loc(lesson.summary)}</p>
      </section>
      <Fold title="Teoría">
        <Prose lines={lesson.body.map(loc)} />
        <h4 className="h4like">En la trompeta</h4>
        <ul>{lesson.trumpet.map((t, i) => <li key={i}>{loc(t)}</li>)}</ul>
        {lesson.listen && (
          <>
            <h4 className="h4like">Para escuchar</h4>
            <ul>{lesson.listen.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </>
        )}
      </Fold>
      <Fold title="Paso a paso">
        <ol className="steps">
          {lesson.steps.map((t, i) => (
            <li key={i}>{loc(t)}</li>
          ))}
        </ol>
      </Fold>
      <Fold title="Por qué funciona">
        <ul className="whylist">
          {lesson.why.map((t, i) => (
            <li key={i}>{loc(t)}</li>
          ))}
        </ul>
      </Fold>
      <Fold title="Plan de una semana">
        <ol className="steps">
          {lesson.week.map((t, i) => (
            <li key={i}><b>Día {i + 1}.</b> {loc(t)}</li>
          ))}
        </ol>
      </Fold>
      <Fold title="Errores frecuentes">
        <ul className="whylist">
          {lesson.mistakes.map((t, i) => (
            <li key={i}>{loc(t)}</li>
          ))}
        </ul>
      </Fold>
      <h3 className="sectionhead">Ejercicios ({lesson.exercises.length})</h3>
      {lesson.exercises.map((ex, i) => {
        const id = `${lesson.id}:${i}`;
        const done = Object.keys(mastery[id] ?? {}).filter((k) => k !== 'todas').length;
        const tempo = ex.tempo ?? progressionById(ex.progression).tempo;
        return (
          <Fold key={id} id={`ex-${i}`} title={ex.label} meta={`♩ ${tempo} · ${done}/12 tonalidades`} lazy defaultOpen={initialEx === i}>
            <LessonExerciseCard id={id} ex={ex} initialKey={initialKey} />
          </Fold>
        );
      })}
    </div>
  );
}

function LessonExerciseCard({ id, ex, initialKey }: { id: string; ex: LessonExercise; initialKey: string | null }) {
  const prog = progressionById(ex.progression);
  const [settings] = useSettings();
  const [key, setKey] = useState(initialKey ?? prog.key ?? 'C');
  const [seed, setSeed] = useState(0);
  const range = concertRange(settings.register);

  const { chart, notes, description, keyValue } = useMemo(() => {
    const g = generatorById(ex.generator!);
    const base = parseChart(prog.chart);
    const chart = prog.key ? transposeChart(base, keyInterval(prog.key, key)) : base;
    // la "variante" cambia el registro de arranque desplazando el rango
    const shift = [0, -3, 3][seed % 3];
    const notes = g.run(chart, { low: range.low + shift, high: range.high + shift });
    return { chart, notes, description: g.description, keyValue: prog.key ? key : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex, key, seed, settings.register]);

  return (
    <>
    <ExerciseCard
      id={id}
      title={ex.label}
      description={description}
      chart={chart}
      notes={notes}
      keyValue={keyValue}
      mode={prog.mode}
      onKey={setKey}
      tempo={ex.tempo ?? prog.tempo}
      style={prog.style}
      onRegenerate={() => setSeed((s) => s + 1)}
    />
    <PracticeGuide generator={ex.generator!} tempo={ex.tempo ?? prog.tempo} />
    <LineBreakdown recipe={generatorById(ex.generator!).recipe} chart={chart} notes={notes} />
    </>
  );
}

/** Cómo practicar este tipo de ejercicio: método común y pasos propios del tipo de línea. */
function PracticeGuide({ generator, tempo }: { generator: string; tempo: number }) {
  const { iv } = useReading();
  const loc = (t: string) => localizeNotes(t, 'C', 'C', iv);
  const g = GUIDES[generator];
  if (!g) return null;
  const slow = Math.max(40, Math.round((tempo * 0.5) / 4) * 4);
  return (
    <details className="card study">
      <summary><h3>Cómo practicar este ejercicio</h3></summary>
      <p>{loc(g.focus)}</p>
      <h4>Antes de tocar</h4>
      <ol>{g.steps.map((s, i) => <li key={i}>{loc(s)}</li>)}</ol>
      <h4>El método, paso a paso</h4>
      <ol>
        {COMMON_METHOD.map((s, i) => <li key={i}>{i === 1 ? `${s} Un tempo de partida razonable: ${slow} bpm.` : s}</li>)}
      </ol>
      <h4>Qué escuchar</h4>
      <p>{loc(g.listen)}</p>
      <h4>En la trompeta</h4>
      <ul>{g.trumpet.map((s, i) => <li key={i}>{loc(s)}</li>)}</ul>
    </details>
  );
}
