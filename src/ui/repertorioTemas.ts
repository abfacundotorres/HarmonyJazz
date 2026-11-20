import { type MonthPlan, monthActive, repertoireName } from '../content/monthPlan';

/** Los temas propios guardados (sólo id y nombre, descartando lo que no tenga la forma esperada). */
export const userTunes = (lib: { tunes?: unknown[] }) =>
  (lib.tunes ?? []).flatMap((t) => {
    const x = t as { id?: unknown; name?: unknown } | null;
    return x && typeof x.id === 'string' && typeof x.name === 'string' ? [{ id: x.id, name: x.name }] : [];
  });

/** Los temas del repertorio: los propios y, si el tema del mes es una forma incluida, también esa (primera). */
export function temasDeRepertorio(lib: { tunes?: unknown[] }, mp: MonthPlan, today: Date): { temas: { id: string; name: string }[]; delMes: string | null } {
  const tunes = userTunes(lib);
  const delMes = monthActive(mp, today, tunes) ? mp.rep : null;
  const temas = [...tunes];
  if (delMes && !temas.some((t) => t.id === delMes)) {
    const nombre = repertoireName(delMes, tunes);
    if (nombre) temas.unshift({ id: delMes, name: nombre });
  }
  return { temas, delMes };
}
