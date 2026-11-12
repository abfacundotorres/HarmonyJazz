import { describe, expect, it } from 'vitest';
import { PROGRESSIONS } from '../content/progressions';
import { parseChart } from '../theory/chart';
import { mod, pc } from '../theory/notes';
import { BASS_HIGH, BASS_LOW, bassLine, chordPcs, compLine, drumLine, effectiveSwing, fillProbability, mulberry32, newCompState, walkBar } from './patterns';
import { parseChord } from '../theory/chords';

const chartOf = (id: string) => parseChart(PROGRESSIONS.find((p) => p.id === id)!.chart);
const circ = (a: number, b: number) => Math.min(mod(a - b, 12), mod(b - a, 12));

describe('swing', () => {
  it('se aplana al subir el tempo y la bossa va recta', () => {
    const s = (t: number) => effectiveSwing(t, 0.64, 'swing');
    expect(s(90)).toBeGreaterThan(s(140));
    expect(s(140)).toBeGreaterThan(s(200));
    expect(s(200)).toBeGreaterThan(s(260));
    expect(s(260)).toBeGreaterThanOrEqual(0.5);
    expect(s(100)).toBeLessThan(0.72);
    expect(effectiveSwing(120, 0.7, 'bossa')).toBe(0.5);
  });
  it('respeta el ajuste del usuario en ambos sentidos', () => {
    expect(effectiveSwing(120, 0.5, 'swing')).toBe(0.5);
    expect(effectiveSwing(120, 0.72, 'swing')).toBeGreaterThan(effectiveSwing(120, 0.6, 'swing'));
    for (const t of [60, 120, 200, 320]) for (const a of [0.5, 0.64, 0.72]) {
      const v = effectiveSwing(t, a, 'swing');
      expect(v).toBeGreaterThanOrEqual(0.5);
      expect(v).toBeLessThanOrEqual(0.72);
    }
  });
});

