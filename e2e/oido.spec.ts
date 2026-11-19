import { expect, test } from './helpers';

const guardado = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:ear') ?? '{}'));

test.describe('entrenamiento del oído', () => {
  test('intervalos: contestar guarda el acierto o el error y se ve en "Mis aciertos"', async ({ page }) => {
    await page.goto('/#/oido');
    await expect(page.getByRole('heading', { name: 'Entrenamiento del oído' })).toBeVisible();
    await page.getByRole('button', { name: 'Empezar' }).click();
    const opciones = page.getByRole('group', { name: 'Opciones' }).getByRole('button');
    await expect(opciones).toHaveCount(12);
    await opciones.first().click();
    await expect(page.getByRole('status').filter({ hasText: /Bien\.|Era:/ })).toBeVisible();
    await expect(page.getByText(/Esta sesión: [01]\/1/)).toBeVisible();
    await expect.poll(async () => Object.values(await guardado(page)).reduce((a: number, v: any) => a + v.n, 0)).toBe(1);
    // una vez contestada no se puede cambiar la respuesta
    await expect(opciones.first()).toBeEnabled();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(opciones.first()).toBeEnabled();
    await page.getByText('Mis aciertos').click();
    await page.getByText(/^Intervalos · Ascendente/).click();
    await expect(page.locator('details li').first()).toContainText('/1)');
    // los aciertos vuelven al recargar
    await page.reload();
    await page.getByText(/^Intervalos · Ascendente/).click();
    await expect(page.locator('details li').first()).toContainText('/1)');
  });

  test('acordes: tríadas dan 4 opciones y cuatro notas también', async ({ page }) => {
    await page.goto('/#/oido');
    await page.getByRole('button', { name: 'Calidades de acorde' }).click();
    await page.getByRole('group', { name: 'Acordes' }).getByRole('button', { name: 'Tríadas' }).click();
    await page.getByRole('button', { name: 'Empezar' }).click();
    const opciones = page.getByRole('group', { name: 'Opciones' }).getByRole('button');
    await expect(opciones).toHaveText(['Mayor', 'Menor', 'Disminuido', 'Aumentado']);
    await page.getByRole('group', { name: 'Acordes' }).getByRole('button', { name: 'Cuatro notas' }).click();
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(opciones).toHaveText(['maj7', 'm7', '7 (dominante)', 'm7♭5']);
  });

  test('guide tones: tres acordes con cuatro notas cada uno; al contestar los tres muestra la línea', async ({ page }) => {
    await page.goto('/#/oido');
    await page.getByRole('button', { name: 'Guide tones' }).click();
    await page.getByRole('button', { name: 'Empezar' }).click();
    const filas = page.getByRole('group', { name: /^Nota sobre/ });
    await expect(filas).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(filas.nth(i).getByRole('button')).toHaveCount(4);
      await filas.nth(i).getByRole('button').nth(1).click();
    }
    await expect(page.getByText(/de 3\. Línea: .+ → .+ → /)).toBeVisible();
    await expect.poll(async () => Object.values(await guardado(page)).reduce((a: number, v: any) => a + v.n, 0)).toBe(3);
  });

  test('recuerda el ejercicio elegido y, al errar, permite oír la correcta y la propia', async ({ page }) => {
    await page.goto('/#/oido');
    await page.getByRole('group', { name: 'Tipo de intervalo' }).getByRole('button', { name: 'Armónico' }).click();
    await page.reload();
    await expect(page.getByRole('group', { name: 'Tipo de intervalo' }).getByRole('button', { name: 'Armónico' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Empezar' }).click();
    const opciones = page.getByRole('group', { name: 'Opciones' }).getByRole('button');
    await opciones.first().click();
    // si no acertó (11 de 12 veces), ofrece comparar
    if (await page.getByText(/^Era:/).count()) {
      await expect(page.getByRole('button', { name: '▶ Oír la correcta' })).toBeVisible();
      await expect(page.getByRole('button', { name: /▶ Oír la tuya \(2ª menor\)/ })).toBeVisible();
    }
  });
});

test.describe('el oído en el repaso', () => {
  const stats = JSON.stringify({ 'i:asc:6': { n: 6, ok: 2, d: 1 }, 'i:asc:5': { n: 4, ok: 1, d: 1 } });

  test('lo flojo aparece en Hoy y en Progreso, con enlace a Oído', async ({ page }) => {
    await page.addInitScript((s) => localStorage.setItem('harmonyjazz:ear', s), stats);
    await page.goto('/#/hoy');
    const repaso = page.locator('#repaso');
    await expect(repaso).toContainText('Oído');
    await expect(repaso).toContainText('Te cuestan: 4ª justa (25 %), Tritono (33 %)');
    await repaso.getByRole('link', { name: /Oído/ }).click();
    await expect(page).toHaveURL(/#\/oido$/);
    await page.goto('/#/progreso');
    await expect(page.locator('#repaso')).toContainText('4ª justa (25 %), Tritono (33 %)');
  });

  test('sin datos de oído no aparece, y con todo firme avisa sólo si hace días que no se practica', async ({ page }) => {
    await page.goto('/#/hoy');
    await expect(page.locator('#repaso')).toHaveCount(0);
    await page.addInitScript(() => {
      const hoy = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
      localStorage.setItem('harmonyjazz:ear', JSON.stringify({ 'i:asc:7': { n: 10, ok: 10, d: hoy - 5 } }));
    });
    await page.goto('/#/progreso');
    await page.reload();
    await expect(page.locator('#repaso')).toContainText('Hace 5 días que no practicás el oído');
  });
});
