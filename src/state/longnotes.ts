/** Notas largas guardadas y su evolución día a día. */
export interface LongNote {
  /** "AAAA-MM-DD". */
  day: string;
  /** Nota en concierto. */
  midi: number;
  secs: number;
  /** Dispersión de la afinación en cents (menos es más estable). */
  spread: number;
  /** Desvío medio en cents. */
  offset: number;
}

export interface DayStat {
  day: string;
  count: number;
  /** Dispersión media del día, en cents. */
  spread: number;
  /** Segundos sostenidos en promedio. */
  secs: number;
}

/** Un resumen por día, del más viejo al más nuevo, de los últimos `days` días con notas. */
export function byDay(rows: LongNote[], days = 14): DayStat[] {
  const m = new Map<string, LongNote[]>();
  for (const r of rows) m.set(r.day, [...(m.get(r.day) ?? []), r]);
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-days)
    .map(([day, rs]) => ({ day, count: rs.length, spread: rs.reduce((a, r) => a + r.spread, 0) / rs.length, secs: rs.reduce((a, r) => a + r.secs, 0) / rs.length }));
}

/** Cambio de la dispersión media entre el primer y el último día con notas (negativo = más estable); null si hay menos de dos días. */
export function trend(stats: DayStat[]): number | null {
  return stats.length < 2 ? null : stats[stats.length - 1].spread - stats[0].spread;
}
