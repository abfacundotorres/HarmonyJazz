import { BackupCard } from '../components/BackupCard';
import { ThemeCard } from '../components/ThemeCard';
import { ATRIL_SIZE, clampAtrilSize } from '../../state/atril';
import { usePersistent } from '../../state/storage';
import { useReading, useSettings } from '../hooks';

/** Ajustes: apariencia, sonido, lectura y copia de seguridad (antes repartidos entre Hoy y el reproductor). */
export function More() {
  const [settings, setSettings] = useSettings();
  const { view } = useReading();
  const [atril, setAtril] = usePersistent<{ size: number }>('atril', { size: ATRIL_SIZE.default });
  const size = clampAtrilSize(atril.size);
  return (
    <div className="page more">
      <section className="card" id="extras">
        <h2 className="h3like">Más pantallas</h2>
        <p className="muted small">Lo que no hace falta para aprender un standard pero ayuda: están acá para que la barra quede corta.</p>
        <ul className="extras">
          <li><a href="#/mes">Mi mes</a> <span className="muted small">elegís pocos focos de técnica y lenguaje y los trabajás un mes; arma el plan de Hoy</span></li>
          <li><a href="#/curricula">Currícula</a> <span className="muted small">tres años en seis semestres, un tema por mes con cierre y autoevaluación</span></li>
          <li><a href="#/progreso">Progreso</a> <span className="muted small">lo que marcaste como logrado y qué conviene repasar</span></li>
          <li><a href="#/metronomo">Metrónomo</a> <span className="muted small">péndulo y pulsos para practicar con tempo</span></li>
          <li><a href="#/escucha">Afinador</a> <span className="muted small">afinación, bordón y notas largas guardadas</span></li>
        </ul>
      </section>

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
          Todo se lee {view === 'Bb' ? 'escrito para trompeta en Si♭' : 'en concierto'} (se cambia arriba, junto al registro).
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
