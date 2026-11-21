import { expect, test } from './helpers';

// Protección de los datos: almacenamiento persistente y «Compartir copia». El navegador de prueba no tiene Compartir ni
// concede la protección, así que se simulan.
test.describe('copia de seguridad: protección y compartir', () => {
  test('sin protección avisa y deja pedirla; si el navegador la concede, lo dice', async ({ page }) => {
    await page.addInitScript(() => {
      // lo niega cuando la app lo pide sola al arrancar y lo concede cuando se lo pide con el botón
      let ok = false;
      let pedidos = 0;
      Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: { persisted: async () => ok, persist: async () => (ok = ++pedidos > 1), estimate: async () => ({ usage: 0, quota: 1e9 }) },
      });
    });
    await page.goto('/#/mas');
    await expect(page.getByText('Datos sin proteger')).toBeVisible();
    await page.getByRole('button', { name: 'Pedir protección' }).click();
    await expect(page.getByText(/Datos protegidos/)).toBeVisible();
    await expect(page.getByText('Datos sin proteger')).toHaveCount(0);
  });

  test('si el navegador no la concede, lo explica sin romper nada', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: { persisted: async () => false, persist: async () => false, estimate: async () => ({ usage: 0, quota: 1e9 }) },
      });
    });
    await page.goto('/#/mas');
    await page.getByRole('button', { name: 'Pedir protección' }).click();
    await expect(page.getByText(/no concedió la protección/)).toBeVisible();
    await expect(page.getByText('Datos sin proteger')).toBeVisible();
  });

  test('«Compartir copia» entrega un archivo de copia válido y recién entonces cuenta como copia hecha', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __compartido: unknown[] }).__compartido = [];
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (d: { files: File[]; title: string }) => {
          const f = d.files[0];
          (window as unknown as { __compartido: unknown[] }).__compartido.push({ nombre: f.name, tipo: f.type, titulo: d.title, texto: await f.text() });
        },
      });
      localStorage.setItem('harmonyjazz:atril', JSON.stringify({ size: 2.5 }));
    });
    await page.goto('/#/mas');
    expect(await page.evaluate(() => localStorage.getItem('harmonyjazz:lastBackup'))).toBeNull();
    await page.getByRole('button', { name: 'Compartir copia' }).click();
    await expect(page.getByText(/Copia compartida/)).toBeVisible();
    const [c] = await page.evaluate(() => (window as unknown as { __compartido: { nombre: string; tipo: string; titulo: string; texto: string }[] }).__compartido);
    expect(c.nombre).toMatch(/^harmonyjazz-copia-\d{4}-\d{2}-\d{2}\.json$/);
    expect(c.tipo).toBe('application/json');
    const copia = JSON.parse(c.texto);
    expect(copia).toMatchObject({ app: 'harmonyjazz', version: 2 });
    expect(copia.data.atril).toEqual({ size: 2.5 });
    expect(await page.evaluate(() => localStorage.getItem('harmonyjazz:lastBackup'))).not.toBeNull();
  });

  test('cancelar el menú de compartir no cuenta como copia hecha', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => { throw Object.assign(new Error('cancelado'), { name: 'AbortError' }); },
      });
    });
    await page.goto('/#/mas');
    await page.getByRole('button', { name: 'Compartir copia' }).click();
    await expect(page.getByRole('button', { name: 'Compartir copia' })).toBeEnabled();
    await expect(page.getByText(/Copia compartida/)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('harmonyjazz:lastBackup'))).toBeNull();
  });

  test('sin Compartir en el navegador no aparece el botón y «Guardar copia» sigue funcionando', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    });
    await page.goto('/#/mas');
    await expect(page.getByRole('button', { name: 'Guardar copia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir copia' })).toHaveCount(0);
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Guardar copia' }).click();
    expect((await descarga).suggestedFilename()).toMatch(/^harmonyjazz-copia-.*\.json$/);
  });
});
