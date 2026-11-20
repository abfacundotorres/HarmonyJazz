/**
 * Comparar la transcripción de una persona con la estimación automática del mismo pasaje, encontrar las diferencias y
 * explicarlas con teoría (la nota respecto del acorde, aproximaciones cromáticas) y con la lógica de la trompeta (tesitura,
 * serie de armónicos, articulación). La app no es juez final: cada diferencia dice quién probablemente tiene razón y por
 * qué, o que no se puede saber, y la pantalla ofrece escuchar las dos versiones. Núcleo puro y sin audio.
 */
import { analyzePc, type Chord, chordSymbol, prettyDegree } from '../theory/chords';
import { midiName, parsePitch, midi as pitchMidi, prettyAcc } from '../theory/notes';
import type { DetectedNote } from './pitch';

/** Nota con alturas en concierto; `start` y `dur` en corcheas desde el comienzo del pasaje. */
export interface QNote {
  start: number;
  dur: number;
  midi: number;
  /** Fuerza de la detección (0..1); no la tienen las notas escritas a mano. */
  strength?: number;
  /** Desafinación detectada, en centésimas. */
  cents?: number;
}

/** Tesitura habitual de la trompeta en Si♭, en concierto: de Mi3 (Fa♯3 escrito) a Si♭5 (Do6 escrito). */
export const TRUMPET_RANGE = { lo: 52, hi: 82 };

export type Kind = 'altura' | 'falta' | 'sobra' | 'ritmo' | 'duracion';
export type Quien = 'tu versión' | 'el detector' | 'no se puede saber';

export interface Diff {
  /** Posición en la lista de diferencias (para elegir con cuál quedarse). */
  id: number;
  kind: Kind;
  /** Posición en corcheas desde el comienzo del pasaje. */
  at: number;
  user?: QNote;
  det?: QNote;
  /** Qué clase de diferencia de altura: semitono, octava, dos semitonos (¿lectura?) u otra. */
  subtype?: 'semitono' | 'octava' | 'lectura' | 'otra';
  /** Explicación: qué pasó y por qué. */
  porQue: string;
  quien: Quien;
}

export interface Comparison {
  /** Notas que coinciden en altura, tiempo y duración. */
  coinciden: number;
  diffs: Diff[];
  /** Si casi toda la transcripción coincide con la detección corrida N semitonos, un aviso único; las diferencias se calculan ya con esa corrección. */
  global?: { semis: number; n: number; texto: string };
  /** Cuántas notas pitcheadas tenía cada versión. */
  nUser: number;
  nDet: number;
  /** Tu transcripción ya con la corrección global (si la hubo): la base sobre la que se aplican las elecciones. */
  base: QNote[];
  /** Consejos según el patrón de diferencias (qué ajustar en la detección, o en tu escritura). */
  consejos: string[];
}

export interface CompareOptions {
  /** Acorde que suena en una posición (corcheas desde el comienzo del pasaje), si se eligió un tema. */
  chordAt?: (eighth: number) => Chord | null;
  /** ¿Esa posición cae en tiempo fuerte? (sólo con un tema elegido): una nota del acorde en tiempo fuerte pesa más. */
  strong?: (eighth: number) => boolean;
  /** Leer en Si♭: las notas se nombran como se escriben y se aclara cuál suena (un tono más grave). */
  bb?: boolean;
}

// ---------- armar las notas de las dos versiones ----------

/** Notas detectadas cuantizadas a corcheas (misma cuenta que `notesToLine`). */
export function quantizeDetected(notes: DetectedNote[], bpm: number, t0: number): QNote[] {
  if (!(bpm > 0)) return [];
  const eighth = 30 / bpm;
  const out: QNote[] = [];
  let pos = 0;
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    let s = Math.max(0, Math.round((n.start - t0) / eighth));
    const e = Math.max(s + 1, Math.round((n.end - t0) / eighth));
    if (s < pos) s = pos;
    if (e <= s) continue;
    out.push({ start: s, dur: e - s, midi: n.midi, strength: n.strength, cents: n.cents });
    pos = e;
  }
  return out;
}

