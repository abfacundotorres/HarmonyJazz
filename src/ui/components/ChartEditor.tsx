import { useRef, useState } from 'react';
import { ChartDoc, DocBar, emptyBar, MAX_CHORD_CHARS, playedBars, QUALITY_BUTTONS, ROOTS, SECTIONS } from '../../content/chartDoc';
import { parseChord } from '../../theory/chords';
import { MAX_BARS } from '../../theory/chart';
import { prettyAcc as pretty } from '../../theory/notes';

const valid = (c: string) => {
  if (c === '%') return true;
  try {
    parseChord(c);
    return true;
  } catch {
    return false;
  }
};
/** Separa "Bbm7" en raíz ("Bb") y resto ("m7"). */
const split = (s: string) => {
  const m = /^([A-G][b#]?)(.*)$/.exec(s);
  return m ? { root: m[1], rest: m[2] } : { root: '', rest: s };
};

/**
 * Editor de grilla al estilo iReal Pro: se toca un compás, se eligen raíz y calidad con botones (o se escribe),
 * y se marcan secciones, repeticiones y finales. Tiene deshacer/rehacer.
 */
export function ChartEditor({ doc, onChange }: { doc: ChartDoc; onChange: (d: ChartDoc) => void }) {
  const [sel, setSel] = useState(0);
  const [slot, setSlot] = useState(0);
  const past = useRef<ChartDoc[]>([]);
  const future = useRef<ChartDoc[]>([]);
  const [, force] = useState(0);

  const bars = doc.bars;
  const cur = Math.min(sel, bars.length - 1);
  const bar = bars[cur];
  const curSlot = Math.min(slot, bar.chords.length - 1);

  const commit = (next: ChartDoc) => {
    past.current.push(doc);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    onChange(next);
    force((n) => n + 1);
  };
  const undo = () => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(doc);
    onChange(p);
    force((n) => n + 1);
  };
  const redo = () => {
    const f = future.current.pop();
    if (!f) return;
    past.current.push(doc);
    onChange(f);
    force((n) => n + 1);
  };

  const patchBar = (i: number, patch: Partial<DocBar>) => {
    const next = bars.map((b, k) => (k === i ? { ...b, ...patch } : b));
    // los campos opcionales en false/undefined se quitan para que el documento quede limpio
    commit({ bars: next.map((b) => JSON.parse(JSON.stringify(b)) as DocBar) });
  };
  const setChord = (i: number, k: number, text: string) =>
    patchBar(i, { chords: bars[i].chords.map((c, j) => (j === k ? text.slice(0, MAX_CHORD_CHARS) : c)) });

  const insertAt = (i: number, b: DocBar = emptyBar()) => {
    if (bars.length >= MAX_BARS) return;
    commit({ bars: [...bars.slice(0, i), b, ...bars.slice(i)] });
    setSel(i);
    setSlot(0);
  };
  const remove = () => {
    if (bars.length === 1) return commit({ bars: [emptyBar()] });
    commit({ bars: bars.filter((_, k) => k !== cur) });
    setSel(Math.max(0, cur - 1));
  };
  const move = (d: -1 | 1) => {
    const j = cur + d;
    if (j < 0 || j >= bars.length) return;
    const next = bars.slice();
    [next[cur], next[j]] = [next[j], next[cur]];
    commit({ bars: next });
    setSel(j);
  };
  const addChord = () => {
    if (bar.chords.length >= 4) return;
    patchBar(cur, { chords: [...bar.chords, ''] });
    setSlot(bar.chords.length);
  };
  const removeChord = () => {
    if (bar.chords.length <= 1) return;
    patchBar(cur, { chords: bar.chords.slice(0, -1) });
    setSlot(Math.min(curSlot, bar.chords.length - 2));
  };

  const pickRoot = (r: string) => setChord(cur, curSlot, r + split(bar.chords[curSlot]).rest);
  const pickQuality = (suffix: string) => {
    const { root } = split(bar.chords[curSlot]);
    if (root) setChord(cur, curSlot, root + suffix);
  };

  const played = playedBars(doc);
  const chordsOk = bars.every((b) => b.chords.every((c) => c !== '' && valid(c)));

  return (
    <div className="ced">
      <div className="ced-tools">
        <button onClick={undo} disabled={!past.current.length} aria-label="Deshacer">↶ Deshacer</button>
        <button onClick={redo} disabled={!future.current.length} aria-label="Rehacer">↷ Rehacer</button>
        <span className="muted small">
          {bars.length} {bars.length === 1 ? 'compás' : 'compases'}
          {played !== null && played !== bars.length ? ` · se tocan ${played} (con repeticiones)` : ''}
        </span>
      </div>

      <div className="ced-grid" role="list">
        {bars.map((b, i) => {
          const bad = b.chords.some((c) => c === '' || !valid(c));
          return (
            <button
              key={i}
              role="listitem"
              className={`ced-bar ${i === cur ? 'sel' : ''} ${b.repeatStart ? 'rs' : ''} ${b.repeatEnd ? 're' : ''} ${bad ? 'bad' : ''}`}
              onClick={() => { setSel(i); setSlot(0); }}
              aria-label={`Compás ${i + 1}: ${b.chords.join(' ') || 'vacío'}`}
              aria-pressed={i === cur}
            >
              {(b.section || b.ending) && (
                <span className="ced-tags">
                  {b.section && <b className="ced-sec">{b.section}</b>}
                  {b.ending && <span className="ced-end">{b.ending}.</span>}
                </span>
              )}
              <span className="ced-chords">
                {b.chords.map((c, k) => (
                  <span key={k} className={c !== '' && !valid(c) ? 'err' : ''}>{c ? pretty(c) : '·'}</span>
                ))}
              </span>
            </button>
          );
        })}
        <button className="ced-bar add" onClick={() => insertAt(bars.length)} disabled={bars.length >= MAX_BARS} aria-label="Agregar compás al final">+</button>
      </div>

      <div className="ced-panel card-inner">
        <p className="small">
          <b>Compás {cur + 1}</b>{' '}
          <span className="muted">· tocá el acorde a editar, elegí la raíz y la calidad (o escribilo).</span>
        </p>
        <div className="ced-slots">
          {bar.chords.map((c, k) => (
            <input
              key={k}
              type="text"
              value={c}
              className={k === curSlot ? 'on' : ''}
              onFocus={() => setSlot(k)}
              onChange={(e) => setChord(cur, k, e.target.value)}
              aria-label={`Acorde ${k + 1} del compás ${cur + 1}`}
              placeholder="Cm7"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={c !== '' && !valid(c)}
            />
          ))}
          <button onClick={addChord} disabled={bar.chords.length >= 4} aria-label="Agregar acorde al compás">+ acorde</button>
          <button onClick={removeChord} disabled={bar.chords.length <= 1} aria-label="Quitar acorde del compás">− acorde</button>
          <button onClick={() => patchBar(cur, { chords: ['%'] })} disabled={cur === 0} title="Repite el compás anterior">%</button>
        </div>

        <div className="ced-pal" role="group" aria-label="Raíz">
          {ROOTS.map((r) => (
            <button key={r} onClick={() => pickRoot(r)} className={split(bar.chords[curSlot]).root === r ? 'on' : ''}>{pretty(r)}</button>
          ))}
        </div>
        <div className="ced-pal" role="group" aria-label="Calidad">
          {QUALITY_BUTTONS.map(([label, suf]) => (
            <button key={label} onClick={() => pickQuality(suf)} disabled={!split(bar.chords[curSlot]).root}>{label}</button>
          ))}
        </div>

        <div className="ced-marks">
          <label>
            Sección{' '}
            <select value={bar.section ?? ''} onChange={(e) => patchBar(cur, { section: e.target.value || undefined })}>
              <option value="">—</option>
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button className={bar.repeatStart ? 'on' : ''} aria-pressed={!!bar.repeatStart} onClick={() => patchBar(cur, { repeatStart: !bar.repeatStart })}>𝄆 Inicio de repetición</button>
          <button className={bar.repeatEnd ? 'on' : ''} aria-pressed={!!bar.repeatEnd} onClick={() => patchBar(cur, { repeatEnd: !bar.repeatEnd })}>Fin de repetición 𝄇</button>
          <label>
            Final{' '}
            <select value={bar.ending ?? ''} onChange={(e) => patchBar(cur, { ending: e.target.value ? (Number(e.target.value) as 1 | 2) : undefined })}>
              <option value="">—</option>
              <option value="1">1.º</option>
              <option value="2">2.º</option>
            </select>
          </label>
        </div>

        <div className="ced-acts">
          <button onClick={() => insertAt(cur)}>Insertar antes</button>
          <button onClick={() => insertAt(cur + 1)}>Insertar después</button>
          <button onClick={() => insertAt(cur + 1, { ...bar, section: undefined, repeatStart: undefined, repeatEnd: undefined, ending: undefined })}>Duplicar</button>
          <button onClick={() => move(-1)} disabled={cur === 0} aria-label="Mover compás a la izquierda">◀</button>
          <button onClick={() => move(1)} disabled={cur === bars.length - 1} aria-label="Mover compás a la derecha">▶</button>
          <button onClick={() => setSel(Math.min(bars.length - 1, cur + 1))} disabled={cur === bars.length - 1}>Siguiente compás ▸</button>
          <button onClick={remove}>Borrar compás</button>
        </div>
      </div>
      {!chordsOk && <p className="muted small">Hay compases con acordes vacíos o inválidos (en rojo).</p>}
    </div>
  );
}
