import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import { MAX_TEMPO, MIN_TEMPO, type MetroOpts } from '../../audio/metronomePlan';
import { usePersistent } from '../../state/storage';
import { tapTempo } from '../../transcribe/grid';
import { NumberField } from '../components/NumberField';

interface MetroState {
  tempo: number;
  beats: number;
  sub: 1 | 2 | 3 | 4;
  sound: 'click' | 'hat';
  accent: boolean;
  backbeat: boolean;
  silenceOn: boolean;
  play: number;
  mute: number;
  rampOn: boolean;
  step: number;
  every: number;
  max: number;
}
const DEFAULTS: MetroState = { tempo: 100, beats: 4, sub: 1, sound: 'click', accent: true, backbeat: false, silenceOn: false, play: 3, mute: 1, rampOn: false, step: 4, every: 4, max: 160 };

const toOpts = (m: MetroState): MetroOpts & { sound: 'click' | 'hat' } => ({
  tempo: m.tempo, beats: m.beats, sub: m.sub, accent: m.accent, backbeat: m.backbeat, sound: m.sound,
  silence: m.silenceOn ? { play: m.play, mute: m.mute } : undefined,
  ramp: m.rampOn ? { step: m.step, every: m.every, max: Math.max(m.max, m.tempo) } : undefined,
});

/** Metrónomo independiente del play-along: pulsos, subdivisión, contratiempos, compases en silencio y subida de tempo. */
export function Metronome() {
  const [m, set] = usePersistent<MetroState>('metro', DEFAULTS);
  const [on, setOn] = useState(false);
  const [pos, setPos] = useState<{ bar: number; beat: number; tempo: number; muted: boolean } | null>(null);
  const live = useRef(m);
  live.current = m;
  const taps = useRef<number[]>([]);
  const [tapNote, setTapNote] = useState('');

  const stop = () => {
    engine.stop();
    setOn(false);
    setPos(null);
  };
  useEffect(() => () => engine.stop(), []);

  const start = async () => {
    setOn(true);
    const ok = await engine.playMetronome(() => toOpts(live.current), setPos);
    if (!ok) setOn(false);
  };

  const tap = () => {
    const r = tapTempo([...taps.current, performance.now() / 1000]);
    taps.current = r.taps;
    if (r.bpm) {
      set({ tempo: Math.round(Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, r.bpm))) });
      setTapNote('');
    } else setTapNote(`${r.taps.length} toque${r.taps.length === 1 ? '' : 's'}: seguí marcando`);
  };

  return (
    <div className="page metro-page">
      <section className="card">
        <h2>Metrónomo</h2>
        <div className="beats" role="img" aria-label={pos ? `Pulso ${pos.beat + 1} de ${m.beats}${pos.muted ? ', compás en silencio' : ''}` : 'Metrónomo detenido'}>
          {Array.from({ length: m.beats }, (_, i) => (
            <i key={i} className={`${pos?.beat === i ? 'now' : ''} ${i === 0 && m.accent ? 'strong' : ''} ${pos?.muted ? 'muted' : ''}`} />
          ))}
        </div>
        <p className="muted small" aria-live="off">{pos ? `Compás ${pos.bar + 1} · ${Math.round(pos.tempo)} bpm${pos.muted ? ' · en silencio: seguí vos' : ''}` : 'Detenido'}</p>
        <div className="row">
          <button className="primary" onClick={on ? stop : start}>{on ? 'Parar' : 'Empezar'}</button>
          <button onClick={tap}>Marcar el tempo</button>
          {tapNote && <span className="muted small">{tapNote}</span>}
        </div>
        <div className="row">
          <span>Tempo (bpm) <NumberField label="Tempo" value={m.tempo} min={MIN_TEMPO} max={MAX_TEMPO} onCommit={(v) => set({ tempo: v })} /></span>
          <button aria-label="Bajar 1 bpm" onClick={() => set({ tempo: Math.max(MIN_TEMPO, m.tempo - 1) })}>−</button>
          <button aria-label="Subir 1 bpm" onClick={() => set({ tempo: Math.min(MAX_TEMPO, m.tempo + 1) })}>+</button>
        </div>
        <div className="row">
          <span>Pulsos por compás <NumberField label="Pulsos por compás" value={m.beats} min={1} max={12} onCommit={(v) => set({ beats: v })} /></span>
          <label>Subdivisión
            <select value={m.sub} onChange={(e) => set({ sub: Number(e.target.value) as MetroState['sub'] })}>
              <option value={1}>Ninguna</option>
              <option value={2}>Corcheas</option>
              <option value={3}>Tresillos</option>
              <option value={4}>Semicorcheas</option>
            </select>
          </label>
          <label>Sonido
            <select value={m.sound} onChange={(e) => set({ sound: e.target.value as MetroState['sound'] })}>
              <option value="click">Clic</option>
              <option value="hat">Hi-hat</option>
            </select>
          </label>
        </div>
        <div className="row">
          <label><input type="checkbox" checked={m.accent} onChange={(e) => set({ accent: e.target.checked })} /> Acentuar el primer pulso</label>
          <label><input type="checkbox" checked={m.backbeat} onChange={(e) => set({ backbeat: e.target.checked })} /> Sólo contratiempos (2 y 4)</label>
        </div>
      </section>

      <section className="card">
        <h3>Para exigirte</h3>
        <label><input type="checkbox" checked={m.silenceOn} onChange={(e) => set({ silenceOn: e.target.checked })} /> Compases en silencio (el pulso lo llevás vos)</label>
        {m.silenceOn && (
          <div className="row">
            Suenan <NumberField label="Compases que suenan" value={m.play} min={1} max={16} onCommit={(v) => set({ play: v })} />
            y se callan <NumberField label="Compases en silencio" value={m.mute} min={1} max={16} onCommit={(v) => set({ mute: v })} />
          </div>
        )}
        <label><input type="checkbox" checked={m.rampOn} onChange={(e) => set({ rampOn: e.target.checked })} /> Subir el tempo solo</label>
        {m.rampOn && (
          <div className="row">
            Sube <NumberField label="Cuánto sube, en bpm" value={m.step} min={1} max={20} onCommit={(v) => set({ step: v })} />
            bpm cada <NumberField label="Cada cuántos compases" value={m.every} min={1} max={64} onCommit={(v) => set({ every: v })} /> compases, hasta
            <NumberField label="Tempo máximo, en bpm" value={m.max} min={MIN_TEMPO} max={MAX_TEMPO} onCommit={(v) => set({ max: v })} />
          </div>
        )}
        <p className="muted small">Los cambios se oyen en el compás siguiente, sin cortar el pulso.</p>
      </section>
    </div>
  );
}
