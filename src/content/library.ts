import type { Style } from '../audio/engine';
import { CONCERT_KEYS, parseChart } from '../theory/chart';
import type { Progression } from './progressions';

/** Un tema que el usuario cargó. Se guarda sólo en su dispositivo. */
export interface UserTune {
  id: string;
  name: string;
  composer: string;
  /** Tonalidad (concierto) en la que está escrito el cifrado; null si no tiene una sola. */
  key: string | null;
  mode: 'major' | 'minor';
  chart: string;
  tempo: number;
  style: Style;
}

export const MAX_TUNES = 500;
export const MAX_CHART_CHARS = 20000;
const STYLES: Style[] = ['swing', 'two', 'ballad', 'bossa'];

export interface Library {
  tunes: UserTune[];
}

/**
 * Limpia el texto pegado desde un libro o un editor de cifrados: secciones ([A], *A), repeticiones
 * ({ } |: :|), barras dobles y saltos de línea. El resultado usa sólo "|" y espacios.
 */
export function normalizeChartText(src: string): string {
  return src
    .replace(/\[[A-Za-z0-9 ]{1,12}\]/g, '|') // [A] [Intro]
    .replace(/\*[A-Za-z]\b/g, '') // *A
    .replace(/[{}]/g, '|')
    .replace(/[|:]*:[|:]*/g, '|') // |: :| ||:
    .replace(/[\r\n]+/g, '|')
    .split('|')
    .map((bar) => bar.replace(/\s+/g, ' ').trim())
    .filter((bar) => bar.length > 0)
    .join(' | ');
}

export function newTuneId(): string {
  return 'u:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Valida un tema de origen desconocido (formulario o archivo importado). Devuelve el tema limpio o un mensaje de error. */
export function validateTune(raw: unknown): UserTune | string {
  if (typeof raw !== 'object' || raw === null) return 'Formato inválido';
  const t = raw as Record<string, unknown>;
  const name = typeof t.name === 'string' ? t.name.trim() : '';
  if (!name) return 'Falta el nombre';
  if (name.length > 80) return 'El nombre es demasiado largo (máximo 80 caracteres)';
  const composer = typeof t.composer === 'string' ? t.composer.trim().slice(0, 80) : '';
  const chart = typeof t.chart === 'string' ? t.chart : '';
  if (chart.length > MAX_CHART_CHARS) return 'El cifrado es demasiado largo';
  try {
    parseChart(normalizeChartText(chart));
  } catch (e) {
    return (e as Error).message;
  }
  const key = typeof t.key === 'string' && CONCERT_KEYS.includes(t.key) ? t.key : null;
  const mode = t.mode === 'minor' ? 'minor' : 'major';
  const tempoN = Math.round(Number(t.tempo));
  const tempo = Number.isFinite(tempoN) ? Math.max(40, Math.min(320, tempoN)) : 120;
  const style = STYLES.includes(t.style as Style) ? (t.style as Style) : 'swing';
  const id = typeof t.id === 'string' && /^u:[a-z0-9]{4,24}$/.test(t.id) ? t.id : newTuneId();
  return { id, name, composer, key, mode, chart: normalizeChartText(chart), tempo, style };
}

export function parseImport(json: string): { tunes: UserTune[]; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { tunes: [], errors: ['El archivo no es un JSON válido'] };
  }
  const list = Array.isArray(data) ? data : (data as { tunes?: unknown })?.tunes;
  if (!Array.isArray(list)) return { tunes: [], errors: ['No encontré una lista de temas en el archivo'] };
  const tunes: UserTune[] = [];
  const errors: string[] = [];
  list.slice(0, MAX_TUNES).forEach((raw, i) => {
    const r = validateTune(raw);
    if (typeof r === 'string') errors.push(`Tema ${i + 1}: ${r}`);
    else tunes.push(r);
  });
  if (list.length > MAX_TUNES) errors.push(`Se importaron sólo los primeros ${MAX_TUNES} temas`);
  return { tunes, errors };
}

/** Un tema del usuario, con la misma forma que los de la app. */
export function tuneToProgression(t: UserTune): Progression {
  return {
    id: t.id,
    name: t.name,
    category: 'Mis temas',
    key: t.key,
    mode: t.mode,
    chart: t.chart,
    tempo: t.tempo,
    style: t.style,
    notes: t.composer ? `De ${t.composer}. Cifrado cargado por vos.` : 'Cifrado cargado por vos.',
  };
}
