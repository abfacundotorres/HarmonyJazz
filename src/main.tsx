import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { Gate } from './ui/components/Gate';
import { DEFAULT_SETTINGS, load } from './state/storage';
import { pedirProteccion } from './state/persist';
import { applyTheme } from './ui/themes';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/dm-serif-display/latin-400-italic.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/libre-baskerville/latin-400.css';
import './styles.css';

// el tema elegido se aplica antes de dibujar, para que no parpadee el de por defecto
applyTheme(load('settings', DEFAULT_SETTINGS).theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gate>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Gate>
  </StrictMode>,
);

// pide que el navegador no borre los datos si falta espacio (una app instalada suele recibirlo sin preguntar); si no lo da,
// la tarjeta «Copia de seguridad» lo dice y deja reintentar
void pedirProteccion();

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
