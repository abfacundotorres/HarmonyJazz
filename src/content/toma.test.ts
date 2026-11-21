import { describe, expect, it } from 'vitest';
import { consignaToma, COROS_TOMA, COROS_TOMA_INICIAL, duracionToma, guionToma } from './toma';

describe('guion de la toma', () => {
  it('melodía al principio y al final y solos en el medio', () => {
    expect(guionToma(3)).toEqual(['melodia', 'solo', 'melodia']);
    expect(guionToma(5)).toEqual(['melodia', 'solo', 'solo', 'solo', 'melodia']);
  });
  it('con 1 o 2 coros no hay solo; nunca queda vacío', () => {
    expect(guionToma(1)).toEqual(['melodia']);
    expect(guionToma(2)).toEqual(['melodia', 'melodia']);
    expect(guionToma(0)).toEqual(['melodia']);
  });
  it('los coros elegibles empiezan en 3 (un solo como pide el paso) y el inicial es válido', () => {
    expect(COROS_TOMA[0]).toBe(3);
    expect(COROS_TOMA).toContain(COROS_TOMA_INICIAL);
  });
  it('la consigna dice dónde estás', () => {
    expect(consignaToma(3, -1)).toMatch(/Cuenta previa/);
    expect(consignaToma(3, 0)).toBe('Coro 1 de 3: Tocá la melodía');
    expect(consignaToma(3, 1)).toBe('Coro 2 de 3: Improvisá');
    expect(consignaToma(3, 2)).toBe('Coro 3 de 3: Tocá la melodía');
    expect(consignaToma(3, 9)).toBe('Coro 3 de 3: Tocá la melodía'); // no se pasa del último
  });
  it('duración: coros más la cuenta previa de un compás', () => {
    expect(duracionToma(3, 12, 120)).toBe(96); // (3+1) × 12 compases × 4 pulsos × 0,5 s
    expect(duracionToma(3, 4, 320)).toBe(12);
    expect(duracionToma(3, 8, 0)).toBeGreaterThan(0);
  });
});
