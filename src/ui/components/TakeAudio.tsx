import { useEffect, useMemo, useState } from 'react';
import { blobToWav } from '../../pitch/wav';
import { addTrack } from '../../transcribe/audioStore';
import { navigate } from '../hooks';

/** Clave con la que Transcribir sabe qué audio abrir apenas se muestra. */
export const OPEN_TRACK_KEY = 'harmonyjazz:open-track';

/**
 * La toma de audio de lo que acabás de tocar: se escucha ahí mismo y se puede guardar en Transcribir
 * para verla en el espectrograma, bajarle la velocidad o detectar sus notas.
 */
export function TakeAudio({ blob, name, onDiscard }: { blob: Blob; name: string; onDiscard: () => void }) {
  // el audio crudo de una grabación no trae duración (el reproductor no puede avanzar ni retroceder): se pasa a WAV
  const [wav, setWav] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let alive = true;
    setWav(null);
    blobToWav(blob).then(
      (w) => alive && setWav(w),
      () => alive && setMsg('No se pudo leer la toma grabada en este navegador.'),
    );
    return () => {
      alive = false;
    };
  }, [blob]);
  const url = useMemo(() => (wav ? URL.createObjectURL(wav) : ''), [wav]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const save = async () => {
    if (!wav) return;
    setBusy(true);
    setMsg('');
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const meta = await addTrack(new File([wav], `Toma - ${name} - ${stamp}.wav`, { type: 'audio/wav' }));
      try {
        sessionStorage.setItem(OPEN_TRACK_KEY, meta.id);
      } catch {
        /* se abre desde la lista */
      }
      navigate('#/transcribir');
    } catch (e) {
      setMsg(`No se pudo guardar la toma: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h3>Tu toma</h3>
      {url ? <audio src={url} controls style={{ width: '100%' }} /> : <p className="muted small" role="status">Preparando la toma…</p>}
      <p className="muted small">
        Es el audio completo del micrófono. Con auriculares se oye sólo tu trompeta; sin ellos también se cuela el acompañamiento. Guardala en Transcribir para verla en el espectrograma, escucharla lenta o marcar pasajes.
      </p>
      <div className="row">
        <button className="primary" onClick={() => void save()} disabled={busy || !wav}>{busy ? 'Guardando…' : 'Guardar en Transcribir'}</button>
        <button onClick={onDiscard} disabled={busy}>Descartar</button>
      </div>
      {msg && <p role="alert" style={{ color: 'var(--bad)' }}>{msg}</p>}
    </section>
  );
}
