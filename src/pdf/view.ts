/**
 * Visor de tu libro (PDF o foto) para copiar un tema mientras lo cargás. Aquí está la parte pura: zoom, páginas, tamaños.
 * El zoom es relativo al ancho del recuadro: 1 = la página ocupa todo el ancho; 2 = el doble.
 */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 5;
/** Alturas del visor en vertical (porcentaje del alto de la pantalla). */
export const ALTURAS = [30, 45, 60] as const;
export const ALTURA_INICIAL = 45;
/** Más grande que esto no se abre (se lee entero a la memoria del navegador). */
export const MAX_LIBRO_BYTES = 300 * 1024 * 1024;

export const clampZoom = (z: number): number => (Number.isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100)) : 1);
export const stepZoom = (z: number, dir: 1 | -1): number => clampZoom(z * (dir > 0 ? 1.25 : 0.8));

export const clampPage = (p: number, n: number): number => Math.min(Math.max(1, Number.isFinite(p) ? Math.round(p) : 1), Math.max(1, n));
export const rotar = (r: number): number => (((Math.round(r / 90) * 90 + 90) % 360) + 360) % 360;

/** Zoom con el que toda la página entra en el recuadro (sin pasar de 1: a lo ancho ya se ve entera si es baja). */
export function zoomPaginaCompleta(pw: number, ph: number, bw: number, bh: number): number {
  if (pw <= 0 || ph <= 0 || bw <= 0 || bh <= 0) return 1;
  return clampZoom(Math.min(1, (bh / ph) / (bw / pw)));
}

/**
 * Escala (píxeles de pantalla por unidad de la página) para un zoom dado, sin pasar del tope de píxeles que aguanta un lienzo
 * en el celular. `dpr`: densidad de píxeles.
 */
export function escala(zoom: number, pw: number, ph: number, bw: number, dpr: number, maxPixeles = 16_000_000): number {
  const base = (clampZoom(zoom) * bw) / Math.max(1, pw);
  const px = pw * base * dpr * (ph * base * dpr);
  return px > maxPixeles ? base * Math.sqrt(maxPixeles / px) : base;
}

export const esImagen = (type: string, name: string): boolean => /^image\//.test(type) || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(name);
export const esPdf = (type: string, name: string): boolean => type === 'application/pdf' || /\.pdf$/i.test(name);

/** Qué hacer con un archivo elegido: 'pdf', 'imagen' o el motivo por el que no se puede abrir. */
export function tipoDeArchivo(f: { type: string; name: string; size: number }): 'pdf' | 'imagen' | string {
  if (f.size <= 0) return 'El archivo está vacío.';
  if (f.size > MAX_LIBRO_BYTES) return `El archivo pesa ${Math.round(f.size / 1048576)} MB: el máximo es ${Math.round(MAX_LIBRO_BYTES / 1048576)} MB.`;
  if (esPdf(f.type, f.name)) return 'pdf';
  if (esImagen(f.type, f.name)) return 'imagen';
  return 'Elegí un PDF o una foto (png, jpg, webp).';
}
