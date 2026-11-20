import { expect, test } from './helpers';

const TEMA = { id: 'u:hoja', name: 'Hojas de otoño', composer: '', key: 'C', mode: 'major', chart: 'Dm7 | G7 | Cmaj7 | Cmaj7', tempo: 120, style: 'swing' };
const guardado = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes[0]);

test.describe('melodía de un tema propio', () => {
  test.beforeEach(async ({ page }) => {
    // el tema se carga sólo la primera vez: al recargar tiene que quedar lo guardado
    await page.addInitScript((t) => { if (!localStorage.getItem('harmonyjazz:library')) localStorage.setItem('harmonyjazz:library', JSON.stringify({ tunes: [t] })); }, TEMA);
  });

  test('se agrega con el cuadro de notas, se ve en el pentagrama y activa «Oír la línea» en el reproductor', async ({ page }) => {
    await page.goto('/#/playalong?p=u:hoja');
    const panel = page.getByRole('region', { name: 'Melodía del tema' });
    await expect(panel).toContainText('La app no trae melodías');
    await expect(page.getByRole('button', { name: 'Oír la línea' })).toHaveCount(0);
    await panel.getByRole('button', { name: 'Agregar la melodía' }).click();
    // se escribe en Si♭ (la lectura de la trompeta): en concierto queda un tono abajo
    await expect(panel.getByRole('button', { name: /Escribo para trompeta/ })).toHaveClass(/on/);
    await panel.getByLabel('Notas').fill('E4 G4 B4 D5 | C5:2 A4:2 | r:8 | r:8');
    await expect(panel.locator('.paper svg')).toBeVisible();
    await panel.getByRole('button', { name: 'Guardar la melodía' }).click();
    await expect(panel.getByRole('button', { name: 'Editar la melodía' })).toBeVisible();
    await expect(panel.locator('.paper svg .abcjs-note').first()).toBeVisible();
    expect((await guardado(page)).melody).toBe('D4 F4 A4 C5 Bb4:2 G4:2 r:8 r:8');
    await expect(page.getByRole('button', { name: 'Oír la línea' })).toBeVisible();
    // se conserva al recargar
    await page.reload();
    await expect(page.getByRole('region', { name: 'Melodía del tema' }).locator('.paper svg')).toBeVisible();
  });

  test('una melodía que no cabe en el tema o no se entiende avisa y no se guarda', async ({ page }) => {
    await page.goto('/#/playalong?p=u:hoja');
    const panel = page.getByRole('region', { name: 'Melodía del tema' });
    await panel.getByRole('button', { name: 'Agregar la melodía' }).click();
    await panel.getByLabel('Notas').fill('D4:8 D4:8 D4:8 D4:8 D4:8');
    await expect(panel.getByRole('status')).toContainText('ocupa 5 compases y el tema tiene 4');
    await panel.getByLabel('Notas').fill('H4 J2');
    await expect(panel.getByRole('status')).toContainText('Notas:');
    await panel.getByRole('button', { name: 'Guardar la melodía' }).click();
    await expect(panel.getByRole('alert')).toBeVisible();
    expect((await guardado(page)).melody).toBeUndefined();
    await panel.getByRole('button', { name: 'Cancelar' }).click();
    await expect(panel.getByRole('button', { name: 'Agregar la melodía' })).toBeVisible();
  });

  test('se edita y se borra', async ({ page }) => {
    await page.addInitScript(() => {
      const l = JSON.parse(localStorage.getItem('harmonyjazz:library')!);
      if (!l.tunes[0].melody && !localStorage.getItem('hj:test-melodia')) {
        l.tunes[0].melody = 'D4 F4 A4 C5';
        localStorage.setItem('harmonyjazz:library', JSON.stringify(l));
        localStorage.setItem('hj:test-melodia', '1');
      }
    });
    await page.goto('/#/playalong?p=u:hoja');
    const panel = page.getByRole('region', { name: 'Melodía del tema' });
    await panel.getByRole('button', { name: 'Editar la melodía' }).click();
    await expect(panel.getByLabel('Notas')).toHaveValue('D4 F4 A4 C5');
    await panel.getByLabel('Notas').fill('D4 F4 A4 C5 E5:2');
    await panel.getByRole('button', { name: 'Guardar la melodía' }).click();
    expect((await guardado(page)).melody).toBe('D4 F4 A4 C5 E5:2');
    await panel.getByRole('button', { name: 'Editar la melodía' }).click();
    await panel.getByRole('button', { name: 'Borrar la melodía' }).click();
    expect((await guardado(page)).melody).toBeUndefined();
    await expect(panel.getByRole('button', { name: 'Agregar la melodía' })).toBeVisible();
  });

  test('los temas incluidos no tienen panel de melodía, y no se desborda en el celular', async ({ page }) => {
    await page.goto('/#/playalong?p=blues-f');
    await expect(page.getByRole('region', { name: 'Melodía del tema' })).toHaveCount(0);
    await page.goto('/#/playalong?p=u:hoja');
    await page.getByRole('button', { name: 'Agregar la melodía' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
