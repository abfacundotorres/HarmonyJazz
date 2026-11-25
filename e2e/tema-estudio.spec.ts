import { expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Un tema a la vez: el tema en estudio se fija desde el Play-along, aparece arriba de Hoy con lo que sigue y el Play-along abre en él.
const guardado = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:temaestudio') ?? 'null'));
const tarjeta = (page: Page) => page.getByRole('region', { name: 'Tema en estudio' });
const desde = (page: Page, datos: Record<string, unknown>) =>
  page.addInitScript((d) => { for (const [k, v] of Object.entries(d)) localStorage.setItem('harmonyjazz:' + k, JSON.stringify(v)); }, datos);

test('se fija desde el Play-along y Hoy lo muestra con su próximo paso, con atajos para tocarlo y estudiarlo', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  await page.waitForSelector('.player');
  const fijar = page.getByRole('button', { name: /Estudiar este tema ahora/ });
  await expect(fijar).toHaveAttribute('aria-pressed', 'false');
  await fijar.click();
  await expect(page.getByRole('button', { name: /Es tu tema en estudio/ })).toHaveAttribute('aria-pressed', 'true');
  expect(await guardado(page)).toEqual({ id: 'ii-v-i' });

  await page.goto('/#/hoy');
  await expect(tarjeta(page)).toBeVisible();
  await expect(tarjeta(page)).toContainText('ii–V–I');
  await expect(tarjeta(page)).toContainText('Próximo paso: La forma');
  await expect(tarjeta(page)).toContainText('0 de 7 hechos');

  await tarjeta(page).getByRole('link', { name: 'Estudiarlo' }).click();
  await expect(page).toHaveURL(/#\/playalong\?p=ii-v-i&estudio=1/);
  await expect(page.locator('details.estudio-tema')).toHaveAttribute('open', '');

  await page.goto('/#/hoy');
  await tarjeta(page).getByRole('link', { name: 'Tocarlo' }).click();
  await expect(page).toHaveURL(/#\/playalong\?p=ii-v-i$/);
});

test('con la escalera empezada muestra el próximo paso y los compases flojos', async ({ page }) => {
  await desde(page, { temaestudio: { id: 'ii-v-i' }, repertorio: { 'ii-v-i': { hechos: [0, 1], ultimo: 20000, inicio: 19990 } }, flojos: { 'ii-v-i': [1, 2] } });
  await page.goto('/#/hoy');
  await expect(tarjeta(page)).toContainText('Próximo paso: Guide tones');
  await expect(tarjeta(page)).toContainText('2 de 7 hechos');
  await expect(tarjeta(page)).toContainText('2 compases flojos marcados');
});

test('el Play-along sin tema pedido abre el que se está estudiando, y se puede dejar de estudiarlo', async ({ page }) => {
  await desde(page, { temaestudio: { id: 'blues-f' } });
  await page.goto('/#/playalong');
  await page.waitForSelector('.player');
  await expect(page.getByLabel('Tema').locator('option:checked')).toContainText('Blues');
  await expect(page.getByRole('button', { name: /Es tu tema en estudio/ })).toBeVisible();

  await page.goto('/#/hoy');
  await tarjeta(page).getByRole('button', { name: 'Dejar de estudiarlo' }).click();
  await expect(tarjeta(page)).toHaveCount(0);
  expect(await guardado(page)).toEqual({});
});

test('sin tema en estudio no hay tarjeta; si el tema ya no existe se puede quitar sin romper nada', async ({ page }) => {
  await page.goto('/#/hoy');
  await expect(page.locator('.hero')).toBeVisible();
  await expect(tarjeta(page)).toHaveCount(0);

  await desde(page, { temaestudio: { id: 'u:ya-no-esta' } });
  await page.goto('/#/playalong'); // vuelve a cargar con el dato
  await page.reload();
  await page.waitForSelector('.player'); // el Play-along abre en el tema de siempre
  await page.goto('/#/hoy');
  await expect(tarjeta(page)).toContainText('ya no está en tu lista');
  await tarjeta(page).getByRole('button', { name: 'Quitarlo' }).click();
  await expect(tarjeta(page)).toHaveCount(0);
});
