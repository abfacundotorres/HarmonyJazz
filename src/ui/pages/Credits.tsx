import { useEffect, useState } from 'react';
import { DOMINIO_PUBLICO } from '../../content/dominioPublico';
import { FUENTES } from '../../content/estudio';

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Créditos y licencias de todo lo que no es de la app: sonidos, tipografía y programas. */
export function Credits() {
  const [full, setFull] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || full !== null) return;
    fetch('./samples/CREDITS.txt')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('sin archivo'))))
      .then(setFull)
      .catch(() => setFull('No se pudo cargar el texto completo.'));
  }, [open, full]);

  return (
    <div className="page credits-page">
      <section className="card">
        <h2>Créditos y licencias</h2>
        <p className="muted">
          HarmonyJazz es una app personal para estudiar jazz en trompeta. Todo lo de abajo es obra de otras personas, usado según su licencia. Las melodías, letras y cifrados de los temas que estudiás los cargás vos: la app no incluye contenido de terceros, salvo los pocos temas de dominio público que se listan abajo.
        </p>
      </section>

      <section className="card">
        <h3>Sonido</h3>
        <ul>
          <li>
            <b>Piano:</b> Salamander Grand Piano V3, de Alexander Holm.{' '}
            <a href="https://creativecommons.org/licenses/by/3.0/" {...ext}>CC BY 3.0</a>. Se usa una selección de notas, convertida a MP3.
          </li>
          <li>
            <b>Batería:</b> The Salamander Drumkit, de Alexander Holm.{' '}
            <a href="https://creativecommons.org/licenses/by-sa/3.0/" {...ext}>CC BY-SA 3.0</a>. Se recortó, se pasó a mono y se convirtió a MP3; las muestras adaptadas conservan esa licencia.
          </li>
          <li>
            <b>Contrabajo y trompeta:</b> FluidR3 SoundFont, de Frank Wen. Licencia MIT.
          </li>
          <li>
            <b>Metrónomo mecánico:</b> "Sound Classic Metronome 96", de Olga Ernst (Wikimedia Commons).{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" {...ext}>CC BY-SA 4.0</a>. Se recortaron seis golpes, se les reconstruyó el pico recortado y se igualó el nivel; las muestras adaptadas conservan esa licencia.
          </li>
        </ul>
      </section>

      <section className="card" id="dominio-publico">
        <h3>Temas de dominio público</h3>
        <p>
          En Play-along hay unos pocos temas tradicionales de dominio público: la composición es anónima y de más de un siglo, o es libre en EE. UU. (publicada hasta 1930)
          y sus autores murieron hace más de 70 años. Se incluye <b>sólo la armonía</b>, sin melodía ni letra, y es una <b>armonización propia, escrita de memoria y sin verificar</b>
          contra ninguna edición: no se copió de ningún libro. Contrastala de oído.
        </p>
        <ul>
          {DOMINIO_PUBLICO.map((t) => (
            <li key={t.id}>
              <b>{t.nombre}</b>: {t.autoria} ({t.epoca}). {t.base}
            </li>
          ))}
        </ul>
      </section>

      <section className="card" id="listas-de-estudio">
        <h3>Listas de temas para estudiar</h3>
        <p>
          «Qué estudiar y en qué orden» (Mi repertorio) toma de estas cuatro listas publicadas <b>sólo los títulos y compositores</b> de los temas y cuántas listas coinciden en cada uno.
          No incluye acordes, melodías ni textos de esas páginas. El orden en etapas es criterio propio de la app.
        </p>
        <ul>
          {FUENTES.map((f) => (
            <li key={f.id}>
              <a href={f.url} {...ext}>{f.nombre}</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Tipografía</h3>
        <p>
          Los títulos usan <b>DM Serif Display</b>. Copyright 2014–2017 Adobe Systems Incorporated (nombre reservado "Source") y 2019 Google LLC, bajo la{' '}
          <a href="https://openfontlicense.org/" {...ext}>SIL Open Font License 1.1</a>. Se distribuye con la app a través del paquete <code>@fontsource/dm-serif-display</code>.{' '}
          <a href="./licenses/DM-Serif-Display-OFL.txt" {...ext}>Texto de la licencia</a>.
        </p>
        <p>
          Algunos temas usan otras tipografías, también bajo la <a href="https://openfontlicense.org/" {...ext}>SIL Open Font License 1.1</a> y distribuidas con la app:{' '}
          <b>Barlow Condensed</b> (Copyright 2017 The Barlow Project Authors; paquete <code>@fontsource/barlow-condensed</code>;{' '}
          <a href="./licenses/Barlow-Condensed-OFL.txt" {...ext}>licencia</a>) en los temas Blue Note, y <b>Libre Baskerville</b> (Copyright 2012 The Libre Baskerville Project Authors; paquete{' '}
          <code>@fontsource/libre-baskerville</code>; <a href="./licenses/Libre-Baskerville-OFL.txt" {...ext}>licencia</a>) en el tema Papel de partitura.
        </p>
      </section>

      <section className="card">
        <h3>Programas</h3>
        <p>
          La app está hecha con React, Vite, Tone.js (síntesis y reproducción) y abcjs (partituras), todos de código abierto con licencia MIT.
        </p>
      </section>

      <section className="card">
        <details onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary>Texto completo de las licencias de los sonidos</summary>
          <pre className="license">{full ?? 'Cargando…'}</pre>
        </details>
      </section>
    </div>
  );
}
