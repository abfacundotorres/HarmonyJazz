import { describe, expect, it } from 'vitest';
import { compasesVisibles, isMemoriaModo, MEMORIA_MODOS, memoriaNivel, siguienteModo } from './memoria';

describe('memoriaNivel', () => {
  it('visible, comienzos y oculto no dependen de la vuelta', () => {
    for (const c of [-1, 0, 1, 5]) {
      expect(memoriaNivel('off', c)).toBe('todo');
      expect(memoriaNivel('pistas', c)).toBe('pistas');
      expect(memoriaNivel('oculto', c)).toBe('nada');
    }
  });
  it('de a poco: parado y en la primera vuelta se ve todo, luego comienzos y luego nada', () => {
    expect([-1, 0, 1, 2, 3, 9].map((c) => memoriaNivel('gradual', c))).toEqual(['todo', 'todo', 'pistas', 'nada', 'nada', 'nada']);
  });
});

describe('compasesVisibles', () => {
  it('todo y nada', () => {
    expect(compasesVisibles('todo', 3)).toEqual([true, true, true]);
    expect(compasesVisibles('nada', 3)).toEqual([false, false, false]);
    expect(compasesVisibles('nada', 0)).toEqual([]);
  });
  it('comienzos con partes: el primer compás de cada parte', () => {
    const v = compasesVisibles('pistas', 12, new Set([0, 4, 8]));
    expect(v.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)).toEqual([0, 4, 8]);
    const w = compasesVisibles('pistas', 8, [3]); // una parte que empieza en el 4.º; el compás 1 siempre se ve
    expect(w.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)).toEqual([0, 3]);
  });
  it('comienzos sin partes: cada 4 compases', () => {
    const v = compasesVisibles('pistas', 12);
    expect(v.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)).toEqual([0, 4, 8]);
    expect(compasesVisibles('pistas', 1)).toEqual([true]);
  });
});

describe('modos', () => {
  it('ids únicos, con texto, y siguienteModo los recorre y vuelve', () => {
    expect(new Set(MEMORIA_MODOS.map((m) => m.id)).size).toBe(4);
    expect(MEMORIA_MODOS.every((m) => m.label && m.texto)).toBe(true);
    expect(['off', 'pistas', 'oculto', 'gradual'].every(isMemoriaModo)).toBe(true);
    expect(isMemoriaModo('x')).toBe(false);
    let m = MEMORIA_MODOS[0].id;
    const vistos: string[] = [];
    for (let i = 0; i < 5; i++) { vistos.push(m); m = siguienteModo(m); }
    expect(vistos).toEqual(['off', 'pistas', 'oculto', 'gradual', 'off']);
  });
});
