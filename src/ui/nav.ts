/**
 * Navegación: cinco grupos con sus pantallas. Cada pantalla conserva su dirección (`#/lecciones`, `#/escalas`…), así que
 * los enlaces guardados y los del plan de Hoy siguen funcionando; los grupos sólo ordenan la barra.
 */
export interface Group {
  id: string;
  label: string;
  /** [dirección, nombre] de cada pantalla del grupo; la primera es la que abre el grupo. */
  pages: readonly (readonly [string, string])[];
}

export const GROUPS: readonly Group[] = [
  { id: 'hoy', label: 'Hoy', pages: [['hoy', 'Plan'], ['mes', 'Mi mes'], ['curricula', 'Currícula'], ['progreso', 'Progreso']] },
  { id: 'estudiar', label: 'Estudiar', pages: [['lecciones', 'Lecciones'], ['escalas', 'Escalas'], ['vocabulario', 'Vocabulario']] },
  { id: 'tocar', label: 'Tocar', pages: [['playalong', 'Play-along'], ['repertorio', 'Repertorio'], ['metronomo', 'Metrónomo']] },
  { id: 'escuchar', label: 'Escuchar', pages: [['transcribir', 'Transcribir'], ['oido', 'Oído'], ['escucha', 'Afinador']] },
  { id: 'mas', label: 'Más', pages: [['mas', 'Ajustes'], ['creditos', 'Créditos']] },
];

/** Grupo al que pertenece una pantalla (Hoy si no se reconoce). */
export const groupOf = (page: string): Group => GROUPS.find((g) => g.pages.some(([p]) => p === page)) ?? GROUPS[0];

/** Nombre de una pantalla, para el título principal. */
export const pageLabel = (page: string): string => groupOf(page).pages.find(([p]) => p === page)?.[1] ?? 'HarmonyJazz';
