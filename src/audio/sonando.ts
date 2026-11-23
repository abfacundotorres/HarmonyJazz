/**
 * Estado mínimo de «hay un play-along sonando», sin depender de Tone.js: el motor lo actualiza y la cáscara de la app
 * (la barra flotante) lo lee y le manda pausa, seguir o stop sin tener que cargar el motor de audio.
 */
export interface Sonando {
  /** Nombre del tema que suena. */
  label: string;
  /** Dirección para volver a la pantalla del tema (si se puede reconstruir). */
  href?: string;
  paused: boolean;
}

export interface Acciones {
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

let cur: Sonando | null = null;
let acciones: Acciones | null = null;
const subs = new Set<() => void>();

export const getSonando = () => cur;
export const subscribeSonando = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
export const setSonando = (s: Sonando | null) => {
  if (s === cur || (s && cur && s.label === cur.label && s.href === cur.href && s.paused === cur.paused)) return;
  cur = s;
  subs.forEach((f) => f());
};
export const registerAcciones = (a: Acciones) => void (acciones = a);
export const accionesSonando = () => acciones;
