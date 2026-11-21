import { expect, test } from './helpers';

// Temas de dominio público: una categoría aparte en el Play-along, con aviso de que son armonizaciones propias sin verificar.
test.describe('temas de dominio público', () => {
  test('están en su propia categoría y cada uno avisa que no está verificado', async ({ page }) => {
    await page.goto('/#/playalong');
    const grupo = page.locator('select[aria-label="Tema"] optgroup[label="Dominio público"]');
    await expect(grupo.locator('option')).toHaveText(['When the Saints Go Marching In', 'Down by the Riverside', 'Swing Low, Sweet Chariot', 'Amazing Grace']);
    await page.goto('/#/playalong?p=dp-saints');
    await expect(page.locator('.board .bar')).toHaveCount(16);
    await expect(page.getByText(/SIN VERIFICAR/)).toBeVisible();
    await expect(page.getByText(/Sin melodía ni letra/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar a Mis temas' })).toBeVisible();
  });

  test('Amazing Grace es un tema en 3/4 y suena como tal', async ({ page }) => {
    await page.goto('/#/playalong?p=dp-grace');
    await expect(page.locator('.board .bar')).toHaveCount(16);
    await expect(page.locator('.player-note', { hasText: 'Compás de 3/4' })).toBeVisible();
  });

  test('«Copiar a Mis temas» lo vuelve tuyo, una sola vez, y entra en Mi repertorio', async ({ page }) => {
    await page.goto('/#/playalong?p=dp-riverside');
    await page.getByRole('button', { name: 'Copiar a Mis temas' }).click();
    await expect(page.getByText(/«Down by the Riverside» copiado a Mis temas/)).toBeVisible();
    const t = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ name: 'Down by the Riverside', composer: 'Tradicional', key: 'F', mode: 'major', style: 'swing' });
    expect(t[0].melody).toBeUndefined();
    // copiarlo de nuevo no lo duplica
    await page.getByRole('button', { name: 'Copiar a Mis temas' }).click();
    await expect(page.getByText(/ya está en Mis temas/)).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:library')!).tunes.length)).toBe(1);
    // aparece en Mi repertorio con su escalera
    await page.goto('/#/repertorio');
    await expect(page.getByRole('region', { name: 'Down by the Riverside' })).toBeVisible();
  });

  test('los créditos dicen qué es de dominio público y que es una armonización sin verificar', async ({ page }) => {
    await page.goto('/#/creditos');
    const sec = page.locator('#dominio-publico');
    await expect(sec).toContainText('Temas de dominio público');
    await expect(sec).toContainText('sin verificar');
    await expect(sec.locator('li')).toHaveCount(4);
  });
});
