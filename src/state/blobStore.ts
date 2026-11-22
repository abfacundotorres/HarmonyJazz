/**
 * Un archivo (uno solo) guardado en este navegador, en IndexedDB: no entra en la copia de seguridad (pesa) y no sube a ningún lado. Si el
 * navegador no deja guardarlo, el archivo igual se usa esa vez.
 */
export interface Archivo {
  name: string;
  type: string;
  blob: Blob;
}

export interface Almacen {
  guardar: (a: Archivo) => Promise<unknown>;
  leer: () => Promise<Archivo | null>;
  borrar: () => Promise<unknown>;
}

const KEY = 'actual';

export function crearAlmacen(base: string, tabla: string): Almacen {
  const abrir = (): Promise<IDBDatabase> =>
    new Promise((res, rej) => {
      if (typeof indexedDB === 'undefined') return rej(new Error('Este navegador no guarda archivos.'));
      const r = indexedDB.open(base, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(tabla);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error ?? new Error('No se pudo abrir el almacenamiento.'));
    });
  const con = async <T,>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await abrir();
    try {
      return await new Promise<T>((res, rej) => {
        const t = db.transaction(tabla, modo);
        const q = f(t.objectStore(tabla));
        t.oncomplete = () => res(q.result);
        t.onerror = () => rej(t.error ?? new Error('Falló el almacenamiento.'));
        t.onabort = () => rej(t.error ?? new Error('No hay lugar para guardar el archivo.'));
      });
    } finally {
      db.close();
    }
  };
  return {
    guardar: (a) => con('readwrite', (s) => s.put({ name: a.name, type: a.type, blob: a.blob }, KEY)),
    borrar: () => con('readwrite', (s) => s.delete(KEY)),
    leer: async () => {
      try {
        const r = (await con('readonly', (s) => s.get(KEY))) as Partial<Archivo> | undefined;
        return r && r.blob instanceof Blob && typeof r.name === 'string' ? { name: r.name, type: typeof r.type === 'string' ? r.type : '', blob: r.blob } : null;
      } catch {
        return null;
      }
    },
  };
}

/** La colección de temas elegida en Play-along → Mi colección. */
export const almacenColeccion = crearAlmacen('harmonyjazz-coleccion', 'coleccion');
