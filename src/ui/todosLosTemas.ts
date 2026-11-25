import { PROGRESIONES_DOMINIO_PUBLICO } from '../content/dominioPublico';
import { tuneToProgression, type UserTune } from '../content/library';
import { PROGRESSIONS, type Progression } from '../content/progressions';

/** Todos los temas que se pueden tocar: las progresiones de la app, los de dominio público y los propios. */
export const todosLosTemas = (tunes: readonly UserTune[]): Progression[] => [...PROGRESSIONS, ...PROGRESIONES_DOMINIO_PUBLICO, ...tunes.map(tuneToProgression)];
