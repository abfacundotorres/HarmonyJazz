import { describe, expect, it } from 'vitest';
import { parseChord } from '../theory/chords';
import { aplicarElecciones, compareTranscriptions, lineaDe, quantizeDetected, type QNote, TRUMPET_RANGE, userNotes } from './compare';
import { notesToLine } from './toPhrase';
import { parseLine } from '../content/licks';
import { midi as pitchMidi } from '../theory/notes';

const q = (start: number, dur: number, midi: number, extra: Partial<QNote> = {}): QNote => ({ start, dur, midi, ...extra });
const det = (start: number, end: number, midi: number, strength = 0.9, cents = 0) => ({ start, end, midi, strength, cents });

describe('armar las dos versiones', () => {
  it('la cuantización coincide con la de «Pasar a Vocabulario»', () => {
    const notes = [det(0.02, 0.31, 62), det(0.32, 0.61, 65), det(0.9, 1.52, 69), det(1.55, 1.6, 67)];
    const bpm = 100; // corchea = 0,3 s
    const a = quantizeDetected(notes, bpm, 0);
    const line = notesToLine(notes, bpm, 0)!.line;
    const b = parseLine(line).filter((n) => n.pitch).map((n) => ({ start: n.start, dur: n.dur, midi: pitchMidi(n.pitch!) }));
    expect(a.map((n) => ({ start: n.start, dur: n.dur, midi: n.midi }))).toEqual(b);
    expect(quantizeDetected(notes, 0, 0)).toEqual([]);
  });
  it('la transcripción escrita a mano pasa a concierto si se escribió en Si♭ y rechaza lo ilegible', () => {
    const c = userNotes('E4 G4:2 r:2 | B4', 'Bb') as QNote[];
    expect(c.map((n) => [n.start, n.dur, n.midi])).toEqual([[0, 1, 62], [1, 2, 65], [5, 1, 69]]);
    expect((userNotes('E4', 'C') as QNote[])[0].midi).toBe(64);
    expect(userNotes('H4', 'C')).toMatch(/No entiendo/);
    expect(userNotes('r:2', 'C')).toMatch(/al menos una nota/);
    expect(userNotes('E4:0', 'C')).toMatch(/Duración/);
  });
});

