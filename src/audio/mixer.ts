/**
 * Mezcla del acompañamiento: volumen y ecualizador (graves, medios, agudos) de cada instrumento y de la mezcla general.
 * Sin dependencias del motor de audio, para validarse al leer los ajustes guardados.
 */
export const STRIPS = ['master', 'piano', 'bass', 'drums', 'horn'] as const;
export type StripId = (typeof STRIPS)[number];

export const STRIP_LABEL: Record<StripId, string> = { master: 'General', piano: 'Piano', bass: 'Bajo', drums: 'Batería', horn: 'Línea' };

export interface Strip {
  /** Volumen en dB (−18…+6). */
  vol: number;
  /** Graves, medios y agudos en dB (−12…+12). */
  low: number;
  mid: number;
  high: number;
}
export type Mixer = Record<StripId, Strip>;

export const FLAT: Strip = { vol: 0, low: 0, mid: 0, high: 0 };
export const defaultMixer = (): Mixer => ({ master: { ...FLAT }, piano: { ...FLAT }, bass: { ...FLAT }, drums: { ...FLAT }, horn: { ...FLAT } });

export const RANGE = { vol: [-18, 6], eq: [-12, 12] } as const;
export const BANDS = [
  ['vol', 'Volumen'],
  ['low', 'Graves'],
  ['mid', 'Medios'],
  ['high', 'Agudos'],
] as const;
export type Band = (typeof BANDS)[number][0];

const clamp = (v: unknown, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v))) : 0);

/** Mezcla limpia a partir de lo guardado: lo que falta o está dañado queda plano. */
export function cleanMixer(raw: unknown): Mixer {
  const out = defaultMixer();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const id of STRIPS) {
    const s = (raw as Record<string, unknown>)[id];
    if (typeof s !== 'object' || s === null || Array.isArray(s)) continue;
    const r = s as Record<string, unknown>;
    out[id] = { vol: clamp(r.vol, ...RANGE.vol), low: clamp(r.low, ...RANGE.eq), mid: clamp(r.mid, ...RANGE.eq), high: clamp(r.high, ...RANGE.eq) };
  }
  return out;
}

export const isFlat = (s: Strip) => s.vol === 0 && s.low === 0 && s.mid === 0 && s.high === 0;
