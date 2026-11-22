import { describe, expect, it } from 'vitest';
import { buscar, convertirTema, leerColeccion, type ResumenTema } from './coleccion';
import { compileDoc } from './chartDoc';

// Temas inventados para la prueba (no son de ninguna colección real).
const DOS_FINALES = {
  Title: 'Tema de prueba uno',
  Composer: 'Autor Uno',
  Key: 'F',
  Rhythm: 'Medium Swing',
  TimeSignature: '4/4',
  Sections: [
    { Label: 'A', MainSegment: { Chords: 'Dm7|G7|Cmaj7|A7' }, Endings: [{ Chords: 'Dm7,G7|Cmaj7' }, { Chords: 'Dm7|Cmaj7,A7' }] },
    { Label: 'B', MainSegment: { Chords: 'Fmaj7|Bb7|Gm7|C7' } },
  ],
};
const ok = (raw: unknown) => {
  const r = convertirTema(raw);
  if ('error' in r) throw new Error(r.error);
  return r;
};

describe('leerColeccion', () => {
  it('lee la lista, resume cada tema y salta lo que no tiene la forma esperada', () => {
    const r = leerColeccion(JSON.stringify([DOS_FINALES, { Title: '', Sections: [] }, { Title: 'Sin secciones' }, null, 5]));
    expect(typeof r).not.toBe('string');
    if (typeof r === 'string') return;
    expect(r.resumen).toHaveLength(1);
    expect(r.resumen[0]).toMatchObject({ idx: 0, titulo: 'Tema de prueba uno', compositor: 'Autor Uno', tonalidad: 'F', ritmo: 'Medium Swing', compas: '4/4' });
    expect(r.temas).toHaveLength(1);
  });
  it('acepta un BOM y un objeto con la lista adentro', () => {
    expect(typeof leerColeccion('﻿' + JSON.stringify([DOS_FINALES]))).not.toBe('string');
    expect(typeof leerColeccion(JSON.stringify({ songs: [DOS_FINALES] }))).not.toBe('string');
  });
  it('dice por qué no sirve', () => {
    expect(leerColeccion('esto no es json')).toMatch(/JSON válido/);
    expect(leerColeccion('{"a":1}')).toMatch(/lista de temas/);
    expect(leerColeccion('[]')).toMatch(/lista de temas/);
    expect(leerColeccion('[{"nada":1}]')).toMatch(/no parece una colección/);
  });
});

describe('buscar', () => {
  const resumen: ResumenTema[] = ['Árbol de Otoño', 'Blues del Camino', 'Camino al Sur'].map((titulo, idx) => ({
    idx, titulo, compositor: idx === 1 ? 'Ana Pérez' : '', tonalidad: '', ritmo: '', compas: '', busca: (titulo + ' ' + (idx === 1 ? 'Ana Pérez' : '')).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(),
  }));
  it('sin consulta devuelve todo en orden alfabético', () => expect(buscar(resumen, '').map((t) => t.titulo)).toEqual(['Árbol de Otoño', 'Blues del Camino', 'Camino al Sur']));
  it('no distingue mayúsculas ni acentos, y pide todas las palabras', () => {
    expect(buscar(resumen, 'arbol').map((t) => t.titulo)).toEqual(['Árbol de Otoño']);
    expect(buscar(resumen, 'CAMINO').map((t) => t.titulo)).toEqual(['Blues del Camino', 'Camino al Sur']);
    expect(buscar(resumen, 'camino sur').map((t) => t.titulo)).toEqual(['Camino al Sur']);
    expect(buscar(resumen, 'perez').map((t) => t.titulo)).toEqual(['Blues del Camino']); // por compositor
    expect(buscar(resumen, 'zzz')).toEqual([]);
  });
});