describe('walking bass', () => {
  it('es reproducible con la misma semilla y distinto con otra', () => {
    const c = chartOf('rhythm');
    const a = bassLine(c, 'swing', mulberry32(1), 40).hits.map((h) => h.midi).join();
    const b = bassLine(c, 'swing', mulberry32(1), 40).hits.map((h) => h.midi).join();
    const d = bassLine(c, 'swing', mulberry32(2), 40).hits.map((h) => h.midi).join();
    expect(a).toBe(b);
    expect(a).not.toBe(d);
  });

  for (const id of ['ii-v-i', 'cadena-mayor-menor', 'rhythm', 'blues-f', 'coltrane', 'menor-modulante']) {
    describe(id, () => {
      const chart = chartOf(id);
      const seeds = Array.from({ length: 12 }, (_, i) => i + 1);
      const runs = seeds.map((s) => bassLine(chart, 'swing', mulberry32(s), 40).hits);

      it('todas las notas están en el registro del contrabajo', () => {
        for (const hits of runs) for (const h of hits) {
          expect(h.midi).toBeGreaterThanOrEqual(BASS_LOW);
          expect(h.midi).toBeLessThanOrEqual(BASS_HIGH);
        }
      });

      it('cada compás de un acorde empieza en la fundamental, en el tiempo 1', () => {
        for (const hits of runs) for (const cc of chart.chords.filter((c) => c.dur >= 8)) {
          const h = hits.find((x) => x.e === cc.start)!;
          expect(circ(h.midi, pc(cc.chord.root)), `${id} compás ${cc.bar + 1}`).toBe(0);
        }
      });

      it('el cuarto tiempo aproxima por semitono o tono a la fundamental siguiente (≥ 95 %)', () => {
        let ok = 0, total = 0;
        for (const hits of runs) chart.chords.forEach((cc, i) => {
          if (cc.dur < 8) return;
          const next = chart.chords[(i + 1) % chart.chords.length];
          const h = hits.find((x) => x.e === cc.start + 6)!;
          total++;
          if (circ(h.midi, pc(next.chord.root)) <= 2) ok++;
        });
        expect(ok / total).toBeGreaterThanOrEqual(0.95);
      });

      it('no repite la misma nota seguida y casi no hay saltos grandes', () => {
        let leaps = 0, moves = 0, step = 0;
        for (const hits of runs) for (let i = 1; i < hits.length; i++) {
          const d = Math.abs(hits[i].midi - hits[i - 1].midi);
          expect(d, `${id} nota ${i}`).not.toBe(0);
          moves++;
          if (d <= 2) step++;
          if (d > 7) leaps++;
        }
        expect(leaps / moves).toBeLessThan(0.06);
        expect(step / moves).toBeGreaterThan(0.4); // movimiento mayormente conjunto
      });

      it('las notas fuertes (1 y 3) son más fuertes que las débiles (2 y 4)', () => {
        const hits = runs[0];
        const avg = (pred: (e: number) => boolean) => {
          const xs = hits.filter((h) => pred(h.e % 8)).map((h) => h.vel);
          return xs.reduce((a, b) => a + b, 0) / xs.length;
        };
        expect(avg((e) => e === 0 || e === 4)).toBeGreaterThan(avg((e) => e === 2 || e === 6));
      });
    });
  }

  it('el tercer tiempo es siempre una nota del acorde (3ª, 5ª, 7ª o fundamental)', () => {
    let checked = 0;
    for (const id of ['cadena-mayor-menor', 'rhythm', 'coltrane']) {
      const chart = chartOf(id);
      for (let s = 1; s <= 12; s++) {
        for (const hit of bassLine(chart, 'swing', mulberry32(s), 40).hits) {
          if (hit.e % 8 !== 4) continue;
          const cc = chart.chords.find((c) => hit.e >= c.start && hit.e < c.start + c.dur)!;
          if (cc.dur < 8) continue;
          expect(chordPcs(cc.chord).tones, `${id}: compás ${cc.bar + 1}`).toContain(mod(hit.midi, 12));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('walkBar da cuatro notas distintas entre sí en tiempos consecutivos', () => {
    for (let s = 1; s <= 50; s++) {
      const n = walkBar(parseChord('Dm7'), parseChord('G7'), 45, mulberry32(s));
      expect(n).toHaveLength(4);
      for (let i = 1; i < 4; i++) expect(n[i]).not.toBe(n[i - 1]);
    }
  });

  it('los estilos "en 2" y balada tocan fundamental y quinta; la bossa, fundamental y quinta sincopada', () => {
    const c = chartOf('ii-v-i');
    for (const style of ['two', 'ballad'] as const) {
      const h = bassLine(c, style, mulberry32(3), 40).hits;
      expect(h.every((x) => x.e % 4 === 0)).toBe(true);
    }
    expect(bassLine(c, 'bossa', mulberry32(3), 40).hits.some((x) => x.e % 8 === 3)).toBe(true);
  });
});

describe('piano', () => {
  const chart = chartOf('cadena-mayor-menor');
  const hits = (seed: number, style = 'swing' as const) => compLine(chart, style, mulberry32(seed), 1, newCompState());

  it('los voicings están en un registro cómodo y sin la fundamental grave', () => {
    for (let s = 1; s <= 10; s++) for (const h of hits(s)) {
      expect(Math.min(...h.midis)).toBeGreaterThanOrEqual(50);
      expect(Math.max(...h.midis)).toBeLessThanOrEqual(78);
    }
  });

  it('no toca en el tiempo 1 todo el tiempo: deja aire y usa contratiempos', () => {
    const all = Array.from({ length: 10 }, (_, s) => hits(s + 1)).flat();
    const onOne = all.filter((h) => h.e % 8 === 0).length;
    const off = all.filter((h) => h.e % 2 === 1).length;
    expect(off / all.length).toBeGreaterThan(0.3);
    expect(onOne / all.length).toBeLessThan(0.45);
  });

  it('no repite la misma célula más de dos compases seguidos', () => {
    const c = chartOf('blues-f');
    const st = newCompState();
    let maxRepeats = 0;
    for (let s = 0; s < 60; s++) {
      compLine(c, 'swing', mulberry32(s + 7), 1, st);
      maxRepeats = Math.max(maxRepeats, st.repeats);
    }
    expect(maxRepeats).toBeLessThanOrEqual(2);
    expect(maxRepeats).toBeGreaterThanOrEqual(1);
  });

  it('todos los golpes caen dentro del chorus y con intensidad válida', () => {
    for (let s = 1; s <= 10; s++) for (const h of hits(s)) {
      expect(h.e).toBeGreaterThanOrEqual(0);
      expect(h.e).toBeLessThan(chart.bars * 8);
      expect(h.vel).toBeGreaterThan(0.1);
      expect(h.vel).toBeLessThanOrEqual(1);
      expect(h.dur).toBeGreaterThan(0);
    }
  });

  it('la balada sostiene el acorde y es más suave que el swing', () => {
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const b = compLine(chart, 'ballad', mulberry32(1), 1, newCompState());
    const w = hits(1);
    expect(avg(b.map((h) => h.vel))).toBeLessThan(avg(w.map((h) => h.vel)));
    expect(b.filter((h) => h.e % 8 === 0).length).toBe(chart.bars);
  });
});

describe('batería', () => {
  const chart = chartOf('rhythm');
  const count = (hits: ReturnType<typeof drumLine>, v: string, pred: (e: number) => boolean) => hits.filter((h) => h.voice === v && pred(h.e % 8)).length;

  it('el ride marca los cuatro tiempos de cada compás y la nota de salto en 2 y 4', () => {
    const h = drumLine(chart, 'swing', mulberry32(1), 1);
    for (const k of [0, 2, 4, 6]) expect(count(h, 'ride', (e) => e === k)).toBe(chart.bars);
    for (const k of [3, 7]) expect(count(h, 'ride', (e) => e === k) / chart.bars).toBeGreaterThan(0.9);
    expect(count(h, 'ride', (e) => e === 1 || e === 5)).toBe(0);
  });

  it('el pedal de hi-hat suena en los tiempos 2 y 4 y sólo ahí', () => {
    const h = drumLine(chart, 'swing', mulberry32(2), 1);
    expect(count(h, 'chick', (e) => e === 2)).toBe(chart.bars);
    expect(count(h, 'chick', (e) => e === 6)).toBe(chart.bars);
    expect(h.filter((x) => x.voice === 'chick' && ![2, 6].includes(x.e % 8))).toHaveLength(0);
  });

  it('el bombo es apenas audible (feathering) salvo acentos', () => {
    const h = drumLine(chart, 'swing', mulberry32(3), 1).filter((x) => x.voice === 'kick');
    const soft = h.filter((x) => x.vel < 0.3).length;
    expect(soft / h.length).toBeGreaterThan(0.8);
  });

  it('la caja va por debajo del ride en intensidad media y a veces comenta', () => {
    const h = drumLine(chart, 'swing', mulberry32(4), 1);
    const avg = (v: string) => { const xs = h.filter((x) => x.voice === v).map((x) => x.vel); return xs.reduce((a, b) => a + b, 0) / xs.length; };
    expect(avg('ghost')).toBeLessThan(avg('ride'));
    expect(h.filter((x) => x.voice === 'ghost' || x.voice === 'snare').length).toBeGreaterThan(chart.bars * 0.2);
  });

  it('hay fills al final de las frases y del chorus, no en cualquier compás', () => {
    const last = chart.bars - 1;
    let withFill = 0;
    for (let s = 1; s <= 20; s++) {
      const h = drumLine(chart, 'swing', mulberry32(s), 1);
      const inLast = h.filter((x) => Math.floor(x.e / 8) === last && x.voice === 'snare' && x.e % 8 >= 4).length;
      if (inLast >= 2) withFill++;
      const mid = h.filter((x) => Math.floor(x.e / 8) === 1 && x.voice === 'snare' && x.e % 8 === 7 && x.vel > 0.5).length;
      expect(mid).toBe(0);
    }
    expect(withFill).toBeGreaterThanOrEqual(15);
    expect(fillProbability(0, 32)).toBe(0);
    expect(fillProbability(31, 32)).toBeGreaterThan(0.9);
    expect(fillProbability(7, 32)).toBeGreaterThan(fillProbability(3, 32));
  });

  it('la bossa usa cross-stick en la clave 3-2 y ni ride ni pedal', () => {
    const h = drumLine(chart, 'bossa', mulberry32(1), 1);
    expect(h.some((x) => x.voice === 'ride')).toBe(false);
    expect(h.filter((x) => x.voice === 'stick' && Math.floor(x.e / 8) === 0).map((x) => x.e)).toEqual([0, 3, 6]);
    expect(h.filter((x) => x.voice === 'stick' && Math.floor(x.e / 8) === 1).map((x) => x.e - 8)).toEqual([2, 4]);
  });

  it('todas las intensidades son válidas', () => {
    for (const style of ['swing', 'two', 'ballad', 'bossa'] as const) for (const x of drumLine(chart, style, mulberry32(9), 3)) {
      expect(x.vel).toBeGreaterThan(0);
      expect(x.vel).toBeLessThanOrEqual(1);
      expect(x.e).toBeGreaterThanOrEqual(0);
      expect(x.e).toBeLessThan(chart.bars * 8);
    }
  });
});
