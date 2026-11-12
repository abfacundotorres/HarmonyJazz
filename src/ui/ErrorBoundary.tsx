import { Component, ReactNode } from 'react';
import { backupFileName, buildBackup, collectLocal, PREFIX } from '../state/backup';

/**
 * Si una pantalla falla, en vez de dejar la app en blanco se muestra qué pasó y cómo seguir: reintentar, volver
 * al inicio, bajar una copia de lo guardado (para no perderlo) o restablecer los datos de la app.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Falló una pantalla:', error, info.componentStack);
  }

  componentDidMount() {
    // al cambiar de pantalla se vuelve a intentar
    window.addEventListener('hashchange', this.reset);
  }
  componentWillUnmount() {
    window.removeEventListener('hashchange', this.reset);
  }
  reset = () => this.setState({ error: null });

  downloadCopy = () => {
    const file = buildBackup(collectLocal(localStorage), []);
    const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  eraseAll = () => {
    if (!window.confirm('Esto borra TODOS los datos de la app en este dispositivo (temas, frases, progreso y ajustes). Los audios de Transcribir no se borran.\n\nSi no bajaste una copia, tocá Cancelar y bajala primero. ¿Borrar todo?')) return;
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* sin almacenamiento */
    }
    window.location.hash = '#/hoy';
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="gate">
        <section className="card" role="alert" style={{ maxWidth: 520 }}>
          <h2>Algo falló en esta pantalla</h2>
          <p className="muted">
            La app no se rompió del todo: tus datos siguen guardados. Probá volver a intentar o ir al inicio. Si vuelve a pasar, bajá una copia de lo guardado antes de restablecer nada.
          </p>
          <p className="small muted">Detalle técnico: {error.message || String(error)}</p>
          <div className="row">
            <button className="primary" onClick={this.reset}>Reintentar</button>
            <button onClick={() => { window.location.hash = '#/hoy'; this.reset(); }}>Ir al inicio</button>
            <button onClick={() => window.location.reload()}>Recargar</button>
          </div>
          <div className="row">
            <button onClick={this.downloadCopy}>Bajar una copia de mis datos</button>
            <button onClick={this.eraseAll}>Borrar los datos de la app…</button>
          </div>
        </section>
      </div>
    );
  }
}