describe('comparar', () => {
  it('lo que coincide no se marca como diferencia', () => {
    const u = [q(0, 1, 62), q(1, 2, 65), q(3, 1, 69)];
    const r = compareTranscriptions(u, u.map((n) => ({ ...n, strength: 0.9 })));
    expect(r).toMatchObject({ coinciden: 3, diffs: [], nUser: 3, nDet: 3 });
  });

  it('un semitono: con el acorde decide quién encaja mejor y explica el porqué', () => {
    const chord = parseChord('Dm7');
    const opt = { chordAt: () => chord };
    // tuya F (♭3 de Dm7, nota del acorde); detectada F♯ (fuera de la escala dórica…: F♯ no está en D dórico)
    const r1 = compareTranscriptions([q(0, 2, 65)], [q(0, 2, 66, { strength: 0.9 })], opt);
    expect(r1.diffs).toHaveLength(1);
    expect(r1.diffs[0]).toMatchObject({ kind: 'altura', subtype: 'semitono', quien: 'tu versión' });
    expect(r1.diffs[0].porQue).toMatch(/Dm7/);
    expect(r1.diffs[0].porQue).toMatch(/nota del acorde/);
    // al revés: la detectada es la que encaja
    const r2 = compareTranscriptions([q(0, 2, 66)], [q(0, 2, 65, { strength: 0.9 })], opt);
    expect(r2.diffs[0].quien).toBe('el detector');
    // sin acorde y sin nota siguiente: no se puede saber
    const r3 = compareTranscriptions([q(0, 2, 65)], [q(0, 2, 66)]);
    expect(r3.diffs[0].quien).toBe('no se puede saber');
    // con aproximación cromática a la nota siguiente de tu versión
    const r4 = compareTranscriptions([q(0, 1, 65), q(1, 1, 64)], [q(0, 1, 66), q(1, 1, 64)]);
    expect(r4.diffs[0].quien).toBe('tu versión');
    expect(r4.diffs[0].porQue).toMatch(/aproximación cromática/);
  });

  it('una octava: tesitura de la trompeta y armónicos', () => {
    // detectada una octava arriba con poca fuerza: armónico
    const r = compareTranscriptions([q(0, 2, 62)], [q(0, 2, 74, { strength: 0.3 })]);
    expect(r.diffs[0]).toMatchObject({ subtype: 'octava', quien: 'tu versión' });
    expect(r.diffs[0].porQue).toMatch(/armónicos/);
    // la tuya fuera de la tesitura: tiene razón el detector
    const r2 = compareTranscriptions([q(0, 2, TRUMPET_RANGE.lo - 12)], [q(0, 2, TRUMPET_RANGE.lo, { strength: 0.9 })]);
    expect(r2.diffs[0].quien).toBe('el detector');
    expect(r2.diffs[0].porQue).toMatch(/tesitura/);
    // la detectada fuera de la tesitura
    const r3 = compareTranscriptions([q(0, 2, 80)], [q(0, 2, 92, { strength: 0.9 })]);
    expect(r3.diffs[0].quien).toBe('tu versión');
  });

  it('casi todas las notas con la misma diferencia son un solo aviso (lectura u octava), no una lista de errores', () => {
    const u = [q(0, 1, 62), q(1, 1, 65), q(2, 1, 69), q(3, 1, 67), q(4, 1, 64)];
    const d = u.map((n) => ({ ...n, midi: n.midi - 2, strength: 0.9 })); // detectada un tono más grave
    const r = compareTranscriptions(u, d);
    expect(r.global).toMatchObject({ semis: -2, n: 5 });
    expect(r.global!.texto).toMatch(/Si♭/);
    expect(r.global!.texto).toMatch(/en Si♭ lo que marcaste como concierto/);
    // con la corrección aplicada no quedan diferencias y las cinco coinciden
    expect(r.diffs).toEqual([]);
    expect(r.coinciden).toBe(5);
    // al revés
    const r2 = compareTranscriptions(u, u.map((n) => ({ ...n, midi: n.midi + 2 })));
    expect(r2.global!.texto).toMatch(/en concierto lo que marcaste como Si♭/);
    // una octava pareja
    expect(compareTranscriptions(u, u.map((n) => ({ ...n, midi: n.midi + 12 }))).global!.texto).toMatch(/octava/);
    // con menos de tres notas iguales no hay aviso global
    expect(compareTranscriptions(u.slice(0, 2), d.slice(0, 2)).global).toBeUndefined();
  });

  it('el aviso global aparece aunque algunas notas coincidan por casualidad con la lectura equivocada', () => {
    // la melodía real: Do Mi Sol Fa Re Mi; escrita en la lectura equivocada, algunas notas caen sobre otras de la melodía
    const real = [q(0, 1, 60), q(1, 2, 64), q(3, 2, 67), q(5, 1, 65), q(6, 1, 62), q(7, 2, 64)];
    const r = compareTranscriptions(real.map((n) => ({ ...n, midi: n.midi - 2 })), real.map((n) => ({ ...n, strength: 0.9 })));
    expect(r.global).toMatchObject({ semis: 2 });
    expect(r.global!.texto).toMatch(/en concierto lo que marcaste como Si♭/);
    expect(r.diffs).toEqual([]);
  });

  it('con una transposición global, lo que queda se compara ya corregido', () => {
    const u = [q(0, 1, 60), q(1, 1, 62), q(2, 1, 64), q(3, 1, 65), q(5, 1, 67)];
    const d = [...u.slice(0, 4).map((n) => ({ ...n, midi: n.midi + 2, strength: 0.9 })), q(8, 2, 69, { strength: 0.9 })];
    const r = compareTranscriptions(u, d);
    expect(r.global).toMatchObject({ semis: 2, n: 4 });
    expect(r.coinciden).toBe(4);
    // la quinta nota (G4 escrita corrida 2 = A4) no tiene detectada cerca: es una nota que falta, y la detectada A4 a las 8 sobra
    expect(r.diffs.map((x) => x.kind).sort()).toEqual(['falta', 'sobra']);
  });

  it('dos semitonos sueltos avisan de la posible confusión de lectura', () => {
    const r = compareTranscriptions([q(0, 1, 62), q(1, 1, 65)], [q(0, 1, 62), q(1, 1, 67)]);
    expect(r.coinciden).toBe(1);
    expect(r.diffs[0]).toMatchObject({ subtype: 'lectura', quien: 'no se puede saber' });
    expect(r.diffs[0].porQue).toMatch(/Si♭/);
  });

  it('nota que falta: repetida (articulación), muy corta, fuera de tesitura o floja', () => {
    const rep = compareTranscriptions([q(0, 1, 62), q(1, 1, 62)], [q(0, 1, 62, { strength: 0.9 })]);
    expect(rep.diffs[0]).toMatchObject({ kind: 'falta' });
    expect(rep.diffs[0].porQue).toMatch(/articulación/);
    expect(compareTranscriptions([q(0, 4, 62), q(4, 1, 70)], [q(0, 4, 62)]).diffs[0].porQue).toMatch(/fantasma|breve/);
    expect(compareTranscriptions([q(0, 4, 62), q(4, 2, 30)], [q(0, 4, 62)]).diffs[0].quien).toBe('el detector');
    expect(compareTranscriptions([q(0, 4, 62), q(4, 4, 65)], [q(0, 4, 62)]).diffs[0].porQue).toMatch(/sensibilidad/);
  });

  it('nota de más: débil es un armónico del bajo; fuerte y corta puede ser una nota de paso', () => {
    const base = [q(0, 4, 62)];
    const debil = compareTranscriptions(base, [q(0, 4, 62), q(4, 2, 50, { strength: 0.3 })]);
    expect(debil.diffs[0]).toMatchObject({ kind: 'sobra', quien: 'tu versión' });
    expect(debil.diffs[0].porQue).toMatch(/armónico del bajo/);
    const fuerte = compareTranscriptions(base, [q(0, 4, 62), q(4, 1, 63, { strength: 0.9 })]);
    expect(fuerte.diffs[0].quien).toBe('el detector');
    expect(fuerte.diffs[0].porQue).toMatch(/nota de paso/);
    expect(compareTranscriptions(base, [q(0, 4, 62), q(4, 4, 63, { strength: 0.6 })]).diffs[0].quien).toBe('no se puede saber');
  });

  it('el ritmo y la duración se explican con el swing y la articulación', () => {
    const r = compareTranscriptions([q(0, 2, 62), q(2, 2, 65)], [q(0, 2, 62), q(3, 1, 65)]);
    const kinds = r.diffs.map((d) => d.kind);
    expect(kinds).toEqual(['ritmo']);
    expect(r.diffs[0].porQue).toMatch(/swing/);
    const r2 = compareTranscriptions([q(0, 4, 62)], [q(0, 1, 62)]);
    expect(r2.diffs[0].kind).toBe('duracion');
    expect(r2.diffs[0].porQue).toMatch(/lengua/);
  });

  it('muestra la nota escrita para Si♭ cuando se lee en esa lectura', () => {
    const r = compareTranscriptions([q(0, 2, 65)], [q(0, 2, 66)], { bb: true });
    expect(r.diffs[0].porQue).toMatch(/G4 escrito \(suena F4\)/);
  });

  it('las diferencias salen en orden de aparición y la mezcla de todo no se rompe', () => {
    const u = [q(0, 2, 62), q(2, 2, 65), q(4, 2, 69), q(8, 2, 60)];
    const d = [q(0, 2, 62, { strength: 0.9 }), q(2, 2, 66), q(6, 2, 50, { strength: 0.3 })];
    const r = compareTranscriptions(u, d);
    expect(r.diffs.map((x) => x.at)).toEqual([...r.diffs.map((x) => x.at)].sort((a, b) => a - b));
    expect(r.nUser).toBe(4);
    expect(r.nDet).toBe(3);
  });
});

