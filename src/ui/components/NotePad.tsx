import { useState } from 'react';

const DURATIONS: [label: string, eighths: number][] = [
  ['corchea', 1], ['negra', 2], ['negra con puntillo', 3], ['blanca', 4], ['redonda', 8],
];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Cuadro para escribir notas (formato del Vocabulario: `D4`, `D4:2`, `r:2`, `|`): botones para armarlas o un cuadro de texto. */
export function NotePad({ line, onLine, placeholder = 'D4 F4 A4 C5 | B4:2 G4:2', rows = 3 }: { line: string; onLine: (l: string) => void; placeholder?: string; rows?: number }) {
  const [acc, setAcc] = useState<'' | 'b' | '#'>('');
  const [oct, setOct] = useState(4);
  const [dur, setDur] = useState(1);
  const append = (tok: string) => onLine((line.trim() + ' ' + tok).trim());
  const suffix = dur > 1 ? ':' + dur : '';
  const undo = () => onLine(line.trim().split(/\s+/).slice(0, -1).join(' '));
  return (
    <>
      <p className="muted small">
        Notas: cada una es letra + alteración + octava (<code>D4</code>, <code>Bb4</code>, <code>F#5</code>; C4 = do central escrito). Sin número es una corchea;
        <code>D4:2</code> es una negra. <code>r</code> es silencio. Una barra <code>|</code> sólo ordena la lectura. Podés escribirlas o armarlas con los botones.
      </p>
      <div className="pad">
        <div className="seg" role="group" aria-label="Alteración">
          {(['', 'b', '#'] as const).map((a) => (
            <button key={a || 'n'} className={acc === a ? 'on' : ''} onClick={() => setAcc(a)} aria-label={a === 'b' ? 'bemol' : a === '#' ? 'sostenido' : 'natural'}>
              {a === 'b' ? '♭' : a === '#' ? '♯' : '♮'}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Octava">
          {[3, 4, 5, 6].map((o) => (
            <button key={o} className={oct === o ? 'on' : ''} onClick={() => setOct(o)}>{o}</button>
          ))}
        </div>
        <select value={dur} onChange={(e) => setDur(Number(e.target.value))} aria-label="Duración">
          {DURATIONS.map(([l, n]) => (
            <option key={n} value={n}>{l}</option>
          ))}
        </select>
      </div>
      <div className="pad">
        {LETTERS.map((l) => (
          <button key={l} onClick={() => append(`${l}${acc}${oct}${suffix}`)}>{l}{acc === 'b' ? '♭' : acc === '#' ? '♯' : ''}</button>
        ))}
        <button onClick={() => append(`r${suffix}`)}>silencio</button>
        <button onClick={() => append('|')}>compás |</button>
        <button onClick={undo}>⌫</button>
      </div>
      <label className="block">
        <textarea value={line} rows={rows} maxLength={4000} onChange={(e) => onLine(e.target.value)} placeholder={placeholder} style={{ width: '100%' }} aria-label="Notas" />
      </label>
    </>
  );
}
