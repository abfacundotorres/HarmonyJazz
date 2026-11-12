import { expect, testLoose as test } from './helpers';

/** Datos guardados dañados (copia ajena, otra versión, edición a mano) no deben dejar la app en blanco. */
const BAD: Record<string, string[]> = {
  settings: ['null', '5', '"x"', '{"minutes":"a","view":7,"register":null,"volume":"x"}', '{"volume":null,"swing":"x"}'],
  log: ['{"2026-11-12":5}', '[]', '{"2026-11-12":{"done":5}}'],
  mastery: ['"x"', '{"a":{"b":"c"}}', '{"a":5}'],
  library: ['{"tunes":5}', '{"tunes":[null,1,{"name":3}]}', 'null'],
  phrases: ['{"phrases":"x"}', '{"phrases":[{"id":1}]}', '[]'],
  atril: ['{"size":"a"}', '5'],
};

test('ningún dato guardado dañado rompe una pantalla', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const broken: string[] = [];
  for (const [key, values] of Object.entries(BAD)) {
    for (const v of values) {
      await page.evaluate(([k, val]) => {
        const keep = localStorage.getItem('hj:acceso');
        localStorage.clear();
        if (keep) localStorage.setItem('hj:acceso', keep);
        localStorage.setItem('harmonyjazz:' + k, val);
      }, [key, v]);
      await page.reload();
      for (const r of ['#/hoy', '#/playalong', '#/vocabulario', '#/lecciones']) {
        errors.length = 0;
        await page.evaluate((h) => (location.hash = h), r);
        await page.waitForTimeout(150);
        if (!(await page.locator('nav').count()) || errors.length) broken.push(`${key}=${v} en ${r} ${errors[0] ?? ''}`);
      }
    }
  }
  expect(broken).toEqual([]);
});

test('si una pantalla falla, se muestra un recuadro de recuperación en lugar de la pantalla en blanco', async ({ page }) => {
  await page.goto('/#/hoy');
  await page.evaluate(() => localStorage.setItem('harmonyjazz:mastery', JSON.stringify({ 'lesson:x': { C: 130 } })));
  await page.reload();
  const sel = page.getByLabel('Duración de la sesión');
  await expect(sel).toBeVisible();
  // se provoca un error de dibujado: una función que usa la pantalla empieza a fallar
  await page.evaluate(() => {
    Date.prototype.getFullYear = function () {
      throw new Error('falla de prueba');
    };
  });
  await sel.selectOption('30');
  await expect(page.getByText('Algo falló en esta pantalla')).toBeVisible();
  await expect(page.getByText('falla de prueba')).toBeVisible();
  // la copia de rescate conserva los datos
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Bajar una copia de mis datos' }).click()]);
  const text = (await (await dl.createReadStream()).toArray()).join('');
  expect(text).toContain('lesson:x');
  // borrar es opcional y pide confirmación: cancelada, no se pierde nada
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: /Borrar los datos de la app/ }).click();
  expect(await page.evaluate(() => !!localStorage.getItem('harmonyjazz:mastery'))).toBe(true);
});

test('si el almacenamiento está lleno, se avisa que lo último no quedó guardado', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Storage.prototype.setItem;
    (window as unknown as { __lleno: boolean }).__lleno = false;
    Storage.prototype.setItem = function (k: string, v: string) {
      if ((window as unknown as { __lleno: boolean }).__lleno && k.startsWith('harmonyjazz:')) throw new DOMException('cuota', 'QuotaExceededError');
      return orig.call(this, k, v);
    };
  });
  await page.goto('/#/hoy');
  const sel = page.getByLabel('Duración de la sesión');
  await sel.selectOption('90');
  await expect(page.locator('.updatebar.warn')).toHaveCount(0);
  await page.evaluate(() => ((window as unknown as { __lleno: boolean }).__lleno = true));
  await sel.selectOption('45');
  await expect(page.locator('.updatebar.warn')).toContainText('No se pudo guardar');
  await expect(page.locator('nav')).toBeVisible();
});
