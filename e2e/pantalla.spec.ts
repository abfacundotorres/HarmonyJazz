import { expect, test } from './helpers';

// Pantalla encendida: la app pide el bloqueo del navegador mientras suena o escucha algo, y con el ajuste, siempre. Se simula
// `navigator.wakeLock` y se cuentan los bloqueos pedidos y los que siguen activos.
const simular = () => {
  const w = window as unknown as { __wl: { pedidos: number; activos: number } };
  w.__wl = { pedidos: 0, activos: 0 };
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: async () => {
        w.__wl.pedidos++;
        w.__wl.activos++;
        const s = {
          released: false,
          release: async () => {
            if (!s.released) {
              s.released = true;
              w.__wl.activos--;
            }
          },
          addEventListener: () => undefined,
        };
        return s;
      },
    },
  });
};
const bloqueos = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { __wl: { pedidos: number; activos: number } }).__wl);

test.describe('pantalla encendida', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(simular);
  });

  test('por defecto, leer una pantalla común no pide el bloqueo', async ({ page }) => {
    await page.goto('/#/lecciones');
    await expect(page.locator('main .card').first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await bloqueos(page)).toEqual({ pedidos: 0, activos: 0 });
  });

  test('con el ajuste «Mantener la pantalla encendida», la app lo pide en cualquier pantalla y lo suelta al apagarlo', async ({ page }) => {
    await page.goto('/#/mas');
    const caja = page.getByLabel('Mantener la pantalla encendida mientras la app esté abierta');
    await expect(caja).not.toBeChecked();
    await caja.check();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(1);
    await page.goto('/#/lecciones'); // sigue pedido al cambiar de pantalla
    await expect(page.locator('main .card').first()).toBeVisible();
    expect((await bloqueos(page)).activos).toBe(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:settings')!).keepAwake)).toBe(true);
    await page.goto('/#/mas');
    await page.getByLabel('Mantener la pantalla encendida mientras la app esté abierta').uncheck();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(0);
  });

  test('el metrónomo lo pide mientras suena y lo suelta al parar', async ({ page }) => {
    await page.goto('/#/metronomo');
    expect((await bloqueos(page)).activos).toBe(0);
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(1);
    await page.getByRole('button', { name: 'Parar' }).click();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(0);
  });

  test('Escalas lo pide mientras suena la escala y lo suelta al detenerla', async ({ page }) => {
    await page.goto('/#/escalas');
    expect((await bloqueos(page)).activos).toBe(0);
    await page.getByRole('button', { name: /Oírla en trompeta/ }).click();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(1);
    await page.getByRole('button', { name: /Detener/ }).click();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(0);
  });

  test('el afinador lo pide con el micrófono encendido y lo suelta al apagarlo', async ({ page }) => {
    await page.goto('/#/escucha');
    expect((await bloqueos(page)).activos).toBe(0);
    await page.getByRole('button', { name: 'Activar micrófono' }).click();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(1);
    await page.getByRole('button', { name: 'Apagar' }).click();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(0);
  });

  test('Oído lo pide mientras se está en la pantalla y lo suelta al salir', async ({ page }) => {
    await page.goto('/#/oido');
    await expect(page.getByRole('heading', { name: 'Entrenamiento del oído' })).toBeVisible();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(1);
    await page.goto('/#/lecciones');
    await expect(page.locator('main .card').first()).toBeVisible();
    await expect.poll(async () => (await bloqueos(page)).activos).toBe(0);
  });

  test('si el navegador no tiene wakeLock, nada se rompe', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined }));
    await page.goto('/#/mas');
    await page.getByLabel('Mantener la pantalla encendida mientras la app esté abierta').check();
    await page.goto('/#/oido');
    await expect(page.getByRole('heading', { name: 'Entrenamiento del oído' })).toBeVisible();
  });
});
