import { expect, test as base } from '@playwright/test';

// sin desbloquear: se prueba la pantalla de contraseña
base.describe('contraseña de acceso', () => {
  base('una contraseña incorrecta no deja entrar', async ({ page }) => {
    await page.goto('/');
    await page.fill('#gate-pw', 'contraseña-incorrecta');
    await page.click('button[type=submit]');
    await expect(page.getByText('Contraseña incorrecta.')).toBeVisible();
    await expect(page.locator('nav')).toHaveCount(0);
  });

  base('con la contraseña correcta se entra y queda recordada', async ({ page }) => {
    const pw = process.env.HJ_PASSWORD;
    base.skip(!pw, 'la contraseña no está en el repositorio: se pasa con HJ_PASSWORD');
    await page.goto('/');
    await page.fill('#gate-pw', pw!);
    await page.click('button[type=submit]');
    await expect(page.locator('nav')).toBeVisible();
    await page.reload();
    await expect(page.locator('nav')).toBeVisible();
  });

  base('el botón de entrar está desactivado con el campo vacío', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button[type=submit]')).toBeDisabled();
  });
});
