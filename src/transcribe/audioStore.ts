import { Filters, NO_FILTERS, validFilters } from './filters';
import { Grid, Marker, validGrid } from './grid';
import { Peaks, peaksFromChannels, Region } from './regions';
import { DEFAULT_TRAINER, Trainer, validTrainer } from './trainer';

/**
 * Audios del transcriptor. Los archivos pueden pesar decenas de MB, así que van en IndexedDB (no en
 * localStorage) y sólo en este dispositivo; nada se sube a ningún servidor.
 */
export interface SavedLoop {
  id: string;
  name: string;
  start: number;
  end: number;
  /** Velocidad con la que se guardó (1 = original). */
  rate?: number;
}

export interface TrackMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  added: number;
  opened: number;
  duration?: number;
  /** Posición donde se dejó (segundos). */
  pos: number;
  rate: number;
  loopOn: boolean;
  region: Region | null;
  loops: SavedLoop[];
  /** Afinación: semitonos enteros y centésimas. */
  pitchSemis: number;
  pitchCents: number;
  filters: Filters;
  grid: Grid | null;
  markers: Marker[];
  trainer: Trainer;
  /** Apuntes del usuario sobre este audio. */
  text: string;
  /** Vista de la onda. */
  viewMode: 'wave' | 'spec';
  /** Usar el reproductor simple del navegador. */
  simple: boolean;
  /** Click de metrónomo sobre la grilla. */
  clickOn: boolean;
  clickGain: number;
}

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : d);

/** Completa y valida una ficha guardada (las de versiones anteriores no tienen los campos nuevos). */
export function normalizeMeta(raw: TrackMeta): TrackMeta {
  const r = raw as Partial<TrackMeta> & TrackMeta;
  return {
    ...r,
    rate: num(r.rate, 0.25, 2, 1),
    pos: num(r.pos, 0, 1e6, 0),
    loops: Array.isArray(r.loops) ? r.loops : [],
    pitchSemis: Math.round(num(r.pitchSemis, -12, 12, 0)),
    pitchCents: Math.round(num(r.pitchCents, -100, 100, 0)),
    filters: validFilters(r.filters) ? r.filters : NO_FILTERS,
    grid: validGrid(r.grid) ? r.grid : null,
    markers: Array.isArray(r.markers) ? r.markers.filter((m) => m && typeof m.t === 'number' && typeof m.name === 'string') : [],
    trainer: validTrainer(r.trainer) ? r.trainer : DEFAULT_TRAINER,
    text: typeof r.text === 'string' ? r.text.slice(0, 5000) : '',
    viewMode: r.viewMode === 'spec' ? 'spec' : 'wave',
    simple: r.simple === true,
    clickOn: r.clickOn === true,
    clickGain: num(r.clickGain, 0.05, 1, 0.5),
  };
}

export const MAX_FILE_BYTES = 400 * 1024 * 1024;
/** Por encima de este tamaño no se dibuja la onda (decodificar consume mucha memoria en el celular). */
export const MAX_DECODE_BYTES = 80 * 1024 * 1024;

const DB_NAME = 'harmonyjazz-audio';
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      if (typeof indexedDB === 'undefined') return rej(new Error('Este navegador no permite guardar audios'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('meta', { keyPath: 'id' });
        req.result.createObjectStore('blobs');
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error ?? new Error('No se pudo abrir el almacenamiento'));
    });
    dbp.catch(() => (dbp = null));
  }
  return dbp;
}

function tx<T>(stores: string | string[], mode: IDBTransactionMode, run: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise<T | undefined>((res, rej) => {
        const t = d.transaction(stores, mode);
        const r = run(t);
        t.oncomplete = () => res(r ? (r.result as T) : undefined);
        t.onerror = () => rej(t.error ?? new Error('Error de almacenamiento'));
        t.onabort = () => rej(t.error ?? new Error('No hay espacio suficiente para guardar el audio'));
      }),
  );
}

/** Lista los audios; descarta (y borra) las fichas huérfanas cuyo archivo ya no existe. */
export async function listTracks(): Promise<TrackMeta[]> {
  const d = await db();
  const all = await new Promise<TrackMeta[]>((res, rej) => {
    const t = d.transaction(['meta', 'blobs'], 'readwrite');
    const metas = t.objectStore('meta').getAll();
    const out: TrackMeta[] = [];
    metas.onsuccess = () => {
      for (const m of metas.result as TrackMeta[]) {
        const c = t.objectStore('blobs').count(m.id);
        c.onsuccess = () => {
          if (c.result) out.push(m);
          else t.objectStore('meta').delete(m.id);
        };
      }
    };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error ?? new Error('Error de almacenamiento'));
    t.onabort = () => rej(t.error ?? new Error('Error de almacenamiento'));
  });
  return all.map(normalizeMeta).sort((a, b) => b.opened - a.opened);
}

export async function addTrack(file: File): Promise<TrackMeta> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`El archivo pesa ${(file.size / 1048576).toFixed(0)} MB; el máximo es ${MAX_FILE_BYTES / 1048576} MB`);
  const now = Date.now();
  const meta: TrackMeta = {
    id: 'a:' + now.toString(36) + Math.random().toString(36).slice(2, 6),
    name: file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Audio',
    size: file.size,
    type: file.type,
    added: now,
    opened: now,
    pos: 0,
    rate: 1,
    loopOn: false,
    region: null,
    loops: [],
    pitchSemis: 0,
    pitchCents: 0,
    filters: NO_FILTERS,
    grid: null,
    markers: [],
    trainer: DEFAULT_TRAINER,
    text: '',
    viewMode: 'wave',
    simple: false,
    clickOn: false,
    clickGain: 0.5,
  };
  await tx(['meta', 'blobs'], 'readwrite', (t) => {
    t.objectStore('blobs').put(file, meta.id);
    t.objectStore('meta').put(meta);
  });
  return meta;
}

export async function getBlob(id: string): Promise<Blob | null> {
  return (await tx<Blob>('blobs', 'readonly', (t) => t.objectStore('blobs').get(id))) ?? null;
}

/** Guarda la ficha sólo si el audio todavía existe (así borrar un audio abierto no lo "resucita"). */
export async function saveMeta(meta: TrackMeta): Promise<void> {
  await tx(['meta', 'blobs'], 'readwrite', (t) => {
    const c = t.objectStore('blobs').count(meta.id);
    c.onsuccess = () => {
      if (c.result) t.objectStore('meta').put(meta);
    };
  });
}

export async function removeTrack(id: string): Promise<void> {
  await tx(['meta', 'blobs'], 'readwrite', (t) => {
    t.objectStore('meta').delete(id);
    t.objectStore('blobs').delete(id);
  });
}

/**
 * Picos de la onda para dibujarla. Se decodifica a 8 kHz (el navegador remuestrea) para gastar poca memoria;
 * devuelve null si el archivo es muy grande o no se puede decodificar (el audio igual se puede reproducir).
 */
export async function decodePeaks(blob: Blob, perSec = 200): Promise<Peaks | null> {
  if (blob.size > MAX_DECODE_BYTES) return null;
  try {
    const Ctor: typeof OfflineAudioContext | undefined = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor(1, 1, 8000);
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const chans: Float32Array[] = [];
    for (let c = 0; c < buf.numberOfChannels; c++) chans.push(buf.getChannelData(c));
    return peaksFromChannels(chans, buf.sampleRate, perSec);
  } catch {
    return null;
  }
}