/** La transcripción escrita a mano ("D4 E4:2 r:2 | …"), pasada a concierto si se escribió para trompeta en Si♭. */
export function userNotes(line: string, reading: 'Bb' | 'C'): QNote[] | string {
  const out: QNote[] = [];
  let t = 0;
  for (const tok of line.replace(/[\r\n]+/g, ' ').split(/\s+/).filter((x) => x && x !== '|')) {
    const [p, d] = tok.split(':');
    const dur = d ? Number(d) : 1;
    if (!Number.isInteger(dur) || dur < 1 || dur > 64) return `Duración no válida en «${tok}» (van de 1 a 64 corcheas)`;
    if (p !== 'r') {
      try {
        out.push({ start: t, dur, midi: pitchMidi(parsePitch(p)) - (reading === 'Bb' ? 2 : 0) });
      } catch {
        return `No entiendo la nota «${p}»`;
      }
    }
    t += dur;
  }
  if (!out.length) return 'Escribí al menos una nota';
  return out;
}

// ---------- explicar ----------

const SCORE = { chord: 3, tension: 2, scale: 1, chromatic: 0 } as const;

/** El nombre de la nota como se lee: para trompeta en Si♭ se dice la nota escrita y entre paréntesis la que suena. */
function nombre(m: number, bb: boolean): string {
  const c = prettyAcc(midiName(m));
  return bb ? `${prettyAcc(midiName(m + 2))} escrito (suena ${c})` : c;
}

const fuera = (m: number) => m < TRUMPET_RANGE.lo || m > TRUMPET_RANGE.hi;
const RANGO = 'la tesitura habitual de la trompeta en Si♭ va de Mi3 a Si♭5 (de Fa♯3 a Do6 escrito)';

function rol(chord: Chord | null | undefined, m: number) {
  if (!chord) return null;
  const a = analyzePc(chord, ((m % 12) + 12) % 12);
  return { score: SCORE[a.role], texto: a.role === 'chord' ? `nota del acorde (${prettyDegree(a.degree)})` : a.role === 'tension' ? `tensión (${prettyDegree(a.degree)})` : a.role === 'scale' ? `nota de la escala (${prettyDegree(a.degree)})` : `nota cromática (${prettyDegree(a.degree)}), fuera de la escala` };
}

