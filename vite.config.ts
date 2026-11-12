import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
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

/**
 * Modo sin conexión: genera `sw.js` con la lista de todo lo que la app necesita (código, estilos, el worklet
 * del transcriptor, íconos y las muestras de instrumentos, ~4 MB). El service worker las guarda al instalarse
 * y desde entonces responde primero desde el almacenamiento: la app abre y suena sin señal.
 * La versión del caché sale de un hash de los nombres y tamaños, así que cada despliegue renueva el caché.
 */
const offline = (): Plugin => {
  let cfg: ResolvedConfig;
  const walk = (dir: string, out: { rel: string; size: number }[] = []) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full, out);
      else out.push({ rel: relative(cfg.publicDir, full).split('\\').join('/'), size: st.size });
    }
    return out;
  };
  return {
    name: 'harmonyjazz-offline',
    apply: 'build',
    configResolved(c) {
      cfg = c;
    },
    generateBundle: {
      // al final: así el HTML ya está en el paquete
      order: 'post',
      handler(_o, bundle) {
      const pub = walk(cfg.publicDir);
      const files = [...new Set(['./', 'index.html', ...Object.keys(bundle), ...pub.map((f) => f.rel)])].filter((f) => f !== 'sw.js').sort();
      const version = createHash('sha1')
        .update(files.join('|') + pub.map((f) => f.size).join(','))
        .update(Object.values(bundle).map((b) => ('code' in b ? b.code.length : 0)).join(','))
        .digest('hex')
        .slice(0, 10);
      // la hora de compilación (10 cifras) hace que ordenar los nombres sea ordenar por antigüedad
      const stamp = String(Math.floor(Date.now() / 1000));
      const source = `/* generado por vite.config.ts: no editar */
const CACHE = 'harmonyjazz-${stamp}-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new URL(f, self.location).href))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  // se conserva la versión anterior: una pestaña abierta antes de la actualización todavía puede pedir sus archivos
  // (por ejemplo el motor de audio de Transcribir); las anteriores a esa se borran
  e.waitUntil(
    caches.keys().then((ks) => {
      const mine = ks.filter((k) => k.startsWith('harmonyjazz-')).sort();
      const keep = new Set([CACHE, ...mine.filter((k) => k !== CACHE).slice(-1)]);
      return Promise.all(mine.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
    }).then(() => self.clients.claim()),
  );
});
// primero el caché de esta versión; si falta, el de la anterior; y por último la red
const fromCache = async (req, opts) => {
  const cur = await caches.open(CACHE);
  return (await cur.match(req, opts)) || (await caches.match(req, opts));
};
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fromCache(new URL('index.html', self.location).href, { ignoreVary: true }).then((m) => m || fetch(r)));
    return;
  }
  e.respondWith(fromCache(r, { ignoreSearch: true, ignoreVary: true }).then((m) => m || fetch(r)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      },
    },
  };
};

// base relativo para que funcione en GitHub Pages o en cualquier subcarpeta
export default defineConfig({
  base: './',
  plugins: [react(), csp(), offline()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as any);