describe('tiempo fuerte', () => {
  const chord = parseChord('Dm7');
  it('una nota del acorde en tiempo fuerte desempata a su favor', () => {
    // tuya F (♭3, del acorde) contra detectada F♯... ya decide el rol; acá las dos son del acorde: D (fundamental) contra F (♭3) → no es un semitono; se prueba un caso con empate de rol
    const opt = { chordAt: () => chord, strong: () => true };
    // A (quinta) y A♭... : tuya A (del acorde) contra detectada B♭ (tensión ♭9 no… B♭ es b6 → cromática en Dm7): rol distinto igual; el apoyo se nombra
    const r = compareTranscriptions([q(0, 2, 69)], [q(0, 2, 70, { strength: 0.9 })], opt);
    expect(r.diffs[0].quien).toBe('tu versión');
    expect(r.diffs[0].porQue).toMatch(/tiempo fuerte/);
  });
  it('un semitono con las dos fuera de la armonía no se decide por el tiempo fuerte', () => {
    const r = compareTranscriptions([q(0, 2, 61)], [q(0, 2, 63, { strength: 0.9 })], { chordAt: () => chord, strong: () => true });
    expect(r.diffs[0].porQue).not.toMatch(/tiempo fuerte/);
  });
  it('una nota de más del acorde, fuerte y en tiempo fuerte, probablemente es real', () => {
    const r = compareTranscriptions([q(0, 4, 62)], [q(0, 4, 62), q(4, 2, 65, { strength: 0.8 })], { chordAt: () => chord, strong: (e) => e === 4 });
    expect(r.diffs[0]).toMatchObject({ kind: 'sobra', quien: 'el detector' });
    expect(r.diffs[0].porQue).toMatch(/tiempo fuerte/);
  });
});