function explicarAltura(u: QNote, d: QNote, at: number, next: QNote | undefined, opt: CompareOptions): { subtype: NonNullable<Diff['subtype']>; porQue: string; quien: Quien } {
  const bb = !!opt.bb;
  const diff = d.midi - u.midi;
  const abs = Math.abs(diff);
  const chord = opt.chordAt?.(at) ?? null;
  const ru = rol(chord, u.midi);
  const rd = rol(chord, d.midi);
  // una nota del acorde en tiempo fuerte pesa más: es donde la armonía se apoya
  const fuerte = !!opt.strong?.(at);
  const su = (ru?.score ?? 0) + (fuerte && ru?.score === 3 ? 1 : 0);
  const sd = (rd?.score ?? 0) + (fuerte && rd?.score === 3 ? 1 : 0);
  const apoyo = fuerte && ru && rd && (ru.score === 3) !== (rd.score === 3) ? ` Además cae en tiempo fuerte, donde se apoya una nota del acorde: ${ru.score === 3 ? 'la tuya lo es' : 'la detectada lo es'}.` : '';
  const cab = `Vos pusiste ${nombre(u.midi, bb)} y la app detectó ${nombre(d.midi, bb)}`;
  const ctx = chord && ru && rd ? ` Sobre ${chordSymbol(chord, true)}: la tuya es ${ru.texto}; la detectada es ${rd.texto}.` : '';

  if (abs % 12 === 0) {
    const arriba = diff > 0;
    let quien: Quien = 'no se puede saber';
    let porQue = `${cab}: la misma nota con ${abs === 12 ? 'una octava' : `${abs / 12} octavas`} de diferencia (${arriba ? 'la detectada es más aguda' : 'la detectada es más grave'}).`;
    if (fuera(u.midi) && !fuera(d.midi)) {
      quien = 'el detector';
      porQue += ` La tuya queda fuera de ${RANGO}: probablemente la escribiste en otra octava y la detección tiene razón.`;
    } else if (fuera(d.midi) && !fuera(u.midi)) {
      quien = 'tu versión';
      porQue += ` La detectada queda fuera de ${RANGO}: probablemente es un error de la detección.`;
    } else if (arriba && (d.strength ?? 1) < 0.5) {
      quien = 'tu versión';
      porQue += ' En la trompeta cada digitación da una serie de armónicos (fundamental, octava, quinta…) y el segundo armónico suena fuerte: el detector puede quedarse con él. Como la fuerza de lo detectado es baja, probablemente se trata de ese armónico.';
    } else {
      porQue += ' Las octavas también se confunden de oído: escuchá las dos versiones y fijate cuál suena como la grabación. En la trompeta, una octava entre dos notas con la misma digitación se cambia solo con los labios.';
    }
    return { subtype: 'octava', porQue, quien };
  }

  if (abs === 1) {
    let quien: Quien = 'no se puede saber';
    let porQue = `${cab}: un semitono de diferencia.${ctx}`;
    if (ru && rd && su > sd) {
      quien = 'tu versión';
      porQue += ` La tuya encaja mejor con la armonía; la detectada pudo correrse un semitono (afinación del disco o vibrato).${apoyo}`;
    } else if (ru && rd && sd > su) {
      quien = 'el detector';
      porQue += ` La detectada encaja mejor con la armonía: revisá si no escribiste un semitono de más o de menos.${apoyo}`;
    } else if (next && Math.abs(next.midi - u.midi) === 1) {
      quien = 'tu versión';
      porQue += ' La tuya resuelve por semitono a la nota siguiente: puede ser una aproximación cromática, un recurso típico del bebop.';
    } else if (d.cents !== undefined && Math.abs(d.cents) > 30) {
      porQue += ` La detección quedó entre dos notas (${Math.round(d.cents)}¢): si el disco está desafinado, probá «Estimar la afinación del disco» antes de detectar.`;
    } else {
      porQue += ' Sin contexto armónico no puedo decidir: escuchá las dos.';
    }
    return { subtype: 'semitono', porQue, quien };
  }

  if (abs === 2) {
    return {
      subtype: 'lectura',
      quien: 'no se puede saber',
      porQue: `${cab}: dos semitonos de diferencia. Es la diferencia entre la trompeta en Si♭ y el concierto (lo escrito suena un tono más grave): si esto se repite en varias notas, probablemente elegiste la lectura equivocada. Si es una sola nota, puede ser una nota distinta de la escala.${ctx}`,
    };
  }

  // otra diferencia
  let quien: Quien = 'no se puede saber';
  let porQue = `${cab}: ${abs} semitonos de diferencia.${ctx}`;
  if (chord && (d.strength ?? 1) < 0.6) {
    const rel = (((d.midi - u.midi) % 12) + 12) % 12;
    const pcD = ((d.midi % 12) + 12) % 12;
    const aD = analyzePc(chord, pcD);
    if (aD.degree === '1' || aD.degree === '5') {
      quien = 'tu versión';
      porQue += ` La detectada es la ${aD.degree === '1' ? 'fundamental' : 'quinta'} del acorde y su fuerza es baja: puede ser el bajo filtrado.`;
    } else if (rel === 7) {
      porQue += ' Es una quinta de diferencia: típico cuando el detector toma el tercer armónico de la nota.';
    }
  }
  if (quien === 'no se puede saber') {
    if (ru && rd && su > sd) {
      quien = 'tu versión';
      porQue += ` La tuya encaja mejor con la armonía.${apoyo}`;
    } else if (ru && rd && sd > su) {
      quien = 'el detector';
      porQue += ` La detectada encaja mejor con la armonía.${apoyo}`;
    } else {
      porQue += ' Una diferencia así no suele ser un error de afinación: puede ser otra nota (por ejemplo el bajo) o un error de lectura. Escuchá las dos.';
    }
  }
  return { subtype: 'otra', porQue, quien };
}

function explicarFalta(u: QNote, prev: QNote | undefined, opt: CompareOptions): { porQue: string; quien: Quien } {
  const bb = !!opt.bb;
  const base = `Escribiste ${nombre(u.midi, bb)} y la app no encontró ninguna nota ahí.`;
  if (fuera(u.midi)) return { quien: 'el detector', porQue: `${base} Además queda fuera de ${RANGO}: probablemente la escribiste en otra octava o lectura.` };
  if (prev && prev.midi === u.midi && prev.start + prev.dur === u.start) {
    return { quien: 'no se puede saber', porQue: `${base} Es la misma nota que la anterior, repetida: en la trompeta se separan con la lengua (articulación), sin cambio de altura, y el detector las une en una sola nota larga. Mirá si la detectada es más larga que la tuya.` };
  }
  if (u.dur <= 1) return { quien: 'tu versión', porQue: `${base} Es una nota muy corta (una corchea o menos): puede ser una nota fantasma o de paso que el detector descarta por ser breve o floja. Bajá la sensibilidad y probá de nuevo.` };
  return { quien: 'tu versión', porQue: `${base} Si la oís en la grabación, es una nota floja que el detector descartó (probá bajando la sensibilidad); si no la oís, quizá la escribiste de más.` };
}

