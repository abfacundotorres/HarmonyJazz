/**
 * Corte general del audio sin depender del motor: quien sabe sonar (el motor de play-along) se anota acá, y la
 * cáscara de la app puede cortar todo al cambiar de pantalla sin tener que cargar Tone.js para eso.
 */
const stoppers = new Set<() => void>();

export const registerStop = (f: () => void) => void stoppers.add(f);

export const stopAll = () => stoppers.forEach((f) => f());
