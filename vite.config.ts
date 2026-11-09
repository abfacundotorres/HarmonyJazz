import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy como meta tag (GitHub Pages no permite configurar cabeceras).
 * Sólo en el build: el servidor de desarrollo de Vite usa scripts inline para el HMR.
 *
 * - connect-src 'self': el navegador bloquea cualquier descarga o envío a otro host.
 *   (abcjs trae URLs de soundfonts que esta app no usa; así quedan inertes por política.)
 * - blob: en script/worker: Tone.js crea AudioWorklets desde blobs.
 * - style-src 'unsafe-inline': React y abcjs aplican estilos en línea.
 * - frame-ancestors no funciona en meta; la app no depende de ello (no tiene sesión ni acciones sensibles).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const csp = (): Plugin => ({
  name: 'harmonyjazz-csp',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  },
});

// base relativo para que funcione en GitHub Pages o en cualquier subcarpeta
export default defineConfig({
  base: './',
  plugins: [react(), csp()],
  test: { environment: 'node' },
} as any);
