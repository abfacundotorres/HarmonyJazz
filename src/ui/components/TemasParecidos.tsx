import { useEffect, useRef, useState } from 'react';
import { convertirTema, leerColeccion, type ResumenTema } from '../../content/coleccion';
import type { UserTune } from '../../content/library';
import { etiqueta, huella, masParecidos, type Candidato } from '../../content/similares';
import { parseChart, type Chart } from '../../theory/chart';
import { almacenColeccion } from '../../state/blobStore';

interface Cargada {
  firma: string;
  temas: unknown[];
  resumen: ResumenTema[];
  huellas: Candidato[];
}

/** Las huellas de la colección se calculan una vez por archivo y quedan en memoria mientras la app esté abierta. */
let cache: Cargada | null = null;

const respirar = () => new Promise<void>((res) => setTimeout(res, 0));

/**
 * Temas de tu colección con la misma armonía que el que estás tocando: compara la progresión (sin importar la tonalidad) contra todos
 * los temas del archivo y muestra los 10 más parecidos. Todo pasa en este navegador; el archivo no se sube a ningún lado.
 */
export function TemasParecidos({
  chart,
  titulo,
  existentes,
  onAgregar,
  onTocar,
}: {
  chart: Chart;
  /** Nombre del tema que suena: no se ofrece a sí mismo. */
  titulo: string;
  existentes: Map<string, string>;
  onAgregar: (t: UserTune, tocar: boolean) => { ok: boolean; mensaje: string };
  onTocar: (id: string) => void;
}) {
  const [estado, setEstado] = useState<'quieto' | 'leyendo' | 'listo' | 'sin' | 'error'>('quieto');
  const [avance, setAvance] = useState('');
  const [lista, setLista] = useState<{ t: ResumenTema; puntaje: number }[]>([]);
  const [ultimo, setUltimo] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const col = useRef<Cargada | null>(null);
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const buscar = async () => {
    setEstado('leyendo');
    setUltimo(null);
    setAvance('Leyendo la colección…');
    try {
      const archivo = await almacenColeccion.leer();
      if (!archivo) return setEstado('sin');
      const r = leerColeccion(await archivo.blob.text());
      if (typeof r === 'string') {
        setAvance(r);
        return setEstado('error');
      }
      const firma = `${archivo.name}:${archivo.blob.size}:${r.resumen.length}`;
      if (cache?.firma !== firma) {
        const huellas: Candidato[] = [];
        for (let i = 0; i < r.temas.length; i++) {
          const c = convertirTema(r.temas[i]);
          if (!('error' in c)) {
            try {
              huellas.push({ idx: i, h: huella(parseChart(c.tune.chart)) });
            } catch {
              /* un tema que no se puede leer no entra en la comparación */
            }
          }
          if (i % 100 === 99) {
            if (!vivo.current) return;
            setAvance(`Analizando la armonía de tus temas… ${i + 1} de ${r.temas.length}`);
            await respirar();
          }
        }
        cache = { firma, temas: r.temas, resumen: r.resumen, huellas };
      }
      col.current = cache;
      const miNombre = titulo.trim().toLowerCase();
      const candidatos = cache.huellas.filter((c) => c.h.length > 0 && cache!.resumen[c.idx].titulo.trim().toLowerCase() !== miNombre);
      const ref = huella(chart);
      setLista(masParecidos(ref, candidatos, 10).map((m) => ({ t: cache!.resumen[m.idx], puntaje: m.puntaje })));
      setEstado('listo');
    } catch (e) {
      setAvance((e as Error).message || 'No se pudo leer la colección.');
      setEstado('error');
    }
  };

  const agregar = (t: ResumenTema, tocar: boolean) => {
    const c = convertirTema(col.current!.temas[t.idx]);
    if ('error' in c) return setUltimo({ ok: false, mensaje: `No se pudo agregar «${t.titulo}»: ${c.error}` });
    setUltimo(onAgregar(c.tune, tocar));
  };

  return (
    <details className="parecidos">
      <summary>Temas de mi colección con esta armonía</summary>
      <p className="muted small">
        Compara la armonía de este tema, sin importar la tonalidad, con todos los temas de «Mi colección» y te muestra los 10 más parecidos. Sirve para
        estudiar por estructuras: lo que aprendas en uno te sirve en los otros.
      </p>
      <div className="row">
        <button onClick={() => void buscar()} disabled={estado === 'leyendo'}>{estado === 'leyendo' ? 'Analizando…' : estado === 'listo' ? 'Buscar de nuevo' : 'Buscar en mi colección'}</button>
      </div>
      {estado === 'leyendo' && <p className="muted small" role="status">{avance}</p>}
      {estado === 'sin' && <p role="status">Todavía no cargaste tu colección: elegí el archivo en «Mi colección», más abajo, y volvé a buscar.</p>}
      {estado === 'error' && <p role="alert" className="error">{avance}</p>}
      {estado === 'listo' && lista.length === 0 && <p role="status" className="muted">Ningún tema de tu colección se parece a esta armonía.</p>}
      {estado === 'listo' && lista.length > 0 && lista.length < 10 && <p role="status" className="muted small">Sólo {lista.length === 1 ? 'un tema tiene' : `${lista.length} temas tienen`} algo de esta armonía.</p>}
      {estado === 'listo' && lista.length > 0 && (
        <ol className="parecidos-lista">
          {lista.map(({ t, puntaje }) => {
            const id = existentes.get(t.titulo.toLowerCase());
            return (
              <li key={t.idx}>
                <span>
                  <b>{t.titulo}</b>
                  <small className="muted"> · {[t.compositor, t.tonalidad || 'sin tonalidad', t.ritmo].filter(Boolean).join(' · ')}</small>
                  <br />
                  <small><b>{Math.round(puntaje * 100)} %</b> · {etiqueta(puntaje)}</small>
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
        </ol>
      )}
      {ultimo && <p role="status" className={ultimo.ok ? 'colecc-ok' : 'error'}><b>{ultimo.mensaje}</b></p>}
    </details>
  );
}