describe('consejos según el patrón', () => {
  it('sin diferencias felicita pero recuerda que es una estimación', () => {
    const r = compareTranscriptions([q(0, 2, 62)], [q(0, 2, 62, { strength: 0.9 })]);
    expect(r.consejos).toHaveLength(1);
    expect(r.consejos[0]).toMatch(/estimación/);
  });
  it('muchas notas de más débiles sugieren aislar la trompeta', () => {
    const det = [q(0, 4, 62, { strength: 0.9 }), q(4, 1, 50, { strength: 0.3 }), q(5, 1, 52, { strength: 0.3 }), q(6, 1, 55, { strength: 0.3 })];
    const r = compareTranscriptions([q(0, 4, 62)], det);
    expect(r.consejos.join(' ')).toMatch(/Aislar trompeta/);
  });
  it('varias notas que faltan sugieren bajar la sensibilidad; los corrimientos repetidos, revisar el tempo', () => {
    const u = [q(0, 1, 62), q(2, 1, 64), q(4, 1, 65), q(6, 1, 67)];
    expect(compareTranscriptions(u, []).consejos.join(' ')).toMatch(/bajá la sensibilidad/);
    const d = u.map((n) => ({ ...n, start: n.start + 1, strength: 0.9 }));
    expect(compareTranscriptions(u, d).consejos.join(' ')).toMatch(/swing o el tempo/);
  });
  it('muchos semitonos sugieren estimar la afinación del disco', () => {
    const u = [q(0, 1, 62), q(2, 1, 64), q(4, 1, 66), q(6, 1, 67), q(8, 1, 69)];
    const off = [1, -1, 1, -1, 0]; // cuatro semitonos sueltos que no suman una corrida global
    const d = u.map((n, i) => ({ ...n, midi: n.midi + off[i], strength: 0.9 }));
    const c = compareTranscriptions(u, d);
    expect(c.global).toBeUndefined();
    expect(c.consejos.join(' ')).toMatch(/afinación del disco/);
  });
  it('si la detección encontró muchísimas más notas, sugiere ajustar la selección', () => {
    const det = Array.from({ length: 14 }, (_, i) => q(i * 2, 1, 62 + (i % 5), { strength: 0.9 }));
    expect(compareTranscriptions([q(0, 1, 62), q(2, 1, 63)], det).consejos.join(' ')).toMatch(/selección/);
  });
});

