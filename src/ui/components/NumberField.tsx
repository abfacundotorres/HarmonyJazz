import { useEffect, useState } from 'react';

/**
 * Campo numérico que deja escribir el número entero: el valor se corrige a [min, max] recién al salir del campo
 * o con Enter (si se corrigiera en cada tecla, escribir "200" saltaría a "40" después del "2").
 */
export function NumberField({ value, min, max, onCommit, label }: { value: number; min: number; max: number; onCommit: (v: number) => void; label: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Math.round(Number(text));
    if (Number.isFinite(v) && text.trim() !== '') onCommit(Math.min(max, Math.max(min, v)));
    else setText(String(value));
  };
  return (
    <input
      type="number" inputMode="numeric" min={min} max={max} value={text} aria-label={label}
      onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}
