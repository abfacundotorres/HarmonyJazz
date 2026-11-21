import { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import {
  ALL_ITEMS, CHORD_MODE_LABEL, CHORD_SETS, type ChordMode, type ChordSet, chordId, chordQuestion, GT_DEGREES, GT_DEGREE_LABEL, type GtDegree,
  type GtQuestion, gtId, guideToneQuestion, INTERVAL_SEMIS, type IntervalMode, intervalId, intervalQuestion, MODE_LABEL, pickItem, type Question, rate, record, type EarStats,
} from '../../ear/core';
import { dayNum } from '../../state/progress';
import { usePersistent } from '../../state/storage';
import { useWakeLock } from '../wakeLock';
import { chordSymbol, parseChord, transposeChord } from '../../theory/chords';
import { CYCLE_OF_FOURTHS } from '../../theory/chart';
import { BB_TRUMPET, INTERVAL, type Note, noteName, simplify, transposeNote } from '../../theory/notes';
import { useSettings } from '../hooks';

type Kind = 'int' | 'chord' | 'gt';
const KINDS: [Kind, string][] = [['int', 'Intervalos'], ['chord', 'Calidades de acorde'], ['gt', 'Guide tones']];
type IntMode = IntervalMode | 'mix';
type ChMode = ChordMode | 'mix';

const pct = (s: EarStats[string] | undefined) => {
  const r = rate(s);
  return r === null ? '—' : `${Math.round(r * 100)} % (${s!.ok}/${s!.n})`;
};

const weak = (s: EarStats[string] | undefined) => !!s && s.n >= 3 && s.ok / s.n < 0.6;

/** Entrenamiento del oído con la trompeta y el piano de la app. Los aciertos se guardan y lo que se falla vuelve a salir más seguido. */
export function Ear() {
  const [settings] = useSettings();
  const iv = settings.view === 'Bb' ? BB_TRUMPET : INTERVAL.P1;
  const [stats, setStats] = usePersistent<EarStats>('ear', {});
  const [opts, setOpts] = usePersistent<{ kind: Kind; intMode: IntMode; chSet: ChordSet; chMode: ChMode }>('earset', { kind: 'int', intMode: 'asc', chSet: 'sevenths', chMode: 'arp' });
  const { kind, intMode, chSet, chMode } = opts;
  const [q, setQ] = useState<Question | null>(null);
  const [gt, setGt] = useState<GtQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [gtPicks, setGtPicks] = useState<(GtDegree | null)[]>([null, null, null]);
  const [playing, setPlaying] = useState(false);
  useWakeLock(true); // se contesta pensando entre sonido y sonido: la pantalla no se apaga mientras se está en esta pantalla
  const [session, setSession] = useState({ ok: 0, n: 0 });
  const last = useRef<string | undefined>(undefined);
  const rng = useRef(Math.random);

  useEffect(() => () => engine.stopLine(), []);

  const show = (n: Note) => noteName(simplify(transposeNote(n, iv)), true);
  const play = (events: { midi: number; start: number; dur: number; voice: 'horn' | 'piano' }[]) => {
    setPlaying(true);
    void engine.playEar(events, () => setPlaying(false));
  };

  const next = (k: Kind = kind, im: IntMode = intMode, cs: ChordSet = chSet, cm: ChMode = chMode) => {
    engine.stopLine();
    setPicked(null);
    setGtPicks([null, null, null]);
    if (k === 'gt') {
      const g = guideToneQuestion(CYCLE_OF_FOURTHS[Math.floor(rng.current() * 12)], rng.current, stats);
      setGt(g);
      setQ(null);
      play(g.events);
      return;
    }
    let item: string;
    let question: Question;
    if (k === 'int') {
      const modes: IntervalMode[] = im === 'mix' ? ['asc', 'desc', 'harm'] : [im];
      const ids = modes.flatMap((m) => INTERVAL_SEMIS.map((s) => intervalId(m, s)));
      item = pickItem(ids, stats, rng.current, last.current);
      const [, m, s] = item.split(':');
      question = intervalQuestion(m as IntervalMode, Number(s), rng.current);
    } else {
      const modes: ChordMode[] = cm === 'mix' ? ['arp', 'block'] : [cm];
      const ids = modes.flatMap((m) => CHORD_SETS[cs].map((c) => chordId(m, c)));
      item = pickItem(ids, stats, rng.current, last.current);
      const [, m, c] = item.split(':');
      question = chordQuestion(cs, m as ChordMode, c, rng.current);
    }
    last.current = item;
    setGt(null);
    setQ(question);
    play(question.events);
  };

  const answer = (id: string) => {
    if (!q || picked !== null) return;
    const right = id === q.answer;
    setPicked(id);
    setStats((s) => record(s, q.id, right, dayNum()));
    setSession((s) => ({ ok: s.ok + (right ? 1 : 0), n: s.n + 1 }));
  };

  const gtPick = (slot: number, d: GtDegree) => {
    if (!gt || gtPicks[slot] !== null) return;
    const right = d === gt.slots[slot].played;
    setGtPicks((p) => p.map((x, i) => (i === slot ? d : x)));
    setStats((s) => record(s, gtId(gt.slots[slot].played), right, dayNum()));
    setSession((s) => ({ ok: s.ok + (right ? 1 : 0), n: s.n + 1 }));
  };

  const switchKind = (k: Kind) => {
    engine.stopLine();
    setPlaying(false);
    setOpts({ kind: k });
    setQ(null);
    setGt(null);
    setPicked(null);
  };

  const rows = useMemo(() => {
    const groups = new Map<string, { id: string; label: string }[]>();
    for (const it of ALL_ITEMS) if (stats[it.id]?.n) groups.set(it.group, [...(groups.get(it.group) ?? []), it]);
    // lo más flojo primero
    for (const [g, list] of groups) groups.set(g, [...list].sort((a, b) => (rate(stats[a.id]) ?? 1) - (rate(stats[b.id]) ?? 1)));
    return [...groups.entries()];
  }, [stats]);

  const question = q ?? null;
  const gtDone = gt !== null && gtPicks.every((p) => p !== null);

  return (
    <div className="ear">
      <section className="card">
        <header>
          <h2>Entrenamiento del oído</h2>
          <span className="muted" role="status">Esta sesión: {session.ok}/{session.n}</span>
        </header>
        <p className="muted">Suena con la trompeta y el piano de la app. Lo que fallás vuelve a salir más seguido.</p>
        <div className="seg" role="group" aria-label="Ejercicio">
          {KINDS.map(([k, label]) => (
            <button key={k} className={k === kind ? 'on' : ''} aria-pressed={k === kind} onClick={() => switchKind(k)}>{label}</button>
          ))}
        </div>

        {kind === 'int' && (
          <div className="seg" role="group" aria-label="Tipo de intervalo" style={{ marginTop: 8 }}>
            {([...(['asc', 'desc', 'harm'] as const).map((m) => [m, MODE_LABEL[m]] as const), ['mix', 'Mezcla'] as const]).map(([m, label]) => (
              <button key={m} className={m === intMode ? 'on' : ''} aria-pressed={m === intMode} onClick={() => { setOpts({ intMode: m }); setQ(null); setPicked(null); }}>{label}</button>
            ))}
          </div>
        )}
        {kind === 'chord' && (
          <>
            <div className="seg" role="group" aria-label="Acordes" style={{ marginTop: 8 }}>
              {([['triads', 'Tríadas'], ['sevenths', 'Cuatro notas']] as const).map(([s, label]) => (
                <button key={s} className={s === chSet ? 'on' : ''} aria-pressed={s === chSet} onClick={() => { setOpts({ chSet: s }); setQ(null); setPicked(null); }}>{label}</button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Cómo suena" style={{ marginTop: 8 }}>
              {([...(['arp', 'block'] as const).map((m) => [m, CHORD_MODE_LABEL[m]] as const), ['mix', 'Mezcla'] as const]).map(([m, label]) => (
                <button key={m} className={m === chMode ? 'on' : ''} aria-pressed={m === chMode} onClick={() => { setOpts({ chMode: m }); setQ(null); setPicked(null); }}>{label}</button>
              ))}
            </div>
          </>
        )}
        {kind === 'gt' && (
          <p className="muted" style={{ marginTop: 8 }}>
            ii–V–I mayor en una tonalidad al azar. El piano toca fundamental y quinta; la trompeta toca la 3ª o la 7ª de cada acorde. Elegí qué nota tocó en cada uno.
          </p>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!question && !gt && <button className="primary" onClick={() => next()}>Empezar</button>}
          {(question || gt) && (
            <>
              <button onClick={() => play((question ?? gt!).events)} disabled={playing} aria-label="Repetir el sonido">▶ Repetir</button>
              <button className={picked !== null || gtDone ? 'primary' : ''} onClick={() => next()}>Siguiente</button>
            </>
          )}
        </div>

        {question && (
          <div style={{ marginTop: 12 }}>
            <h3>{question.prompt}</h3>
            <div className="chips" role="group" aria-label="Opciones">
              {question.options.map((o) => {
                const state = picked === null ? '' : o.id === question.answer ? 'ok' : o.id === picked ? 'bad' : '';
                return (
                  <button key={o.id} className={state} aria-pressed={picked === o.id} disabled={picked !== null && state === ''} onClick={() => answer(o.id)}>
                    {o.label}{state === 'ok' ? ' ✓' : state === 'bad' ? ' ✗' : ''}
                  </button>
                );
              })}
            </div>
            <p role="status" aria-live="polite">
              {picked === null ? '' : picked === question.answer ? 'Bien.' : `Era: ${question.options.find((o) => o.id === question.answer)!.label}.`}
            </p>
            {picked !== null && picked !== question.answer && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => play(question.optionEvents[question.answer])} disabled={playing}>▶ Oír la correcta</button>
                <button onClick={() => play(question.optionEvents[picked])} disabled={playing}>▶ Oír la tuya ({question.options.find((o) => o.id === picked)!.label})</button>
              </div>
            )}
          </div>
        )}

        {gt && (
          <div style={{ marginTop: 12 }}>
            <h3>¿Qué nota tocó la trompeta en cada acorde?</h3>
            {gt.slots.map((s, i) => {
              const chord = chordSymbol(transposeChord(parseChord(s.chord), iv), true);
              const p = gtPicks[i];
              return (
                <div key={i} style={{ margin: '8px 0' }}>
                  <b>{chord}</b>
                  <div className="chips" role="group" aria-label={`Nota sobre ${chord}`}>
                    {GT_DEGREES.map((d) => {
                      const state = p === null ? '' : d === s.played ? 'ok' : d === p ? 'bad' : '';
                      return (
                        <button key={d} className={state} aria-pressed={p === d} disabled={p !== null && state === ''} onClick={() => gtPick(i, d)}>
                          {show(s.names[d])}{p !== null && state ? ` (${GT_DEGREE_LABEL[d]})` : ''}{state === 'ok' ? ' ✓' : state === 'bad' ? ' ✗' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {gtDone && (
              <button onClick={() => play(gt.events.filter((e) => e.voice === 'horn'))} disabled={playing}>▶ Sólo la línea de la trompeta</button>
            )}
            <p role="status" aria-live="polite">
              {gtDone ? `${gtPicks.filter((p, i) => p === gt.slots[i].played).length} de 3. Línea: ${gt.slots.map((s) => show(s.names[s.played])).join(' → ')}.` : ''}
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <header>
          <h3>Mis aciertos</h3>
          {rows.length > 0 && (
            <button onClick={() => window.confirm('¿Borrar todos los aciertos del entrenamiento del oído?') && setStats(() => ({}))}>Borrar</button>
          )}
        </header>
        {rows.length === 0 ? (
          <p className="muted">Todavía no contestaste nada.</p>
        ) : (
          rows.map(([group, items]) => (
            <details key={group}>
              <summary>{group}</summary>
              <ul>
                {items.map((it) => (
                  <li key={it.id} className={weak(stats[it.id]) ? 'bad' : ''}>{it.label}: {pct(stats[it.id])}{weak(stats[it.id]) ? ' · para repasar' : ''}</li>
                ))}
              </ul>
            </details>
          ))
        )}
      </section>
    </div>
  );
}
