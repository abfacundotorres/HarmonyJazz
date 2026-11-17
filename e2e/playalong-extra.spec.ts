import { expect, test } from './helpers';

test('acelerar solo: cada vuelta sube lo pedido y la pantalla dice a cuánto suena', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  const player = page.locator('.player').first();
  await player.locator('summary', { hasText: 'Más' }).click();
  await page.getByLabel('Cuenta de 4').uncheck();
  await page.getByLabel('Acelerar solo').check();
  // los campos aceptan escribir el número entero (no saltan a un mínimo a mitad de camino)
  const hasta = page.getByLabel('Máximo al que llega, en bpm');
  await hasta.fill('1');
  await expect(hasta).toHaveValue('1');
  await hasta.fill('135');
  await hasta.press('Enter');
  await page.getByLabel('Cuánto sube, en bpm').fill('10');
  await page.getByLabel('Cuánto sube, en bpm').press('Enter');
  await page.getByLabel('Cada cuántas vueltas sube').fill('1');
  await page.getByLabel('Cada cuántas vueltas sube').press('Enter');
  await expect(hasta).toHaveValue('135');
  await page.getByRole('button', { name: 'Reproducir' }).click();
  await expect(player.getByText(/sonando a/)).toHaveCount(0);
  // ii–V–I = 4 compases a 120 bpm = 8 s por vuelta: la segunda vuelta suena a 130 y la tercera se frena en el máximo (135)
  await expect(player.getByText('sonando a')).toBeVisible({ timeout: 25_000 });
  await expect(player.locator('b', { hasText: '130' })).toBeVisible();
  await page.getByRole('button', { name: 'Detener' }).click();
});

test('al oír la línea de un ejercicio, la partitura resalta la nota que suena y lo deja de hacer al parar', async ({ page }) => {
  await page.goto('/#/lecciones/guide-tones');
  const card = page.locator('section.exercise').first();
  await card.getByRole('button', { name: 'Oír la línea' }).click();
  await card.getByRole('button', { name: 'Reproducir' }).click();
  await expect(card.locator('.paper .hj-note')).toHaveCount(1, { timeout: 15_000 });
  const first = await card.locator('.paper .hj-note').evaluate((n) => [...(n.closest('svg')?.querySelectorAll('.abcjs-note') ?? [])].indexOf(n));
  // cambia de nota mientras suena
  await expect.poll(async () => card.locator('.paper .hj-note').evaluate((n) => [...(n.closest('svg')?.querySelectorAll('.abcjs-note') ?? [])].indexOf(n)), { timeout: 15_000 }).not.toBe(first);
  await card.getByRole('button', { name: 'Detener' }).click();
  await expect(card.locator('.paper .hj-note')).toHaveCount(0);
});

test('sin oír la línea no se resalta ninguna nota', async ({ page }) => {
  await page.goto('/#/lecciones/guide-tones');
  const card = page.locator('section.exercise').first();
  await card.getByRole('button', { name: 'Reproducir' }).click();
  await page.waitForTimeout(3500);
  await expect(card.locator('.paper .hj-note')).toHaveCount(0);
  await card.getByRole('button', { name: 'Detener' }).click();
});

test('el estilo Latin suena (clave, tumbao y montuno) y se puede elegir en el reproductor', async ({ page }) => {
  await page.goto('/#/playalong?p=ii-v-i');
  await page.getByLabel('Estilo', { exact: true }).first().selectOption({ label: 'Latin (clave y montuno)' });
  await page.getByRole('button', { name: 'Reproducir' }).click();
  await expect(page.getByRole('button', { name: 'Detener' })).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByRole('button', { name: 'Detener' })).toBeVisible();
  await page.getByRole('button', { name: 'Detener' }).click();
});
