import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { Gate } from './ui/components/Gate';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gate>
      <App />
    </Gate>
  </StrictMode>,
);

// modo sin conexión (sólo en el sitio publicado)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = !!navigator.serviceWorker.controller;
  void navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // la primera instalación también dispara el evento: sólo avisa si ya había una versión antes
    if (hadController) window.dispatchEvent(new Event('hj-update'));
  });
}
