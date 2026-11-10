import { useEffect } from 'react';
import { engine } from '../audio/engine';
import { useRoute, useSettings } from './hooks';
import { Lessons } from './pages/Lessons';
import { Listen } from './pages/Listen';
import { PlayAlong } from './pages/PlayAlong';
import { Today } from './pages/Today';
import { Vocab } from './pages/Vocab';

const NAV = [
  ['hoy', 'Hoy'],
  ['playalong', 'Play-along'],
  ['lecciones', 'Lecciones'],
  ['vocabulario', 'Vocabulario'],
  ['escucha', 'Afinador'],
] as const;

export function App() {
  const { path } = useRoute();
  const page = path[0] ?? 'hoy';
  const [settings, setSettings] = useSettings();

  // al cambiar de pantalla, cortar el audio
  useEffect(() => {
    engine.stop();
    window.scrollTo(0, 0);
  }, [page, path[1]]);

  return (
    <div className="app">
      <header className="top">
        <a href="#/hoy" className="brand">
          <span className="bell" aria-hidden>◗</span> HarmonyJazz
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
            <option value="grave">Registro grave</option>
            <option value="medio">Registro medio</option>
            <option value="agudo">Registro agudo</option>
          </select>
        </div>
      </header>
      <main>
        {page === 'hoy' && <Today />}
        {page === 'playalong' && <PlayAlong />}
        {page === 'lecciones' && <Lessons />}
        {page === 'vocabulario' && <Vocab />}
        {page === 'escucha' && <Listen />}
      </main>
      <footer className="credits">
        Piano: Salamander Grand Piano V3 (Alexander Holm,{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>) · Batería: Salamander Drumkit (Alexander Holm,{' '}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>) · Contrabajo y trompeta: FluidR3 (Frank Wen, MIT) ·{' '}
        <a href="./samples/CREDITS.txt" target="_blank" rel="noopener noreferrer">Créditos y licencias</a>
      </footer>
    </div>
  );
}
