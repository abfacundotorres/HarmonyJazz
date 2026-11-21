import type { Style } from '../audio/engine';
import { qdef } from '../theory/chords';
import { CONCERT_KEYS, chartToString, parseChart, transposeChart } from '../theory/chart';
import { BB_TRUMPET, invert, noteName, parseNote, simplify, transposeNote } from '../theory/notes';
import { compileDoc, ChartDoc, sanitizeDoc } from './chartDoc';
import { buildMelody, type Reading } from './melody';
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
  /** Grilla del editor (secciones, repeticiones, finales). `chart` es siempre su versión desplegada. */
  doc?: ChartDoc;
  /** Melodía escrita por el usuario (notas en concierto, formato del Vocabulario); empieza en el compás 1. */
  melody?: string;
}

export const MAX_TUNES = 500;
export const MAX_CHART_CHARS = 20000;
const STYLES: Style[] = ['swing', 'two', 'ballad', 'bossa', 'latin'];

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
  let chart = typeof t.chart === 'string' ? t.chart : '';
  if (chart.length > MAX_CHART_CHARS) return 'El cifrado es demasiado largo';
  let doc: ChartDoc | undefined;
  if (t.doc !== undefined && t.doc !== null) {
    const d = sanitizeDoc(t.doc);
    if (typeof d === 'string') return d;
    try {
      chart = compileDoc(d); // el cifrado que se toca sale siempre de la grilla
    } catch (e) {
      return (e as Error).message;
    }
    doc = d;
  }
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
  const chartText = normalizeChartText(chart);
  // una melodía dañada o que ya no cabe en el cifrado se descarta sin tirar el tema entero
  const mel = typeof t.melody === 'string' ? buildMelody(chartText, t.melody, 'C') : null;
  const melody = mel && typeof mel !== 'string' ? mel.line : undefined;
  return { id, name, composer, key, mode, chart: chartText, tempo, style, ...(doc ? { doc } : {}), ...(melody ? { melody } : {}) };
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
    doc: t.doc,
    melody: t.melody,
    notes: t.composer ? `De ${t.composer}. Cifrado cargado por vos.` : 'Cifrado cargado por vos.',
  };
}

// ---------- Carga masiva desde texto ----------

/** Un tema detectado en el texto, con lo que se pudo entender y lo que no. */
export interface BulkEntry {
  /** Línea (1-based) donde empieza el tema en el texto. */
  line: number;
  name: string;
  tune: UserTune | null;
  /** Avisos que no impiden importar (por ejemplo, "tonalidad deducida"). */
  notes: string[];
  /** Motivo por el que no se puede importar. */
  error: string | null;
  bars: number;
}

const ENHARMONIC: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb', 'E#': 'F', 'B#': 'C', Cb: 'B', Fb: 'E',
};

