import { lazy, Suspense, useEffect, useState } from 'react';
import { stopAll } from '../audio/stopAll';
import { useRoute, useSettings } from './hooks';
import { Today } from './pages/Today';

// Cada pantalla viaja en su propio archivo: Hoy abre sin esperar al motor de audio ni a las partituras.
const PAGES = {
  playalong: () => import('./pages/PlayAlong').then((m) => ({ default: m.PlayAlong })),
  lecciones: () => import('./pages/Lessons').then((m) => ({ default: m.Lessons })),
  escalas: () => import('./pages/Scales').then((m) => ({ default: m.Scales })),
  vocabulario: () => import('./pages/Vocab').then((m) => ({ default: m.Vocab })),
  transcribir: () => import('./pages/Transcribe').then((m) => ({ default: m.Transcribe })),
  escucha: () => import('./pages/Listen').then((m) => ({ default: m.Listen })),
  creditos: () => import('./pages/Credits').then((m) => ({ default: m.Credits })),
};
const PlayAlong = lazy(PAGES.playalong);
const Lessons = lazy(PAGES.lecciones);
const Scales = lazy(PAGES.escalas);
const Vocab = lazy(PAGES.vocabulario);
const Transcribe = lazy(PAGES.transcribir);
const Listen = lazy(PAGES.escucha);
const Credits = lazy(PAGES.creditos);

const NAV = [
  ['hoy', 'Hoy'],
  ['playalong', 'Play-along'],
  ['lecciones', 'Lecciones'],
  ['escalas', 'Escalas'],
  ['vocabulario', 'Vocabulario'],
  ['transcribir', 'Transcribir'],
  ['escucha', 'Afinador'],
] as const;

export function App() {
  const { path } = useRoute();
  const page = path[0] ?? 'hoy';
  const [settings, setSettings] = useSettings();
  const [updated, setUpdated] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    const f = () => setUpdated(true);
    const g = () => setSaveFailed(true);
    window.addEventListener('hj-update', f);
    window.addEventListener('hj-save-failed', g);
    return () => {
      window.removeEventListener('hj-update', f);
      window.removeEventListener('hj-save-failed', g);
    };
  }, []);

  // al cambiar de pantalla, cortar el audio
  const sub = path[1];
  useEffect(() => {
    stopAll();
    window.scrollTo(0, 0);
  }, [page, sub]);

  // con la app ya dibujada, se traen de fondo las demás pantallas: el cambio de pestaña es inmediato
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => number }).requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500));
    idle(() => Object.values(PAGES).forEach((load) => void load().catch(() => undefined)));
  }, []);

  // en el celular las pestañas se desplazan: la activa queda a la vista
  useEffect(() => {
    document.querySelector('.top nav a.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [page]);

  return (
    <div className="app">
      {saveFailed && (
        <div className="updatebar warn" role="alert">
          No se pudo guardar el último cambio: el almacenamiento del navegador está lleno o bloqueado. Bajá una copia de tus datos (en Hoy) y liberá espacio.{' '}
          <button onClick={() => setSaveFailed(false)}>Entendido</button>
        </div>
      )}
      {updated && (
        <div className="updatebar" role="status">
          Hay una versión nueva de la app.{' '}
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      )}
      <header className="top">
        <a href="#/hoy" className="brand">
          <img src="./icon.svg" alt="" width="38" height="38" /> <span className="brandname">HarmonyJazz</span>
        </a>
        <nav>
          {NAV.map(([id, label]) => (
            <a key={id} href={`#/${id}`} className={page === id ? 'on' : ''}>
              {label}
            </a>
          ))}
        </nav>
        <div className="prefs">
          <div className="seg" role="group" aria-label="Transposición">
            <button className={settings.view === 'Bb' ? 'on' : ''} onClick={() => setSettings({ view: 'Bb' })} title="Notación y cifrados escritos para trompeta en Si♭">
              Si♭
            </button>
            <button className={settings.view === 'C' ? 'on' : ''} onClick={() => setSettings({ view: 'C' })} title="Notación y cifrados en concierto">
              Concierto
            </button>
          </div>
          <select value={settings.register} onChange={(e) => setSettings({ register: e.target.value as typeof settings.register })} aria-label="Registro">
            <option value="grave">Reg. grave</option>
            <option value="medio">Reg. medio</option>
            <option value="agudo">Reg. agudo</option>
          </select>
        </div>
      </header>
      <main>
        <h1 className="sr">{page === 'creditos' ? 'Créditos y licencias' : (NAV.find(([id]) => id === page)?.[1] ?? 'HarmonyJazz')}</h1>
        <Suspense fallback={<p className="muted" role="status">Cargando…</p>}>
          {page === 'hoy' && <Today />}
          {page === 'playalong' && <PlayAlong />}
          {page === 'lecciones' && <Lessons />}
          {page === 'escalas' && <Scales />}
          {page === 'vocabulario' && <Vocab />}
          {page === 'transcribir' && <Transcribe />}
          {page === 'escucha' && <Listen />}
          {page === 'creditos' && <Credits />}
        </Suspense>
      </main>
      <footer className="credits">
        Piano: Salamander Grand Piano V3 (Alexander Holm,{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>) · Batería: Salamander Drumkit (Alexander Holm,{' '}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>) · Contrabajo y trompeta: FluidR3 (Frank Wen, MIT) ·{' '}
        <a href="#/creditos">Créditos y licencias</a>
      </footer>
    </div>
  );
}
