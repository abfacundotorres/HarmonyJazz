import { describe, expect, it, vi } from 'vitest';
import { BASE_LIBRO_VIEJA, compartirArchivo, estadoProteccion, limpiarLibroViejo, pedirProteccion, puedeCompartirArchivo } from './persist';

const file = new File(['{}'], 'copia.json', { type: 'application/json' });

describe('estadoProteccion', () => {
  it('dice si los datos están protegidos', async () => {
    expect(await estadoProteccion({ persisted: async () => true } as never)).toBe('si');
    expect(await estadoProteccion({ persisted: async () => false } as never)).toBe('no');
  });
  it('sin soporte o con error no rompe', async () => {
    expect(await estadoProteccion(undefined)).toBe('nodisponible');
    expect(await estadoProteccion({} as never)).toBe('nodisponible');
    expect(await estadoProteccion({ persisted: async () => { throw new Error('x'); } } as never)).toBe('nodisponible');
  });
});

describe('pedirProteccion', () => {
  it('si ya estaba protegido no vuelve a pedir', async () => {
    const persist = vi.fn(async () => true);
    expect(await pedirProteccion({ persisted: async () => true, persist } as never)).toBe('si');
    expect(persist).not.toHaveBeenCalled();
  });
  it('pide y devuelve lo que el navegador decidió', async () => {
    expect(await pedirProteccion({ persisted: async () => false, persist: async () => true } as never)).toBe('si');
    expect(await pedirProteccion({ persisted: async () => false, persist: async () => false } as never)).toBe('no');
    expect(await pedirProteccion({ persist: async () => true } as never)).toBe('si'); // sin persisted()
  });
  it('sin soporte o con error no rompe', async () => {
    expect(await pedirProteccion(undefined)).toBe('nodisponible');
    expect(await pedirProteccion({ persisted: async () => false, persist: async () => { throw new Error('x'); } } as never)).toBe('nodisponible');
  });
});

describe('compartir un archivo', () => {
  it('sólo si el navegador sabe compartir archivos', () => {
    expect(puedeCompartirArchivo({ share: async () => undefined, canShare: () => true }, file)).toBe(true);
    expect(puedeCompartirArchivo({ share: async () => undefined, canShare: () => false }, file)).toBe(false);
    expect(puedeCompartirArchivo({ share: async () => undefined }, file)).toBe(false);
    expect(puedeCompartirArchivo({}, file)).toBe(false);
    expect(puedeCompartirArchivo(undefined, file)).toBe(false);
    expect(puedeCompartirArchivo({ share: async () => undefined, canShare: () => { throw new Error('x'); } }, file)).toBe(false);
  });
  it('compartido, cancelado (no es un error) o error', async () => {
    const share = vi.fn(async () => undefined);
    expect(await compartirArchivo({ share }, file, 'T')).toBe('compartido');
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'T' });
    expect(await compartirArchivo({ share: async () => { throw Object.assign(new Error('c'), { name: 'AbortError' }); } }, file, 'T')).toBe('cancelado');
    expect(await compartirArchivo({ share: async () => { throw new Error('boom'); } }, file, 'T')).toBe('error');
  });
});

describe('limpiarLibroViejo', () => {
  it('borra la base del visor retirado y no rompe si el navegador no la tiene o falla', () => {
    const deleteDatabase = vi.fn(() => ({}) as IDBOpenDBRequest);
    vi.stubGlobal('indexedDB', { deleteDatabase });
    limpiarLibroViejo();
    expect(deleteDatabase).toHaveBeenCalledWith(BASE_LIBRO_VIEJA);
    vi.stubGlobal('indexedDB', { deleteDatabase: () => { throw new Error('sin permiso'); } });
    expect(() => limpiarLibroViejo()).not.toThrow();
    vi.stubGlobal('indexedDB', undefined);
    expect(() => limpiarLibroViejo()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
