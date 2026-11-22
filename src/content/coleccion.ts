/**
 * Importador de una colección en JSON (estilo iReal Pro: título, compositor, tonalidad, ritmo, compás y secciones con acordes, repeticiones
 * y finales). La app no trae ninguna colección: la elegís vos, se lee en tu navegador y queda ahí; nada del archivo sube a ningún lado.
 * Trae sólo armonía (sin melodía ni letra). Funciones puras: leer, buscar y convertir un tema a la grilla de la app.
 */
import type { Style } from '../audio/engine';
import { maxChordsPerBar, type Meter } from '../theory/chart';
import { type ChartDoc, compileDoc, type DocBar } from './chartDoc';
import { parseKeySpec, validateTune, type UserTune } from './library';
import { traducirAcorde } from './coleccionAcordes';

export const MAX_COLECCION_BYTES = 30 * 1024 * 1024;
export const MAX_COLECCION_TEMAS = 20000;

/** Lo que se ve de cada tema en la lista (el tema completo se convierte recién al agregarlo). */
export interface ResumenTema {
  idx: number;
  titulo: string;
  compositor: string;
  tonalidad: string;
  ritmo: string;
  compas: string;
  /** Título y compositor en minúsculas y sin acentos, para buscar. */
  busca: string;
}

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const txt = (x: unknown, max = 200): string => (typeof x === 'string' ? x.trim().slice(0, max) : '');

/** Lee y valida el archivo. Devuelve los temas (crudos) con su resumen, o un mensaje de por qué no sirve. */
export function leerColeccion(text: string): { temas: unknown[]; resumen: ResumenTema[] } | string {
  if (text.length > MAX_COLECCION_BYTES) return 'El archivo es demasiado grande para ser una colección.';
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return 'El archivo no es un JSON válido.';
  }
  const lista = Array.isArray(data) ? data : (data as { tunes?: unknown; songs?: unknown } | null)?.songs ?? (data as { tunes?: unknown } | null)?.tunes;
  if (!Array.isArray(lista) || lista.length === 0) return 'No encontré una lista de temas en el archivo.';
  if (lista.length > MAX_COLECCION_TEMAS) return `La colección tiene demasiados temas (máximo ${MAX_COLECCION_TEMAS}).`;
  const resumen: ResumenTema[] = [];
  const temas: unknown[] = [];
  for (const t of lista) {
    const o = t as { Title?: unknown; Composer?: unknown; Key?: unknown; Rhythm?: unknown; TimeSignature?: unknown; Sections?: unknown } | null;
    const titulo = txt(o?.Title, 80);
    if (!o || !titulo || !Array.isArray(o.Sections)) continue; // lo que no tiene la forma esperada se salta
    resumen.push({
      idx: temas.length,
      titulo,
      compositor: txt(o.Composer, 80),
      tonalidad: txt(o.Key, 12),
      ritmo: txt(o.Rhythm, 30),
      compas: txt(o.TimeSignature, 6),
      busca: sinAcentos(`${titulo} ${txt(o.Composer, 80)}`),
    });
    temas.push(t);
  }
  if (!resumen.length) return 'El archivo no tiene temas con título y secciones: no parece una colección de cifrados.';
  return { temas, resumen };
}

/** Temas cuyo título o compositor contiene todas las palabras buscadas (sin distinguir mayúsculas ni acentos), en orden alfabético. */
export function buscar(resumen: ResumenTema[], consulta: string): ResumenTema[] {
  const palabras = sinAcentos(consulta).split(/\s+/).filter(Boolean);
  const r = palabras.length ? resumen.filter((t) => palabras.every((p) => t.busca.includes(p))) : [...resumen];
  return r.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
}

// ---------------------------------------------------------------- ritmo → estilo y tempo

