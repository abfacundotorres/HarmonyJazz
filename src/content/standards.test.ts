import { describe, expect, it } from 'vitest';
import { parseChart } from '../theory/chart';
import { compileDoc, sanitizeDoc } from './chartDoc';
import { PROGRESSIONS } from './progressions';
import { STANDARDS, standardChart, standardDoc } from './standards';

describe('repertorio (sólo armonía)', () => {
  it('ids únicos y presentes en la lista del play-along', () => {
    const ids = PROGRESSIONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STANDARDS) expect(ids).toContain(s.id);
  });

  for (const s of STANDARDS) {
    it(`${s.name}: el cifrado es válido y la grilla despliega lo mismo`, () => {
      const chart = parseChart(standardChart(s));
      expect(chart.bars).toBeGreaterThanOrEqual(10);
      const doc = standardDoc(s);
      expect(typeof sanitizeDoc(doc)).not.toBe('string');
      expect(compileDoc(doc)).toBe(standardChart(s));
    });
  }

  it('no incluye melodía ni letra: sólo símbolos de acordes', () => {
    for (const s of STANDARDS) for (const [, bars] of s.form) expect(bars).toMatch(/^[A-G#b0-9a-zA-Z|% ]+$/);
  });
});
