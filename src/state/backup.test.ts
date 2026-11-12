import { describe, expect, it } from 'vitest';
import { applyLocal, backupFileName, buildBackup, collectLocal, daysSinceBackup, hasData, markBackup, parseBackup, summarize } from './backup';

class Mem {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

const seed = () => {
  const s = new Mem();
  s.setItem('harmonyjazz:settings', JSON.stringify({ view: 'Bb', minutes: 45 }));
  s.setItem('harmonyjazz:library', JSON.stringify({ tunes: [{ id: 'u:1', name: 'A' }, { id: 'u:2', name: 'B' }] }));
  s.setItem('harmonyjazz:phrases', JSON.stringify({ phrases: [{ id: 'p:1' }] }));
  s.setItem('harmonyjazz:mastery', JSON.stringify({ 'lesson:1': { C: 120 } }));
  s.setItem('harmonyjazz:phrase-draft', JSON.stringify({ line: 'x' }));
  s.setItem('hj:acceso', 'SECRETO');
  s.setItem('otraapp:x', '1');
  s.setItem('harmonyjazz:roto', '{no es json');
  return s;
};

describe('copia de seguridad', () => {
  it('copia sólo los datos de la app: sin contraseña, sin borradores, sin datos de otras apps ni dañados', () => {
    const data = collectLocal(seed());
    expect(Object.keys(data).sort()).toEqual(['library', 'mastery', 'phrases', 'settings']);
    expect(JSON.stringify(data)).not.toContain('SECRETO');
  });

  it('ida y vuelta: lo que se copia vuelve igual en otro dispositivo', () => {
    const file = buildBackup(collectLocal(seed()), [], new Date('2026-11-12T10:00:00Z'));
    const parsed = parseBackup(JSON.stringify(file));
    expect(typeof parsed).not.toBe('string');
    if (typeof parsed === 'string') return;
    const nuevo = new Mem();
    expect(applyLocal(nuevo, parsed.data)).toBe(4);
    expect(JSON.parse(nuevo.getItem('harmonyjazz:library')!).tunes).toHaveLength(2);
    expect(JSON.parse(nuevo.getItem('harmonyjazz:settings')!).minutes).toBe(45);
    expect(nuevo.getItem('hj:acceso')).toBeNull();
  });

  it('el nombre del archivo lleva la fecha', () => {
    expect(backupFileName(new Date('2026-11-12T10:00:00Z'))).toBe('harmonyjazz-copia-2026-11-12.json');
  });

  it('rechaza archivos que no son una copia', () => {
    expect(parseBackup('no json')).toMatch(/no se puede leer/);
    expect(parseBackup('[]')).toMatch(/no es una copia/);
    expect(parseBackup(JSON.stringify({ app: 'otra', data: {} }))).toMatch(/no es una copia/);
    expect(parseBackup(JSON.stringify({ app: 'harmonyjazz' }))).toMatch(/no tiene datos/);
  });

  it('ignora claves peligrosas, transitorias o con caracteres no permitidos', () => {
    const raw = JSON.stringify({ app: 'harmonyjazz', data: { settings: { a: 1 }, __proto__: { x: 1 }, 'a/b': 1, 'phrase-draft': 1, lastBackup: 5 } });
    const p = parseBackup(raw);
    if (typeof p === 'string') throw new Error(p);
    expect(Object.keys(p.data)).toEqual(['settings']);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('rechaza datos desmesurados', () => {
    const big = 'x'.repeat(2_100_000);
    expect(parseBackup(JSON.stringify({ app: 'harmonyjazz', data: { library: big } }))).toMatch(/demasiado grande/);
  });

  it('resume lo que hay para mostrarlo antes de restaurar', () => {
    const s = summarize(collectLocal(seed()), [{}, {}]);
    expect(s).toEqual({ tunes: 2, phrases: 1, mastered: 1, audios: 2 });
    expect(hasData(s)).toBe(true);
    expect(hasData({ tunes: 0, phrases: 0, mastered: 0, audios: 0 })).toBe(false);
  });

  it('cuenta los días desde la última copia', () => {
    const s = new Mem();
    expect(daysSinceBackup(s)).toBeNull();
    markBackup(s, Date.UTC(2026, 10, 1));
    expect(daysSinceBackup(s, Date.UTC(2026, 10, 12, 12))).toBe(11);
  });

  it('el aviso de última copia no viaja dentro de la copia', () => {
    const s = seed();
    markBackup(s);
    expect(Object.keys(collectLocal(s))).not.toContain('lastBackup');
  });
});
