import { useMemo } from 'react';
import { ETAPAS, FUENTES, idEnMisTemas, siguienteSugerido, temasDeEtapa, TEMAS_ESTUDIO, type TemaEstudio } from '../../content/estudio';

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * Qué estudiar y en qué orden: los standards que más aparecen en cuatro listas publicadas, agrupados en etapas de lo simple a lo
 * exigente (el orden es criterio propio). Dice cuáles ya están en Mis temas y lleva a buscar el resto en tu colección.
 */
export function QueEstudiar({ tunes }: { tunes: readonly { id: string; name: string }[] }) {
  const ids = useMemo(() => new Map(TEMAS_ESTUDIO.map((t) => [t.titulo, idEnMisTemas(t, tunes)])), [tunes]);
  const sig = useMemo(() => siguienteSugerido(tunes), [tunes]);
  const hechos = TEMAS_ESTUDIO.filter((t) => ids.get(t.titulo)).length;

  const fila = (t: TemaEstudio) => {
    const id = ids.get(t.titulo);
    return (
      <li key={t.titulo}>
        <span>
          <b>{t.titulo}</b>
          <small className="muted"> · {t.autor} · en {t.fuentes.length} de {FUENTES.length} listas</small>
          {t.nota && <small className="muted nota"> {t.nota}</small>}
        </span>
        <span className="row">
          {id ? (
            <>
              <small className="muted">✓ en Mis temas</small>
              <a className="button" href={`#/playalong?p=${encodeURIComponent(id)}`} aria-label={`Tocar ${t.titulo}`}>Tocar</a>
            </>
          ) : (
            <a className="button" href={`#/repertorio?buscar=${encodeURIComponent(t.q)}`} aria-label={`Buscar ${t.titulo} en mi colección`}>Buscar en mi colección</a>
          )}
        </span>
      </li>
    );
  };

  return (
    <details className="card estudio">
      <summary><h3>🎯 Qué estudiar y en qué orden</h3></summary>
      <p className="muted small">
        Los standards que más se repiten en cuatro listas publicadas, en cuatro etapas de lo simple a lo exigente. <b>El orden es criterio propio de la app</b>: dos de las listas son alfabéticas y las otras dos no proponen un orden de estudio, así que no hay un «orden de los foros» que seguir. Lo que sí sale de las listas es cuántas coinciden en cada tema. La app no trae sus cifrados: los cargás vos en Mi colección o en Mis temas.
      </p>
      <p className="small" role="status">
        {hechos} de {TEMAS_ESTUDIO.length} ya están en Mis temas.
        {sig && (
          <>
            {' '}Sigue: <b>{sig.titulo}</b> (etapa {sig.etapa}).{' '}
            <a className="button" href={`#/repertorio?buscar=${encodeURIComponent(sig.q)}`} aria-label={`Buscar ${sig.titulo} en mi colección`}>Buscar en mi colección</a>
          </>
        )}
      </p>
      {ETAPAS.map((e) => (
        <details key={e.n} className="etapa" open={sig?.etapa === e.n}>
          <summary>
            <b>Etapa {e.n}: {e.titulo}</b> <small className="muted">({temasDeEtapa(e.n).length} temas)</small>
          </summary>
          <p className="muted small">{e.texto}</p>
          <ul className="colecc-lista">{temasDeEtapa(e.n).map(fila)}</ul>
        </details>
      ))}
      <p className="muted small">
        Fuentes (sólo títulos y compositores):{' '}
        {FUENTES.map((f, i) => (
          <span key={f.id}>
            {i > 0 && ' · '}
            <a href={f.url} {...ext}>{f.nombre}</a>
          </span>
        ))}
        .
      </p>
    </details>
  );
}
