import { useMemo, useState } from 'react';
import { LICKS, Lick, lickById, lickInKey, LickLevel } from '../../content/licks';
import { concertRange } from '../../state/storage';
import { ExerciseCard } from '../components/ExerciseCard';
import { LickStudy } from '../components/LickStudy';
import { localizeNotes } from '../../exercises/localize';
import { useMastery, useReading, useRoute, useSettings } from '../hooks';

const LEVELS: LickLevel[] = ['Esencial', 'Intermedio', 'Avanzado'];

export function Vocab() {
  const { path, query } = useRoute();
  const [mastery] = useMastery();
  const id = path[1] ?? LICKS[0].id;
  const lick = lickById(id) ?? LICKS[0];
  return (
    <div className="page vocab">
      <section className="card">
        <h2>Vocabulario</h2>
        <p className="muted">
          Frases para aprender en las 12 tonalidades. Cada una trae el paso a paso para aprenderla, sus ideas, el análisis nota por nota, por qué funciona y ejercicios.
          El método: escuchala con "Oír la línea", tocala de memoria, recorré el ciclo de cuartas y después variá el ritmo y el final.
        </p>
        {LEVELS.map((lv) => {
          const items = LICKS.filter((l) => (l.level ?? 'Intermedio') === lv);
          return items.length ? (
            <div key={lv} className="lickgroup">
              <h4>{lv}</h4>
              <nav className="lick-list">
                {items.map((l) => (
                  <a key={l.id} href={`#/vocabulario/${l.id}`} className={l.id === lick.id ? 'on' : ''}>
                    {l.name}
                    <small>{Object.keys(mastery[`lick:${l.id}`] ?? {}).length}/12</small>
                  </a>
                ))}
              </nav>
            </div>
          ) : null;
        })}
      </section>
      <LickCard key={lick.id} lick={lick} initialKey={query.get('k')} />
    </div>
  );
}

function LickCard({ lick, initialKey }: { lick: Lick; initialKey: string | null }) {
  const [settings] = useSettings();
  const { iv } = useReading();
  const [key, setKey] = useState(initialKey ?? lick.key);
  const { chart, notes } = useMemo(() => lickInKey(lick, key, concertRange(settings.register)), [lick, key, settings.register]);
  const mode = lick.mode ?? (/m7b5|m6/.test(lick.chart) ? 'minor' : 'major');
  return (
    <>
      <ExerciseCard
        id={`lick:${lick.id}`}
        title={lick.name}
        description={localizeNotes(lick.idea, lick.key, key, iv)}
        chart={chart}
        notes={notes}
        keyValue={key}
        mode={mode}
        onKey={setKey}
        tempo={lick.tempo ?? 130}
      />
      <LickStudy lick={lick} chart={chart} notes={notes} keyValue={key} />
    </>
  );
}
