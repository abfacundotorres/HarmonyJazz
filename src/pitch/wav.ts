/** Codifica audio en WAV (PCM de 16 bits). Se usa para guardar las tomas grabadas: un WAV siempre tiene duración y lo lee cualquier motor. */
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const nch = Math.max(1, Math.min(2, channels.length));
  const len = channels[0]?.length ?? 0;
  const bytes = 44 + len * nch * 2;
  const buf = new ArrayBuffer(bytes);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, bytes - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, nch, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * nch * 2, true);
  v.setUint16(32, nch * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, len * nch * 2, true);
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nch; c++) {
      const x = Math.max(-1, Math.min(1, channels[c][i]));
      v.setInt16(o, x < 0 ? x * 32768 : x * 32767, true);
      o += 2;
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/** Lee la cabecera de un WAV de 16 bits (para verificar lo que se guarda). */
export function parseWavHeader(b: ArrayBuffer): { channels: number; sampleRate: number; frames: number } | null {
  const v = new DataView(b);
  if (b.byteLength < 44 || String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3)) !== 'RIFF') return null;
  const channels = v.getUint16(22, true);
  return { channels, sampleRate: v.getUint32(24, true), frames: v.getUint32(40, true) / (channels * 2) };
}

/** Decodifica cualquier audio que el navegador entienda (p. ej. WebM/Opus de una grabación) y lo pasa a WAV. */
export async function blobToWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const ch: Float32Array[] = [];
    for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) ch.push(buf.getChannelData(c));
    return encodeWav(ch, buf.sampleRate);
  } finally {
    void ctx.close().catch(() => undefined);
  }
}
