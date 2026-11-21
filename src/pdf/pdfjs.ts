/** Carga diferida de pdf.js: la librería y su worker (~1,8 MB) sólo se bajan al abrir un PDF. */
type Pdfjs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let cargado: Promise<Pdfjs> | null = null;

export function cargarPdfjs(): Promise<Pdfjs> {
  cargado ??= (async () => {
    const [lib, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  })().catch((e) => {
    cargado = null; // que se pueda reintentar
    throw e;
  });
  return cargado;
}
