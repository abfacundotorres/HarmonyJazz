import { BackupCard } from '../components/BackupCard';
import { ThemeCard } from '../components/ThemeCard';
import { useReading, useSettings } from '../hooks';

/** Ajustes: apariencia, sonido, lectura y copia de seguridad (antes repartidos entre Hoy y el reproductor). */
export function More() {
  const [settings, setSettings] = useSettings();
  const { view } = useReading();
  return (
    <div className="page more">
      <ThemeCard />

      <section className="card" id="sonido">
        <h2 className="h3like">Sonido y cifrado</h2>
        <div className="settingslist">
          <label>
            Volumen: {settings.volume > 0 ? '+' : ''}{settings.volume} dB
            <input type="range" min={-14} max={2} step={1} value={settings.volume} onChange={(e) => setSettings({ volume: Number(e.target.value) })} />
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
        <p className="muted small">
          Todo se lee {view === 'Bb' ? 'escrito para trompeta en Si♭' : 'en concierto'} (se cambia arriba, junto al registro).
          El volumen, el swing y la salida valen para todo el audio de la app.
        </p>
      </section>

      <BackupCard />
    </div>
  );
}
