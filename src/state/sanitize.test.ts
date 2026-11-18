import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';
import { sanitizeKey, SANITIZERS } from './sanitize';
import { DEFAULT_SETTINGS, streak } from './storage';

/** Los mismos valores con los que se encontraron 19 pantallas en blanco. */
const BAD = [null, 5, 'x', [], { tunes: 5 }, { tunes: [null, 1, { name: 3 }] }, { phrases: 'x' }, { phrases: [{ id: 1 }] }, { size: 'a' }, { minutes: 'a', view: 7, register: null, volume: 'x' }, { '2026-11-12': 5 }, { a: { b: 'c' } }, true, { volume: NaN, swing: Infinity }];

describe('validación de datos guardados', () => {
  it('ningún valor dañado hace fallar a un validador', () => {
    for (const key of Object.keys(SANITIZERS)) for (const v of BAD) expect(() => sanitizeKey(key, v), `${key} = ${JSON.stringify(v)}`).not.toThrow();
  });

  it('los ajustes dañados se descartan campo por campo y quedan los valores por defecto', () => {
    const clean = sanitizeKey('settings', { minutes: 'a', view: 7, register: null, volume: 'x', swing: 0.6, output: 'phone' }) as object;
    const merged = { ...DEFAULT_SETTINGS, ...clean };
    expect(merged.view).toBe('Bb');
    expect(merged.volume).toBe(0);
    expect(merged.minutes).toBe(60);
    expect(merged.swing).toBe(0.6);
    expect(merged.output).toBe('phone');
  });

  it('los números fuera de rango se recortan y NaN o Infinity se descartan', () => {
    const c = sanitizeKey('settings', { volume: 99, swing: Infinity, minutes: -5 }) as Record<string, number>;
    expect(c.volume).toBe(2);
    expect(c.swing).toBeUndefined();
    expect(c.minutes).toBe(15);
  });

  it('el historial se limpia: sólo fechas válidas con la forma correcta', () => {
    const log = sanitizeKey('log', { '2026-11-12': 5, 'hoy': { done: ['a'], minutes: 3 }, '2026-11-11': { done: ['warm', 7, 'tech'], minutes: 'x' } }) as Record<string, { done: string[]; minutes: number }>;
    expect(Object.keys(log)).toEqual(['2026-11-11']);
    expect(log['2026-11-11']).toEqual({ done: ['warm', 'tech'], minutes: 0 });
    expect(() => streak(log, new Date(2026, 10, 12))).not.toThrow();
  });

  it('temas y frases deben ser listas; el progreso, números', () => {
    expect(sanitizeKey('library', { tunes: 5 })).toBeNull();
    expect(sanitizeKey('library', { tunes: [null, 1, { name: 'a' }] })).toEqual({ tunes: [{ name: 'a' }] });
    expect(sanitizeKey('phrases', { phrases: 'x' })).toBeNull();
    expect(sanitizeKey('mastery', { 'lesson:1': { C: 120, F: 'x', G: -4 } })).toEqual({ 'lesson:1': { C: 120, G: 0 } });
  });

  it('las claves que no se conocen pasan sin cambios', () => {
    expect(sanitizeKey('otra', { a: 1 })).toEqual({ a: 1 });
  });
});

describe('restaurar una copia dañada', () => {
  it('descarta lo dañado, conserva lo sano y lo informa', () => {
    const raw = JSON.stringify({ app: 'harmonyjazz', data: { library: { tunes: 5 }, settings: { volume: 'x', view: 'C' }, mastery: { 'l:1': { C: 100 } } } });
    const p = parseBackup(raw);
    if (typeof p === 'string') throw new Error(p);
    expect(p.dropped).toEqual(['library']);
    expect(Object.keys(p.data).sort()).toEqual(['mastery', 'settings']);
    expect(p.data.settings).toEqual({ view: 'C' });
  });
});

describe('herramientas de práctica: datos guardados', () => {
  it('el metrónomo recorta los números y descarta lo que no es válido', () => {
    expect(sanitizeKey('metro', { tempo: 900, beats: 'x', sub: 5, sound: 'cowbell', accent: 'si', backbeat: true, play: 0 })).toEqual({ tempo: 320, sound: 'cowbell', backbeat: true, play: 1 });
  });
  it('las notas largas guardadas descartan las filas dañadas y recortan los valores', () => {
    const rows = [{ day: '2026-11-17', midi: 60, secs: 3.2, spread: 4.1, offset: -3 }, { day: 'x', midi: 60, secs: 1, spread: 1, offset: 0 }, { day: '2026-11-18', midi: 'a', secs: 1, spread: 1, offset: 0 }, null, { day: '2026-11-18', midi: 61.4, secs: 2, spread: 400, offset: 0 }];
    expect(sanitizeKey('longnotes', { rows })).toEqual({ rows: [rows[0], { day: '2026-11-18', midi: 61, secs: 2, spread: 100, offset: 0 }] });
    expect(sanitizeKey('longnotes', [1])).toBeNull();
  });
  it('la afinación del La se limita a 415–466 Hz', () => {
    expect((sanitizeKey('settings', { a4: 442 }) as { a4: number }).a4).toBe(442);
    expect((sanitizeKey('settings', { a4: 9000 }) as { a4: number }).a4).toBe(466);
  });
});