const RECTAS = 'corcheas rectas: la app no tiene ese estilo, se usa swing';
const RITMOS: Record<string, { style: Style; tempo: number; nota?: string }> = {
  'medium swing': { style: 'swing', tempo: 130 },
  'medium up swing': { style: 'swing', tempo: 160 },
  'up tempo swing': { style: 'swing', tempo: 200 },
  'slow swing': { style: 'swing', tempo: 90 },
  'medium slow': { style: 'swing', tempo: 100 },
  ballad: { style: 'ballad', tempo: 66 },
  'bossa nova': { style: 'bossa', tempo: 130 },
  samba: { style: 'latin', tempo: 150 },
  latin: { style: 'latin', tempo: 140 },
  'latin-swing': { style: 'latin', tempo: 140 },
  afro: { style: 'latin', tempo: 120 },
  calypso: { style: 'latin', tempo: 110 },
  waltz: { style: 'swing', tempo: 150 },
  'even 8ths': { style: 'swing', tempo: 120, nota: RECTAS },
  'even 16ths': { style: 'swing', tempo: 110, nota: RECTAS },
  funk: { style: 'swing', tempo: 110, nota: 'funk: la app no tiene ese estilo, se usa swing' },
  'rock pop': { style: 'swing', tempo: 110, nota: 'rock: la app no tiene ese estilo, se usa swing' },
  'slow rock': { style: 'swing', tempo: 80, nota: 'rock: la app no tiene ese estilo, se usa swing' },
};

/** Compases que la app sabe tocar. */
const COMPASES: Record<string, Meter | undefined> = { '4/4': undefined, '3/4': '3/4', '6/8': '6/8' };

// ---------------------------------------------------------------- un tema

export interface TemaConvertido {
  tune: UserTune;
  /** Lo que se aproximó, se omitió o se desplegó distinto (para mostrarlo, no impide cargar). */
  avisos: string[];
}

interface Segmento {
  /** Compases; cada uno con sus acordes ya traducidos. */
  bars: string[][];
}

/** Un segmento «D9|Fm6|C7,B7» → compases de acordes traducidos. Los compases vacíos del borde se descartan y los del medio repiten el anterior. */
function leerSegmento(chords: unknown, cuenta: { aprox: Map<string, number>; vacios: number; sobran: number }, meter?: Meter): Segmento | string {
  const crudos = typeof chords === 'string' ? chords.split('|') : [];
  const bars: (string[] | null)[] = crudos.map((b) => {
    const out: string[] = [];
    for (const c of b.split(',')) {
      if (!c.trim()) continue;
      const t = traducirAcorde(c);
      if (!t) return ['?' + c.trim()];
      if (t.nota) cuenta.aprox.set(t.nota, (cuenta.aprox.get(t.nota) ?? 0) + 1);
      out.push(t.sym);
    }
    return out.length ? out : null;
  });
  while (bars.length && bars[0] === null) bars.shift();
  while (bars.length && bars[bars.length - 1] === null) bars.pop();
  const max = maxChordsPerBar(meter);
  const fin: string[][] = [];
  for (const b of bars) {
    if (b === null) {
      cuenta.vacios++;
      fin.push(fin.length ? ['%'] : ['?vacío']);
      continue;
    }
    const mala = b.find((c) => c.startsWith('?'));
    if (mala) return `No se entiende el acorde «${mala.slice(1)}».`;
    if (b.length > max) cuenta.sobran++;
    fin.push(b.slice(0, max));
  }
  return { bars: fin };
}

const rotulo = (l: unknown): string | undefined => {
  const s = typeof l === 'string' ? l.trim() : '';
  return ['A', 'B', 'C', 'D'].includes(s) ? s : undefined;
};

