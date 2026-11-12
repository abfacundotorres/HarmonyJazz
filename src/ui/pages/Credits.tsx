import { useEffect, useState } from 'react';

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
          HarmonyJazz es una app personal para estudiar jazz en trompeta. Todo lo de abajo es obra de otras personas, usado según su licencia. Las melodías, letras y cifrados de los temas que estudiás los cargás vos: la app no incluye contenido de terceros.
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
        </ul>
      </section>

      <section className="card">
        <h3>Tipografía</h3>
        <p>
          Los títulos usan <b>DM Serif Display</b>. Copyright 2014–2017 Adobe Systems Incorporated (nombre reservado "Source") y 2019 Google LLC, bajo la{' '}
          <a href="https://openfontlicense.org/" {...ext}>SIL Open Font License 1.1</a>. Se distribuye con la app a través del paquete <code>@fontsource/dm-serif-display</code>.{' '}
          <a href="./licenses/DM-Serif-Display-OFL.txt" {...ext}>Texto de la licencia</a>.
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
