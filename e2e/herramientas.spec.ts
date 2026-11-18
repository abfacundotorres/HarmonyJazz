import { expect, test } from './helpers';

test.describe('metrónomo', () => {
  test('arranca, marca los pulsos en pantalla y se detiene', async ({ page }) => {
    await page.goto('/#/metronomo');
    await expect(page.getByRole('heading', { name: 'Metrónomo' }).first()).toBeVisible();
    await page.getByLabel('Tempo', { exact: true }).fill('240');
    await page.getByLabel('Tempo', { exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.getByText(/Compás 1 · 240 bpm/)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.beats i.now')).toHaveCount(1);
    await page.getByRole('button', { name: 'Parar' }).click();
    await expect(page.getByText('Detenido')).toBeVisible();
  });

  test('los ajustes se recuerdan y los compases en silencio se avisan en pantalla', async ({ page }) => {
    await page.goto('/#/metronomo');
    await page.getByLabel('Pulsos por compás').fill('3');
    await page.getByLabel('Pulsos por compás').press('Enter');
    await page.getByLabel('Subdivisión').selectOption('3');
    await expect(page.locator('.beats i')).toHaveCount(3);
    await page.getByText('Para exigirte').click();
    await page.getByLabel(/Compases en silencio \(el pulso/).check();
    await page.getByLabel('Compases que suenan').fill('1');
    await page.getByLabel('Compases que suenan').press('Enter');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:metro')!))).toMatchObject({ beats: 3, sub: 3, silenceOn: true, play: 1 });
    await page.getByLabel('Tempo', { exact: true }).fill('300');
    await page.getByLabel('Tempo', { exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.getByText(/en silencio: seguí vos/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Parar' }).click();
    await page.reload();
    await expect(page.locator('.beats i')).toHaveCount(3);
    await expect(page.getByLabel('Subdivisión')).toHaveValue('3');
  });

  test('la pesa del péndulo cambia el tempo con el teclado y el nombre italiano acompaña', async ({ page }) => {
    await page.goto('/#/metronomo');
    const pesa = page.getByRole('slider', { name: /Pesa del metrónomo/ });
    await page.getByLabel('Tempo', { exact: true }).fill('100');
    await page.getByLabel('Tempo', { exact: true }).press('Enter');
    await expect(pesa).toHaveAttribute('aria-valuenow', '100');
    await expect(page.locator('.pend-tempo')).toContainText('Andante');
    await pesa.focus();
    await page.keyboard.press('PageUp');
    await expect(pesa).toHaveAttribute('aria-valuenow', '110');
    await page.keyboard.press('ArrowDown');
    await expect(pesa).toHaveAttribute('aria-valuenow', '109');
    await expect(page.getByLabel('Tempo', { exact: true })).toHaveValue('109');
  });

  test('arrastrar la pesa cambia el tempo y el péndulo se mueve al sonar', async ({ page }) => {
    await page.goto('/#/metronomo');
    const pesa = page.getByRole('slider', { name: /Pesa del metrónomo/ });
    const before = Number(await pesa.getAttribute('aria-valuenow'));
    const box = (await pesa.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60, { steps: 6 });
    await page.mouse.up();
    expect(Number(await pesa.getAttribute('aria-valuenow'))).toBeGreaterThan(before);
    await page.getByLabel('Tempo', { exact: true }).fill('120');
    await page.getByLabel('Tempo', { exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.getByText(/Compás 1/)).toBeVisible({ timeout: 10_000 });
    const rot = async () => (await page.locator('svg.pendulum g[transform^="rotate"]').getAttribute('transform')) ?? '';
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      seen.add(await rot());
      await page.waitForTimeout(90);
    }
    expect(seen.size).toBeGreaterThan(2);
    await page.getByRole('button', { name: 'Parar' }).click();
  });

  test('el botón del aparato empieza y para, y "Mi sonido" se arma con las perillas y se recuerda', async ({ page }) => {
    await page.goto('/#/metronomo');
    const play = page.locator('.pend-play');
    await expect(play).toBeVisible();
    await expect(play).toHaveAttribute('aria-label', 'Empezar');
    await play.click();
    await expect(play).toHaveAttribute('aria-label', 'Parar');
    await expect(page.getByText(/Compás 1/)).toBeVisible({ timeout: 10_000 });
    await play.click();
    await expect(play).toHaveAttribute('aria-label', 'Empezar');
    await page.getByText('Crear mi sonido').click();
    await page.getByLabel('Punto de partida').selectOption('Madera grave (caja)');
    await expect(page.getByLabel('Sonido')).toHaveValue('custom');
    const altura = page.getByLabel(/^Altura/);
    await altura.fill('700');
    await expect(page.getByText('700 Hz')).toBeVisible();
    await page.getByRole('button', { name: 'Probar el fuerte' }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:metro')!))).toMatchObject({ sound: 'custom', custom: { pitch: 700, wood: 1 } });
    await page.reload();
    await page.getByText('Crear mi sonido').click();
    await expect(page.getByText('700 Hz')).toBeVisible();
  });

  test('la voz grabada de un metrónomo mecánico se carga y suena, y "Mi sonido" puede mezclarla', async ({ page }) => {
    const ticks = page.waitForResponse((r) => r.url().endsWith('/samples/metronome/ticks.wav'));
    await page.goto('/#/metronomo');
    await page.getByLabel('Sonido').selectOption('real');
    await page.getByText('Crear mi sonido').click();
    await page.getByRole('button', { name: 'Probar el pulso' }).click();
    const res = await ticks;
    expect(res.status()).toBe(200);
    expect((await res.body()).length).toBe(105884);
    await page.getByLabel('Punto de partida').selectOption('Grabación con cuerpo de madera');
    await expect(page.getByLabel('Sonido')).toHaveValue('custom');
    await expect(page.getByLabel(/^Grabación/)).toHaveValue('0.9');
    await page.getByRole('button', { name: 'Probar el fuerte' }).click();
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.getByText(/Compás 1/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Parar' }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:metro')!))).toMatchObject({ sound: 'custom', custom: { real: 0.9 } });
  });

  test('"Marcar el tempo" pide varios toques', async ({ page }) => {
    await page.goto('/#/metronomo');
    await page.getByRole('button', { name: 'Marcar el tempo' }).click();
    await expect(page.getByText('1 toque: seguí marcando')).toBeVisible();
  });
});

test.describe('afinador: bordón, afinación y notas largas guardadas', () => {
  test('la afinación del La se recuerda', async ({ page }) => {
    await page.goto('/#/escucha');
    await page.getByLabel('Afinación del La').selectOption('442');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:settings')!))).toMatchObject({ a4: 442 });
    await page.reload();
    await expect(page.getByLabel('Afinación del La')).toHaveValue('442');
  });

  test('el bordón se enciende y se apaga con la misma nota o con "Parar bordón"', async ({ page }) => {
    await page.goto('/#/escucha');
    const bordon = page.getByText('Bordón (nota sostenida):').locator('..');
    const b = bordon.getByRole('button').first();
    await b.click();
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(bordon.getByRole('button', { name: 'Parar bordón' })).toBeVisible();
    await b.click();
    await expect(b).toHaveAttribute('aria-pressed', 'false');
  });

  test('el historial de notas largas se muestra por día, con la tendencia, y se puede borrar', async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('harmonyjazz:longnotes'))
        localStorage.setItem('harmonyjazz:longnotes', JSON.stringify({ rows: [
          { day: '2026-11-10', midi: 60, secs: 3, spread: 9, offset: 2 },
          { day: '2026-11-10', midi: 62, secs: 4, spread: 7, offset: -1 },
          { day: '2026-11-17', midi: 60, secs: 5, spread: 4, offset: 0 },
        ] }));
    });
    await page.goto('/#/escucha');
    await expect(page.getByRole('heading', { name: 'Tu evolución' })).toBeVisible();
    await expect(page.getByText(/Mejoraste: la dispersión bajó 4\.0 cents/)).toBeVisible();
    const filas = page.locator('section', { has: page.getByRole('heading', { name: 'Tu evolución' }) }).locator('tbody tr');
    await expect(filas).toHaveCount(2);
    await expect(filas.first()).toContainText('17/11');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Borrar historial' }).click();
    await expect(page.getByText(/se guardan solas/)).toBeVisible();
  });
});