function explicarSobra(d: QNote, at: number, opt: CompareOptions): { porQue: string; quien: Quien } {
  const bb = !!opt.bb;
  const chord = opt.chordAt?.(at) ?? null;
  const r = rol(chord, d.midi);
  const base = `La app detectó ${nombre(d.midi, bb)} y vos no escribiste nada ahí.`;
  const fuerza = d.strength ?? 0.5;
  if (fuerza < 0.5) {
    return { quien: 'tu versión', porQue: `${base} Su fuerza es baja (${Math.round(fuerza * 100)} %)${r ? ` y es ${r.texto}` : ''}: lo más probable es un armónico del bajo o ruido, no una nota de la trompeta.` };
  }
  if (fuerza >= 0.6 && r && r.score === 3 && opt.strong?.(at)) {
    return { quien: 'el detector', porQue: `${base} Es una nota del acorde (${r.texto.replace(/^nota del acorde /, '')}) en tiempo fuerte y suena con fuerza (${Math.round(fuerza * 100)} %): es justo donde se apoya la armonía, así que probablemente es una nota real que te faltó.` };
  }
  if (fuerza >= 0.7 && d.dur <= 2) {
    return { quien: 'el detector', porQue: `${base} Es fuerte y breve${r ? ` (${r.texto})` : ''}: puede ser una nota de paso o una aproximación rápida que no escribiste. Escuchala.` };
  }
  return { quien: 'no se puede saber', porQue: `${base} Tiene una fuerza media (${Math.round(fuerza * 100)} %): puede ser una nota real que te faltó o un armónico del bajo. Escuchala para decidir.` };
}

// ---------- comparar ----------

/** Compara las dos versiones. Las notas se emparejan por cercanía en el tiempo (hasta una corchea de diferencia). */
/** Cuántas notas de `us`, corridas `shift` semitonos, tienen una igual (con hasta una corchea de diferencia) en `ds`. */
function igualesCon(us: QNote[], ds: QNote[], shift: number): number {
  const used = new Set<number>();
  let n = 0;
  for (const u of us) {
    const i = ds.findIndex((d, k) => !used.has(k) && Math.abs(d.start - u.start) <= 1 && d.midi === u.midi + shift);
    if (i >= 0) {
      used.add(i);
      n++;
    }
  }
  return n;
}

/** Texto del aviso cuando toda la transcripción parece correrse la misma cantidad de semitonos. */
function textoGlobal(semis: number, n: number, total: number): string {
  const abs = Math.abs(semis);
  if (abs === 2) {
    return `Corrida ${abs} semitonos, ${n} de tus ${total} notas coinciden con la detección (${semis > 0 ? 'la detectada es más aguda' : 'la detectada es más grave'}). Es la diferencia entre la lectura de trompeta en Si♭ y el concierto: probablemente escribiste ${semis > 0 ? 'en concierto lo que marcaste como Si♭' : 'en Si♭ lo que marcaste como concierto'}. Cambiá la lectura y volvé a comparar; abajo se muestran las diferencias que quedan con esa corrección.`;
  }
  if (abs % 12 === 0) {
    return `Corrida ${abs / 12 === 1 ? 'una octava' : `${abs / 12} octavas`}, ${n} de tus ${total} notas coinciden con la detección: probablemente escribiste todo en otra octava. Abajo se muestran las diferencias que quedan con esa corrección.`;
  }
  return `Corrida ${abs} semitonos, ${n} de tus ${total} notas coinciden con la detección: parece una transposición de todo el pasaje (¿otra tonalidad, o el disco está afinado distinto?). Abajo se muestran las diferencias que quedan con esa corrección.`;
}

/**
 * Compara las dos versiones. Antes de emparejar se busca si casi toda la transcripción coincide con la detección corrida un
 * mismo número de semitonos (lectura Si♭/concierto u octava): en ese caso es un solo aviso y se compara ya con la corrección.
 * Después las notas se emparejan por cercanía en el tiempo (hasta una corchea de diferencia).
 */
