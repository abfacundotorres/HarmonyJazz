import { expect, test } from './helpers';

test.describe('estudio de escalas', () => {
  // lectura en concierto: el nombre de cada tonalidad coincide con la clave que se guarda
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:settings', JSON.stringify({ view: 'C' })));
  });

  test('elegir escala, tonalidad y patrón; marcar limpio guarda el tempo y vuelve al recargar', async ({ page }) => {
    await page.goto('/#/escalas');
    await page.getByRole('group', { name: 'Grupo de escalas' }).getByRole('button', { name: 'Menor melódica' }).click();
    await page.getByRole('group', { name: 'Escala' }).getByRole('button', { name: 'Alterada (superlocria)' }).click();
    await expect(page.getByRole('heading', { name: 'Alterada (superlocria)' })).toBeVisible();
    await expect(page.getByLabel('Notas de la escala')).toContainText('D♯');
    await page.locator('ol.steppath').getByRole('button', { name: /En terceras/ }).click();
    await expect(page.locator('.paper svg')).toBeVisible();
    expect(await page.locator('.paper svg .abcjs-note').count()).toBeGreaterThanOrEqual(14);
    await page.getByRole('radio', { name: /^F/ }).first().click();
    await page.getByLabel(/Tempo \(negra\)/).fill('80');
    await page.getByRole('button', { name: /Salió limpio a 80 bpm/ }).click();
    await expect(page.getByText(/Mejor marca en .*: 80 bpm/)).toBeVisible();
    await expect(page.locator('ol.steppath').getByRole('button', { name: /En terceras/ })).toContainText('1/12');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:mastery')!)['scale:altered:thirds'])).toEqual({ F: 80 });
    await page.reload();
    await page.getByRole('group', { name: 'Grupo de escalas' }).getByRole('button', { name: 'Menor melódica' }).click();
    await page.getByRole('group', { name: 'Escala' }).getByRole('button', { name: 'Alterada (superlocria)' }).click();
    await expect(page.locator('ol.steppath').getByRole('button', { name: /En terceras/ })).toContainText('1/12');
  });

  test('"¿Qué estudio hoy?" propone lo menos trabajado y rota al marcar', async ({ page }) => {
    await page.goto('/#/escalas');
    await page.getByRole('button', { name: '¿Qué estudio hoy?' }).click();
    const first = await page.getByRole('heading', { level: 3 }).first().innerText();
    expect(first.length).toBeGreaterThan(3);
    await page.getByRole('button', { name: /Salió limpio/ }).click();
    await page.getByRole('button', { name: '¿Qué estudio hoy?' }).click();
    // lo recién marcado ya no es lo menos trabajado
    await expect(page.getByText(/1\/12 tonalidades marcadas/)).toHaveCount(0);
  });

  test('suena con metrónomo y cuenta previa, se repite y se corta al cambiar el tempo', async ({ page }) => {
    await page.goto('/#/escalas');
    await expect(page.getByLabel('Metrónomo (2 y 4)')).toBeChecked();
    await expect(page.getByLabel('Cuenta de 4')).toBeChecked();
    await page.getByLabel('Repetir').check();
    await page.getByLabel(/Tempo \(negra\)/).fill('120');
    await page.getByRole('button', { name: /Oírla en trompeta/ }).click();
    await expect(page.getByRole('button', { name: /Detener/ })).toBeVisible();
    await page.waitForTimeout(2500);
    // sigue sonando (repite) y cambiar el tempo la corta
    await expect(page.getByRole('button', { name: /Detener/ })).toBeVisible();
    await page.getByLabel(/Tempo \(negra\)/).fill('100');
    await expect(page.getByRole('button', { name: /Oírla en trompeta/ })).toBeVisible();
  });

  test('sin repetir, termina sola', async ({ page }) => {
    await page.goto('/#/escalas');
    await page.getByLabel('Cuenta de 4').uncheck();
    await page.getByLabel(/Tempo \(negra\)/).fill('200');
    await page.getByRole('button', { name: /Oírla en trompeta/ }).click();
    await expect(page.getByRole('button', { name: /Oírla en trompeta/ })).toBeVisible({ timeout: 15_000 });
  });

  test('suena con la trompeta de la app, se puede detener y no hay desborde en el celular', async ({ page }) => {
    await page.goto('/#/escalas');
    await page.getByRole('button', { name: /Oírla en trompeta/ }).click();
    await expect(page.getByRole('button', { name: /Detener/ })).toBeVisible();
    await page.getByRole('button', { name: /Detener/ }).click();
    await expect(page.getByRole('button', { name: /Oírla en trompeta/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: process.env.SHOT ?? 'test-results/escalas.png', fullPage: true });
  });

  test('el plan de Hoy incluye la escala del día y su enlace abre esa escala', async ({ page }) => {
    await page.goto('/#/hoy');
    const bloque = page.locator('article.block', { hasText: 'Escala del día' });
    await expect(bloque).toBeVisible();
    const titulo = (await bloque.getByRole('heading').innerText()).replace('Escala del día: ', '');
    await bloque.getByRole('link', { name: /Estudiar la escala/ }).click();
    await expect(page.getByRole('heading', { name: titulo, exact: true }).first()).toBeVisible();
    await expect(page.locator('ol.steppath button.on')).toHaveCount(1);
  });
});
