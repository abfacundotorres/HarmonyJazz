import type { Due } from '../../state/progress';
import { describeItem } from '../progressItems';
import { useReading } from '../hooks';
import type { Lick } from '../../content/licks';

const when = (d: Due) => (d.ago === 1 ? 'ayer' : `hace ${d.ago} días`);

/** Lista de lo que toca repasar, con enlace a cada ejercicio en su tonalidad. */
export function ReviewList({ items, phrases, temas = [] }: { items: Due[]; phrases: Pick<Lick, 'id' | 'name'>[]; temas?: { id: string; name: string }[] }) {
  const { keyLabel } = useReading();
  return (
    <ul className="tracklist reviewlist">
      {items.map((d) => {
        const it = describeItem(d.id, phrases, temas);
        if (!it) return null;
        return (
          <li key={`${d.id}|${d.key}`}>
            <a className="link" href={it.href(d.key)}>
              <b>{it.title} · {keyLabel(d.key)}</b>
              <small>
                {it.detail} · {d.undated ? 'sin fecha' : `marcado ${when(d)}`} · {d.bpm} bpm{d.late > 0 && !d.undated ? ` · ${d.late} ${d.late === 1 ? 'día' : 'días'} de retraso` : ''}
              </small>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
