/** Memoria máxima del audio decodificado (Float32) para usar el motor preciso. */
export const MAX_DECODED_BYTES = 260 * 1024 * 1024;

/**
 * El mismo tope según la memoria del aparato (`navigator.deviceMemory`, en GB; sólo Chrome lo informa). Además del
 * audio decodificado hay que guardar su copia de 16 bits y el análisis: en un celular de 4 GB un audio de 10 minutos
 * puede cerrar la pestaña, y eso no se puede atajar. Con menos memoria se pasa antes al reproductor simple.
 */
export function maxDecodedBytes(deviceMemoryGb: number | undefined): number {
  if (!deviceMemoryGb || deviceMemoryGb >= 8) return MAX_DECODED_BYTES;
  return Math.round(MAX_DECODED_BYTES * (deviceMemoryGb >= 4 ? 0.65 : 0.35));
}
