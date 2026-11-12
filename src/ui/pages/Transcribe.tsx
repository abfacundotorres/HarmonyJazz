import { useCallback, useEffect, useState } from 'react';
import { addTrack, getBlob, listTracks, removeTrack, saveMeta, TrackMeta } from '../../transcribe/audioStore';
import { fmtTime } from '../../transcribe/regions';
import { OPEN_TRACK_KEY } from '../components/TakeAudio';
import { TrackPlayer } from '../components/transcribe/TrackPlayer';

const mb = (n: number) => (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';

export function Transcribe() {
  const [tracks, setTracks] = useState<TrackMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<{ meta: TrackMeta; blob: Blob } | null>(null);
  const [usage, setUsage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTracks(await listTracks());
    } catch (e) {
      setTracks([]);
      setError((e as Error).message);
    }
    try {
      const est = await navigator.storage?.estimate?.();
      if (est?.usage != null && est.quota) setUsage(`${mb(est.usage)} usados de ${mb(est.quota)} disponibles en este navegador`);
    } catch {
      /* sin estimación */
    }
  }, []);
  useEffect(() => {
    void refresh();
    // pide que el navegador no borre los audios si falta espacio
    void navigator.storage?.persist?.().catch(() => undefined);
  }, [refresh]);

  // si se llegó desde "Guardar en Transcribir", se abre esa toma
  useEffect(() => {
    if (!tracks) return;
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(OPEN_TRACK_KEY);
      if (id) sessionStorage.removeItem(OPEN_TRACK_KEY);
    } catch {
      /* sin sessionStorage */
    }
    const m = id ? tracks.find((t) => t.id === id) : null;
    if (m) void openTrack(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const openTrack = async (m: TrackMeta) => {
    setError(null);
    try {
      const blob = await getBlob(m.id);
      if (!blob) return setError('No se encontró el archivo de este audio.');
      const meta = { ...m, opened: Date.now() };
      void saveMeta(meta);
      setOpen({ meta, blob });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    let last: TrackMeta | null = null;
    for (const f of Array.from(files)) {
      try {
        last = await addTrack(f);
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
    }
    await refresh();
    setBusy(false);
    if (last) void openTrack(last);
  };

  const remove = async (m: TrackMeta) => {
    if (!window.confirm(`¿Borrar "${m.name}" y sus pasajes guardados? No se puede deshacer.`)) return;
    await removeTrack(m.id);
    if (open?.meta.id === m.id) setOpen(null);
    void refresh();
  };

  return (
    <div className="page transcribe">
      {open && (
        <TrackPlayer
          key={open.meta.id}
          initial={open.meta}
          blob={open.blob}
          onClose={() => {
            setOpen(null);
            void refresh();
          }}
        />
      )}
      <section className="card">
        <h2>Transcribir</h2>
        <p className="muted">
          Cargá un audio, bajale la velocidad sin cambiar el tono, marcá pasajes para repetirlos sin cortes, mirá el espectrograma, detectá notas y guardá todo para seguir otro día.
          Los audios quedan sólo en este navegador: no se suben a ningún lado.
        </p>
        <label className="button primary filebtn">
          {busy ? 'Guardando…' : '+ Cargar audio'}
          <input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.oga,.flac,.aac,.opus,.webm" multiple hidden disabled={busy} onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
        </label>
        {error && <p role="alert" style={{ color: 'var(--bad)' }}>{error}</p>}
        {tracks && tracks.length > 0 && (
          <ul className="tracklist">
            {tracks.map((t) => (
              <li key={t.id} className={open?.meta.id === t.id ? 'on' : ''}>
                <button className="link" onClick={() => void openTrack(t)}>
                  <b>{t.name}</b>
                  <small>
                    {mb(t.size)}
                    {t.duration ? ` · ${fmtTime(t.duration, 0)}` : ''}
                    {t.loops.length ? ` · ${t.loops.length} pasaje${t.loops.length === 1 ? '' : 's'}` : ''}
                    {t.pos > 1 ? ` · quedaste en ${fmtTime(t.pos, 0)}` : ''}
                  </small>
                </button>
                <button onClick={() => void remove(t)} aria-label={`Borrar ${t.name}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
        {tracks && tracks.length === 0 && <p className="muted">Todavía no cargaste audios.</p>}
        {usage && <p className="muted small">{usage}</p>}
      </section>

    </div>
  );
}
