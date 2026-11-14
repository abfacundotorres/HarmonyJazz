import { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import {
  BPM_STEP, masteryId, PATTERNS, patternItems, SCALE_GROUPS, SCALE_INFO, scaleAbc, scaleDegrees, scaleNoteNames, suggest,
} from '../../content/scaleStudy';
import { SCALES } from '../../theory/scales';
import { midi } from '../../theory/notes';
import { KeySelect } from '../components/KeySelect';
import { Notation } from '../components/Notation';
import { useMastery, useReading } from '../hooks';

const dayNumber = () => Math.floor(Date.now() / 86400000);

/** Estudio guiado de escalas: una escala por vez, en una tonalidad, siguiendo un camino de patrones con tempo. */
export function Scales() {
  const { iv, view, keyLabel } = useReading();
  const [mastery, setMastery] = useMastery();
  const [groupId, setGroupId] = useState(SCALE_GROUPS[0].id);
  const [scaleId, setScaleId] = useState(SCALE_GROUPS[0].scales[0]);
  const [key, setKey] = useState('C');
  const [stepIdx, setStepIdx] = useState(0);
  const [tempo, setTempo] = useState(PATTERNS[0].bpm);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const group = SCALE_GROUPS.find((g) => g.id === groupId)!;
  const step = PATTERNS[stepIdx];
  const info = SCALE_INFO[scaleId];
  const record = mastery[masteryId(scaleId, step.id)] ?? {};

  const abc = useMemo(() => scaleAbc(scaleId, step.id, key, tempo, iv), [scaleId, step.id, key, tempo, iv]);
  const names = useMemo(() => scaleNoteNames(scaleId, key, iv), [scaleId, key, iv]);

  const stop = () => {
    engine.stopLine();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setPlaying(false);
  };
  useEffect(() => stop, []);
  // al cambiar lo que se muestra, se corta lo que suena
  useEffect(stop, [scaleId, step.id, key]);

  const play = async () => {
    if (playing) return stop();
    const eighth = 30 / tempo;
    let t = 0;
    const notes: { midi: number; start: number; dur: number }[] = [];
    for (const it of patternItems(scaleId, step.id, key)) {
      if (it.p) notes.push({ midi: midi(it.p), start: t, dur: it.dur * eighth });
      t += it.dur * eighth;
    }
    setPlaying(true);
    await engine.playLine(notes, () => setPlaying(false));
  };

  const pickScale = (g: string, s: string) => {
    setGroupId(g);
    setScaleId(s);
    setStepIdx(0);
    setTempo(PATTERNS[0].bpm);
  };
  const pickStep = (i: number) => {
    setStepIdx(i);
    setTempo(PATTERNS[i].bpm);
  };
  const mark = () => setMastery((m) => ({ ...m, [masteryId(scaleId, step.id)]: { ...(m[masteryId(scaleId, step.id)] ?? {}), [key]: Math.max(tempo, m[masteryId(scaleId, step.id)]?.[key] ?? 0) } }));
  const today = () => {
    const s = suggest(mastery, dayNumber());
    const g = SCALE_GROUPS.find((x) => x.scales.includes(s.scale))!;
    setGroupId(g.id);
    setScaleId(s.scale);
    setKey(s.key);
    const i = PATTERNS.findIndex((p) => p.id === s.pattern);
    setStepIdx(i);
    setTempo(PATTERNS[i].bpm);
  };
  const doneCount = (s: string, p: string) => Object.keys(mastery[masteryId(s, p)] ?? {}).length;
  const best = record[key];

  return (
    <div className="page scales">
      <section className="card">
        <h2>Estudio de escalas</h2>
        <p className="muted">
          Elegí una escala y una tonalidad y seguí el camino de patrones, de lo lento a lo ágil. Cada vez que te salga limpio a un tempo, marcalo: la app guarda tu
          mejor tempo por escala, patrón y tonalidad y te propone lo menos trabajado.
        </p>
        <p>
          <button className="primary" onClick={today}>¿Qué estudio hoy?</button>
        </p>
        <div className="seg" role="group" aria-label="Grupo de escalas">
          {SCALE_GROUPS.map((g) => (
            <button key={g.id} className={g.id === groupId ? 'on' : ''} aria-pressed={g.id === groupId} onClick={() => pickScale(g.id, g.scales[0])}>
              {g.title}
            </button>
          ))}
        </div>
        <div className="scalelist" role="group" aria-label="Escala">
          {group.scales.map((s) => (
            <button key={s} className={s === scaleId ? 'on' : ''} aria-pressed={s === scaleId} onClick={() => pickScale(groupId, s)}>
              {SCALES[s].name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <header>
          <h3>{SCALES[scaleId].name}</h3>
          <span className="badge">{view === 'Bb' ? 'Trompeta en Si♭' : 'Concierto'}</span>
        </header>
        <p className="notes-line" aria-label="Notas de la escala">
          {names.map((n, i) => (
            <span key={i}>
              <b>{n}</b>
              <small>{scaleDegrees(scaleId)[i].replace('b', '♭').replace('#', '♯')}</small>
            </span>
          ))}
        </p>
        <p>{info.what}</p>
        <ul>
          <li><b>Acordes:</b> {info.chords}</li>
          <li><b>Qué escuchar:</b> {info.listen}</li>
          <li><b>Ojo:</b> {info.tip}</li>
        </ul>
      </section>

      <section className="card">
        <h3>Camino de estudio</h3>
        <ol className="steppath">
          {PATTERNS.map((p, i) => (
            <li key={p.id}>
              <button className={i === stepIdx ? 'on' : ''} aria-pressed={i === stepIdx} onClick={() => pickStep(i)}>
                <b>{i + 1}.</b> {p.title} <small>{doneCount(scaleId, p.id)}/12</small>
              </button>
            </li>
          ))}
        </ol>

        <h4>Tonalidad</h4>
        <KeySelect value={key} onChange={setKey} mastered={record} />
        <p className="muted small">
          {doneCount(scaleId, step.id)}/12 tonalidades marcadas en "{step.title}". Tonalidad elegida: {keyLabel(key)}.
        </p>

        <Notation abc={abc} />

        <div className="row">
          <button className={playing ? 'on' : ''} onClick={() => void play()} aria-pressed={playing}>{playing ? '■ Detener' : '▶ Oírla en trompeta'}</button>
          <label>
            Tempo (negra){' '}
            <input type="number" min={40} max={200} step={BPM_STEP} value={tempo} onChange={(e) => setTempo(Math.max(40, Math.min(200, Number(e.target.value) || step.bpm)))} />
          </label>
          <button className="primary" onClick={mark}>✓ Salió limpio a {tempo} bpm</button>
          {best ? <span className="muted small">Mejor marca en {keyLabel(key)}: {best} bpm</span> : null}
        </div>

        <h4>Cómo se estudia</h4>
        <ol>{step.how.map((t, i) => <li key={i}>{t}</li>)}</ol>
        <p className="muted small">
          Empezá en {step.bpm} bpm y subí de a {BPM_STEP} cuando salga limpio dos veces seguidas. Si se ensucia, volvé al tempo anterior. Todo suave y sin forzar; si los
          labios se cansan, parar.
        </p>
      </section>
    </div>
  );
}