describe('aplicar las elecciones', () => {
  const user = [q(0, 2, 62), q(2, 2, 65), q(4, 2, 69)];
  it('sin elegir la detectada queda igual que tu versión', () => {
    const c = compareTranscriptions(user, [q(0, 2, 62), q(2, 2, 66), q(4, 2, 69)]);
    expect(aplicarElecciones(c, {}).map((n) => [n.start, n.dur, n.midi])).toEqual([[0, 2, 62], [2, 2, 65], [4, 2, 69]]);
  });
  it('elegir la detectada cambia la altura, el ritmo y la duración de esa nota', () => {
    const c = compareTranscriptions(user, [q(0, 2, 62), q(2, 2, 66), q(4, 2, 69)]);
    const id = c.diffs[0].id;
    expect(aplicarElecciones(c, { [id]: 'detectada' }).map((n) => n.midi)).toEqual([62, 66, 69]);
    const c2 = compareTranscriptions([q(0, 4, 62)], [q(0, 1, 62)]);
    expect(aplicarElecciones(c2, { [c2.diffs[0].id]: 'detectada' })[0].dur).toBe(1);
    const c3 = compareTranscriptions([q(0, 2, 62), q(2, 2, 65)], [q(0, 2, 62), q(3, 1, 65)]);
    expect(aplicarElecciones(c3, { [c3.diffs[0].id]: 'detectada' }).map((n) => n.start)).toEqual([0, 3]);
  });
  it('una nota que falta se quita y una de más se agrega', () => {
    const c = compareTranscriptions([q(0, 2, 62), q(2, 2, 65)], [q(0, 2, 62), q(4, 2, 69, { strength: 0.9 })]);
    const falta = c.diffs.find((d) => d.kind === 'falta')!;
    const sobra = c.diffs.find((d) => d.kind === 'sobra')!;
    const r = aplicarElecciones(c, { [falta.id]: 'detectada', [sobra.id]: 'detectada' });
    expect(r.map((n) => [n.start, n.midi])).toEqual([[0, 62], [4, 69]]);
  });
  it('parte de tu versión ya con la corrección global', () => {
    const real = [q(0, 1, 60), q(1, 1, 62), q(2, 1, 64), q(3, 1, 65), q(4, 1, 67), q(6, 1, 69)];
    const c = compareTranscriptions(real.map((n) => ({ ...n, midi: n.midi - 2 })), real.slice(0, 5).map((n) => ({ ...n, strength: 0.9 })));
    expect(c.global?.semis).toBe(2);
    expect(c.base.map((n) => n.midi)).toEqual(real.map((n) => n.midi));
    const falta = c.diffs.find((d) => d.kind === 'falta')!;
    expect(aplicarElecciones(c, { [falta.id]: 'detectada' })).toHaveLength(5);
  });
  it('lo aplicado no se superpone y vuelve a leerse con el mismo texto', () => {
    const c = compareTranscriptions([q(0, 4, 62)], [q(0, 4, 62), q(2, 2, 65, { strength: 0.9 })]);
    const r = aplicarElecciones(c, { [c.diffs[0].id]: 'detectada' });
    for (let i = 1; i < r.length; i++) expect(r[i].start).toBeGreaterThanOrEqual(r[i - 1].start + r[i - 1].dur);
    for (const reading of ['Bb', 'C'] as const) {
      const back = userNotes(lineaDe(r, reading), reading) as QNote[];
      expect(back.map((n) => [n.start, n.dur, n.midi])).toEqual(r.map((n) => [n.start, n.dur, n.midi]));
    }
    expect(lineaDe([q(2, 1, 62)], 'C')).toBe('r:2 D4');
    expect(lineaDe([q(0, 40, 62)], 'C')).toBe('D4:32 D4:8');
  });
});
