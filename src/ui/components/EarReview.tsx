import { earDue, earReview, type EarStats } from '../../ear/core';
import { useMemo } from 'react';
import { dayNum } from '../../state/progress';
import { usePersistent } from '../../state/storage';

/** ¿Hay algo del oído para repasar? Para que Hoy y Progreso decidan si muestran su tarjeta. */
export function useEarReview() {
  const [stats] = usePersistent<EarStats>('ear', {});
  const today = useMemo(() => dayNum(), []);
  const review = useMemo(() => earReview(stats, today), [stats, today]);
  return { review, due: earDue(review) };
}

/** El oído en el repaso: lo que más cuesta y un enlace para practicarlo. */
export function EarReview({ review }: { review: ReturnType<typeof earReview> }) {
  const top = review.weak.slice(0, 3);
  return (
    <ul className="tracklist reviewlist earreview">
      <li>
        <a className="link" href="#/oido">
          <b>Oído</b>
          <small>
            {top.length > 0
              ? `Te cuestan: ${top.map((w) => `${w.label} (${Math.round(w.rate * 100)} %)`).join(', ')}`
              : `Hace ${review.idle} días que no practicás el oído`}
          </small>
        </a>
      </li>
    </ul>
  );
}
