import { Chord, qdef } from './chords';
import { degreePc, pc } from './notes';

/**
 * Voicings rootless (estilo Bill Evans / Wynton Kelly) con conducción de voces:
 * se prueban forma A y forma B en las octavas posibles y se elige la que menos se mueve.
 * Devuelve números MIDI (concierto).
 */
export function buildVoicing(c: Chord, prev: number[] | null, low = 50, high = 62): number[] {
  const d = qdef(c);
  const root = pc(c.root);
  const candidates: number[][] = [];
  for (const form of d.voicings) {
    const pcs = form.map((deg) => (root + degreePc(deg)) % 12);
    for (let start = low; start <= high; start++) {
      if (start % 12 !== pcs[0]) continue;
      const v = [start];
      for (let i = 1; i < pcs.length; i++) {
        let n = v[i - 1] + 1;
        while (n % 12 !== pcs[i]) n++;
        v.push(n);
      }
      candidates.push(v);
    }
  }
  if (!prev) {
    // primer acorde: el más cercano al centro del registro
    const center = (low + high) / 2 + 5;
    return candidates.sort((a, b) => Math.abs(avg(a) - center) - Math.abs(avg(b) - center))[0];
  }
  return candidates.sort((a, b) => movement(a, prev) - movement(b, prev))[0];
}

const avg = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;

function movement(a: number[], b: number[]) {
  // suma de distancias entre voces ordenadas + leve penalización de alejarse del centro
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s + Math.abs(avg(a) - 60) * 0.3;
}
