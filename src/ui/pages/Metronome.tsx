import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine';
import { CUSTOM_PRESETS, CUSTOM_RANGES, DEFAULT_CUSTOM, type HitKind, isVoiceId, type SoundParams, VOICES, type VoiceId } from '../../audio/metroVoices';
import { tempoName, type SwingBeat } from '../../audio/pendulum';
import { MAX_TEMPO, MIN_TEMPO, type MetroOpts } from '../../audio/metronomePlan';
import { usePersistent } from '../../state/storage';
import { tapTempo } from '../../transcribe/grid';
import { NumberField } from '../components/NumberField';
import { Pendulum } from '../components/Pendulum';

interface MetroState {
  tempo: number;
  beats: number;
  sub: 1 | 2 | 3 | 4;
  sound: VoiceId;
  custom: SoundParams;
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
const DEFAULTS: MetroState = { tempo: 100, beats: 4, sub: 1, sound: 'wood', custom: DEFAULT_CUSTOM, accent: true, backbeat: false, silenceOn: false, play: 3, mute: 1, rampOn: false, step: 4, every: 4, max: 160 };

const KNOBS: [keyof SoundParams, string, string][] = [
  ['pitch', 'Altura', '(grave ↔ agudo)'],
  ['wood', 'Madera', '(cuerpo seco de caja)'],
  ['metal', 'Metal', '(resonancia de campana)'],
  ['attack', 'Ataque', '(golpe seco)'],
  ['hiss', 'Siseo', '(hi-hat)'],
  ['decay', 'Duración', '(cuánto resuena)'],
  ['accent', 'Acento', '(el fuerte, más agudo)'],
  ['real', 'Grabación', '(un tic de metrónomo real)'],
];

const toOpts = (m: MetroState): MetroOpts & { sound: VoiceId; custom: SoundParams } => ({
  tempo: m.tempo, beats: m.beats, sub: m.sub, accent: m.accent, backbeat: m.backbeat, sound: m.sound, custom: m.custom,
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
  const swing = useRef<SwingBeat[]>([]);
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
    swing.current = [];
    const ok = await engine.playMetronome(() => toOpts(live.current), setPos, (b) => swing.current.push(b));
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
        <Pendulum tempo={m.tempo} onTempo={(v) => set({ tempo: v })} running={on} onToggle={on ? stop : start} beats={swing} now={() => engine.audibleNow()} />
        <p className="pend-tempo"><b>{m.tempo}</b> <span>{tempoName(m.tempo)}</span></p>
        <div className="beats" role="img" aria-label={pos ? `Pulso ${pos.beat + 1} de ${m.beats}${pos.muted ? ', compás en silencio' : ''}` : 'Metrónomo detenido'}>
          {Array.from({ length: m.beats }, (_, i) => (
            <i key={i} className={`${pos?.beat === i ? 'now' : ''} ${i === 0 && m.accent ? 'strong' : ''} ${pos?.muted ? 'muted' : ''}`} />
          ))}
        </div>
        <p className="muted small" aria-live="off">{pos ? `Compás ${pos.bar + 1} · ${Math.round(pos.tempo)} bpm${pos.muted ? ' · en silencio: seguí vos' : ''}` : 'Detenido'}</p>
        <div className="row">
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
            <select value={m.sound} onChange={(e) => set({ sound: isVoiceId(e.target.value) ? e.target.value : 'wood' })}>
              {VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
        </div>
        <div className="row">
          <label><input type="checkbox" checked={m.accent} onChange={(e) => set({ accent: e.target.checked })} /> Acentuar el primer pulso</label>
          <label><input type="checkbox" checked={m.backbeat} onChange={(e) => set({ backbeat: e.target.checked })} /> Sólo contratiempos (2 y 4)</label>
        </div>
      </section>

      <details className="card metro-adv">
        <summary><h3>Crear mi sonido</h3></summary>
        <p className="muted small">Mové las perillas y probá. Al tocar una, el metrónomo pasa a "Mi sonido" y lo que oís es lo que editás (los cambios se oyen en el compás siguiente).</p>
        <label>Punto de partida
          <select
            value=""
            onChange={(e) => {
              const pr = CUSTOM_PRESETS.find((x) => x.name === e.target.value);
              if (pr) set({ custom: pr.p, sound: 'custom' });
            }}
          >
            <option value="">Elegí uno…</option>
            {CUSTOM_PRESETS.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
          </select>
        </label>
        {KNOBS.map(([k, name, hint]) => {
          const [lo, hi] = CUSTOM_RANGES[k];
          return (
            <label key={k} className="knob">
              <span>{name} <small className="muted">{hint}</small></span>
              <input
                type="range"
                min={lo}
                max={hi}
                step={k === 'pitch' ? 10 : k === 'accent' ? 1 : 0.01}
                value={m.custom[k]}
                onChange={(e) => set({ custom: { ...m.custom, [k]: Number(e.target.value) }, sound: 'custom' })}
              />
              <output>{k === 'pitch' ? `${Math.round(m.custom[k])} Hz` : k === 'accent' ? `${m.custom[k]} st` : k === 'decay' ? `×${m.custom[k].toFixed(1)}` : `${Math.round(m.custom[k] * 100)} %`}</output>
            </label>
          );
        })}
        <div className="row">
          {([['strong', 'Probar el fuerte'], ['beat', 'Probar el pulso'], ['sub', 'Probar la subdivisión']] as [HitKind, string][]).map(([k, t]) => (
            <button key={k} onClick={() => engine.previewMetroHit(m.sound, k, m.custom)}>{t}</button>
          ))}
          <button onClick={() => set({ custom: DEFAULT_CUSTOM })}>Restablecer</button>
        </div>
      </details>

      <details className="card metro-adv">
        <summary><h3>Para exigirte</h3></summary>
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
      </details>
    </div>
  );
}
