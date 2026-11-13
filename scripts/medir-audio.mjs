// Mide la salida real de la app (lo que llega al altavoz) con Chromium: graba ~12 s del play-along.
// Uso: npm run build && npx vite preview --port 4173 &
//      node scripts/medir-audio.mjs salida.json [phone|normal] [volumen dB] [piano,bass,drums]
// y después: python3 scripts/medir-audio.py salida.json   (pico, rms, % de muestras cerca del techo y bandas)
// Variables: PORT (4173), DUR (ms de grabación, 12000). Con Node 22: node --experimental-strip-types ...
import { chromium } from 'playwright';
import fs from 'node:fs';
import { ACCESS_HASH } from '../src/auth/access.ts';

const [,, out, mode = 'phone', vol = '0', mixArg = 'bass'] = process.argv;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(([hash, mode, vol]) => {
  localStorage.setItem('hj:acceso', hash);
  localStorage.setItem('harmonyjazz:settings', JSON.stringify({ view: 'C', output: mode, volume: Number(vol) }));
  window.__pcm = [];
  const orig = AudioNode.prototype.connect;
  let sink = null;
  AudioNode.prototype.connect = function (dest, ...r) {
    if (dest instanceof AudioDestinationNode) {
      const ctx = this.context;
      if (!sink) {
        sink = ctx.createGain();
        const tap = ctx.createScriptProcessor(4096, 1, 1);
        tap.onaudioprocess = (e) => { if (window.__rec) window.__pcm.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
        orig.call(sink, tap);
        orig.call(tap, ctx.destination);
        orig.call(sink, ctx.destination);
        window.__sr = ctx.sampleRate;
      }
      return orig.call(this, sink, ...r);
    }
    return orig.call(this, dest, ...r);
  };
}, [ACCESS_HASH, mode, vol]);
await page.goto(`http://localhost:${process.env.PORT||4173}/#/playalong?p=rhythm`);
await page.waitForSelector('.player');
await page.waitForFunction(() => !document.body.innerText.includes('Cargando instrumentos'), null, { timeout: 30000 });
const synth = await page.getByText('se usan sonidos sintetizados').count();
if (synth) console.log('AVISO: instrumentos sintéticos');
await page.waitForTimeout(1500);
// mezcla
const mix = mixArg.split(',');
for (const [name, key] of [['Piano','piano'],['Bajo','bass'],['Batería','drums']]) {
  const btn = page.getByRole('button', { name, exact: true }).first();
  const on = (await btn.getAttribute('aria-pressed')) === 'true';
  if (on !== mix.includes(key)) await btn.click();
}
await page.getByRole('button', { name: 'Reproducir' }).first().click();
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__rec = true; });
await page.waitForTimeout(Number(process.env.DUR||12000));
await page.evaluate(() => { window.__rec = false; });
const b64 = await page.evaluate(async () => {
  const n = window.__pcm.reduce((s, a) => s + a.length, 0);
  const all = new Float32Array(n); let o = 0; for (const a of window.__pcm) { all.set(a, o); o += a.length; }
  const u8 = new Uint8Array(all.buffer); let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
});
const sr = await page.evaluate(() => window.__sr);
fs.writeFileSync(out, JSON.stringify({ sr, f32: b64 }));
await browser.close();
