import { type Avance, siguienteTonalidad, tonalidadesDe } from '../../content/repertorio';
import { CYCLE_OF_FOURTHS } from '../../theory/chart';
import { useReading } from '../hooks';

/**
 * Las doce tonalidades de un tema en ciclo de cuartas: las que ya tocaste (marcadas), la que conviene tocar ahora y un toque para
 * abrirlo en esa tonalidad. Se marcan a mano (tocar una tonalidad la marca o la desmarca). Se leen en Si♭ o concierto como el resto.
 */
export function MapaTonalidades({ id, name, avance, inicial, onToggle }: { id: string; name: string; avance: Avance | undefined; inicial?: string | null; onToggle: (key: string) => void }) {
  const { keyLabel } = useReading();
  const tocadas = tonalidadesDe(avance);
  const sig = siguienteTonalidad(tocadas, inicial);
  return (
    <div className="mapa-tonalidades" role="group" aria-label={`Tonalidades de ${name}`}>
      <p className="small">
        <b>Tonalidades:</b> {tocadas.length} de 12
        {sig ? (
          <>
            {' · '}sigue <b>{keyLabel(sig)}</b>{' '}
            <a className="button" href={`#/playalong?p=${encodeURIComponent(id)}&k=${encodeURIComponent(sig)}`} aria-label={`Tocar ${name} en ${keyLabel(sig)}`}>
              ▶ Tocarlo en {keyLabel(sig)}
            </a>
          </>
        ) : (
          ' · ¡las doce!'
        )}
      </p>
      <div className="row tonalidades">
        {CYCLE_OF_FOURTHS.map((k) => (
          <button key={k} className={tocadas.includes(k) ? 'on' : ''} aria-pressed={tocadas.includes(k)} onClick={() => onToggle(k)} title={`Concierto: ${k}`} aria-label={`${name} en ${keyLabel(k)}`}>
            {keyLabel(k)}
          </button>
        ))}
      </div>
    </div>
  );
}
