import { describe, expect, it, vi } from 'vitest';
import { getSonando, setSonando, subscribeSonando } from './sonando';

describe('sonando', () => {
  it('avisa sólo cuando cambia y deja de avisar al desuscribirse', () => {
    const f = vi.fn();
    const off = subscribeSonando(f);
    setSonando({ label: 'Tema', paused: false });
    setSonando({ label: 'Tema', paused: false }); // igual: no avisa
    setSonando({ label: 'Tema', paused: true });
    expect(f).toHaveBeenCalledTimes(2);
    expect(getSonando()?.paused).toBe(true);
    off();
    setSonando(null);
    expect(f).toHaveBeenCalledTimes(2);
    expect(getSonando()).toBeNull();
  });
});
