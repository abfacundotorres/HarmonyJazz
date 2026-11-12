import { useMemo, useState } from 'react';
import { Lesson, LessonExercise, LESSONS, lessonById } from '../../content/lessons';
import { progressionById } from '../../content/progressions';
import { generatorById } from '../../exercises/generators';
import { concertRange } from '../../state/storage';
import { keyInterval, parseChart, transposeChart } from '../../theory/chart';
import { localizeNotes } from '../../exercises/localize';
import { ExerciseCard } from '../components/ExerciseCard';
import { LineBreakdown } from '../components/LineBreakdown';
import { Prose } from '../components/Prose';
import { useMastery, useReading, useRoute, useSettings } from '../hooks';

export function Lessons() {
  const { path, query } = useRoute();
  const lesson = path[1] ? lessonById(path[1]) : undefined;
  if (lesson) return <LessonView lesson={lesson} initialKey={query.get('k')} />;
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

function LessonView({ lesson, initialKey }: { lesson: Lesson; initialKey: string | null }) {
  const { iv } = useReading();
  /** Los textos usan nombres de notas en concierto (tonalidad de Do): se traducen a la lectura elegida. */
  const loc = (t: string) => localizeNotes(t, 'C', 'C', iv);
  return (
    <div className="page lesson">
      <a href="#/lecciones" className="back">← Lecciones</a>
      <section className="card">
        <span className="badge">{lesson.area}</span>
        <h2>{lesson.title}</h2>
        <p className="lead">{loc(lesson.summary)}</p>
        <Prose lines={lesson.body.map(loc)} />
        <h3 className="h4like">En la trompeta</h3>
        <ul>{lesson.trumpet.map((t, i) => <li key={i}>{loc(t)}</li>)}</ul>
        {lesson.listen && (
          <>
            <h3 className="h4like">Para escuchar</h3>
            <ul>{lesson.listen.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </>
        )}
      </section>
      <details className="card study" open>
        <summary>
          <h3>Paso a paso</h3>
        </summary>
        <ol className="steps">
          {lesson.steps.map((t, i) => (
            <li key={i}>{loc(t)}</li>
          ))}
        </ol>
      </details>
      <details className="card study" open>
        <summary>
          <h3>Por qué funciona</h3>
        </summary>
        <ul className="whylist">
          {lesson.why.map((t, i) => (
            <li key={i}>{loc(t)}</li>
          ))}
        </ul>
      </details>
      <h3 className="sectionhead">Ejercicios ({lesson.exercises.length})</h3>
      {lesson.exercises.map((ex, i) => (
        <LessonExerciseCard key={`${lesson.id}:${i}`} id={`${lesson.id}:${i}`} ex={ex} initialKey={initialKey} />
      ))}
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
    <LineBreakdown recipe={generatorById(ex.generator!).recipe} chart={chart} notes={notes} />
    </>
  );
}
