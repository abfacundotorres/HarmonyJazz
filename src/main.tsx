import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { Gate } from './ui/components/Gate';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/dm-serif-display/latin-400-italic.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gate>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Gate>
  </StrictMode>,
);

// modo sin conexión (sólo en el sitio publicado)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // la primera instalación también dispara "controllerchange" (el service worker toma el control); eso no es una
  // actualización. Cualquier cambio posterior sí lo es.
  let ignoreNext = !navigator.serviceWorker.controller;
  void navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (ignoreNext) {
      ignoreNext = false;
      return;
    }
    window.dispatchEvent(new Event('hj-update'));
  });
}
