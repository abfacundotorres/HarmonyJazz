import { expect, test } from './helpers';

test('la app abre y suena sin conexión (service worker + caché)', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('nav')).toBeVisible();
  // espera a que el service worker tome el control y guarde todo
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r()));
  });
  expect(await page.evaluate(async () => (await caches.keys()).some((k) => k.startsWith('harmonyjazz-')))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('nav')).toBeVisible();
  await page.evaluate(() => (location.hash = '#/playalong'));
  await expect(page.locator('.player')).toBeVisible();
  const r = await page.evaluate(async () => {
    const sample = await fetch('./samples/piano/C4.mp3');
    const manifest = await fetch('./manifest.webmanifest');
    return { sample: sample.ok && (await sample.arrayBuffer()).byteLength > 10_000, manifest: manifest.ok };
  });
  expect(r).toEqual({ sample: true, manifest: true });
  await context.setOffline(false);
});

test('el manifiesto permite instalarla como app (íconos y modo independiente)', async ({ page }) => {
  const m = await (await page.request.get('/manifest.webmanifest')).json();
  expect(m.display).toBe('standalone');
  const sizes = m.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? 'any'}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));
  for (const i of m.icons as { src: string }[]) expect((await page.request.get('/' + i.src)).ok(), i.src).toBe(true);
});
