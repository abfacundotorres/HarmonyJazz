import { describe, expect, it } from 'vitest';
import { LESSONS } from '../content/lessons';
import { describeItem, lessonRows, scaleRows, showable } from './progressItems';

describe('progreso: nombres y filas', () => {
  it('describe un ejercicio de lección, una escala y una frase, con su enlace', () => {
    const l = LESSONS[0];
    const d = describeItem(`${l.id}:1`, [])!;
    expect(d.title).toBe(l.title);
    expect(d.detail).toBe(l.exercises[1].label);
    expect(d.href('Bb')).toBe(`#/lecciones/${l.id}?k=Bb`);
    const s = describeItem('scale:dorian:thirds', [])!;
    expect(s.title).toBe('Dórica');
    expect(s.href('F')).toBe('#/escalas?e=dorian&p=thirds&k=F');
    expect(describeItem('lick:abc', [{ id: 'abc', name: 'Mi frase' }])!.href('D')).toBe('#/vocabulario/abc?k=D');
  });
  it('lo que ya no existe (frase borrada, ejercicio inexistente) devuelve null', () => {
    expect(describeItem('lick:zzz', [])).toBeNull();
    expect(describeItem(`${LESSONS[0].id}:99`, [])).toBeNull();
    expect(describeItem('scale:nada:thirds', [])).toBeNull();
    expect(describeItem('raro', [])).toBeNull();
  });
  it('hay una fila por cada lección y por cada una de las 21 escalas', () => {
    expect(lessonRows()).toHaveLength(LESSONS.length);
    const s = scaleRows();
    expect(s).toHaveLength(21);
    expect(s.every((r) => r.ids.length === 6)).toBe(true);
  });
  it('"showable" quita las marcas de frases borradas', () => {
    const items = [{ id: 'lick:a' }, { id: 'lick:borrada' }, { id: `${LESSONS[0].id}:0` }];
    expect(showable(items, [{ id: 'a', name: 'A' }]).map((x) => x.id)).toEqual(['lick:a', `${LESSONS[0].id}:0`]);
  });
});
