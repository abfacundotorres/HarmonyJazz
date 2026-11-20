import { useMemo } from 'react';
import { PASOS, type Pendiente, repasoRepertorio } from '../../content/repertorio';
import { dayNum } from '../../state/progress';
import { useMonth, usePersistentLibrary, useRepertorio } from '../hooks';
import { temasDeRepertorio } from '../repertorioTemas';

export type RepasoTema = Pendiente & { name: string };

/** Temas del repertorio empezados que hace tiempo no se tocan. */
export function useRepasoRepertorio(): { items: RepasoTema[]; due: boolean } {
  const [rep] = useRepertorio();
  const [lib] = usePersistentLibrary();
  const [mp] = useMonth();
  const today = useMemo(() => new Date(), []);
  const items = useMemo(() => {
    const { temas } = temasDeRepertorio(lib, mp, today);
    const nombres = new Map(temas.map((t) => [t.id, t.name]));
    return repasoRepertorio(rep, temas.map((t) => t.id), dayNum(today)).map((p) => ({ ...p, name: nombres.get(p.id) ?? p.id }));
  }, [rep, lib, mp, today]);
  return { items, due: items.length > 0 };
}

/** El repertorio en el repaso: los temas que hace días no tocás, con el paso que sigue. */
export function RepertorioReview({ items }: { items: RepasoTema[] }) {
  return (
    <ul className="tracklist reviewlist repertorioreview">
      {items.slice(0, 3).map((t) => (
        <li key={t.id}>
          <a className="link" href="#/repertorio">
            <b>Repertorio · {t.name}</b>
            <small>
              Hace {t.dias} días que no lo tocás · {t.paso !== null ? `sigue: ${PASOS[t.paso].titulo}` : 'completo: tocalo para mantenerlo'}
            </small>
          </a>
        </li>
      ))}
    </ul>
  );
}
