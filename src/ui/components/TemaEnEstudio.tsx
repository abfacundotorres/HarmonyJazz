import { useMemo } from 'react';
import { PASOS, siguientePaso, siguienteTonalidad, tonalidadesDe } from '../../content/repertorio';
import { type Flojos, textoFlojos } from '../../content/flojos';
import { localizeNotes } from '../../exercises/localize';
import { usePersistent } from '../../state/storage';
import { useReading, usePersistentLibrary, useRepertorio, useTemaEstudio } from '../hooks';
import { todosLosTemas } from '../todosLosTemas';

/**
 * «Tema en estudio»: el tema que elegiste estudiar ahora, arriba de Hoy, con lo que sigue: el próximo paso de su escalera, cuántos
 * compases flojos marcaste y atajos para tocarlo o abrir su estudio (línea de guide tones, mapa, quiz). Un solo tema a la vez.
 */
export function TemaEnEstudio() {
  const [estudio, setEstudio] = useTemaEstudio();
  const [lib] = usePersistentLibrary();
  const [rep] = useRepertorio();
  const [flojos] = usePersistent<Flojos>('flojos', {});
  const { iv, keyLabel } = useReading();
  const tema = useMemo(() => todosLosTemas((lib.tunes ?? []) as Parameters<typeof todosLosTemas>[0]).find((t) => t.id === estudio.id), [lib, estudio.id]);
  if (!estudio.id) return null;
  if (!tema) {
    // el tema ya no existe (se borró de Mis temas): se ofrece sacarlo, sin romper nada
    return (
      <section className="card temaestudio" aria-label="Tema en estudio">
        <h2 className="h3like">Tema en estudio</h2>
        <p className="muted">El tema que estabas estudiando ya no está en tu lista.</p>
        <p><button onClick={() => setEstudio(() => ({}))}>Quitarlo</button></p>
      </section>
    );
  }
  const nombre = tema.category === 'Mis temas' || tema.category === 'Dominio público' ? tema.name : localizeNotes(tema.name, 'C', 'C', iv);
  const avance = rep[tema.id];
  const paso = siguientePaso(avance);
  const tocadas = tonalidadesDe(avance);
  const sigTon = siguienteTonalidad(tocadas, tema.key);
  const listaFlojos = flojos[tema.id] ?? [];
  const nFlojos = listaFlojos.length;
  const q = `p=${encodeURIComponent(tema.id)}`;
  return (
    <section className="card temaestudio" aria-label="Tema en estudio">
      <span className="lbl">Tema en estudio</span>
      <h2 className="h3like">{nombre}</h2>
      <ul className="temaestudio-datos muted">
        <li>{paso === null ? '✓ Escalera completa (los 7 pasos)' : <>Próximo paso: <b>{PASOS[paso].titulo}</b> <span className="small">({(avance?.hechos.length ?? 0)} de {PASOS.length} hechos)</span></>}</li>
        <li>
          Tonalidades: {tocadas.length} de 12
          {sigTon && (
            <>
              {' · '}<a href={`#/playalong?${q}&k=${encodeURIComponent(sigTon)}`}>probá en {keyLabel(sigTon)}</a>
            </>
          )}
        </li>
        {nFlojos > 0 && (
          <li>
            ⚑ {nFlojos} {nFlojos === 1 ? 'compás flojo' : 'compases flojos'} marcados ({textoFlojos(listaFlojos)}) · <a href={`#/playalong?${q}&flojos=1`}>Practicar solo esos</a>
          </li>
        )}
      </ul>
      <div className="row">
        <a className="button primary" href={`#/playalong?${q}`}>Tocarlo</a>
        <a className="button" href={`#/playalong?${q}&estudio=1`}>Estudiarlo</a>
        <a className="button" href="#/repertorio">Sus pasos</a>
        <button onClick={() => setEstudio(() => ({}))}>Dejar de estudiarlo</button>
      </div>
    </section>
  );
}
