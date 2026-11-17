import { useSettings } from '../hooks';
import { THEMES, themeById, type ThemeId } from '../themes';

/** Selector de tema: una muestra de cada uno (colores y tipografía de los títulos) y la opción automática. */
export function ThemeCard() {
  const [settings, setSettings] = useSettings();
  const current = settings.theme;
  const chosen = themeById(current);
  const pick = (id: ThemeId) => setSettings({ theme: id });
  return (
    <section className="card" id="apariencia">
      <h2 className="h3like">Apariencia</h2>
      <div className="themes" role="radiogroup" aria-label="Tema">
        <button role="radio" aria-checked={current === 'auto'} onClick={() => pick('auto')}>
          <span className="sw" style={{ background: 'linear-gradient(90deg, #ecdfc0 50%, #17120d 50%)', color: '#7d4f0c' }}>
            <b aria-hidden>Aa</b>
          </span>
          <span className="nm">Automático</span>
        </button>
        {THEMES.map((t) => (
          <button key={t.id} role="radio" aria-checked={current === t.id} onClick={() => pick(t.id)}>
            <span className="sw" style={{ background: t.palette.bg, color: t.palette.text }}>
              <b aria-hidden style={{ fontFamily: t.font, textTransform: t.id.startsWith('bn-') ? 'uppercase' : 'none' }}>Aa</b>
              <i aria-hidden style={{ background: t.palette.surface }} />
              <i aria-hidden style={{ background: t.palette.accent }} />
            </span>
            <span className="nm">{t.label}</span>
          </button>
        ))}
      </div>
      <p className="muted small">
        {chosen ? chosen.desc : 'Sigue al celular: Vintage de día y Club de noche cuando el celular está en modo oscuro.'} Se recuerda en este aparato.
      </p>
    </section>
  );
}
