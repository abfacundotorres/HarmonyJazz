import { abrirEstudio, expect, test } from './helpers';
import type { Page } from '@playwright/test';

// Loop por sección y compases flojos del Play-along, con un tema inventado de dos secciones.
const TEMA = {
  id: 'u:flojotema',
  name: 'Tema con secciones',
  composer: '',
  key: 'C',
  mode: 'major',
  chart: 'Dm7 | G7 | Cmaj7 | A7 | Dm7 | G7',
  tempo: 120,
  style: 'swing',
  doc: { bars: [{ chords: ['Dm7'], section: 'A' }, { chords: ['G7'] }, { chords: ['Cmaj7'], section: 'B' }, { chords: ['A7'] }, { chords: ['Dm7'] }, { chords: ['G7'] }] },
};
const conTema = (page: Page) => page.addInitScript((t) => localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })), TEMA);
const compas = (page: Page, n: number) => page.locator('.card .board .bar').nth(n - 1);
const guardados = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:flojos') ?? 'null'));

test.describe('loop por sección y compases flojos', () => {
  test('un botón por sección deja esa sección en loop', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/playalong?p=u:flojotema');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await page.getByRole('button', { name: /Loop de la sección B/ }).click();
    await expect(page.locator('.loopbar')).toContainText('compases 3–6');
    await page.getByRole('button', { name: /Loop de la sección A/ }).click();
    await expect(page.locator('.loopbar')).toContainText('compases 1–2');
  });

  test('un tema sin secciones no muestra el loop por sección', async ({ page }) => {
    await page.goto('/#/playalong?p=ii-v-i');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await expect(page.getByRole('group', { name: 'Loop por sección' })).toHaveCount(0);
  });

  test('se marcan compases flojos, se guardan y se practican de a un tramo', async ({ page }) => {
    await conTema(page);
    await page.goto('/#/playalong?p=u:flojotema');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await page.getByRole('button', { name: 'Marcar compases flojos' }).click();
    await compas(page, 2).click();
    await compas(page, 3).click();
    await compas(page, 6).click();
    await expect(page.locator('.board .bar.floja')).toHaveCount(3);
    await expect(page.locator('.loopbar')).not.toContainText('Inicio'); // en este modo no arma loops
    await page.getByRole('button', { name: 'Listo' }).click();
    await expect.poll(() => guardados(page)).toEqual({ 'u:flojotema': [1, 2, 5] });

    await page.getByRole('button', { name: 'Practicar el siguiente tramo flojo' }).click();
    await expect(page.locator('.loopbar')).toContainText('compases 2–3');
    await page.getByRole('button', { name: 'Practicar el siguiente tramo flojo' }).click();
    await expect(page.locator('.loopbar')).toContainText('compases 6–6');
    await page.getByRole('button', { name: 'Practicar el siguiente tramo flojo' }).click();
    await expect(page.locator('.loopbar')).toContainText('compases 2–3'); // da la vuelta

    // al volver, las marcas siguen ahí
    await page.reload();
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await expect(page.locator('.board .bar.floja')).toHaveCount(3);

    // volver a tocar un compás marcado lo desmarca
    await page.getByRole('button', { name: 'Marcar compases flojos' }).click();
    await compas(page, 6).click();
    await expect(page.locator('.board .bar.floja')).toHaveCount(2);
    await expect.poll(() => guardados(page)).toEqual({ 'u:flojotema': [1, 2] });
  });

  test('borrar las marcas pide confirmación y las quita', async ({ page }) => {
    await conTema(page);
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:flojos', JSON.stringify({ 'u:flojotema': [0, 1] })));
    await page.goto('/#/playalong?p=u:flojotema');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await expect(page.locator('.board .bar.floja')).toHaveCount(2);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Borrar marcas' }).click();
    await expect(page.locator('.board .bar.floja')).toHaveCount(0);
    await expect.poll(() => guardados(page)).toEqual({});
  });

  test('un dato guardado dañado no rompe la pantalla', async ({ page }) => {
    await conTema(page);
    await page.addInitScript(() => localStorage.setItem('harmonyjazz:flojos', '{"u:flojotema":"x","otro":[1.5,-3,999]}'));
    await page.goto('/#/playalong?p=u:flojotema');
    await page.waitForSelector('.board');
    await abrirEstudio(page);
    await expect(page.locator('.board .bar.floja')).toHaveCount(0);
  });
});
