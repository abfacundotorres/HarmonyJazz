import { useEffect, useRef, useState } from 'react';
import { CONTEXTOS, preguntaAcorde, type Pregunta } from '../../content/quizAcordes';
import type { MemoriaModo } from '../../content/memoria';
import type { Chart } from '../../theory/chart';
import { ChordText } from './ChordInfo';

/**
 * «¿Qué acorde sigue?»: comprueba que sabés la armonía del tema sin mirar la grilla. Muestra los acordes que vienen (o ninguno, para
 * «¿con cuál empieza?») y se elige el siguiente entre cuatro. Lo que se falla se puede marcar como compás flojo para trabajarlo en bucle.
 */
export function QuizAcordes({
  chart,
  memoModo,
  onOcultar,
  onMarcarFloja,
}: {
  /** La progresión en concierto, en la tonalidad en que suena (se muestra como la leés). */
  chart: Chart;
  memoModo: MemoriaModo;
  /** Oculta la grilla (modo de memoria «Oculto») para que la pregunta valga. */
  onOcultar: () => void;
  /** Marca un compás (de lo que se toca) como flojo; sólo en temas guardados. */
  onMarcarFloja?: (compas: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<number>(2);
  const [p, setP] = useState<Pregunta | null>(null);
  const [resp, setResp] = useState<number | null>(null);
  const [puntos, setPuntos] = useState({ ok: 0, total: 0 });
  const [marcado, setMarcado] = useState(false);
  const vistos = useRef<number[]>([]);

  // otro tema o otra tonalidad: la pregunta de antes ya no vale
  useEffect(() => {
    setP(null);
    setResp(null);
    setPuntos({ ok: 0, total: 0 });
    vistos.current = [];
  }, [chart]);

  const preguntar = (c = ctx) => {
    const q = preguntaAcorde(chart, Math.random, { contexto: c, evitar: vistos.current });
    if (q && vistos.current.includes(q.indice)) vistos.current = [];
    if (q) vistos.current.push(q.indice);
    setP(q);
    setResp(null);
    setMarcado(false);
  };

  const responder = (i: number) => {
    if (!p || resp !== null) return;
    setResp(i);
    setPuntos((s) => ({ ok: s.ok + (i === p.acierto ? 1 : 0), total: s.total + 1 }));
  };

  return (
    <details className="quiz" open={open} onToggle={(e) => e.target === e.currentTarget && setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>¿Qué acorde sigue?</summary>
      {open && (
        <>
          <p className="muted small">
            Una pregunta de memoria sobre la armonía de este tema. Para que valga, no mires la grilla.
            {memoModo === 'off' && (
              <>
                {' '}
                <button onClick={onOcultar}>Ocultar la grilla</button>
              </>
            )}
          </p>
          <div className="row" role="group" aria-label="Acordes de contexto">
            <span className="muted small">Acordes de pista</span>
            {[0, ...CONTEXTOS].map((c) => (
              <button key={c} className={ctx === c ? 'on' : ''} aria-pressed={ctx === c} onClick={() => { setCtx(c); if (p) preguntar(c); }}>
                {c === 0 ? 'Ninguno' : c}
              </button>
            ))}
          </div>

          {!p ? (
            <p>
              <button className="primary" onClick={() => preguntar()}>Preguntar</button>
            </p>
          ) : (
            <div className="quiz-q">
              <p className="quiz-ctx" aria-live="polite">
                {p.contexto.length === 0 ? (
                  p.correcta.bar === 0 ? <b>¿Con qué acorde empieza el tema?</b> : <b>¿Qué acorde viene en el compás {p.correcta.bar + 1}?</b>
                ) : (
                  <>
                    {p.contexto.map((c, i) => (
                      <span key={i} className="quiz-chip">
                        <ChordText chord={c.chord} /> <small className="muted">c.{c.bar + 1}</small>
                      </span>
                    ))}
                    <span className="quiz-chip quiz-pregunta">¿?</span>
                  </>
                )}
              </p>
              <div className="quiz-ops" role="group" aria-label="Opciones">
                {p.opciones.map((o, i) => {
                  const cls = resp === null ? '' : i === p.acierto ? 'ok' : i === resp ? 'mal' : '';
                  return (
                    <button key={i} className={cls} onClick={() => responder(i)} disabled={resp !== null} aria-label={`Opción ${i + 1}`}>
                      <ChordText chord={o} />
                    </button>
                  );
                })}
              </div>
              {resp !== null && (
                <div role="status" className={resp === p.acierto ? 'quiz-ok' : 'quiz-mal'}>
                  <p>
                    <b>{resp === p.acierto ? '¡Eso!' : 'No.'}</b> Era <b><ChordText chord={p.correcta.chord} /></b> (compás {p.correcta.bar + 1})
                    {p.despues.length > 0 && (
                      <>
                        {' '}y después viene{' '}
                        {p.despues.map((c, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            <ChordText chord={c} />
                          </span>
                        ))}
                      </>
                    )}
                    .
                  </p>
                  <div className="row">
                    {resp !== p.acierto && onMarcarFloja && (
                      <button disabled={marcado} onClick={() => { onMarcarFloja(p.correcta.bar); setMarcado(true); }}>
                        {marcado ? '⚑ Compás marcado' : `⚑ Marcar el compás ${p.correcta.bar + 1} como flojo`}
                      </button>
                    )}
                    <button className="primary" onClick={() => preguntar()}>Siguiente</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {puntos.total > 0 && (
            <p className="small" role="status" data-testid="quiz-puntos">
              Aciertos: {puntos.ok} de {puntos.total}
            </p>
          )}
        </>
      )}
    </details>
  );
}
