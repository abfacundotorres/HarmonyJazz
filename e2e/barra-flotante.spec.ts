import { expect, irA, sinAtrilAutomatico, test } from './helpers';

// Barra flotante: mientras suena el play-along hay pausa/seguir y stop en cualquier pantalla, y el tema sigue sonando.
test.beforeEach(async ({ page }) => {
  await sinAtrilAutomatico(page);
});

test('el play-along sigue sonando al cambiar de pantalla y se maneja desde la barra', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  const barra = page.getByRole('region', { name: 'Play-along sonando' });
  await expect(barra).toHaveCount(0); // sin nada sonando, no hay barra
  await page.getByRole('button', { name: 'Reproducir' }).click();
  await expect(barra).toBeVisible();
  await expect(barra).toContainText('ii–V–I');

  await irA(page, 'Escalas');
  await expect(barra).toBeVisible(); // sigue sonando en otra pantalla
  await barra.getByRole('button', { name: 'Pausar el play-along' }).click();
  await expect(barra).toContainText('en pausa');
  await barra.getByRole('button', { name: 'Seguir el play-along' }).click();
  await expect(barra).not.toContainText('en pausa');

  // volver con «Abrir»: el reproductor sigue marcado como sonando, con el mismo tema
  await barra.getByRole('link', { name: 'Abrir' }).click();
  await expect(page.locator('.player').first().getByRole('button', { name: 'Detener' })).toBeVisible();
  await expect(barra.getByRole('link', { name: 'Abrir' })).toHaveCount(0);

  // pausa desde el propio reproductor y stop desde la barra
  await page.locator('.player').first().getByRole('button', { name: 'Pausa' }).click();
  await expect(barra).toContainText('en pausa');
  await barra.getByRole('button', { name: 'Parar el play-along' }).click();
  await expect(barra).toHaveCount(0);
  await expect(page.locator('.player').first().getByRole('button', { name: 'Reproducir' })).toBeVisible();
});

test('otra pantalla que suena por su cuenta corta el play-along y la barra desaparece', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  await page.getByRole('button', { name: 'Reproducir' }).click();
  const barra = page.getByRole('region', { name: 'Play-along sonando' });
  await expect(barra).toBeVisible();
  await irA(page, 'Metrónomo');
  await expect(barra).toBeVisible(); // abrir el metrónomo no corta el play-along
  await page.getByRole('button', { name: 'Empezar' }).click(); // el metrónomo toma el motor
  await expect(barra).toHaveCount(0);
});
