/**
 * El libro que elegiste (un solo archivo) se guarda en este navegador para no tener que buscarlo cada vez. No se sube a ningún
 * lado y no entra en la copia de seguridad (pesa mucho). Si el navegador no deja guardarlo, el visor igual lo abre esa vez.
 */
export interface Libro {
  name: string;
  type: string;
  blob: Blob;
}

const DB = 'harmonyjazz-libro';
const STORE = 'libro';
const KEY = 'actual';

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('Este navegador no guarda archivos.'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error ?? new Error('No se pudo abrir el almacenamiento.'));
  });
}

async function con<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((res, rej) => {
      const t = db.transaction(STORE, modo);
      const q = f(t.objectStore(STORE));
      t.oncomplete = () => res(q.result);
      t.onerror = () => rej(t.error ?? new Error('Falló el almacenamiento.'));
      t.onabort = () => rej(t.error ?? new Error('No hay lugar para guardar el archivo.'));
    });
  } finally {
    db.close();
  }
}

export const guardarLibro = (l: Libro): Promise<unknown> => con('readwrite', (s) => s.put({ name: l.name, type: l.type, blob: l.blob }, KEY));
export const borrarLibro = (): Promise<unknown> => con('readwrite', (s) => s.delete(KEY));

/** El libro guardado, o null si no hay (o si el navegador no lo deja leer). */
export async function leerLibro(): Promise<Libro | null> {
  try {
    const r = (await con('readonly', (s) => s.get(KEY))) as Partial<Libro> | undefined;
    return r && r.blob instanceof Blob && typeof r.name === 'string' ? { name: r.name, type: typeof r.type === 'string' ? r.type : '', blob: r.blob } : null;
  } catch {
    return null;
  }
}