export function compareTranscriptions(user: QNote[], det: QNote[], opt: CompareOptions = {}): Comparison {
  const orig = [...user].sort((a, b) => a.start - b.start);
  const ds = [...det].sort((a, b) => a.start - b.start);
  let global: Comparison['global'];
  let us = orig;
  const base = igualesCon(orig, ds, 0);
  let best = { shift: 0, n: 0 };
  for (let s = -12; s <= 12; s++) {
    if (s === 0) continue;
    const n = igualesCon(orig, ds, s);
    if (n > best.n) best = { shift: s, n };
  }
  if (best.n >= 3 && best.n >= Math.ceil(orig.length * 0.6) && best.n >= base + 2) {
    global = { semis: best.shift, n: best.n, texto: textoGlobal(best.shift, best.n, orig.length) };
    us = orig.map((u) => ({ ...u, midi: u.midi + best.shift }));
  }
  const used = new Set<number>();
  const pairs: { u: QNote; d: QNote }[] = [];
  const faltan: QNote[] = [];
  for (const u of us) {
    let bestI = -1;
    let score = Infinity;
    ds.forEach((d, i) => {
      if (used.has(i)) return;
      const dt = Math.abs(d.start - u.start);
      if (dt > 1) return;
      const sc = dt * 100 + Math.abs(d.midi - u.midi);
      if (sc < score) {
        score = sc;
        bestI = i;
      }
    });
    if (bestI >= 0) {
      used.add(bestI);
      pairs.push({ u, d: ds[bestI] });
    } else faltan.push(u);
  }
  const sobran = ds.filter((_, i) => !used.has(i));

  const raw: Omit<Diff, 'id'>[] = [];
  let coinciden = 0;
  pairs.forEach(({ u, d }) => {
    const dp = d.midi - u.midi;
    if (dp === 0) {
      if (d.start !== u.start) {
        const dt = d.start - u.start;
        raw.push({
          kind: 'ritmo', at: u.start, user: u, det: d, quien: 'no se puede saber',
          porQue: `La nota ${nombre(u.midi, !!opt.bb)} está ${Math.abs(dt)} corchea${Math.abs(dt) === 1 ? '' : 's'} ${dt > 0 ? 'más tarde' : 'más temprano'} en la detección. Con swing las corcheas se tocan desiguales (larga-corta): al cuantizar a corcheas iguales una nota puede correrse una corchea sin que haya un error. Revisá el tempo y la grilla de compases.`,
        });
      } else if (Math.abs(d.dur - u.dur) >= 2) {
        raw.push({
          kind: 'duracion', at: u.start, user: u, det: d, quien: 'no se puede saber',
          porQue: `La nota ${nombre(u.midi, !!opt.bb)} dura ${u.dur} corchea${u.dur === 1 ? '' : 's'} en tu versión y ${d.dur} en la detección. ${d.dur < u.dur ? 'La trompeta separa las notas con la lengua y deja un silencio breve: el detector mide cuándo suena, no cuánto vale escrita. Una nota escrita más larga puede ser correcta.' : 'El detector pudo unir dos notas iguales (repetición con articulación) o sostener la resonancia final.'}`,
        });
      } else coinciden++;
      return;
    }
    const next = us[us.indexOf(u) + 1];
    const e = explicarAltura(u, d, u.start, next, opt);
    raw.push({ kind: 'altura', at: u.start, user: u, det: d, ...e });
  });
  for (const u of faltan) {
    const prev = us[us.indexOf(u) - 1];
    raw.push({ kind: 'falta', at: u.start, user: u, ...explicarFalta(u, prev, opt) });
  }
  for (const d of sobran) raw.push({ kind: 'sobra', at: d.start, det: d, ...explicarSobra(d, d.start, opt) });
  const diffs: Diff[] = raw.sort((a, b) => a.at - b.at).map((d, id) => ({ ...d, id }));
  return { coinciden, diffs, global, nUser: us.length, nDet: ds.length, base: us, consejos: consejos(diffs, global, us.length, ds.length) };
}

// ---------- consejos según el patrón ----------

