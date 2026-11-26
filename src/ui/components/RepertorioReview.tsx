import { useMemo } from 'react';
import { type Flojos, textoFlojos } from '../../content/flojos';
import { PASOS, type Pendiente, repasoRepertorio } from '../../content/repertorio';
import { dayNum } from '../../state/progress';
import { usePersistent } from '../../state/storage';
import { useMonth, usePersistentLibrary, useRepertorio } from '../hooks';
import { temasDeRepertorio } from '../repertorioTemas';

export type RepasoTema = Pendiente & { name: string; /** Compases flojos (0-based). */ flojos: number[] };

/** Temas del repertorio empezados que hace tiempo no se tocan. */
export function useRepasoRepertorio(): { items: RepasoTema[]; due: boolean } {
  const [rep] = useRepertorio();
  const [lib] = usePersistentLibrary();
  const [mp] = useMonth();
  const [flojos] = usePersistent<Flojos>('flojos', {});
  const today = useMemo(() => new Date(), []);
  const items = useMemo(() => {
    const { temas } = temasDeRepertorio(lib, mp, today);
    const nombres = new Map(temas.map((t) => [t.id, t.name]));
    return repasoRepertorio(rep, temas.map((t) => t.id), dayNum(today)).map((p) => ({ ...p, name: nombres.get(p.id) ?? p.id, flojos: flojos[p.id] ?? [] }));
  }, [rep, lib, mp, today, flojos]);
  return { items, due: items.length > 0 };
}

/** El repertorio en el repaso: los temas que hace días no tocás, con el paso que sigue. */
export function RepertorioReview({ items }: { items: RepasoTema[] }) {
  return (
    <ul className="tracklist reviewlist repertorioreview">
      {items.slice(0, 3).map((t) => (
        <li key={t.id}>
          <a className="link" href={`#/playalong?p=${encodeURIComponent(t.id)}`}>
            <b>Tema · {t.name}</b>
            <small>
              Hace {t.dias} días que no lo tocás · {t.paso !== null ? `sigue: ${PASOS[t.paso].titulo}` : 'completo: tocalo para mantenerlo'}
              {t.flojos.length > 0 && ` · ⚑ te cuestan los ${textoFlojos(t.flojos)}`}
            </small>
          </a>
          {t.flojos.length > 0 && (
            <a className="button" href={`#/playalong?p=${encodeURIComponent(t.id)}&flojos=1`} aria-label={`Practicar solo los compases flojos de ${t.name}`}>
              Practicar flojos
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
