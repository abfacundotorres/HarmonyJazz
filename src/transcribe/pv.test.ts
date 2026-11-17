import { describe, expect, it } from 'vitest';
import { band, hits, score, stretch } from './stretchBench';
import { PhaseVocoder, PV_HOP } from './pv';
import { PlayerCore } from './stretch';

const SR = 44100;

function render(core: PlayerCore, seconds: number) {
  const n = Math.round(seconds * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i += 128) core.process(L.subarray(i, Math.min(n, i + 128)), R.subarray(i, Math.min(n, i + 128)));
  return { L, R };
}

describe('vocoder de fase', () => {
  it('a velocidad normal devuelve el original tal cual', () => {
    const x = new Float32Array(SR);
    for (let i = 0; i < x.length; i++) x[i] = 0.3 * Math.sin(2 * Math.PI * 220 * (i / SR)) + 0.2 * Math.sin(2 * Math.PI * 1234 * (i / SR) + 1) + (i % 5000 === 0 ? 0.5 : 0);
    const pv = new PhaseVocoder((_c, u) => (u >= 0 && u < x.length ? x[u] : 0), false);
    let a = 4096;
    let worst = 0;
    for (let j = 0; j < 30; j++) {
      pv.start(a, 1);
      while (!pv.step());
      // el salto que sale corresponde al comienzo del cuadro (después de los primeros, con el solape completo)
      if (j >= 3) for (let i = 0; i < PV_HOP; i++) worst = Math.max(worst, Math.abs(pv.out[0][i] - x[a + i]));
      expect(pv.hop).toBe(PV_HOP);
      a += pv.hop;
    }
    expect(worst).toBeLessThan(1e-6);
  });

  it('en una banda al 50 % suena más limpio que WSOLA y cada golpe cae en su lugar', () => {
    const src = band(1, 4);
    const ref = band(2, 4);
    const hq = stretch(src, 0.5, true);
    const lite = stretch(src, 0.5, false);
    const a = score(hq, ref);
    const b = score(lite, ref);
    // notas sostenidas más limpias y ataques más parecidos a los de la referencia
    expect(a.tono).toBeLessThan(b.tono - 0.5);
    expect(a.tiempo).toBeLessThan(b.tiempo);
    expect(a.ataques).toBeGreaterThan(b.ataques + 0.1);
    expect(a.estereo).toBeLessThan(b.estereo);
    // golpe por golpe: sin corrimiento ni variación audibles (WSOLA los adelanta unos 30 ms, con ±9 ms de variación)
    const h = hits(hq, ref, 2, 4);
    // (se descuenta el retraso fijo del arranque, unos 12 ms de silencio mientras se prepara el primer cuadro)
    expect(Math.abs(h.corrimiento - a.retraso)).toBeLessThan(4);
    expect(a.retraso).toBeLessThan(25);
    expect(h.variacion).toBeLessThan(4);
    expect(h.forma).toBeLessThan(hits(lite, ref, 2, 4).forma);
  }, 60_000);

  it('el cuadro se calcula por etapas: reproduciendo de corrido nunca hay que terminarlo de golpe', () => {
    const src = band(1, 3);
    for (const [rate, pitch] of [[0.5, 1], [0.8, 1], [1.5, 1], [0.7, 1.26]]) {
      const core = new PlayerCore({ channels: [src.L, src.R], sampleRate: SR });
      core.setRate(rate);
      core.setPitch(pitch);
      core.play();
      render(core, 2);
      expect(core.syncFrames, `velocidad ${rate}, afinación ${pitch}`).toBe(0);
    }
  });

  it('un disco masterizado al tope no recorta al ralentizarlo', () => {
    // señal recortada (como un máster muy comprimido): el vocoder le devuelve los picos y el limitador los contiene
    const n = SR * 3;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const v = 0.9 * Math.sin(2 * Math.PI * 82 * t) + 0.6 * Math.sin(2 * Math.PI * 247 * t + 1) + 0.5 * Math.sin(2 * Math.PI * 1318 * t + 2);
      x[i] = Math.max(-0.95, Math.min(0.95, v));
    }
    const core = new PlayerCore({ channels: [x], sampleRate: SR });
    core.setRate(0.5);
    core.play();
    const { L } = render(core, 4);
    let peak = 0;
    for (const v of L) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThanOrEqual(0.975);
    expect(peak).toBeGreaterThan(0.8);
  });

  it('el modo liviano (WSOLA) sigue disponible y mantiene el tono', () => {
    const x = new Float32Array(SR * 3);
    for (let i = 0; i < x.length; i++) x[i] = 0.3 * Math.sin(2 * Math.PI * 440 * (i / SR));
    const core = new PlayerCore({ channels: [x], sampleRate: SR });
    core.setQuality(false);
    core.setRate(0.5);
    core.play();
    const { L } = render(core, 3);
    let cross = 0;
    for (let i = SR; i < 2 * SR; i++) if (L[i - 1] < 0 && L[i] >= 0) cross++;
    expect(cross).toBeGreaterThan(437);
    expect(cross).toBeLessThan(443);
    expect(core.syncFrames).toBe(0);
  });

  it('cambiar de calidad con el audio sonando no pierde la posición', () => {
    const src = band(1, 4);
    const core = new PlayerCore({ channels: [src.L, src.R], sampleRate: SR });
    core.setRate(0.5);
    core.play();
    render(core, 2);
    const before = core.getPosition() / SR;
    core.setQuality(false);
    render(core, 0.1);
    expect(Math.abs(core.getPosition() / SR - before - 0.05)).toBeLessThan(0.05);
    core.setQuality(true);
    render(core, 0.5);
    expect(Math.abs(core.getPosition() / SR - before - 0.3)).toBeLessThan(0.06);
  });
});
