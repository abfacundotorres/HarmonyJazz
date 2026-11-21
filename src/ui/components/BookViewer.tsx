import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { borrarLibro, guardarLibro, leerLibro, type Libro } from '../../pdf/bookStore';
import { cargarPdfjs } from '../../pdf/pdfjs';
import { ALTURA_INICIAL, ALTURAS, clampPage, clampZoom, escala, rotar, stepZoom, tipoDeArchivo, zoomPaginaCompleta } from '../../pdf/view';
import { usePersistent } from '../../state/storage';

interface VisorView {
  page?: number;
  zoom?: number;
  rot?: number;
  /** Altura del visor en vertical (% de la pantalla). */
  h?: number;
}

/** Por qué no se pudo abrir el PDF, en palabras de una persona. */
function motivo(e: unknown): string {
  const n = (e as { name?: string })?.name ?? '';
  if (n === 'PasswordException') return 'El PDF está protegido con contraseña: sacale la clave y volvé a elegirlo.';
  if (n === 'InvalidPDFException' || n === 'FormatError') return 'Ese archivo no es un PDF válido o está dañado.';
  if (n === 'MissingPDFException') return 'No se pudo leer el archivo.';
  return 'No se pudo abrir el archivo en este navegador.';
}

/**
 * Tu libro (PDF o foto) al lado del editor de temas, para copiar el cifrado mirando la página. El archivo no sale del celular:
 * se lee en el navegador (la librería de PDF se baja sólo al abrir uno) y se guarda ahí para la próxima vez.
 */
