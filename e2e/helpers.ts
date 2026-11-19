import { expect, Page, test as base } from '@playwright/test';
import { ACCESS_HASH } from '../src/auth/access';
import { encodeWav } from '../src/pitch/wav';

/** Deja la app desbloqueada (sin necesitar la contraseña: se usa su derivación, que ya es pública en el código). */
export async function unlock(page: Page) {
  await page.addInitScript((h) => {
    try {
      localStorage.setItem('hj:acceso', h);
    } catch {
      /* sin almacenamiento */
    }
  }, ACCESS_HASH);
}

/** `test` estricto: la pantalla no debe producir errores de JavaScript ni de consola. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({}, use) => {
    await use([]);
  },
  page: async ({ page, errors }, use) => {
    await unlock(page);
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await use(page);
    expect(errors, 'errores en la consola del navegador').toEqual([]);
  },
});

/** `test` sin la verificación de consola (para las pruebas que provocan errores a propósito). */
export const testLoose = base.extend({
  page: async ({ page }, use) => {
    await unlock(page);
    await use(page);
  },
});

export { expect };

export const ROUTES = ['#/hoy', '#/mes', '#/progreso', '#/mas', '#/playalong', '#/metronomo', '#/lecciones', '#/lecciones/guide-tones', '#/escalas', '#/vocabulario', '#/transcribir', '#/oido', '#/escucha'];

/** Segundos de un texto "m:ss.s". */
export const secs = (txt: string) => {
  const [m, s] = txt.trim().split(':');
  return Number(m) * 60 + Number(s);
};

/**
 * Audio de prueba: una melodía tipo trompeta (armónicos, vibrato) sobre un bajo y algo de ruido, en estéreo.
 * `detuneCents` la corre de afinación para probar la estimación.
 */
export async function makeWav({ seconds = 12, detuneCents = 0, sampleRate = 22050 } = {}) {
  const sr = sampleRate;
  const n = Math.round(seconds * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const det = detuneCents / 100;
  const mel = [58, 62, 65, 63, 60, 62, 65, 70, 69, 67, 65, 62];
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5);
  let t = 0.3;
  for (let k = 0; t < seconds - 1; k++) {
    const f0 = hz(mel[k % mel.length] + det);
    const d = [0.35, 0.35, 0.6][k % 3];
    const a = Math.round(t * sr);
    let ph = 0;
    for (let i = 0; i < Math.round(d * sr) && a + i < n; i++) {
      const tt = i / sr;
      const env = Math.min(1, tt / 0.03) * Math.min(1, (d - tt) / 0.04);
      ph += (2 * Math.PI * f0 * (tt > 0.15 ? 1 + 0.0087 * Math.sin(2 * Math.PI * 5.5 * tt) : 1)) / sr;
      let v = 0;
      for (let h = 1; h <= 8; h++) v += Math.sin(h * ph) / Math.pow(h, 0.9);
      v *= 0.09 * env;
      L[a + i] += 0.8 * v;
      R[a + i] += v;
    }
    t += d + 0.05;
  }
  const bass = [34, 38, 41, 43, 45, 41, 38, 36];
  for (let k = 0; k * 0.45 < seconds; k++) {
    const f0 = hz(bass[k % 8] + det);
    const a = Math.round(k * 0.45 * sr);
    for (let i = 0; i < Math.round(0.4 * sr) && a + i < n; i++) {
      const tt = i / sr;
      const v = (Math.sin(2 * Math.PI * f0 * tt) + 0.6 * Math.sin(4 * Math.PI * f0 * tt) + 0.3 * Math.sin(6 * Math.PI * f0 * tt)) * 0.12 * Math.exp(-tt * 3);
      L[a + i] += v;
      R[a + i] += v;
    }
  }
  for (let i = 0; i < n; i++) {
    L[i] += 0.01 * rnd();
    R[i] += 0.01 * rnd();
  }
  return Buffer.from(await encodeWav([L, R], sr).arrayBuffer());
}

/** Abre Transcribir, carga un audio y espera a que el motor preciso esté listo. */
export async function openAudio(page: Page, wav: Buffer, name = 'prueba.wav') {
  await page.goto('/#/transcribir');
  await page.setInputFiles('input[type=file]', { name, mimeType: 'audio/wav', buffer: wav });
  await page.waitForSelector('canvas.wave');
  await expect(page.getByText('Motor preciso')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
}

/**
 * Un mediodía en que el plan de rotación trae el ejercicio de técnica número `indice` (de los 18): la técnica toca cuando
 * el número de día es múltiplo de 3 (foco del día entre técnica, escala y armonía) y su ejercicio es floor(n / 4) % 18.
 */
export const diaTecnica = (indice: number) => {
  for (let n = 20790; ; n++) if (n % 3 === 0 && Math.floor(n / 4) % 18 === indice) return new Date(1970, 0, 1 + n, 12, 0, 0);
};

/** Abre un bloque del plan de Hoy (empieza abierto sólo el primero) y devuelve su tarjeta. */
export async function openBlock(page: Page, title: string) {
  const block = page.locator('article.block', { hasText: title }).first();
  const head = block.locator('.bhead');
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
  return block;
}

/** Despliega todos los ejercicios de una lección (empiezan plegados). */
export async function openExercises(page: Page) {
  const heads = page.locator('details.fold[id^="ex-"] > summary');
  await heads.first().waitFor();
  // los ejercicios aparecen de a poco: se espera a que la cantidad se asiente antes de abrirlos (contarlos apenas aparece el primero dejaba alguno sin abrir)
  let prev = -1;
  await expect
    .poll(async () => {
      const c = await heads.count();
      const stable = c === prev;
      prev = c;
      return stable;
    }, { intervals: [250] })
    .toBe(true);
  const n = await heads.count();
  for (let i = 0; i < n; i++) await heads.nth(i).click();
}