const pl = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Convierte un tema de la colección a un tema de la app (con su grilla: secciones, repeticiones y finales). */
export function convertirTema(raw: unknown): TemaConvertido | { error: string } {
  const o = raw as { Title?: unknown; Composer?: unknown; Key?: unknown; Rhythm?: unknown; TimeSignature?: unknown; Sections?: unknown } | null;
  const name = txt(o?.Title, 80);
  if (!o || !name || !Array.isArray(o.Sections)) return { error: 'El tema no tiene título o secciones.' };
  const avisos: string[] = [];

  // compás
  const ts = txt(o.TimeSignature, 6);
  if (ts && !(ts in COMPASES)) return { error: `El compás ${ts} no está disponible en la app (sólo 4/4, 3/4 y 6/8).` };
  const meter = ts ? COMPASES[ts] : undefined;
  if (!ts) avisos.push('El tema no dice su compás: se usó 4/4.');

  // ritmo → estilo y tempo
  const ritmo = txt(o.Rhythm, 30);
  const r = RITMOS[ritmo.toLowerCase()];
  let style: Style = r?.style ?? 'swing';
  const tempo = r?.tempo ?? 120;
  if (r?.nota) avisos.push(`Ritmo «${ritmo}»: ${r.nota}.`);
  else if (!r) avisos.push(`Ritmo «${ritmo || 'sin dato'}» desconocido: se usó swing.`);
  if (meter && style !== 'swing' && style !== 'ballad') style = 'swing'; // en 3/4 y 6/8 sólo hay swing y balada
  avisos.push('El tempo no viene en la colección: se puso uno típico del ritmo; ajustalo.');

  // tonalidad
  const k = txt(o.Key, 12) ? parseKeySpec(txt(o.Key, 12)) : null;

  // secciones → grilla
  const cuenta = { aprox: new Map<string, number>(), vacios: 0, sobran: 0 };
  const secciones = (o.Sections as unknown[]).map((s) => s as { Label?: unknown; MainSegment?: { Chords?: unknown }; Endings?: { Chords?: unknown }[]; Repeats?: unknown } | null);
  const omitidas: string[] = [];
  let usar = secciones.filter((s) => {
    const l = typeof s?.Label === 'string' ? s.Label.trim().toLowerCase() : '';
    if (l === 'i' || l === 'v') {
      omitidas.push(l === 'i' ? 'la introducción' : 'el verso');
      return false;
    }
    return true;
  });
  if (!usar.length) usar = secciones; // si todo era introducción o verso, se deja
  else if (omitidas.length) avisos.push(`Se omitió ${[...new Set(omitidas)].join(' y ')}: la app repite toda la grilla en cada vuelta.`);

  const bars: DocBar[] = [];
  const poner = (seg: string[][], extra: (b: DocBar, i: number) => void) => seg.forEach((chords, i) => { const b: DocBar = { chords }; extra(b, i); bars.push(b); });
  for (const s of usar) {
    if (!s || !s.MainSegment) continue;
    const main = leerSegmento(s.MainSegment.Chords, cuenta, meter);
    if (typeof main === 'string') return { error: main };
    const fins: Segmento[] = [];
    for (const e of s.Endings ?? []) {
      const sg = leerSegmento(e?.Chords, cuenta, meter);
      if (typeof sg === 'string') return { error: sg };
      if (sg.bars.length) fins.push(sg);
    }
    const label = rotulo(s.Label);
    const rep = Number(s.Repeats) > 0;
    if (fins.length === 2) {
      // tema + 1.er final, se repite, tema + 2.º final
      poner(main.bars, (b, i) => { if (i === 0) { b.repeatStart = true; if (label) b.section = label; } });
      poner(fins[0].bars, (b) => { b.ending = 1; });
      poner(fins[1].bars, (b) => { b.ending = 2; });
    } else if (fins.length === 1) {
      poner(main.bars, (b, i) => { if (i === 0 && label) b.section = label; });
      poner(fins[0].bars, () => undefined);
      avisos.push('Una sección tiene un solo final: se tocó el tema y el final una vez.');
    } else if (fins.length >= 3) {
      fins.forEach((f, n) => { poner(main.bars, (b, i) => { if (i === 0 && label && n === 0) b.section = label; }); poner(f.bars, () => undefined); });
      avisos.push(`Una sección tiene ${fins.length} finales: se desplegó sin signos de repetición.`);
    } else {
      poner(main.bars, (b, i) => { if (i === 0 && label) b.section = label; });
      if (rep && main.bars.length) {
        const desde = bars.length - main.bars.length;
        bars[desde].repeatStart = true;
        bars[bars.length - 1].repeatEnd = true;
      }
    }
  }
  if (!bars.length) return { error: 'El tema no tiene compases.' };

  if (cuenta.vacios) avisos.push(`${pl(cuenta.vacios, 'compás vacío', 'compases vacíos')}: se repitió el anterior.`);
  if (cuenta.sobran) avisos.push(`${pl(cuenta.sobran, 'compás con', 'compases con')} más acordes de los que entran (${maxChordsPerBar(meter)}): se dejaron los primeros.`);
  const aprox = [...cuenta.aprox.entries()].sort((a, b) => b[1] - a[1]);
  if (aprox.length) avisos.push(`Acordes aproximados: ${aprox.slice(0, 4).map(([n, c]) => `${n} (${c})`).join('; ')}${aprox.length > 4 ? '…' : ''}.`);

  const doc: ChartDoc = { bars, ...(meter ? { meter } : {}) };
  let chart: string;
  try {
    chart = compileDoc(doc);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const v = validateTune({ name, composer: txt(o.Composer, 80), key: k?.key ?? null, mode: k?.mode ?? 'major', chart, tempo, style, doc });
  if (typeof v === 'string') return { error: v };
  return { tune: v, avisos };
}
