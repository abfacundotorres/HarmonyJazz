import { expect, openBlock, test } from './helpers';

test.describe('Hoy', () => {
  test('abre sin cargar el motor de audio ni las partituras; la partitura llega al abrir un ejercicio', async ({ page }) => {
    // lo que el navegador baja sí o sí para dibujar Hoy: la página, su archivo de entrada y lo que éste importa de forma fija
    const html = await (await page.request.get('/')).text();
    const entry = /src="\.\/(assets\/index-[^"]+\.js)"/.exec(html)![1];
    const code = await (await page.request.get('/' + entry)).text();
    const fixed = [...html.matchAll(/modulepreload[^>]*href="[^"]*\/([^"/]+)"/g), ...code.matchAll(/(?:from|import)\s*"\.\/([^"]+)"/g)].map((m) => m[1]);
    expect(fixed.filter((f) => /^(engine|Notation|PlayAlong|Transcribe|Lessons)-/.test(f))).toEqual([]);
    expect(code.length).toBeLessThan(500_000);

    await page.goto('/#/hoy');
    await expect(page.locator('.hero')).toContainText('Tonalidad del día');
    // el ejercicio de técnica siempre trae pentagrama
    await (await openBlock(page, 'Técnica en la tonalidad del día')).locator('details.exercise summary').first().click();
    await expect(page.locator('details.exercise[open] .paper svg').first()).toBeVisible();
    // las demás pantallas se traen de fondo: se llega a Escalas por el grupo Estudiar
    await page.getByRole('link', { name: 'Estudiar' }).click();
    await page.getByRole('link', { name: 'Escalas' }).click();
    await expect(page.getByRole('heading', { name: 'Estudio de escalas' })).toBeVisible();
  });

  test('el temporizador sigue el reloj aunque la pantalla se apague, y al terminar marca el bloque', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 16, 10, 0, 0) });
    await page.goto('/#/hoy');
    const block = page.locator('article.block').first();
    await block.getByRole('button', { name: /Iniciar el temporizador, quedan 10:00/ }).click();
    await page.clock.runFor(3000);
    await expect(block.getByRole('button', { name: /Pausar el temporizador, quedan 09:5[67]/ })).toBeVisible();
    // 9 minutos sin que corran los temporizadores (pantalla apagada): al volver, el conteo está al día
    await page.clock.fastForward(9 * 60_000);
    await page.clock.runFor(600);
    await expect(block.getByRole('button', { name: /quedan 00:5[567]/ })).toBeVisible();
    await page.clock.fastForward(60_000);
    await page.clock.runFor(600);
    await expect(block.getByLabel('Hecho')).toBeChecked();
    await expect(block.getByRole('button', { name: /Iniciar el temporizador, quedan 00:00/ })).toBeVisible();
    // pausar conserva lo que falta
    const second = page.locator('article.block').nth(1);
    await second.locator('.bhead').click();
    await second.getByRole('button', { name: /Iniciar el temporizador/ }).click();
    await page.clock.runFor(2000);
    await second.getByRole('button', { name: /Pausar el temporizador/ }).click();
    await page.clock.runFor(5000);
    await expect(second.getByRole('button', { name: /Iniciar el temporizador, quedan 04:58/ })).toBeVisible();
  });

  test('si la app queda abierta, al pasar la medianoche el plan cambia de día', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 16, 23, 58, 0) });
    await page.goto('/#/hoy');
    const key = page.locator('.hero .big').first();
    const before = await key.textContent();
    await page.locator('article.block').first().getByLabel('Hecho').check();
    await page.clock.fastForward(3 * 60_000);
    await page.clock.runFor(61_000);
    await expect(key).not.toHaveText(before!);
    // lo hecho ayer no aparece como hecho hoy
    await expect(page.locator('article.block').first().getByLabel('Hecho')).not.toBeChecked();
    const log = await page.evaluate(() => JSON.parse(localStorage.getItem('harmonyjazz:log')!));
    expect(Object.keys(log)).toEqual(['2026-11-16']);
  });

  test('con datos y sin copia reciente, el aviso aparece arriba y se va al guardar la copia', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('harmonyjazz:mastery', JSON.stringify({ 'scale:ionian:octave': { C: 80 } }));
    });
    await page.goto('/#/hoy');
    await expect(page.locator('.notice:not(.monthbar)')).toContainText('Todavía no hiciste ninguna copia');
    await page.locator('.notice:not(.monthbar)').getByRole('link', { name: 'Ir a la copia' }).click();
    await expect(page).toHaveURL(/#\/mas/);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Guardar copia' }).click();
    await download;
    await page.goto('/#/hoy');
    await expect(page.locator('.hero')).toContainText('Tonalidad del día');
    await expect(page.locator('.notice:not(.monthbar)')).toHaveCount(0);
  });

  test('sin datos propios no hay aviso de copia', async ({ page }) => {
    await page.goto('/#/hoy');
    await expect(page.locator('.hero')).toContainText('Tonalidad del día');
    await expect(page.locator('.notice:not(.monthbar)')).toHaveCount(0);
  });

  test('leyendo en Si♭, los nombres de las progresiones de la app también están en Si♭; en concierto quedan como son', async ({ page }) => {
    await page.goto('/#/playalong?p=blues-f');
    const tema = page.getByLabel('Tema');
    await expect(tema.locator('option:checked')).toHaveText('Blues de jazz en G');
    await expect(page.getByText(/Tocás en G \(escrito para Si♭\); en concierto suena en F\./)).toBeVisible();
    await page.getByRole('button', { name: 'Concierto' }).click();
    await expect(tema.locator('option:checked')).toHaveText('Blues de jazz en F');
    await expect(page.getByText('Tocás en F (concierto).')).toBeVisible();
  });
});
