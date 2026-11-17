/**
 * Mide la calidad del estiramiento de tiempo de Transcribir: el vocoder de fase contra WSOLA, sobre una banda
 * sintética con su versión lenta exacta como referencia.  Uso:  npx tsx scripts/medir-estiramiento.ts
 * Qué mide cada número está explicado en src/transcribe/stretchBench.ts.
 */
import { band, hits, score, stretch, type Score } from '../src/transcribe/stretchBench';

const SR = 44100;
const fmtH = (h: ReturnType<typeof hits>) => `golpes: forma ${h.forma.toFixed(2)} dB, corrimiento ${h.corrimiento.toFixed(0)} ± ${h.variacion.toFixed(0)} ms`;
const fmt = (s: Score) => `tono ${s.tono.toFixed(2)} dB · tiempo ${s.tiempo.toFixed(2)} dB · ataques ${s.ataques.toFixed(3)} · estéreo ${s.estereo.toFixed(2)} dB · retraso ${s.retraso.toFixed(0)} ms`;
for (const [name, parts] of [['banda completa', 'bptc'], ['sólo piano y bajo', 'bp'], ['sólo trompeta', 't'], ['sólo platillos', 'c']] as const) {
  console.log(`\n== ${name} ==`);
  const src = band(1, 8, parts);
  for (const rate of [0.5, 0.7, 0.85]) {
    const ref = band(1 / rate, 8, parts);
    const t0 = performance.now();
    const hq = stretch(src, rate, true);
    const t1 = performance.now();
    const lite = stretch(src, rate, false);
    const t2 = performance.now();
    console.log(`${Math.round(rate * 100)} %  vocoder: ${fmt(score(hq, ref))} · ${parts.includes('c') ? fmtH(hits(hq, ref, 1 / rate)) : ''}  [${((src.L.length / rate / SR) / ((t1 - t0) / 1000)).toFixed(0)}× tiempo real]`);
    console.log(`      WSOLA:   ${fmt(score(lite, ref))} · ${parts.includes('c') ? fmtH(hits(lite, ref, 1 / rate)) : ''}  [${((src.L.length / rate / SR) / ((t2 - t1) / 1000)).toFixed(0)}× tiempo real]`);
  }
}
