import { useMemo, useState } from 'react';
import { LICKS, lickById, lickInKey } from '../../content/licks';
import { concertRange } from '../../state/storage';
import { ExerciseCard } from '../components/ExerciseCard';
import { useMastery, useRoute, useSettings } from '../hooks';

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
          Frases para aprender en las 12 tonalidades. El método: aprendela de oído con "Oír la línea", tocala de memoria en la tonalidad del día, recorré el ciclo de cuartas y después variá la rítmica y el final.
        </p>
        <nav className="lick-list">
          {LICKS.map((l) => (
            <a key={l.id} href={`#/vocabulario/${l.id}`} className={l.id === lick.id ? 'on' : ''}>
              {l.name}
              <small>{Object.keys(mastery[`lick:${l.id}`] ?? {}).length}/12</small>
            </a>
          ))}
        </nav>
      </section>
      <LickCard key={lick.id} id={lick.id} initialKey={query.get('k')} />
    </div>
  );
}

function LickCard({ id, initialKey }: { id: string; initialKey: string | null }) {
  const lick = lickById(id);
  const [settings] = useSettings();
  const [key, setKey] = useState(initialKey ?? lick.key);
  const { chart, notes } = useMemo(() => lickInKey(lick, key, concertRange(settings.register)), [lick, key, settings.register]);
  const minor = /m7b5|m6/.test(lick.chart);
  return (
    <ExerciseCard
      id={`lick:${lick.id}`}
      title={lick.name}
      description={lick.idea}
      chart={chart}
      notes={notes}
      keyValue={key}
      mode={minor ? 'minor' : 'major'}
      onKey={setKey}
      tempo={130}
    />
  );
}
