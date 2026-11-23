import { useEffect, useRef, useState } from 'react';
import { GROUPS, pageLabel } from '../nav';

/**
 * Menú desplegable de pantallas, en lugar de pestañas: un solo botón con el nombre de la pantalla donde estás; al tocarlo se abre la
 * lista de todas, agrupadas, y elegir una lo cierra. Se cierra también con Escape o tocando afuera.
 */
export function NavMenu({ page }: { page: string }) {
  const [open, setOpen] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  // cambiar de pantalla (con el menú o con un enlace de adentro de la app) lo cierra
  useEffect(() => setOpen(false), [page]);

  useEffect(() => {
    if (!open) return;
    const afuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setOpen(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        boton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', afuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', afuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [open]);

  const actual = pageLabel(page);
  return (
    <nav className="menuwrap" ref={caja} aria-label="Secciones">
      <button
        ref={boton}
        className={`menubtn ${open ? 'on' : ''}`}
        aria-expanded={open}
        aria-controls="menu-pantallas"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden>☰</span> <span className="menuactual">{actual}</span>
        <span className="sr"> (menú de pantallas)</span> <span aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div id="menu-pantallas" className="menupanel">
          {GROUPS.map((g) => (
            <div key={g.id} className="menugrupo">
              <p className="menutit">{g.label}</p>
              <ul>
                {g.pages.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#/${id}`} className={id === page ? 'on' : ''} aria-current={id === page ? 'page' : undefined}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
