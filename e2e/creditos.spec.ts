import { expect, test } from './helpers';

test.describe('créditos', () => {
  test('el enlace del pie abre la pantalla de créditos dentro de la app, también con el service worker activo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r()));
    });
    await page.getByRole('link', { name: 'Créditos y licencias' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Créditos y licencias');
    await expect(page.getByRole('heading', { name: 'Sonido' })).toBeVisible();
    await expect(page.getByText('DM Serif Display').first()).toBeVisible();
    await page.getByText('Texto completo de las licencias de los sonidos').click();
    await expect(page.locator('pre.license')).toContainText('Salamander', { timeout: 10_000 });
  });

  test('abrir un archivo suelto (samples/CREDITS.txt) muestra el archivo y no una pantalla en blanco', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r()));
    });
    // error que había: el service worker contestaba a TODA navegación con la pantalla principal
    const tab = await context.newPage();
    await tab.goto('/samples/CREDITS.txt');
    await expect(tab.locator('body')).toContainText('Salamander Grand Piano V3');
    expect(await tab.locator('#root').count()).toBe(0);
    await tab.goto('/licenses/DM-Serif-Display-OFL.txt');
    await expect(tab.locator('body')).toContainText('SIL OPEN FONT LICENSE');
    // y la raíz de la app sigue sirviéndose desde el caché sin conexión
    await context.setOffline(true);
    await tab.goto('/');
    await expect(tab.locator('nav')).toBeVisible();
    await context.setOffline(false);
  });
});
