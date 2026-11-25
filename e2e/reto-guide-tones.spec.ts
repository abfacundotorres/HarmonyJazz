import { expect, sinAtrilAutomatico, test } from './helpers';

// Reto de guide tones con micrófono: un casillero por acorde de la forma que pasa de «pendiente» a acierto, fallo o sin tocar a medida que
// cambian los acordes. El micrófono de la prueba es el falso de Chromium (un pitido): no se prueba qué nota oye, sino el recorrido del reto.
test.beforeEach(async ({ page }) => {
  await sinAtrilAutomatico(page);
});

test('con el micrófono encendido hay un casillero por acorde, y al sonar el play-along se van resolviendo', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  await page.waitForSelector('.player');
  await expect(page.locator('.reto-mapa')).toHaveCount(0); // sin micrófono no hay reto
  await page.getByRole('button', { name: 'Activar micrófono' }).click();
  await expect(page.getByRole('button', { name: 'Apagar micrófono' })).toBeVisible();

  const casilleros = page.locator('.reto-mapa .reto');
  await expect(casilleros).toHaveCount(4); // E-7, A7, DΔ7, DΔ7 (escritos para Si♭)
  await expect(casilleros.first()).toContainText('E-7');
  await expect(page.locator('.reto-mapa .reto.pendiente')).toHaveCount(4);
  await expect(page.getByText(/Tocá la 3\.ª o la 7\.ª de cada acorde/)).toBeVisible();

  await page.getByRole('button', { name: 'Reproducir' }).click();
  // al cambiar de acorde se cierra el anterior: pasa a acierto, fallo o «sin tocar», pero deja de estar pendiente
  await expect(page.locator('.reto-mapa .reto.pendiente')).not.toHaveCount(4, { timeout: 25_000 });
  await expect(page.locator('.reto-mapa .reto.ahora')).toHaveCount(1);
  await page.getByRole('button', { name: 'Detener' }).first().click();

  // «Reiniciar» vuelve todo a pendiente
  await page.getByRole('button', { name: 'Reiniciar' }).click();
  await expect(page.locator('.reto-mapa .reto.pendiente')).toHaveCount(4);
});

test('el reto sigue la forma que suena: con un loop de dos compases hay dos casilleros', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  await page.waitForSelector('.board');
  await page.getByRole('button', { name: 'Activar micrófono' }).click();
  await expect(page.locator('.reto-mapa .reto')).toHaveCount(4);
  const compases = page.locator('.board .bar');
  await compases.nth(0).click();
  await compases.nth(1).click();
  await expect(page.locator('.reto-mapa .reto')).toHaveCount(2);
  await expect(page.locator('.reto-mapa .reto').nth(1)).toContainText('A7');
});
