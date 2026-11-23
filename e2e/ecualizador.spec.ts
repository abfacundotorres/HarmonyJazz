import { expect, sinAtrilAutomatico, test } from './helpers';

// Mezcla y ecualizador: volumen y graves/medios/agudos por instrumento; se guardan y se pueden restablecer.
test('el ecualizador guarda la mezcla de cada instrumento, sobrevive a recargar y se restablece', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  const player = page.locator('.player').first();
  await player.locator('summary', { hasText: 'Más' }).click();
  const eq = player.locator('details.eq');
  await eq.locator('summary').click();
  await expect(eq.locator('summary')).not.toContainText('modificada');

  await eq.getByRole('button', { name: 'Bajo' }).click();
  await eq.getByLabel('Graves de Bajo').fill('6');
  await eq.getByRole('button', { name: 'Batería' }).click();
  await eq.getByLabel('Volumen de Batería').fill('-8');
  await expect(eq.locator('summary')).toContainText('modificada');
  const guardado = () => page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:settings')!).mixer);
  await expect.poll(guardado).toMatchObject({ bass: { low: 6, vol: 0 }, drums: { vol: -8 }, piano: { vol: 0, low: 0 } });

  await page.reload();
  await player.locator('summary', { hasText: 'Más' }).click();
  await eq.locator('summary').click();
  await eq.getByRole('button', { name: 'Bajo' }).click();
  await expect(eq.getByLabel('Graves de Bajo')).toHaveValue('6');

  await eq.getByRole('button', { name: 'Restablecer bajo' }).click();
  await expect(eq.getByLabel('Graves de Bajo')).toHaveValue('0');
  await eq.getByRole('button', { name: 'Restablecer todo' }).click();
  await expect(eq.locator('summary')).not.toContainText('modificada');
});

test('una mezcla guardada dañada no rompe la pantalla y vuelve a plana', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('harmonyjazz:settings', JSON.stringify({ mixer: { piano: { vol: 'x', low: 99 }, bass: 7, nada: 1 } })));
  await page.goto('/#/playalong?p=ii-v-i');
  const player = page.locator('.player').first();
  await player.locator('summary', { hasText: 'Más' }).click();
  await player.locator('details.eq > summary').click();
  await expect(player.getByLabel('Graves de Piano')).toHaveValue('12'); // 99 se recorta al máximo
  await expect(player.getByLabel('Volumen de Piano')).toHaveValue('0'); // lo que no es número queda plano
});

test('suena sin errores con la mezcla modificada y se puede mover en vivo', async ({ page }) => {
  await sinAtrilAutomatico(page);
  await page.goto('/#/playalong?p=ii-v-i');
  const player = page.locator('.player').first();
  await player.locator('summary', { hasText: 'Más' }).click();
  await player.locator('details.eq > summary').click();
  await player.locator('details.eq').getByRole('button', { name: 'General' }).click();
  await player.getByLabel('Agudos de General').fill('-6');
  await player.getByRole('button', { name: 'Reproducir' }).click();
  await expect(page.getByRole('region', { name: 'Play-along sonando' })).toBeVisible();
  await player.locator('details.eq').getByRole('button', { name: 'Piano' }).click();
  await player.getByLabel('Volumen de Piano').fill('-12');
  await player.getByLabel('Medios de Piano').fill('5');
  await page.waitForTimeout(600);
  await player.getByRole('button', { name: 'Detener' }).click();
});
