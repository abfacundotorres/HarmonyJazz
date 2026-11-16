import { describe, expect, it } from 'vitest';
import { MAX_DECODED_BYTES, maxDecodedBytes } from './limits';

/** Minutos de audio estéreo a 48 kHz que entran en el tope. */
const minutes = (bytes: number) => bytes / (48000 * 2 * 4) / 60;

describe('tope de memoria del motor preciso', () => {
  it('sin dato de memoria o con 8 GB o más se usa el tope completo', () => {
    expect(maxDecodedBytes(undefined)).toBe(MAX_DECODED_BYTES);
    expect(maxDecodedBytes(8)).toBe(MAX_DECODED_BYTES);
  });
  it('con menos memoria el tope baja: unos 7 minutos con 4 GB y unos 4 con 2 GB', () => {
    expect(minutes(maxDecodedBytes(4))).toBeGreaterThan(7);
    expect(minutes(maxDecodedBytes(4))).toBeLessThan(8);
    expect(minutes(maxDecodedBytes(2))).toBeGreaterThan(3.5);
    expect(minutes(maxDecodedBytes(2))).toBeLessThan(4.5);
    expect(maxDecodedBytes(1)).toBe(maxDecodedBytes(2));
  });
});
