import { useEffect, useMemo, useRef, useState } from 'react';
import { buscar, convertirTema, leerColeccion, MAX_COLECCION_BYTES, type ResumenTema } from '../../content/coleccion';
import type { UserTune } from '../../content/library';
import { almacenColeccion } from '../../state/blobStore';

const PAGINA = 30;

interface Cargada {
  name: string;
  temas: unknown[];
  resumen: ResumenTema[];
}

/**
 * Mi colección: un JSON con muchos temas (título, compositor, tonalidad, ritmo y secciones con acordes) que elegís una vez y queda en este
 * navegador. Se busca por título o compositor y se agrega a Mis temas sólo lo que vas a estudiar (con su grilla de secciones, repeticiones
 * y finales). La app no trae ninguna colección ni sube nada: es tu archivo, leído acá.
 */
export function ColeccionPanel({
  existentes,
  onAgregar,
  onTocar,
  consultaInicial = '',
}: {
  /** Temas que ya están en Mis temas: nombre en minúsculas → id. */
  existentes: Map<string, string>;
  /** Agrega el tema; devuelve el mensaje para mostrar y si salió bien. */
  onAgregar: (t: UserTune, tocar: boolean) => { ok: boolean; mensaje: string };
  /** Toca un tema que ya está en Mis temas. */
  onTocar: (id: string) => void;
  /** Búsqueda con que se abre (viene de «Qué estudiar»): deja la colección abierta y filtrada. */
  consultaInicial?: string;
}) {
  const [col, setCol] = useState<Cargada | null>(null);
  const [error, setError] = useState('');
  const [consulta, setConsulta] = useState('');
  const [limite, setLimite] = useState(PAGINA);
  const [abierto, setAbierto] = useState(!!consultaInicial);
  const [ultimo, setUltimo] = useState<{ ok: boolean; mensaje: string; avisos: string[] } | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const caja = useRef<HTMLDetailsElement>(null);
  // llegar con una búsqueda (desde «Qué estudiar») deja la colección a la vista
  useEffect(() => {
    if (consultaInicial) caja.current?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirTexto = (name: string, texto: string): boolean => {
    const r = leerColeccion(texto);
    if (typeof r === 'string') {
      setError(r);
      return false;
    }
    setError('');
    setCol({ name, ...r });
    setConsulta(consultaInicial);
    setLimite(PAGINA);
    setAbierto(true);
    return true;
  };

  // la colección de la vez pasada
  useEffect(() => {
    let vivo = true;
    void almacenColeccion.leer().then(async (a) => {
      if (!vivo || !a) return;
      abrirTexto(a.name, await a.blob.text());
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_COLECCION_BYTES) return setError(`El archivo pesa ${Math.round(f.size / 1048576)} MB: el máximo es ${Math.round(MAX_COLECCION_BYTES / 1048576)} MB.`);
    setLeyendo(true);
    try {
      const texto = await f.text();
      if (!abrirTexto(f.name, texto)) return;
      try {
        await almacenColeccion.guardar({ name: f.name, type: f.type, blob: f });
      } catch {
        setError('Se abrió, pero el navegador no la pudo guardar: la próxima vez tendrás que elegirla de nuevo.');
      }
    } finally {
      setLeyendo(false);
    }
  };

  const quitar = async () => {
    try {
      await almacenColeccion.borrar();
    } catch {
      /* si no se puede borrar, se saca igual de la pantalla */
    }
    setCol(null);
    setUltimo(null);
    setError('');
  };

  const encontrados = useMemo(() => (col ? buscar(col.resumen, consulta) : []), [col, consulta]);

  const agregar = (t: ResumenTema, tocar: boolean) => {
    const c = convertirTema(col!.temas[t.idx]);
    if ('error' in c) return setUltimo({ ok: false, mensaje: `No se pudo agregar «${t.titulo}»: ${c.error}`, avisos: [] });
    const r = onAgregar(c.tune, tocar);
    setUltimo({ ok: r.ok, mensaje: r.mensaje, avisos: r.ok ? c.avisos : [] });
  };

  return (
    <details ref={caja} className="card coleccion" open={abierto} onToggle={(e) => e.target === e.currentTarget && setAbierto((e.target as HTMLDetailsElement).open)}>
      <summary><h3>📚 Mi colección (archivo JSON)</h3></summary>
      <input
        ref={archivo}
        type="file"
        accept=".json,.txt,application/json,text/plain"
        hidden
        aria-label="Archivo de la colección"
        onChange={(e) => { void elegir(e.target.files?.[0]); e.target.value = ''; }}
      />
      {!col ? (
        <>
          <p className="muted small">
            Si tenés muchos cifrados en un archivo JSON (título, compositor, tonalidad, ritmo y secciones con acordes), elegilo acá: se lee en este navegador y queda
            guardado, <b>no se sube a ningún lado</b>. Lo buscás por título o compositor y agregás a Mis temas sólo lo que vas a estudiar. Trae sólo armonía: la melodía la cargás vos.
          </p>
          <div className="row">
            <button className="primary" onClick={() => archivo.current?.click()} disabled={leyendo}>{leyendo ? 'Leyendo…' : 'Elegir archivo…'}</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted small">«{col.name}» · {col.resumen.length} temas · queda en este navegador (no se sube a ningún lado).</p>
          <div className="row">
            <button onClick={() => archivo.current?.click()} disabled={leyendo}>Cambiar archivo…</button>
            <button onClick={() => void quitar()}>Quitar la colección</button>
          </div>
          <label className="colecc-buscar">
            Buscar
            <input type="search" value={consulta} onChange={(e) => { setConsulta(e.target.value); setLimite(PAGINA); }} placeholder="título o compositor" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </label>
          <p className="muted small" role="status">{encontrados.length === col.resumen.length ? `${col.resumen.length} temas` : `${encontrados.length} de ${col.resumen.length} temas`}</p>
          <ul className="colecc-lista">
            {encontrados.slice(0, limite).map((t) => {
              const id = existentes.get(t.titulo.toLowerCase());
              return (
                <li key={t.idx}>
                  <span>
                    <b>{t.titulo}</b>
                    <small className="muted"> · {[t.compositor, t.tonalidad || 'sin tonalidad', t.ritmo, t.compas].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className="row">
                    {id ? (
                      <>
                        <small className="muted">✓ ya en Mis temas</small>
                        <button onClick={() => onTocar(id)} aria-label={`Tocar ${t.titulo}`}>Tocar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => agregar(t, false)} aria-label={`Agregar ${t.titulo} a Mis temas`}>Agregar</button>
                        <button onClick={() => agregar(t, true)} aria-label={`Agregar ${t.titulo} y tocar`}>Agregar y tocar</button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {encontrados.length > limite && <button onClick={() => setLimite((l) => l + PAGINA)}>Ver más ({encontrados.length - limite})</button>}
        </>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      {ultimo && (
        <div role="status" className={ultimo.ok ? 'colecc-ok' : 'error'}>
          <p><b>{ultimo.mensaje}</b></p>
          {ultimo.avisos.length > 0 && (
            <ul className="muted small">
              {ultimo.avisos.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
        </div>
      )}
    </details>
  );
}
