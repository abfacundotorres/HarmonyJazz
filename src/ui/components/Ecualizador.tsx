import { useState } from 'react';
import { BANDS, defaultMixer, isFlat, RANGE, STRIP_LABEL, STRIPS, type Band, type StripId } from '../../audio/mixer';
import { useSettings } from '../hooks';

/**
 * Volumen y ecualizador (graves, medios, agudos) de cada instrumento y de la mezcla general. Se elige el instrumento y se
 * mueven sus cuatro controles; el cambio se oye al instante y queda guardado.
 */
export function Ecualizador() {
  const [settings, setSettings] = useSettings();
  const [sel, setSel] = useState<StripId>('piano');
  const mixer = settings.mixer;
  const cur = mixer[sel];
  const set = (b: Band, v: number) => setSettings({ mixer: { ...mixer, [sel]: { ...cur, [b]: v } } });
  const tocado = STRIPS.some((id) => !isFlat(mixer[id]));
  return (
    <details className="eq">
      <summary>🎚 Mezcla y ecualizador{tocado ? ' · modificada' : ''}</summary>
      <div className="seg" role="group" aria-label="Instrumento">
        {STRIPS.map((id) => (
          <button key={id} className={sel === id ? 'on' : ''} aria-pressed={sel === id} onClick={() => setSel(id)}>
            {STRIP_LABEL[id]}
            {!isFlat(mixer[id]) && <span aria-label=" modificado"> •</span>}
          </button>
        ))}
      </div>
      {BANDS.map(([b, label]) => {
        const [lo, hi] = b === 'vol' ? RANGE.vol : RANGE.eq;
        return (
          <label key={b} className="eq-fila">
            <span className="eq-nombre">{label}</span>
            <input type="range" min={lo} max={hi} step={1} value={cur[b]} aria-label={`${label} de ${STRIP_LABEL[sel]}`} onChange={(e) => set(b, Number(e.target.value))} />
            <span className="eq-valor">{cur[b] > 0 ? '+' : ''}{cur[b]} dB</span>
          </label>
        );
      })}
      <p className="row">
        <button onClick={() => setSettings({ mixer: { ...mixer, [sel]: defaultMixer()[sel] } })} disabled={isFlat(cur)}>Restablecer {STRIP_LABEL[sel].toLowerCase()}</button>
        <button onClick={() => setSettings({ mixer: defaultMixer() })} disabled={!tocado}>Restablecer todo</button>
      </p>
      <p className="muted small">Graves por debajo de unos 400 Hz, agudos por encima de unos 2,5 kHz. «General» actúa sobre toda la mezcla; «Línea» es la melodía guía.</p>
    </details>
  );
}
