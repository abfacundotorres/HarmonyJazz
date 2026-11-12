import { describe, expect, it } from 'vitest';
import { encodeWav, parseWavHeader } from './wav';

describe('WAV', () => {
  it('la cabecera describe lo que se guardó', async () => {
    const x = new Float32Array(44100).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / 44100));
    const b = await encodeWav([x, x], 44100).arrayBuffer();
    expect(parseWavHeader(b)).toEqual({ channels: 2, sampleRate: 44100, frames: 44100 });
    expect(b.byteLength).toBe(44 + 44100 * 2 * 2);
  });

  it('las muestras vuelven con error menor a 1/32768 y se recortan los excesos', async () => {
    const x = Float32Array.from([0, 0.5, -0.5, 1, -1, 2, -2]);
    const b = await encodeWav([x], 8000).arrayBuffer();
    const v = new DataView(b);
    const back = Array.from({ length: 7 }, (_, i) => v.getInt16(44 + i * 2, true) / 32768);
    [0, 0.5, -0.5, 1, -1, 1, -1].forEach((e, i) => expect(Math.abs(back[i] - e)).toBeLessThan(1 / 16384));
  });

  it('un archivo que no es WAV no se reconoce; vacío no rompe', async () => {
    expect(parseWavHeader(new ArrayBuffer(10))).toBeNull();
    expect(parseWavHeader(await encodeWav([new Float32Array(0)], 8000).arrayBuffer())?.frames).toBe(0);
  });
});
