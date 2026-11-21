/**
 * Protección de los datos del navegador. Todo lo que cargás (temas, melodías, progreso) vive en el navegador y, sin
 * «almacenamiento persistente», Android puede borrarlo si falta espacio. Acá se pide esa protección y se arma el
 * «Compartir copia» (menú de compartir del sistema). Funciones con el navegador inyectado, para poder probarlas.
 */
export type Proteccion = 'si' | 'no' | 'nodisponible';

type StorageApi = Pick<StorageManager, 'persisted' | 'persist'> | undefined;

/** ¿Los datos ya están protegidos? ('nodisponible' si el navegador no lo sabe decir). */
export async function estadoProteccion(storage: StorageApi = typeof navigator === 'undefined' ? undefined : navigator.storage): Promise<Proteccion> {
  if (!storage?.persisted) return 'nodisponible';
  try {
    return (await storage.persisted()) ? 'si' : 'no';
  } catch {
    return 'nodisponible';
  }
}

/** Pide la protección (el navegador decide: una app instalada suele recibirla sin preguntar). Devuelve cómo quedó. */
export async function pedirProteccion(storage: StorageApi = typeof navigator === 'undefined' ? undefined : navigator.storage): Promise<Proteccion> {
  if (!storage?.persist) return 'nodisponible';
  try {
    if (storage.persisted && (await storage.persisted())) return 'si';
    return (await storage.persist()) ? 'si' : 'no';
  } catch {
    return 'nodisponible';
  }
}

type ShareApi = Pick<Navigator, 'share' | 'canShare'>;

/** ¿Este navegador puede compartir un archivo con el menú del sistema? */
export function puedeCompartirArchivo(nav: Partial<ShareApi> | undefined, file: File): boolean {
  try {
    return typeof nav?.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export type ResultadoCompartir = 'compartido' | 'cancelado' | 'error';

/** Abre el menú de compartir con el archivo. Cancelarlo no es un error. */
export async function compartirArchivo(nav: Partial<ShareApi>, file: File, title: string): Promise<ResultadoCompartir> {
  try {
    await nav.share!({ files: [file], title });
    return 'compartido';
  } catch (e) {
    return (e as { name?: string })?.name === 'AbortError' ? 'cancelado' : 'error';
  }
}
