import { BackupCard } from '../components/BackupCard';
import { ThemeCard } from '../components/ThemeCard';
import { ATRIL_SIZE, clampAtrilSize } from '../../state/atril';
import { usePersistent } from '../../state/storage';
import { VOLUME } from '../../state/volume';
import { useReading, useSettings } from '../hooks';

/** Ajustes: apariencia, sonido, lectura y copia de seguridad (antes repartidos entre Hoy y el reproductor). */
export function More() {
  const [settings, setSettings] = useSettings();
  const { view } = useReading();
  const [atril, setAtril] = usePersistent<{ size: number; tira?: boolean }>('atril', { size: ATRIL_SIZE.default });
  const size = clampAtrilSize(atril.size);
  return (
    <div className="page more">
      <section className="card" id="lectura">
        <h2 className="h3like">Cómo se lee</h2>
        <div className="settingslist">
          <div>
            <div className="seg" role="group" aria-label="Transposición">
              <button className={settings.view === 'Bb' ? 'on' : ''} aria-pressed={settings.view === 'Bb'} onClick={() => setSettings({ view: 'Bb' })}>
                Si♭
              </button>
              <button className={settings.view === 'C' ? 'on' : ''} aria-pressed={settings.view === 'C'} onClick={() => setSettings({ view: 'C' })}>
                Concierto
              </button>
            </div>
            <p className="muted small">
              {view === 'Bb'
                ? 'Acordes, notas, escalas y partitura escritos para tu trompeta en Si♭ (un tono más arriba de lo que suena). Es lo que tocás.'
                : 'Todo en la altura real que suena (concierto). Útil para tocar con otros instrumentos o comparar con un cifrado de concierto.'}{' '}
              El acompañamiento suena igual en los dos casos: cambia sólo cómo se escribe.
            </p>
          </div>
          <label>
            Registro{' '}
            <select value={settings.register} onChange={(e) => setSettings({ register: e.target.value as typeof settings.register })} aria-label="Registro">
              <option value="grave">Grave</option>
              <option value="medio">Medio</option>
              <option value="agudo">Agudo</option>
            </select>
          </label>
          <p className="muted small">Zona de la trompeta en la que se arman las frases y los ejercicios (Lecciones, Vocabulario y los ejercicios de cada tema). No cambia el Play-along.</p>
        </div>
      </section>

      <ThemeCard />

      <section className="card" id="sonido">
        <h2 className="h3like">Sonido y cifrado</h2>
        <div className="settingslist">
          <label>
            Volumen: {settings.volume > 0 ? '+' : ''}{settings.volume} dB
            <input type="range" min={VOLUME.min} max={VOLUME.max} step={1} value={settings.volume} onChange={(e) => setSettings({ volume: Number(e.target.value) })} />
          </label>
          <label>
            Swing: {settings.swing <= 0.52 ? 'recto' : settings.swing >= 0.66 ? 'tresillo' : `${Math.round(settings.swing * 100)} %`}
            <input type="range" min={0.5} max={0.72} step={0.01} value={settings.swing} onChange={(e) => setSettings({ swing: Number(e.target.value) })} />
          </label>
          <label>
            Salida
            <select value={settings.output} onChange={(e) => setSettings({ output: e.target.value as typeof settings.output })}>
              <option value="auto">Automática</option>
              <option value="phone">Altavoz del celular (más graves y presencia)</option>
              <option value="normal">Auriculares / parlantes</option>
            </select>
          </label>
          <label>
            Estilo de cifrado
            <select value={settings.chordStyle} onChange={(e) => setSettings({ chordStyle: e.target.value as typeof settings.chordStyle })}>
              <option value="ireal">iReal (Δ7, -7, ø7)</option>
              <option value="full">Completo (maj7, m7, m7♭5)</option>
            </select>
          </label>
        </div>
        <label className="keepawake">
          <input type="checkbox" checked={settings.autoAtril} onChange={(e) => setSettings({ autoAtril: e.target.checked })} />
          {' '}Abrir el atril al dar play en el Play-along
        </label>
        <label className="keepawake">
          <input type="checkbox" checked={settings.keepAwake} onChange={(e) => setSettings({ keepAwake: e.target.checked })} />
          {' '}Mantener la pantalla encendida mientras la app esté abierta
        </label>
        <p className="muted small">
          La app ya evita que se apague mientras suena el play-along, el atril, las escalas, el metrónomo, el afinador, el oído y los audios de Transcribir.
          Esto lo extiende a toda la app (por ejemplo, al leer una lección o escribir una grilla); gasta más batería. Si tu teléfono está en ahorro de batería, puede que el navegador no lo conceda.
        </p>
        <p className="muted small">
          Todo se lee {view === 'Bb' ? 'escrito para trompeta en Si♭' : 'en concierto'} (se cambia en «Cómo se lee», arriba).
          El volumen, el swing y la salida valen para todo el audio de la app.
        </p>
      </section>

      <section className="card" id="atril">
        <h2 className="h3like">Modo atril</h2>
        <div className="settingslist">
          <label>
            Tamaño de la letra del atril: {size.toFixed(1)}
            <input type="range" min={ATRIL_SIZE.min} max={ATRIL_SIZE.max} step={ATRIL_SIZE.step} value={size} onChange={(e) => setAtril({ size: Number(e.target.value) })} aria-label="Tamaño de la letra del atril" />
          </label>
          <label>
            <input type="checkbox" checked={atril.tira === true} onChange={(e) => setAtril({ tira: e.target.checked })} />
            {' '}Guide tones en una tira que se desplaza (la nota que suena queda fija)
          </label>
        </div>
        <div className="atril-preview" aria-hidden style={{ fontSize: `${size}rem` }}>
          <span>G7</span>
          <span>A-7</span>
        </div>
        <p className="muted small">Así se ven los acordes en el modo atril del Play-along (pantalla completa para leer a distancia). Cuanto más grande, menos compases entran.</p>
      </section>

      <BackupCard />
    </div>
  );
}
