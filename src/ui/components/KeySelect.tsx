import { CONCERT_KEYS } from '../../theory/chart';
import { useReading } from '../hooks';

/** Selector de tonalidad. El valor siempre es la tonalidad en concierto; la etiqueta sigue la vista. */
export function KeySelect({
  value,
  onChange,
  mastered,
  minor,
}: {
  value: string;
  onChange: (k: string) => void;
  mastered?: Record<string, number>;
  minor?: boolean;
}) {
  const { keyLabel, view } = useReading();
  return (
    <div className="keys" role="radiogroup" aria-label={`Tonalidad (${view === 'Bb' ? 'escrita para Si♭' : 'concierto'})`}>
      {CONCERT_KEYS.map((k) => (
        <button
          key={k}
          role="radio"
          aria-checked={k === value}
          className={`key ${k === value ? 'on' : ''} ${mastered?.[k] ? 'done' : ''}`}
          onClick={() => onChange(k)}
          title={mastered?.[k] ? `Dominada a ${mastered[k]} bpm` : undefined}
        >
          {keyLabel(k)}
          {minor ? 'm' : ''}
          {mastered?.[k] ? <small>{mastered[k]}</small> : null}
        </button>
      ))}
    </div>
  );
}