/** Qué ajustar mirando el conjunto de diferencias, no cada una: la detección (sensibilidad, filtros, afinación) o la escritura. */
export function consejos(diffs: Diff[], global: Comparison['global'], nUser: number, nDet: number): string[] {
  const out: string[] = [];
  const por = (k: Kind) => diffs.filter((d) => d.kind === k);
  const sobra = por('sobra');
  const debiles = sobra.filter((d) => (d.det?.strength ?? 1) < 0.5);
  const falta = por('falta');
  const ritmo = por('ritmo');
  const semitonos = diffs.filter((d) => d.kind === 'altura' && d.subtype === 'semitono');
  if (!diffs.length && !global) {
    out.push('Tu transcripción coincide con la detección. Recordá que la detección es una estimación: si las dos se equivocan igual, no lo notás; escuchá el pasaje una vez más.');
    return out;
  }
  if (debiles.length >= 3 || (debiles.length >= 2 && debiles.length >= diffs.length * 0.4)) {
    out.push(`${debiles.length} notas de más son débiles: parece que el bajo o la batería se cuelan en la detección. Probá «Aislar trompeta» en Afinación y filtros, o subí la sensibilidad para ocultar las notas flojas.`);
  }
  if (falta.length >= 3) {
    out.push(`No se detectaron ${falta.length} notas que escribiste: bajá la sensibilidad o revisá que el filtro de graves/agudos no las esté cortando (la trompeta en Si♭ llega de Mi3 a Si♭5 sonando).`);
  }
  if (ritmo.length >= 3) {
    out.push(`${ritmo.length} notas están corridas una corchea: se repite, así que probablemente es el swing o el tempo. Ajustá el tempo y la grilla de compases antes de comparar el ritmo.`);
  }
  if (semitonos.length >= 3) {
    out.push(`${semitonos.length} diferencias de un semitono: puede ser que el disco esté afinado distinto. Probá «Estimar la afinación del disco» y corregila antes de detectar.`);
  }
  if (nDet > nUser * 2 && nDet - nUser >= 6) {
    out.push(`La detección encontró ${nDet} notas y vos ${nUser}: si escribiste solo una parte del pasaje, elegí en el reproductor la selección que corresponda antes de detectar.`);
  }
  return out;
}

// ---------- aplicar las elecciones ----------

export type Eleccion = 'mia' | 'detectada';

/**
 * Tu transcripción corregida: para cada diferencia donde elegiste la detectada se toma su altura, su ritmo o su duración,
 * se quita una nota que la app no ve o se agrega una que vos no escribiste. Parte de tu versión ya con la corrección global.
 */
export function aplicarElecciones(c: Comparison, elegidas: Record<number, Eleccion>): QNote[] {
  const clon = new Map<QNote, QNote>(c.base.map((n) => [n, { ...n }]));
  const quitar = new Set<QNote>();
  const agregar: QNote[] = [];
  for (const d of c.diffs) {
    if (elegidas[d.id] !== 'detectada') continue;
    const mine = d.user ? clon.get(d.user) : undefined;
    if (d.kind === 'altura' && mine && d.det) mine.midi = d.det.midi;
    else if (d.kind === 'ritmo' && mine && d.det) mine.start = d.det.start;
    else if (d.kind === 'duracion' && mine && d.det) mine.dur = d.det.dur;
    else if (d.kind === 'falta' && mine) quitar.add(mine);
    else if (d.kind === 'sobra' && d.det) agregar.push({ start: d.det.start, dur: d.det.dur, midi: d.det.midi });
  }
  const todas = [...clon.values()].filter((n) => !quitar.has(n)).concat(agregar).sort((a, b) => a.start - b.start || a.midi - b.midi);
  // sin superposiciones: cada nota empieza cuando termina la anterior como pronto
  const out: QNote[] = [];
  let pos = 0;
  for (const n of todas) {
    const start = Math.max(n.start, pos);
    const dur = n.start + n.dur - start;
    if (dur <= 0) continue;
    out.push({ start, dur, midi: n.midi });
    pos = start + dur;
  }
  return out;
}

/** Las notas como texto para el cuadro de notas (`D4`, `D4:2`, `r:2`), en la lectura pedida (en Si♭ se escribe un tono arriba). */
export function lineaDe(notes: QNote[], reading: 'Bb' | 'C'): string {
  const tokens: string[] = [];
  const push = (name: string, n: number) => {
    while (n > 0) {
      const d = Math.min(32, n);
      tokens.push(name + (d > 1 ? ':' + d : ''));
      n -= d;
    }
  };
  let pos = 0;
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    if (n.start > pos) push('r', n.start - pos);
    push(midiName(n.midi + (reading === 'Bb' ? 2 : 0)), n.dur);
    pos = n.start + n.dur;
  }
  return tokens.join(' ');
}
