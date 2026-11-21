/**
 * Temas de dominio público (repertorio tradicional): la ÚNICA excepción a «la app no trae temas de terceros». Criterio: la
 * composición es libre en las dos reglas a la vez —publicada hasta 1930 en EE. UU. y con todos sus autores fallecidos hace más de
 * 70 años— o es tradicional/anónima. Sólo armonía: sin melodía ni letra. El cifrado es una **armonización habitual propia, escrita
 * de memoria y sin verificar contra ninguna edición** (no se copió de ningún libro): hay que contrastarla de oído. Se pueden copiar a
 * «Mis temas» para corregirlos y sumarles la melodía. Los grandes standards de los años 20 y 30 quedan fuera: varios son libres sólo en
 * EE. UU. y sus coautores murieron después de 1955.
 */
import type { Style } from '../audio/engine';
import type { Progression } from './progressions';

export interface TemaDominioPublico {
  id: string;
  nombre: string;
  /** Quién figura como autor, o «Tradicional». */
  autoria: string;
  /** Época de la obra (texto libre). */
  epoca: string;
  /** Por qué es de dominio público. */
  base: string;
  key: string;
  mode: 'major' | 'minor';
  tempo: number;
  style: Style;
  /** Cifrado en concierto. */
  chart: string;
}

export const DOMINIO_PUBLICO: TemaDominioPublico[] = [
  {
    id: 'dp-saints',
    nombre: 'When the Saints Go Marching In',
    autoria: 'Tradicional (espiritual)',
    epoca: 'fines del siglo XIX',
    base: 'Espiritual tradicional de autoría anónima y más de un siglo de antigüedad.',
    key: 'Bb',
    mode: 'major',
    tempo: 130,
    style: 'swing',
    chart: 'Bb | Bb | Bb | Bb | Bb | Bb | Bb | Bb7 | Eb | Eb | Bb | Bb | Bb | F7 | Bb | Bb',
  },
  {
    id: 'dp-riverside',
    nombre: 'Down by the Riverside',
    autoria: 'Tradicional (espiritual)',
    epoca: 'siglo XIX',
    base: 'Espiritual afroamericano tradicional de autoría anónima y más de un siglo de antigüedad.',
    key: 'F',
    mode: 'major',
    tempo: 120,
    style: 'swing',
    chart: 'F | F | F | F | Bb | Bb | F | F | C7 | C7 | F | F | F | C7 | F | F',
  },
  {
    id: 'dp-swinglow',
    nombre: 'Swing Low, Sweet Chariot',
    autoria: 'Tradicional (espiritual)',
    epoca: 'siglo XIX',
    base: 'Espiritual tradicional del siglo XIX (se lo atribuye a Wallace Willis, fallecido en el siglo XIX).',
    key: 'Eb',
    mode: 'major',
    tempo: 90,
    style: 'swing',
    chart: 'Eb | Eb | Eb | Ab | Eb | Eb | Bb7 | Eb | Eb | Eb | Eb | Ab | Eb | Bb7 | Eb | Eb',
  },
  {
    id: 'dp-grace',
    nombre: 'Amazing Grace',
    autoria: 'Letra de John Newton (1779); melodía tradicional',
    epoca: 'siglos XVIII y XIX',
    base: 'La letra es de 1779 (Newton murió en 1807) y la melodía es una tradicional anónima del siglo XIX.',
    key: 'F',
    mode: 'major',
    tempo: 76,
    style: 'ballad',
    chart: '@3/4 F | F | Bb | F | F | F | C7 | C7 | F | F | Bb | F | Dm | C7 | F | F',
  },
];

export const AVISO_DOMINIO_PUBLICO =
  'Armonización propia, escrita de memoria y SIN VERIFICAR: contrastala de oído y corregila. Sin melodía ni letra. Copialo a Mis temas para editarlo y sumarle la melodía.';

/** El tema como progresión de la app (categoría «Dominio público»). */
export function aProgresion(t: TemaDominioPublico): Progression {
  return {
    id: t.id,
    name: t.nombre,
    category: 'Dominio público',
    key: t.key,
    mode: t.mode,
    chart: t.chart,
    tempo: t.tempo,
    style: t.style,
    notes: `${t.autoria} (${t.epoca}). Dominio público: ${t.base} ${AVISO_DOMINIO_PUBLICO}`,
  };
}

export const PROGRESIONES_DOMINIO_PUBLICO: Progression[] = DOMINIO_PUBLICO.map(aProgresion);