describe('convertirTema: la grilla', () => {
  it('una sección con dos finales: tema + 1.º, se repite, tema + 2.º (con signos de repetición), y la sección que sigue', () => {
    const { tune, avisos } = ok(DOS_FINALES);
    expect(tune).toMatchObject({ name: 'Tema de prueba uno', composer: 'Autor Uno', key: 'F', mode: 'major', style: 'swing', tempo: 130 });
    const bars = tune.doc!.bars;
    expect(bars).toHaveLength(12); // 4 + 2 + 2 + 4
    expect(bars[0]).toMatchObject({ chords: ['Dm7'], section: 'A', repeatStart: true });
    expect(bars.slice(4, 6).map((b) => b.ending)).toEqual([1, 1]);
    expect(bars.slice(6, 8).map((b) => b.ending)).toEqual([2, 2]);
    expect(bars[8]).toMatchObject({ chords: ['Fmaj7'], section: 'B' });
    // el cifrado que se toca está desplegado: A+1.º, A+2.º, B
    expect(tune.chart.split('|').map((b) => b.trim())).toEqual([
      'Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7 G7', 'Cmaj7',
      'Dm7', 'G7', 'Cmaj7', 'A7', 'Dm7', 'Cmaj7 A7',
      'Fmaj7', 'Bb7', 'Gm7', 'C7',
    ]);
    expect(compileDoc(tune.doc!)).toBe(tune.chart);
    expect(avisos.join(' ')).toMatch(/tempo no viene/);
  });

  it('un solo final: tema y final una vez, con aviso', () => {
    const r = ok({ ...DOS_FINALES, Sections: [{ Label: 'A', MainSegment: { Chords: 'C|F' }, Endings: [{ Chords: 'G7|C' }] }] });
    expect(r.tune.chart).toBe('C | F | G7 | C');
    expect(r.tune.doc!.bars.some((b) => b.ending || b.repeatStart)).toBe(false);
    expect(r.avisos.join(' ')).toMatch(/un solo final/);
  });

  it('tres finales: se despliega sin signos y lo dice', () => {
    const r = ok({ ...DOS_FINALES, Sections: [{ Label: 'A', MainSegment: { Chords: 'C|F' }, Endings: [{ Chords: 'G7' }, { Chords: 'Am7' }, { Chords: 'D7' }] }] });
    expect(r.tune.chart).toBe('C | F | G7 | C | F | Am7 | C | F | D7');
    expect(r.avisos.join(' ')).toMatch(/3 finales/);
  });

  it('«Repeats» toca la sección dos veces (signos de repetición)', () => {
    const r = ok({ ...DOS_FINALES, Sections: [{ Label: 'A', Repeats: 1, MainSegment: { Chords: 'C|F' } }, { Label: 'B', MainSegment: { Chords: 'G7|C' } }] });
    expect(r.tune.chart).toBe('C | F | C | F | G7 | C');
    expect(r.tune.doc!.bars[0].repeatStart).toBe(true);
    expect(r.tune.doc!.bars[1].repeatEnd).toBe(true);
  });

  it('se omiten la introducción y el verso (la app repite toda la grilla) y se avisa; si sólo hay eso, se dejan', () => {
    const r = ok({ ...DOS_FINALES, Sections: [{ Label: 'i', MainSegment: { Chords: 'Dm7|G7' } }, { Label: 'v', MainSegment: { Chords: 'Em7' } }, { Label: 'A', MainSegment: { Chords: 'C|F' } }] });
    expect(r.tune.chart).toBe('C | F');
    expect(r.avisos.join(' ')).toMatch(/introducción y el verso/);
    const s = ok({ ...DOS_FINALES, Sections: [{ Label: 'i', MainSegment: { Chords: 'Dm7|G7' } }] });
    expect(s.tune.chart).toBe('Dm7 | G7');
  });

  it('las comas sobrantes se limpian, un compás vacío en el medio repite el anterior y los de los bordes se descartan', () => {
    const r = ok({ ...DOS_FINALES, Sections: [{ Label: 'A', MainSegment: { Chords: '|C,,F,|G7,|||Am7|' } }] });
    expect(r.tune.chart).toBe('C F | G7 | G7 | G7 | Am7');
    expect(r.avisos.join(' ')).toMatch(/2 compases vacíos/);
  });

  it('un compás con más acordes de los que entran deja los primeros y avisa', () => {
    const r = ok({ ...DOS_FINALES, Sections: [{ Label: 'A', MainSegment: { Chords: 'C,D,E,F,G|Am7' } }] });
    expect(r.tune.chart).toBe('C D E F | Am7');
    expect(r.avisos.join(' ')).toMatch(/1 compás con más acordes/);
  });

  it('los acordes aproximados se resumen en un aviso', () => {
    const r = ok({ ...DOS_FINALES, Sections: [{ Label: 'A', MainSegment: { Chords: 'Caug|F9b5|C7(Gm7)' } }] });
    expect(r.tune.chart).toBe('C7#5 | F7#11 | C7');
    expect(r.avisos.join(' ')).toMatch(/Acordes aproximados/);
  });
});

