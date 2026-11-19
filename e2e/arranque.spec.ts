import { expect, testLoose as test } from './helpers';

test.describe('red de seguridad del arranque', () => {
  test('si el código no se puede bajar, no queda en blanco: avisa y el botón repara', async ({ page }) => {
    let bloquear = true;
    await page.route('**/assets/index-*.js', (r) => (bloquear ? r.abort() : r.continue()));
    await page.goto('/');
    // primero intenta repararse sola una vez; como sigue fallando, muestra el aviso
    await expect(page.getByRole('heading', { name: 'No se pudo abrir la app' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Tus temas, progreso y ajustes no se tocan/)).toBeVisible();
    // ya se puede bajar: Reparar vuelve a abrir la app
    bloquear = false;
    await page.getByRole('button', { name: 'Reparar' }).click();
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible({ timeout: 15_000 });
  });

  test('una copia guardada que apunta a código que ya no existe se repara sola y los datos quedan', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
    await page.evaluate(async () => {
      localStorage.setItem('harmonyjazz:longnotes', JSON.stringify({ rows: [{ id: 'x' }] }));
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r()));
      // se rompe la copia guardada: la pantalla principal apunta a un archivo que no existe
      const nombre = (await caches.keys()).find((k) => k.startsWith('harmonyjazz-'))!;
      const c = await caches.open(nombre);
      const html = '<!doctype html><html><head><script src="./arranque.js"></script></head><body><div id="root"></div><script type="module" src="./assets/index-INEXISTENTE.js"></script></body></html>';
      for (const u of [new URL('./', location.href).href, new URL('index.html', location.href).href]) await c.put(u, new Response(html, { headers: { 'content-type': 'text/html' } }));
    });
    await page.reload();
    // se repara sola: borra el service worker y su caché y vuelve a bajar todo
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => localStorage.getItem('harmonyjazz:longnotes'))).toContain('"x"');
  });
});