export function BookViewer() {
  const [view, setView] = usePersistent<VisorView>('visor', {});
  const zoom = clampZoom(view.zoom ?? 1);
  const rot = view.rot ?? 0;
  const altura = (ALTURAS as readonly number[]).includes(view.h ?? -1) ? (view.h as number) : ALTURA_INICIAL;

  const [libro, setLibro] = useState<Libro | null>(null);
  const [tipo, setTipo] = useState<'pdf' | 'imagen' | null>(null);
  const [estado, setEstado] = useState<'vacio' | 'abriendo' | 'listo'>('vacio');
  const [aviso, setAviso] = useState('');
  const [paginas, setPaginas] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const page = clampPage(view.page ?? 1, paginas || 1);
  const [pagTxt, setPagTxt] = useState(String(page));
  useEffect(() => setPagTxt(String(page)), [page]);

  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const tarea = useRef<RenderTask | null>(null);
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [ancho, setAncho] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [imgUrl, setImgUrl] = useState('');
  const [pinch, setPinch] = useState(1);

  const usar = (l: Libro): boolean => {
    const t = tipoDeArchivo({ type: l.type, name: l.name, size: l.blob.size });
    if (t !== 'pdf' && t !== 'imagen') {
      setAviso(t);
      return false;
    }
    setAviso('');
    setNatural(null);
    setLibro(l);
    setTipo(t);
    setAbierto(true);
    return true;
  };

  // el libro de la vez pasada
  useEffect(() => {
    let vivo = true;
    void leerLibro().then((l) => vivo && l && usar(l));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // abrir el PDF (la librería se baja ahora)
  useEffect(() => {
    if (!libro || tipo !== 'pdf') return;
    let vivo = true;
    let doc: PDFDocumentProxy | null = null;
    setEstado('abriendo');
    void (async () => {
      try {
        const [lib, buf] = await Promise.all([cargarPdfjs(), libro.blob.arrayBuffer()]);
        // se le pasa una copia de los datos al lector (los toma para sí); el archivo guardado queda intacto
        const d = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (!vivo) return void d.destroy();
        doc = d;
        docRef.current = d;
        setPaginas(d.numPages);
        setEstado('listo');
      } catch (e) {
        if (!vivo) return;
        setEstado('vacio');
        setLibro(null);
        setTipo(null);
        setAviso(motivo(e));
      }
    })();
    return () => {
      vivo = false;
      docRef.current = null;
      setPaginas(0);
      void doc?.destroy();
    };
  }, [libro, tipo]);

  // abrir una foto
  useEffect(() => {
    if (!libro || tipo !== 'imagen') return;
    const u = URL.createObjectURL(libro.blob);
    setImgUrl(u);
    setEstado('listo');
    return () => {
      URL.revokeObjectURL(u);
      setImgUrl('');
    };
  }, [libro, tipo]);

  // el ancho del recuadro manda: el zoom 1 es «la página a lo ancho»
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setAncho(Math.floor(el.clientWidth));
    const ro = new ResizeObserver(() => setAncho(Math.floor(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
    // el recuadro existe recién cuando hay libro y no está vacío: `estado` vuelve a medirlo cuando aparece
  }, [libro, abierto, estado]);

  // dibujar la página
  useEffect(() => {
    const pdf = docRef.current;
    const cv = canvas.current;
    if (!pdf || !cv || tipo !== 'pdf' || estado !== 'listo' || ancho < 50) return;
    let vivo = true;
    void (async () => {
      try {
        const prev = tarea.current;
        prev?.cancel();
        await prev?.promise.catch(() => undefined);
        if (!vivo) return;
        cv.dataset.listo = '0';
        const p = await pdf.getPage(page);
        if (!vivo) return;
        const v1 = p.getViewport({ scale: 1, rotation: rot });
        setNatural({ w: v1.width, h: v1.height });
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const vp = p.getViewport({ scale: escala(zoom, v1.width, v1.height, ancho, dpr) * dpr, rotation: rot });
        cv.width = Math.floor(vp.width);
        cv.height = Math.floor(vp.height);
        cv.style.width = `${vp.width / dpr}px`;
        cv.style.height = `${vp.height / dpr}px`;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const t = p.render({ canvasContext: ctx, viewport: vp });
        tarea.current = t;
        await t.promise;
        if (!vivo) return;
        cv.dataset.pagina = String(page);
        cv.dataset.listo = '1';
        // después de acercar o alejar, se queda mirando el mismo lugar
        const a = anchor.current;
        const b = box.current;
        if (a && b) {
          b.scrollLeft = a.x * b.scrollWidth - b.clientWidth / 2;
          b.scrollTop = a.y * b.scrollHeight - b.clientHeight / 2;
          anchor.current = null;
        }
        setAviso('');
      } catch (e) {
        if (vivo && (e as { name?: string })?.name !== 'RenderingCancelledException') setAviso('No se pudo dibujar esta página.');
      }
    })();
    return () => {
      vivo = false;
      tarea.current?.cancel();
    };
  }, [page, zoom, rot, ancho, estado, tipo]);

  const recordarCentro = () => {
    const b = box.current;
    if (b && b.scrollWidth > 0 && b.scrollHeight > 0) anchor.current = { x: (b.scrollLeft + b.clientWidth / 2) / b.scrollWidth, y: (b.scrollTop + b.clientHeight / 2) / b.scrollHeight };
  };
  const cambiarZoom = (z: number) => {
    recordarCentro();
    setView({ zoom: clampZoom(z) });
  };
  const irA = (n: number) => {
    anchor.current = null;
    setView({ page: clampPage(n, paginas) });
    if (box.current) box.current.scrollTop = 0;
  };

  // pellizcar con dos dedos para acercar o alejar (con un dedo se desplaza el recuadro, como siempre)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let d0 = 0;
    let z0 = 1;
    let r = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        d0 = dist(e.touches);
        z0 = zoomRef.current;
        r = 1;
      }
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length === 2 && d0 > 0) {
        e.preventDefault();
        r = dist(e.touches) / d0;
        setPinch(r);
      }
    };
    const end = (e: TouchEvent) => {
      if (d0 > 0 && e.touches.length < 2) {
        const z = clampZoom(z0 * r);
        d0 = 0;
        setPinch(1);
        if (Math.abs(r - 1) > 0.02) {
          recordarCentro();
          setView({ zoom: z });
        }
      }
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libro, abierto, estado]);

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    const l: Libro = { name: f.name, type: f.type, blob: f };
    if (!usar(l)) return;
    setView({ page: 1, zoom: 1, rot: 0 });
    try {
      await guardarLibro(l);
    } catch {
      setAviso('Se abrió, pero el navegador no lo pudo guardar: la próxima vez tendrás que elegirlo de nuevo.');
    }
  };
  const quitar = async () => {
    tarea.current?.cancel();
    // primero se borra de verdad y recién entonces se actualiza la pantalla: si se recarga justo después, el libro no vuelve
    try {
      await borrarLibro();
    } catch {
      /* si el navegador no deja borrarlo, se saca igual de la pantalla */
    }
    setLibro(null);
    setTipo(null);
    setEstado('vacio');
    setAviso('');
  };
  const altos = [...ALTURAS];
  const masAlto = () => setView({ h: altos[(altos.indexOf(altura as (typeof ALTURAS)[number]) + 1) % altos.length] });

  return (
    <details className={`visor ${abierto && libro && estado !== 'vacio' ? 'fijo' : ''}`} open={abierto} onToggle={(e) => e.target === e.currentTarget && setAbierto((e.target as HTMLDetailsElement).open)} style={{ ['--visor-h' as string]: `${altura}vh` }}>
      <summary>📖 Mi libro (PDF o foto)<span className="visor-largo"> para copiar mirando la página</span></summary>
      <div className="visor-barra" role="toolbar" aria-label="Visor de mi libro">
        {libro && estado !== 'vacio' ? (
          <>
            {tipo === 'pdf' && (
              <>
                <button onClick={() => irA(page - 1)} disabled={page <= 1} aria-label="Página anterior">‹</button>
                <label className="visor-pag">
                  Pág.{' '}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={paginas || 1}
                    value={pagTxt}
                    aria-label="Número de página"
                    onChange={(e) => setPagTxt(e.target.value)}
                    onBlur={() => irA(Number(pagTxt))}
                    onKeyDown={(e) => e.key === 'Enter' && irA(Number(pagTxt))}
                  />{' '}
                  de {paginas}
                </label>
                <button onClick={() => irA(page + 1)} disabled={page >= paginas} aria-label="Página siguiente">›</button>
              </>
            )}
            <button onClick={() => cambiarZoom(stepZoom(zoom, -1))} aria-label="Alejar">−</button>
            <output aria-label="Zoom">{Math.round(zoom * 100)}%</output>
            <button onClick={() => cambiarZoom(stepZoom(zoom, 1))} aria-label="Acercar">+</button>
            <button onClick={() => cambiarZoom(1)}>Ancho</button>
            {tipo === 'pdf' && (
              <button onClick={() => natural && box.current && cambiarZoom(zoomPaginaCompleta(natural.w, natural.h, box.current.clientWidth, box.current.clientHeight))}>Página</button>
            )}
            {tipo === 'pdf' && <button onClick={() => setView({ rot: rotar(rot) })} aria-label="Girar la página">↻</button>}
            <button onClick={masAlto} aria-label="Cambiar la altura del visor">↕</button>
            <button onClick={() => void quitar()}>Quitar</button>
          </>
        ) : (
          <button className="primary" onClick={() => fileInput.current?.click()}>Abrir mi libro…</button>
        )}
        <input ref={fileInput} type="file" accept="application/pdf,image/*" hidden aria-label="Archivo del libro" onChange={(e) => { void elegir(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {aviso && <p role="alert" className="error small">{aviso}</p>}
      {libro && estado === 'abriendo' && <p role="status" className="muted small">Abriendo «{libro.name}»…</p>}
      {libro && estado !== 'vacio' ? (
        <>
          {/* el recuadro se desplaza: tiene que poder enfocarse para recorrerlo con el teclado */}
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div className="visor-caja" ref={box} role="region" tabIndex={0} aria-label={`Página de ${libro.name}`}>
            <div className="visor-hoja" style={pinch !== 1 ? { transform: `scale(${pinch})`, transformOrigin: '0 0' } : undefined}>
              {tipo === 'pdf' ? <canvas ref={canvas} /> : imgUrl ? <img src={imgUrl} alt="Página de tu libro" style={{ width: `${zoom * 100}%` }} /> : null}
            </div>
          </div>
          <p className="muted small visor-nota">«{libro.name}» se guarda sólo en este navegador; no se sube a ningún lado. Pellizcá para acercar.</p>
        </>
      ) : (
        <p className="muted small">
          Elegí el PDF o una foto de tu libro. Queda en este navegador (no se sube a ningún lado) y se abre solo la próxima vez. Mirás la página mientras armás la grilla debajo.
        </p>
      )}
    </details>
  );
}