/** "G", "Gm", "G minor", "Bb", "F# menor", "Ebmaj" → { key en concierto, modo } o null si no se entiende. */
export function parseKeySpec(spec: string): { key: string; mode: 'major' | 'minor' } | null {
  const m = /^\s*([A-Ga-g])([#b♯♭]?)\s*(m|min|minor|menor|-)?\s*(major|mayor|maj|M)?\s*$/.exec(spec.replace(/♯/g, '#').replace(/♭/g, 'b'));
  if (!m) return null;
  let root = m[1].toUpperCase() + m[2];
  root = ENHARMONIC[root] ?? root;
  if (!CONCERT_KEYS.includes(root)) return null;
  const minor = !!m[3] && !m[4];
  return { key: root, mode: minor ? 'minor' : 'major' };
}

function parseStyleSpec(spec: string): Style | null {
  const t = spec.trim().toLowerCase();
  if (/^(swing|walking)$/.test(t)) return 'swing';
  if (/^(two|en ?2|swing en 2|2)$/.test(t)) return 'two';
  if (/^(ballad|balada)$/.test(t)) return 'ballad';
  if (/^(bossa|bossa ?nova)$/.test(t)) return 'bossa';
  if (/^(latin|latino|latin jazz|afro ?cuban[oa]?)$/.test(t)) return 'latin';
  return null;
}

const META = /^(key|tonalidad|tono|tempo|style|estilo|composer|compositor|mode|modo|compás|compas|meter|metro|time|lectura|reading|melodía|melodia|melody)\s*[:=]\s*(.*)$/i;

/** "Bb", "si♭", "trompeta" → 'Bb'; "C", "concierto" → 'C'; otra cosa → null. */
export function parseReadingSpec(spec: string): Reading | null {
  const t = spec.trim().toLowerCase().replace(/♭/g, 'b');
  if (/^(bb|b ?flat|si ?b|si ?bemol|trompeta|trumpet|escrito|transpuesto)$/.test(t)) return 'Bb';
  if (/^(c|do|concierto|concert|real|sonando)$/.test(t)) return 'C';
  return null;
}

/**
 * Lee varios temas de un texto. Formato:
 *
 *   # Nombre del tema
 *   compositor: ...      (opcional)
 *   tonalidad: G menor   (opcional, en concierto)
 *   tempo: 140           (opcional)
 *   estilo: swing        (opcional: swing, en 2, balada, bossa, latin)
 *   compás: 3/4          (opcional: 4/4 por defecto; también 6/8)
 *   lectura: Bb          (opcional: el cifrado, la tonalidad y la melodía están escritos para trompeta en Si♭; por defecto concierto)
 *   melodía: D4 F4:2 r:2 (opcional: notas del Vocabulario desde el compás 1; puede seguir en varias líneas "melodía:")
 *   [A] Cm7 | F7 | Bbmaj7 | Ebmaj7 |
 *   Am7b5 | D7 | Gm | %
 *
 * Cada línea que empieza con # abre un tema nuevo. Los saltos de línea separan compases.
 * Si no hay tonalidad se deduce del último acorde sólo cuando éste es un acorde de tónica claro.
 */
export function parseBulk(text: string): BulkEntry[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  interface Draft { line: number; name: string; meta: Record<string, string>; chart: string[]; }
  const drafts: Draft[] = [];
  let cur: Draft | null = null;
  const stray: number[] = [];

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith('#')) {
      cur = { line: i + 1, name: line.replace(/^#+\s*/, '').trim(), meta: {}, chart: [] };
      drafts.push(cur);
      return;
    }
    if (!cur) {
      stray.push(i + 1);
      return;
    }
    const meta = META.exec(line);
    if (meta) {
      const k = meta[1].toLowerCase();
      const norm = k === 'tono' || k === 'tonalidad' ? 'key' : k === 'estilo' ? 'style' : k === 'compositor' ? 'composer' : k === 'modo' ? 'mode' : ['compás', 'compas', 'meter', 'metro', 'time'].includes(k) ? 'meter' : k;
      const val = meta[2].trim();
      // la melodía puede seguir en varias líneas "melodía: ..."; se juntan
      if (norm === 'melodía' || norm === 'melodia' || norm === 'melody') cur.meta.melody = ((cur.meta.melody ?? '') + ' ' + val).trim();
      else cur.meta[norm === 'lectura' ? 'reading' : norm] = val;
      return;
    }
    cur.chart.push(line);
  });

  const out: BulkEntry[] = drafts.map((d) => {
    const notes: string[] = [];
    const entry: BulkEntry = { line: d.line, name: d.name, tune: null, notes, error: null, bars: 0 };
    if (!d.name) return { ...entry, error: 'Falta el nombre después del #' };
    const body = normalizeChartText(d.chart.join('\n'));
    if (!body) return { ...entry, error: 'No tiene cifrado' };
    // el compás puede venir como línea "compás: 3/4" o escrito al comienzo del cifrado ("@3/4 ...")
    const ms = d.meta.meter ? /^\s*(4\/4|3\/4|6\/8)\s*$/.exec(d.meta.meter) : null;
    if (d.meta.meter && !ms) notes.push(`No entendí el compás "${d.meta.meter}": se usa 4/4`);
    const chartText = ms && ms[1] !== '4/4' && !/^\s*@/.test(body) ? `@${ms[1]} ${body}` : body;

    // lectura: con "Bb" el cifrado, la tonalidad y la melodía están escritos para trompeta en Si♭ y se pasan a concierto
    let reading: Reading = 'C';
    if (d.meta.reading) {
      const r = parseReadingSpec(d.meta.reading);
      if (r) reading = r;
      else notes.push(`No entendí la lectura "${d.meta.reading}": se usa concierto (escribí "Bb" o "concierto")`);
    }
    const down = invert(BB_TRUMPET);

    let chart;
    let concertText = chartText;
    try {
      chart = parseChart(chartText);
      if (reading === 'Bb') {
        chart = transposeChart(chart, down);
        concertText = chartToString(chart);
        notes.push('Cifrado pasado de Si♭ a concierto (un tono abajo)');
      }
    } catch (e) {
      return { ...entry, error: (e as Error).message };
    }
    entry.bars = chart.bars;

    let key: string | null = null;
    let mode: 'major' | 'minor' = 'major';
    if (d.meta.key) {
      const k = parseKeySpec(d.meta.key);
      if (k && reading === 'Bb') {
        const concert = noteName(simplify(transposeNote(parseNote(k.key), down)));
        if (CONCERT_KEYS.includes(concert)) {
          key = concert;
          mode = k.mode;
        } else notes.push(`La tonalidad "${d.meta.key}" en Si♭ no cae en una tonalidad de concierto usual: quedó sin tonalidad fija`);
      } else if (k) {
        key = k.key;
        mode = k.mode;
      } else notes.push(`No entendí la tonalidad "${d.meta.key}": quedó sin tonalidad fija`);
    } else {
      // deducir sólo si el último acorde es una tónica clara
      const last = chart.chords[chart.chords.length - 1].chord;
      const fam = qdef(last).family;
      const tonic = ['maj', 'maj7', '6', 'maj7#11', 'm', 'm7', 'm6', 'mMaj7'].includes(last.quality);
      const root = noteName(simplify(last.root));
      if (tonic && CONCERT_KEYS.includes(root)) {
        key = root;
        mode = fam === 'minor' ? 'minor' : 'major';
        notes.push(`Tonalidad deducida del último acorde: ${root}${mode === 'minor' ? ' menor' : ''}. Si no es correcta, agregá "tonalidad: ..."`);
      } else notes.push('Sin tonalidad fija (se puede transponer de a medio tono)');
    }
    if (d.meta.mode && !d.meta.key) mode = /^(m|min|minor|menor)/i.test(d.meta.mode) ? 'minor' : 'major';

    const style = d.meta.style ? parseStyleSpec(d.meta.style) : null;
    if (d.meta.style && !style) notes.push(`No entendí el estilo "${d.meta.style}": se usa swing`);

    // la melodía se valida contra el cifrado; si falla, el tema se importa igual y se avisa por qué
    let melody: string | undefined;
    if (d.meta.melody) {
      const m = buildMelody(concertText, d.meta.melody, reading);
      if (typeof m === 'string') notes.push(`La melodía no se importó: ${m}`);
      else {
        melody = m.line;
        notes.push(`Melodía: ${m.bars} de ${chart.bars} compases`);
      }
    }

    const v = validateTune({
      name: d.name,
      composer: d.meta.composer ?? '',
      key,
      mode,
      chart: concertText,
      tempo: d.meta.tempo ? Number(d.meta.tempo) : 120,
      style: style ?? 'swing',
      ...(melody ? { melody } : {}),
    });
    if (typeof v === 'string') return { ...entry, error: v };
    return { ...entry, tune: v };
  });

  if (drafts.length === 0) {
    return [{ line: 1, name: '', tune: null, notes: [], error: 'No encontré ningún tema: cada tema tiene que empezar con una línea "# Nombre"', bars: 0 }];
  }
  if (stray.length) {
    out[0].notes.push(`Se ignoraron líneas anteriores al primer "#" (${stray.slice(0, 3).join(', ')}${stray.length > 3 ? '…' : ''})`);
  }
  return out;
}