describe('convertirTema: tonalidad, ritmo y compás', () => {
  it('tonalidades menores y sin tonalidad', () => {
    expect(ok({ ...DOS_FINALES, Key: 'Dmin' }).tune).toMatchObject({ key: 'D', mode: 'minor' });
    expect(ok({ ...DOS_FINALES, Key: 'C#min' }).tune).toMatchObject({ key: 'Db', mode: 'minor' });
    expect(ok({ ...DOS_FINALES, Key: undefined }).tune.key).toBeNull();
    expect(ok({ ...DOS_FINALES, Key: 'cualquiera' }).tune.key).toBeNull();
  });
  it('el ritmo da estilo y tempo; lo que la app no tiene se avisa; lo desconocido es swing', () => {
    expect(ok({ ...DOS_FINALES, Rhythm: 'Ballad' }).tune).toMatchObject({ style: 'ballad', tempo: 66 });
    expect(ok({ ...DOS_FINALES, Rhythm: 'Bossa Nova' }).tune).toMatchObject({ style: 'bossa', tempo: 130 });
    expect(ok({ ...DOS_FINALES, Rhythm: 'Up Tempo Swing' }).tune.tempo).toBe(200);
    const recto = ok({ ...DOS_FINALES, Rhythm: 'Even 8ths' });
    expect(recto.tune.style).toBe('swing');
    expect(recto.avisos.join(' ')).toMatch(/corcheas rectas/);
    const raro = ok({ ...DOS_FINALES, Rhythm: 'Polka Marciana' });
    expect(raro.tune.style).toBe('swing');
    expect(raro.avisos.join(' ')).toMatch(/desconocido/);
  });
  it('3/4 va en compás de vals y sólo con swing o balada', () => {
    const v = ok({ ...DOS_FINALES, TimeSignature: '3/4', Rhythm: 'Waltz', Sections: [{ Label: 'A', MainSegment: { Chords: 'C|F,G7|C' } }] });
    expect(v.tune.chart.startsWith('@3/4 ')).toBe(true);
    expect(v.tune.doc!.meter).toBe('3/4');
    expect(v.tune.style).toBe('swing');
    expect(ok({ ...DOS_FINALES, TimeSignature: '3/4', Rhythm: 'Bossa Nova' }).tune.style).toBe('swing'); // sin bossa en 3/4
  });
  it('sin compás se usa 4/4 y se avisa; 5/4, 6/4 y 2/4 no se pueden', () => {
    const s = ok({ ...DOS_FINALES, TimeSignature: undefined });
    expect(s.tune.doc!.meter).toBeUndefined();
    expect(s.avisos.join(' ')).toMatch(/no dice su compás/);
    for (const c of ['5/4', '6/4', '2/4']) expect(convertirTema({ ...DOS_FINALES, TimeSignature: c })).toEqual({ error: expect.stringContaining(`compás ${c}`) });
  });
});

describe('convertirTema: lo que falla', () => {
  it('un acorde que no se entiende da un error legible y no rompe', () => {
    expect(convertirTema({ ...DOS_FINALES, Sections: [{ Label: 'A', MainSegment: { Chords: 'Dm7|Zz9' } }] })).toEqual({ error: 'No se entiende el acorde «Zz9».' });
  });
  it('sin título, sin secciones o sin compases', () => {
    expect('error' in convertirTema(null)).toBe(true);
    expect('error' in convertirTema({ Title: 'X' })).toBe(true);
    expect(convertirTema({ ...DOS_FINALES, Sections: [{ Label: 'A', MainSegment: { Chords: '' } }] })).toEqual({ error: 'El tema no tiene compases.' });
  });
  it('un tema demasiado largo da error y no un cuelgue', () => {
    const largo = Array.from({ length: 300 }, () => 'C').join('|');
    expect('error' in convertirTema({ ...DOS_FINALES, Sections: [{ Label: 'A', MainSegment: { Chords: largo } }] })).toBe(true);
  });
  it('el nombre y el compositor se recortan y el id es válido', () => {
    const r = ok({ ...DOS_FINALES, Title: 'T'.repeat(200), Composer: 'C'.repeat(200) });
    expect(r.tune.name.length).toBe(80);
    expect(r.tune.composer.length).toBe(80);
    expect(r.tune.id).toMatch(/^u:[a-z0-9]{4,24}$/);
  });
});
